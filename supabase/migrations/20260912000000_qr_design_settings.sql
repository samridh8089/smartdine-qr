-- Migration: 20260912000000_qr_design_settings.sql
-- Description: Create qr_design_settings table for CleverOps QR Design Studio

CREATE TABLE IF NOT EXISTS public.qr_design_settings (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   UUID        REFERENCES public.restaurants(id) ON DELETE CASCADE,
  template_id     TEXT        NOT NULL DEFAULT 'emerald_green',
  config          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_qr_design_restaurant UNIQUE (restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_qr_design_restaurant ON public.qr_design_settings (restaurant_id);

ALTER TABLE public.qr_design_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_design_read_all" ON public.qr_design_settings;
CREATE POLICY "qr_design_read_all" ON public.qr_design_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "qr_design_write_auth" ON public.qr_design_settings;
CREATE POLICY "qr_design_write_auth" ON public.qr_design_settings
  FOR ALL USING (true) WITH CHECK (true);
