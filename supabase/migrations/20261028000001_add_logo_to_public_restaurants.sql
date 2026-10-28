-- ==============================================================================
-- Migration: 20261028000001_add_logo_to_public_restaurants.sql
-- Purpose:
-- 1. Include logo_url in public.public_restaurants view for customer menu branding
-- 2. Include require_customer_name in public_restaurants settings
-- ==============================================================================

CREATE OR REPLACE VIEW public.public_restaurants AS
SELECT 
  r.id,
  r.name,
  r.slug,
  r.logo_url,
  r.address,
  r.phone,
  r.subscription_plan,
  r.created_at,
  jsonb_build_object(
    'currency', COALESCE(r.settings->>'currency', 'INR'),
    'timezone', COALESCE(r.settings->>'timezone', 'Asia/Kolkata'),
    'theme_color', r.settings->>'theme_color',
    'restaurant_type', r.settings->>'restaurant_type',
    'gst_enabled', COALESCE((r.settings->>'gst_enabled')::boolean, false),
    'gst_percentage', (r.settings->>'gst_percentage')::numeric,
    'cgst_percentage', (r.settings->>'cgst_percentage')::numeric,
    'sgst_percentage', (r.settings->>'sgst_percentage')::numeric,
    'service_charge_enabled', COALESCE((r.settings->>'service_charge_enabled')::boolean, false),
    'service_charge_percentage', (r.settings->>'service_charge_percentage')::numeric,
    'takeaway_enabled', COALESCE((r.settings->>'takeaway_enabled')::boolean, true),
    'require_customer_name', COALESCE((r.settings->>'require_customer_name')::boolean, false),
    'geofence', r.settings->'geofence',
    'offers', COALESCE(r.settings->'offers', '[]'::jsonb),
    'upi_id', r.settings->>'upi_id',
    'upi_name', r.settings->>'upi_name',
    'payment_qr', r.settings->>'payment_qr',
    'payment_enabled', COALESCE((r.settings->>'payment_enabled')::boolean, true),
    'qr_design', r.settings->'qr_design',
    'min_margin_threshold', (r.settings->>'min_margin_threshold')::numeric
  ) AS settings
FROM public.restaurants r;

GRANT SELECT ON public.public_restaurants TO anon, authenticated, service_role;
