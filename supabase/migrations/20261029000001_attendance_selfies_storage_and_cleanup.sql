-- Migration: 20261029000001_attendance_selfies_storage_and_cleanup.sql
-- Description: Create _backup_settings_attendance table with RLS and access revokes,
-- create private storage bucket attendance-selfies (accessed strictly via service-role backend routes),
-- migrate historical attendance records into staff_attendance, purge base64 strings,
-- and clean the attendance array from restaurants.settings.attendo.

-- ============================================================================
-- 1. BACKUP TABLE: CREATE _backup_settings_attendance (RLS ON, REVOKE ACCESS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public._backup_settings_attendance (
  restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  settings_attendance JSONB NOT NULL,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public._backup_settings_attendance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public._backup_settings_attendance FROM anon, authenticated;

-- Populate backup table before modifying settings
DO $$
BEGIN
  IF to_regclass('public.restaurants') IS NOT NULL AND to_regclass('public._backup_settings_attendance') IS NOT NULL THEN
    INSERT INTO public._backup_settings_attendance (restaurant_id, settings_attendance, backed_up_at)
    SELECT id, settings->'attendo'->'attendance', now()
    FROM public.restaurants
    WHERE settings ? 'attendo'
      AND settings->'attendo' ? 'attendance'
      AND jsonb_typeof(settings->'attendo'->'attendance') = 'array'
    ON CONFLICT (restaurant_id) DO UPDATE SET
      settings_attendance = EXCLUDED.settings_attendance,
      backed_up_at = now();
  END IF;
END $$;

-- ============================================================================
-- 2. STORAGE: CREATE PRIVATE BUCKET FOR ATTENDANCE SELFIES (SERVICE-ROLE ONLY)
-- ============================================================================
-- Upload and signed URL generation are executed strictly via service-role API routes
-- (/api/attendance/punch and /api/attendance/selfie-url).
-- No public, authenticated, or anon policies exist on storage.objects.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attendance-selfies',
  'attendance-selfies',
  false,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ============================================================================
-- 3. STAFF ATTENDANCE TABLE: SCOPED RLS POLICIES (WAITER CANNOT VIEW OTHERS)
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.staff_attendance') IS NOT NULL THEN
    ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "staff_manage_staff_attendance" ON public.staff_attendance;
    DROP POLICY IF EXISTS "owner_manager_manage_attendance" ON public.staff_attendance;
    DROP POLICY IF EXISTS "staff_select_own_attendance" ON public.staff_attendance;
    DROP POLICY IF EXISTS "staff_insert_own_attendance" ON public.staff_attendance;

    -- 3.1 Owner, Manager, Supervisor have full attendance management for their restaurant
    CREATE POLICY "owner_manager_manage_attendance"
      ON public.staff_attendance FOR ALL
      TO authenticated
      USING (
        (
          restaurant_id = public.get_user_restaurant_id(auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('owner', 'manager', 'supervisor')
          )
        )
        OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
      )
      WITH CHECK (
        (
          restaurant_id = public.get_user_restaurant_id(auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('owner', 'manager', 'supervisor')
          )
        )
        OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
      );

    -- 3.2 Individual staff (e.g. waiter, chef) can ONLY view their OWN attendance record
    CREATE POLICY "staff_select_own_attendance"
      ON public.staff_attendance FOR SELECT
      TO authenticated
      USING (
        restaurant_id = public.get_user_restaurant_id(auth.uid())
        AND (
          staff_id IN (
            SELECT sp.id FROM public.staff_profiles sp WHERE sp.profile_id = auth.uid()
          )
          OR marked_by_user_id = auth.uid()
        )
      );

    -- 3.3 Individual staff can insert their own punch
    CREATE POLICY "staff_insert_own_attendance"
      ON public.staff_attendance FOR INSERT
      TO authenticated
      WITH CHECK (
        restaurant_id = public.get_user_restaurant_id(auth.uid())
        AND (
          staff_id IN (
            SELECT sp.id FROM public.staff_profiles sp WHERE sp.profile_id = auth.uid()
          )
          OR marked_by_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 4. DATA MIGRATION: COPY SETTINGS.ATTENDO.ATTENDANCE TO STAFF_ATTENDANCE
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  att_item JSONB;
  v_staff_id UUID;
  v_date DATE;
  v_punch_in TIMESTAMPTZ;
  v_punch_out TIMESTAMPTZ;
  v_status TEXT;
  v_marked_by TEXT;
  v_lat NUMERIC;
  v_lng NUMERIC;
  v_acc NUMERIC;
  v_selfie TEXT;
  v_notes TEXT;
  v_staff_exists BOOLEAN;
BEGIN
  IF to_regclass('public.restaurants') IS NOT NULL AND to_regclass('public.staff_attendance') IS NOT NULL THEN
    FOR r IN
      SELECT id AS rest_id, settings
      FROM public.restaurants
      WHERE settings ? 'attendo'
        AND settings->'attendo' ? 'attendance'
        AND jsonb_typeof(settings->'attendo'->'attendance') = 'array'
    LOOP
      FOR att_item IN SELECT * FROM jsonb_array_elements(r.settings->'attendo'->'attendance')
      LOOP
        BEGIN
          v_staff_id := (att_item->>'staff_id')::UUID;
          v_date := (att_item->>'date')::DATE;
          v_punch_in := (att_item->>'punch_in_time')::TIMESTAMPTZ;
          v_punch_out := (att_item->>'punch_out_time')::TIMESTAMPTZ;
          v_status := COALESCE(att_item->>'status', 'present');
          IF v_status NOT IN ('present', 'absent', 'half_day', 'late') THEN
            v_status := 'present';
          END IF;
          v_marked_by := COALESCE(att_item->>'marked_by_type', 'self');
          IF v_marked_by NOT IN ('self', 'manager_override') THEN
            v_marked_by := 'self';
          END IF;
          v_lat := (att_item->>'latitude')::NUMERIC;
          v_lng := (att_item->>'longitude')::NUMERIC;
          v_acc := (att_item->>'accuracy_meters')::NUMERIC;
          v_selfie := att_item->>'selfie_url';
          v_notes := att_item->>'notes';

          -- Strip heavy base64 strings so DB is never bloated with base64 images
          IF v_selfie LIKE 'data:image%' OR length(v_selfie) > 500 THEN
            v_selfie := NULL;
          END IF;

          -- Verify or auto-stub staff_profile so foreign key constraint is satisfied
          SELECT EXISTS (
            SELECT 1 FROM public.staff_profiles WHERE id = v_staff_id
          ) INTO v_staff_exists;

          IF NOT v_staff_exists THEN
            INSERT INTO public.staff_profiles (id, restaurant_id, name, role)
            VALUES (
              v_staff_id,
              r.rest_id,
              COALESCE(att_item->>'staff_name', 'Staff Member'),
              COALESCE(att_item->>'staff_role', 'waiter')
            )
            ON CONFLICT (id) DO NOTHING;
          END IF;

          -- Upsert record into staff_attendance table
          INSERT INTO public.staff_attendance (
            restaurant_id,
            staff_id,
            date,
            punch_in_time,
            punch_out_time,
            status,
            marked_by_type,
            latitude,
            longitude,
            accuracy_meters,
            selfie_url,
            notes,
            created_at,
            updated_at
          ) VALUES (
            r.rest_id,
            v_staff_id,
            v_date,
            v_punch_in,
            v_punch_out,
            v_status,
            v_marked_by,
            v_lat,
            v_lng,
            v_acc,
            v_selfie,
            v_notes,
            COALESCE((att_item->>'created_at')::TIMESTAMPTZ, now()),
            now()
          )
          ON CONFLICT (staff_id, date) DO UPDATE SET
            punch_in_time = EXCLUDED.punch_in_time,
            punch_out_time = COALESCE(EXCLUDED.punch_out_time, public.staff_attendance.punch_out_time),
            status = EXCLUDED.status,
            selfie_url = COALESCE(EXCLUDED.selfie_url, public.staff_attendance.selfie_url),
            updated_at = now();

        EXCEPTION WHEN OTHERS THEN
          -- Ignore any individual malformed JSON record and proceed
          NULL;
        END;
      END LOOP;

      -- ============================================================================
      -- 5. CLEANUP: REMOVE ATTENDANCE ARRAY FROM RESTAURANTS.SETTINGS.ATTENDO
      -- ============================================================================
      UPDATE public.restaurants
      SET settings = settings #- '{attendo,attendance}'
      WHERE id = r.rest_id;
    END LOOP;

    -- Also purge any existing base64 selfies from staff_attendance table
    UPDATE public.staff_attendance
    SET selfie_url = NULL
    WHERE selfie_url LIKE 'data:image%' OR length(selfie_url) > 500;
  END IF;
END $$;
