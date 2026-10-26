-- ==============================================================================
-- Migration: 20261026000002_close_public_rls.sql
-- Purpose:
-- 1. Remove anon SELECT USING (true) policies on orders, order_items, order_batches.
-- 2. Add orders.tracking_token (random, unique) and get_order_tracking RPC.
-- 3. Remove anon SELECT USING (true) and INSERT WITH CHECK (true) on restaurants.
-- 4. Create public_restaurants view with only safe customer-facing columns.
-- 5. Scope table_merge_* and qr_design_settings policies to authenticated staff.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ORDERS, ORDER_ITEMS, ORDER_BATCHES: CLOSE PUBLIC SELECT POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public to read their specific order by ID" ON public.orders;
DROP POLICY IF EXISTS "Allow public to read order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public select access to order_batches" ON public.order_batches;

-- ------------------------------------------------------------------------------
-- 2. ADD TRACKING TOKEN & CREATE SECURE get_order_tracking RPC
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex');

-- Backfill any existing rows
UPDATE public.orders 
SET tracking_token = encode(gen_random_bytes(16), 'hex') 
WHERE tracking_token IS NULL;

-- Enforce unique index on tracking_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tracking_token 
ON public.orders (tracking_token) 
WHERE tracking_token IS NOT NULL;

-- Secure RPC for anonymous customer order tracking
CREATE OR REPLACE FUNCTION public.get_order_tracking(p_order_id UUID, p_token TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_batches JSONB;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Fetch the order row
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Authorization check:
  -- 1. Matches tracking_token
  -- 2. OR caller is authenticated staff/owner of this restaurant
  -- 3. OR caller is service_role
  IF p_token IS NOT NULL AND v_order.tracking_token IS NOT NULL AND p_token = v_order.tracking_token THEN
    v_is_authorized := TRUE;
  ELSIF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND (restaurant_id = v_order.restaurant_id OR role = 'super_admin')
  ) THEN
    v_is_authorized := TRUE;
  ELSIF current_user = 'service_role' THEN
    v_is_authorized := TRUE;
  ELSIF p_token IS NULL AND v_order.tracking_token IS NULL THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN NULL;
  END IF;

  -- Safe order items
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', oi.id,
    'order_id', oi.order_id,
    'batch_id', oi.batch_id,
    'menu_item_id', oi.menu_item_id,
    'menu_item_name', oi.menu_item_name,
    'variant_id', oi.variant_id,
    'variant_name', oi.variant_name,
    'quantity', oi.quantity,
    'price', oi.price,
    'notes', oi.notes,
    'status', oi.status,
    'is_cancelled', oi.is_cancelled,
    'is_served', oi.is_served
  )), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;

  -- Safe order batches
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ob.id,
    'order_id', ob.order_id,
    'batch_number', ob.batch_number,
    'status', ob.status,
    'special_instructions', ob.special_instructions,
    'created_at', ob.created_at
  )), '[]'::jsonb)
  INTO v_batches
  FROM public.order_batches ob
  WHERE ob.order_id = p_order_id;

  -- Safe customer-facing order payload
  RETURN jsonb_build_object(
    'id', v_order.id,
    'restaurant_id', v_order.restaurant_id,
    'table_id', v_order.table_id,
    'table_name', v_order.table_name,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'payment_method', v_order.payment_method,
    'subtotal', v_order.subtotal,
    'tax', v_order.tax,
    'service_charge', v_order.service_charge,
    'discount_amount', v_order.discount_amount,
    'total', v_order.total,
    'order_type', v_order.order_type,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'customer_arrival_minutes', v_order.customer_arrival_minutes,
    'special_instructions', v_order.special_instructions,
    'takeaway_notes', v_order.takeaway_notes,
    'tracking_token', v_order.tracking_token,
    'order_items', v_items,
    'order_batches', v_batches
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_tracking(UUID, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. RESTAURANTS: REMOVE PUBLIC SELECT & INSERT POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public to read restaurants (for customer menu)" ON public.restaurants;
DROP POLICY IF EXISTS "Allow public to insert restaurants" ON public.restaurants;

-- ------------------------------------------------------------------------------
-- 4. CREATE public_restaurants VIEW (SAFE CUSTOMER-FACING COLUMNS ONLY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_restaurants AS
SELECT 
  r.id,
  r.name,
  r.slug,
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

-- ------------------------------------------------------------------------------
-- 5. SCOPE MERGE TABLES & QR DESIGN TO AUTHENTICATED RESTAURANT STAFF
-- ------------------------------------------------------------------------------
-- 5.1 table_merge_groups
ALTER TABLE public.table_merge_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read/write table_merge_groups" ON public.table_merge_groups;
DROP POLICY IF EXISTS "staff_table_merge_groups_policy" ON public.table_merge_groups;

CREATE POLICY "staff_table_merge_groups_policy" ON public.table_merge_groups
FOR ALL TO authenticated
USING (
  restaurant_id IN (
    SELECT p.restaurant_id FROM public.profiles p 
    WHERE p.id = auth.uid() AND (p.restaurant_id IS NOT NULL OR p.role = 'super_admin')
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT p.restaurant_id FROM public.profiles p 
    WHERE p.id = auth.uid() AND (p.restaurant_id IS NOT NULL OR p.role = 'super_admin')
  )
);

-- 5.2 table_merge_members
ALTER TABLE public.table_merge_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read/write table_merge_members" ON public.table_merge_members;
DROP POLICY IF EXISTS "staff_table_merge_members_policy" ON public.table_merge_members;

CREATE POLICY "staff_table_merge_members_policy" ON public.table_merge_members
FOR ALL TO authenticated
USING (
  merge_group_id IN (
    SELECT g.id FROM public.table_merge_groups g
    JOIN public.profiles p ON p.restaurant_id = g.restaurant_id OR p.role = 'super_admin'
    WHERE p.id = auth.uid()
  )
);

-- 5.3 table_merge_sessions
ALTER TABLE public.table_merge_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read/write table_merge_sessions" ON public.table_merge_sessions;
DROP POLICY IF EXISTS "staff_table_merge_sessions_policy" ON public.table_merge_sessions;

CREATE POLICY "staff_table_merge_sessions_policy" ON public.table_merge_sessions
FOR ALL TO authenticated
USING (
  restaurant_id IN (
    SELECT p.restaurant_id FROM public.profiles p 
    WHERE p.id = auth.uid() AND (p.restaurant_id IS NOT NULL OR p.role = 'super_admin')
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT p.restaurant_id FROM public.profiles p 
    WHERE p.id = auth.uid() AND (p.restaurant_id IS NOT NULL OR p.role = 'super_admin')
  )
);

-- 5.4 table_merge_session_members
ALTER TABLE public.table_merge_session_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read/write table_merge_session_members" ON public.table_merge_session_members;
DROP POLICY IF EXISTS "staff_table_merge_session_members_policy" ON public.table_merge_session_members;

CREATE POLICY "staff_table_merge_session_members_policy" ON public.table_merge_session_members
FOR ALL TO authenticated
USING (
  session_id IN (
    SELECT s.id FROM public.table_merge_sessions s
    JOIN public.profiles p ON p.restaurant_id = s.restaurant_id OR p.role = 'super_admin'
    WHERE p.id = auth.uid()
  )
);

-- 5.5 qr_design_settings
ALTER TABLE public.qr_design_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qr_design_read_all" ON public.qr_design_settings;
DROP POLICY IF EXISTS "qr_design_write_auth" ON public.qr_design_settings;
DROP POLICY IF EXISTS "staff_qr_design_policy" ON public.qr_design_settings;

CREATE POLICY "staff_qr_design_policy" ON public.qr_design_settings
FOR ALL TO authenticated
USING (
  restaurant_id IN (
    SELECT p.restaurant_id FROM public.profiles p 
    WHERE p.id = auth.uid() AND (p.restaurant_id IS NOT NULL OR p.role = 'super_admin')
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT p.restaurant_id FROM public.profiles p 
    WHERE p.id = auth.uid() AND (p.restaurant_id IS NOT NULL OR p.role = 'super_admin')
  )
);
