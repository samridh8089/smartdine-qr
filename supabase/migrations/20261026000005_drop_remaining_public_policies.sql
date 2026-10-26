-- Migration: 20261026000005_drop_remaining_public_policies.sql
-- Description: Drop all remaining public/anon SELECT and INSERT policies on orders, order_batches, and order_items.
-- Enforces that order creation must strictly flow through the authenticated server API route.

-- 1. Explicitly drop known remaining public read & insert policies
DROP POLICY IF EXISTS "Allow public to read order_batches" ON public.order_batches;
DROP POLICY IF EXISTS "Allow public select access to order_batches" ON public.order_batches;
DROP POLICY IF EXISTS "Allow public to insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public to insert order_batches" ON public.order_batches;
DROP POLICY IF EXISTS "Allow public to insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public to read order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public to read their specific order by ID" ON public.orders;
DROP POLICY IF EXISTS "Allow public to update payment status" ON public.orders;
DROP POLICY IF EXISTS "Allow public to insert restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Allow public to read restaurants (for customer menu)" ON public.restaurants;

-- 2. Comprehensive dynamic cleanup DO block:
-- Inspects pg_policies and drops ANY remaining policy on orders, order_items, order_batches, or restaurants
-- that grants access to public/anon with unrestricted qualification (qual = 'true' or with_check = 'true' or public in name)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('orders', 'order_items', 'order_batches', 'restaurants')
      AND (
        roles && ARRAY['anon'::name, 'public'::name]
        OR roles IS NULL
      )
      AND (
        qual = 'true' 
        OR with_check = 'true'
        OR policyname ILIKE '%public%'
        OR policyname ILIKE '%anon%'
      )
      -- Guardrail: Strictly preserve internal staff and owner policies
      AND policyname NOT ILIKE '%staff%'
      AND policyname NOT ILIKE '%owner%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Dropped public policy % on table %.%', r.policyname, r.schemaname, r.tablename;
  END LOOP;
END $$;
