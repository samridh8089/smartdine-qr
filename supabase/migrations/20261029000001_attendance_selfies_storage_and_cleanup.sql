-- Migration: 20261029000001_attendance_selfies_storage_and_cleanup.sql
-- Description: Migrate settings.attendo.attendance to staff_attendance, purge base64 selfies from DB,
-- create private storage bucket attendance-selfies, and enforce owner/manager-only access for selfies.

-- ============================================================================
-- 1. STORAGE: CREATE PRIVATE BUCKET FOR ATTENDANCE SELFIES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attendance-selfies',
  'attendance-selfies',
  false,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1.1 SELECT: Only Owner and Manager can select/read private attendance selfies (or AAL2 super admin)
DROP POLICY IF EXISTS "owner_manager_read_attendance_selfies" ON storage.objects;
CREATE POLICY "owner_manager_read_attendance_selfies"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attendance-selfies'
    AND (
      (
        (storage.foldername(name))[1] = (public.get_user_restaurant_id(auth.uid()))::text
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('owner', 'manager')
        )
      )
      OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
    )
  );

-- 1.2 INSERT: Active staff of the restaurant can upload their punch selfie to their restaurant folder
DROP POLICY IF EXISTS "staff_upload_attendance_selfies" ON storage.objects;
CREATE POLICY "staff_upload_attendance_selfies"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attendance-selfies'
    AND (
      (storage.foldername(name))[1] = (public.get_user_restaurant_id(auth.uid()))::text
      OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
    )
  );

-- 1.3 DELETE / UPDATE: Only Owner and Manager can manage selfie objects
DROP POLICY IF EXISTS "owner_manager_manage_attendance_selfies" ON storage.objects;
CREATE POLICY "owner_manager_manage_attendance_selfies"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'attendance-selfies'
    AND (
      (
        (storage.foldername(name))[1] = (public.get_user_restaurant_id(auth.uid()))::text
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('owner', 'manager')
        )
      )
      OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
    )
  );

-- ============================================================================
-- 2. STAFF ATTENDANCE TABLE: SCOPED RLS POLICIES (WAITER CANNOT VIEW OTHERS)
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.staff_attendance') IS NOT NULL THEN
    ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "staff_manage_staff_attendance" ON public.staff_attendance;
    DROP POLICY IF EXISTS "owner_manager_manage_attendance" ON public.staff_attendance;
    DROP POLICY IF EXISTS "staff_select_own_attendance" ON public.staff_attendance;
    DROP POLICY IF EXISTS "staff_insert_own_attendance" ON public.staff_attendance;

    -- 2.1 Owner, Manager, Supervisor have full attendance management for their restaurant
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

    -- 2.2 Individual staff (e.g. waiter, chef) can ONLY view their OWN attendance record
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

    -- 2.3 Individual staff can insert their own punch
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
-- 3. DATA MIGRATION: COPY SETTINGS.ATTENDO.ATTENDANCE TO STAFF_ATTENDANCE
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
      -- 4. CLEANUP: REMOVE ATTENDANCE ARRAY FROM RESTAURANTS.SETTINGS.ATTENDO
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
