-- Migration: 72-Hour ₹3 Trial & Auto-Expiry Support
-- Date: 2026-10-31

-- 1. Ensure columns exist on restaurants
ALTER TABLE public.restaurants 
  ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'trial_3_days',
  ADD COLUMN IF NOT EXISTS plan_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- 2. Drop restrictive check constraints on subscription_plan and subscription_status if present
DO $$
BEGIN
  ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_subscription_plan_check;
  ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_subscription_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- 3. Relax subscription_plan check to allow trial_3_days and custom
ALTER TABLE public.restaurants 
  ADD CONSTRAINT restaurants_subscription_plan_check 
  CHECK (subscription_plan in ('trial_3_days', 'trial', 'starter', 'pro', 'premium', 'custom', 'enterprise'));

-- 4. Index for fast trial expiry lookups & notification cron jobs
CREATE INDEX IF NOT EXISTS idx_restaurants_plan_expires_at ON public.restaurants (plan_expires_at) 
  WHERE plan_expires_at IS NOT NULL;
