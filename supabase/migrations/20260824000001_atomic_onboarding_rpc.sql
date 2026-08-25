-- Migration: 20260824000001_atomic_onboarding_rpc.sql
-- Description: Atomic, Idempotent Restaurant Provisioning & Profile Linking RPC
-- Strict profiles.user_id = auth.uid() & restaurants.owner_id = auth.uid() mapping without legacy fallbacks.

-- 1. Ensure owner_id column exists on restaurants table referencing auth.users(id) directly
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'restaurants' 
          AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE public.restaurants ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Drop legacy foreign key to profiles if present, and re-add pointing directly to auth.users(id)
    ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_owner_id_fkey;
    ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

    -- Add UNIQUE constraint on owner_id if not present
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'UNIQUE' 
          AND table_schema = 'public'
          AND table_name = 'restaurants' 
          AND constraint_name = 'unique_owner'
    ) THEN
        ALTER TABLE public.restaurants ADD CONSTRAINT unique_owner UNIQUE (owner_id);
    END IF;

    -- Ensure profiles.user_id column exists referencing auth.users(id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id);
        UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON public.restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 2. Strict RLS Policy for Owners using user_id = auth.uid() & owner_id = auth.uid() (Strictly No Legacy Fallback)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their restaurant" ON public.restaurants;
CREATE POLICY "Owners manage their restaurant" 
ON public.restaurants 
FOR ALL 
TO authenticated 
USING (
    auth.uid() = owner_id 
    OR id IN (SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid())
);

-- 3. Audit and update handle_new_user Auth Trigger to set both id & user_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, user_id, email, full_name, role, restaurant_id, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'fullName', NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'owner'),
        NULL,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        email = EXCLUDED.email,
        full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
        updated_at = now();

    RETURN NEW;
END;
$$;

-- 4. Create Idempotent Atomic RPC: create_restaurant_and_link
CREATE OR REPLACE FUNCTION public.create_restaurant_and_link(
    p_owner_id UUID,
    p_owner_email TEXT,
    p_owner_name TEXT,
    p_owner_phone TEXT,
    p_restaurant_name TEXT,
    p_slug TEXT,
    p_address TEXT DEFAULT '',
    p_subscription_plan TEXT DEFAULT 'pro',
    p_billing_interval TEXT DEFAULT 'monthly',
    p_settings JSONB DEFAULT '{}'::jsonb,
    p_trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rest_id UUID;
    v_clean_slug TEXT;
    v_existing_rest RECORD;
    v_i INT;
BEGIN
    IF p_owner_id IS NULL THEN
        RAISE EXCEPTION 'p_owner_id is required';
    END IF;

    -- Ensure owner profile exists in profiles table with user_id = p_owner_id
    INSERT INTO public.profiles (id, user_id, email, full_name, role, restaurant_id, created_at, updated_at)
    VALUES (p_owner_id, p_owner_id, COALESCE(p_owner_email, ''), COALESCE(p_owner_name, ''), 'owner', NULL, now(), now())
    ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        email = COALESCE(EXCLUDED.email, profiles.email),
        full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;

    -- 1. Idempotency Check: Look for existing restaurant linked to this owner
    SELECT * INTO v_existing_rest
    FROM public.restaurants
    WHERE owner_id = p_owner_id
       OR id = (SELECT restaurant_id FROM public.profiles WHERE user_id = p_owner_id LIMIT 1)
       OR settings->>'owner_email' = lower(trim(p_owner_email))
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_rest.id IS NOT NULL THEN
        v_rest_id := v_existing_rest.id;

        -- Update existing restaurant owner_id (referencing auth.users.id) & settings if missing
        UPDATE public.restaurants
        SET owner_id = p_owner_id,
            subscription_plan = COALESCE(p_subscription_plan, subscription_plan),
            subscription_status = 'active',
            updated_at = now()
        WHERE id = v_rest_id;

        -- Atomically link profile
        UPDATE public.profiles
        SET restaurant_id = v_rest_id,
            role = 'owner',
            user_id = p_owner_id,
            updated_at = now()
        WHERE user_id = p_owner_id OR id = p_owner_id;

        RETURN jsonb_build_object(
            'success', true,
            'restaurant_id', v_rest_id,
            'already_existed', true,
            'message', 'Existing restaurant profile linked successfully'
        );
    END IF;

    -- 2. Ensure Slug Uniqueness
    v_clean_slug := lower(regexp_replace(COALESCE(p_slug, p_restaurant_name), '[^a-zA-Z0-9]', '', 'g'));
    IF v_clean_slug IS NULL OR v_clean_slug = '' THEN
        v_clean_slug := 'rest' || floor(extract(epoch from now()));
    END IF;

    IF EXISTS (SELECT 1 FROM public.restaurants WHERE slug = v_clean_slug) THEN
        v_clean_slug := v_clean_slug || floor(100 + random() * 900)::text;
    END IF;

    -- 3. Insert New Restaurant with owner_id = p_owner_id (auth.users.id)
    INSERT INTO public.restaurants (
        owner_id,
        name,
        slug,
        phone,
        address,
        subscription_plan,
        subscription_status,
        billing_interval,
        trial_ends_at,
        settings,
        created_at,
        updated_at
    ) VALUES (
        p_owner_id,
        trim(p_restaurant_name),
        v_clean_slug,
        trim(p_owner_phone),
        COALESCE(p_address, 'India'),
        COALESCE(p_subscription_plan, 'pro'),
        'active',
        COALESCE(p_billing_interval, 'monthly'),
        COALESCE(p_trial_ends_at, now() + interval '30 days'),
        p_settings,
        now(),
        now()
    )
    RETURNING id INTO v_rest_id;

    -- 4. Atomically Link Owner Profile inside same transaction
    UPDATE public.profiles
    SET restaurant_id = v_rest_id,
        role = 'owner',
        user_id = p_owner_id,
        updated_at = now()
    WHERE user_id = p_owner_id OR id = p_owner_id;

    -- 5. Provision Default Tables 1 to 10
    FOR v_i IN 1..10 LOOP
        INSERT INTO public.tables (restaurant_id, name)
        VALUES (v_rest_id, 'Table ' || v_i)
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'restaurant_id', v_rest_id,
        'already_existed', false,
        'message', 'Restaurant created and owner profile linked atomically'
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.create_restaurant_and_link TO authenticated, service_role, anon;
