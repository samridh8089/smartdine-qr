-- CleverOps Migration: Staff Attendance, Shift Management & Salary Slips (Attendo Module)
-- File: supabase/migrations/20261021000000_staff_attendance_payroll.sql

-- 1. STAFF PROFILES (Bridged to restaurant and auth profiles)
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('waiter', 'chef', 'manager', 'cashier', 'supervisor', 'cleaner', 'helper')),
  phone TEXT,
  base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  salary_type TEXT NOT NULL DEFAULT 'fixed' CHECK (salary_type IN ('fixed', 'per_day')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_restaurant ON public.staff_profiles(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_profile ON public.staff_profiles(profile_id);

-- 2. SHIFTS MASTER
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  shift_name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  grace_period_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shifts_restaurant ON public.shifts(restaurant_id);

-- 3. STAFF SHIFTS (ROSTER ASSIGNMENTS)
CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unq_staff_shift_date UNIQUE (staff_id, assigned_date, shift_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_shifts_restaurant ON public.staff_shifts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON public.staff_shifts(assigned_date);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff ON public.staff_shifts(staff_id);

-- 4. STAFF ATTENDANCE (PUNCH IN / OUT, GEOFENCE, SELFIE, STATUS)
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  punch_in_time TIMESTAMPTZ,
  punch_out_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'late')),
  marked_by_type TEXT NOT NULL DEFAULT 'self' CHECK (marked_by_type IN ('self', 'manager_override')),
  marked_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  accuracy_meters NUMERIC(8, 2),
  distance_meters NUMERIC(8, 2),
  is_within_geofence BOOLEAN DEFAULT true,
  selfie_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unq_staff_attendance_daily UNIQUE (staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_restaurant ON public.staff_attendance(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON public.staff_attendance(date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff ON public.staff_attendance(staff_id);

-- 5. SALARY RECORDS (MONTHLY PAYROLL, ALLOWANCES, DEDUCTIONS, SLIP)
CREATE TABLE IF NOT EXISTS public.salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  total_days_in_month INTEGER NOT NULL DEFAULT 30,
  total_present_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
  total_half_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
  total_late_days INTEGER NOT NULL DEFAULT 0,
  base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  salary_type TEXT NOT NULL DEFAULT 'fixed' CHECK (salary_type IN ('fixed', 'per_day')),
  gross_earned NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  allowances JSONB NOT NULL DEFAULT '[]'::jsonb,
  deductions JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_advance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  net_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  slip_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unq_salary_records_month_year UNIQUE (staff_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_salary_records_restaurant ON public.salary_records(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_salary_records_staff ON public.salary_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_records_period ON public.salary_records(year, month);

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES (Allow restaurant members and service role full operational access)
DROP POLICY IF EXISTS "staff_profiles_allow_all" ON public.staff_profiles;
CREATE POLICY "staff_profiles_allow_all" ON public.staff_profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "shifts_allow_all" ON public.shifts;
CREATE POLICY "shifts_allow_all" ON public.shifts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_shifts_allow_all" ON public.staff_shifts;
CREATE POLICY "staff_shifts_allow_all" ON public.staff_shifts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_attendance_allow_all" ON public.staff_attendance;
CREATE POLICY "staff_attendance_allow_all" ON public.staff_attendance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "salary_records_allow_all" ON public.salary_records;
CREATE POLICY "salary_records_allow_all" ON public.salary_records FOR ALL USING (true) WITH CHECK (true);
