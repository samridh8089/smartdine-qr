-- Migration: 20260824000002_otp_sessions_table.sql
-- Description: Create persistent otp_sessions table for reliable cross-serverless OTP delivery and verification

CREATE TABLE IF NOT EXISTS public.otp_sessions (
    id TEXT PRIMARY KEY,
    target TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'owner_email',
    otp_hash TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    resend_available_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for instant lookups
CREATE INDEX IF NOT EXISTS idx_otp_sessions_target_type ON public.otp_sessions(target, type);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_lookup ON public.otp_sessions(id);

-- Enable RLS
ALTER TABLE public.otp_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service_role and authenticated to query/update otp_sessions
DROP POLICY IF EXISTS "Enable full access for service_role" ON public.otp_sessions;
CREATE POLICY "Enable full access for service_role" ON public.otp_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated and anon" ON public.otp_sessions;
CREATE POLICY "Enable read access for authenticated and anon" ON public.otp_sessions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
