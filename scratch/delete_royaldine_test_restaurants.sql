-- SQL Script: delete_royaldine_test_restaurants.sql
-- Cascade delete all "RoyalDine%" and "Royal Spice%" test restaurants and set profiles.restaurant_id = NULL

DO $$
DECLARE
    r_record RECORD;
BEGIN
    FOR r_record IN (SELECT id, name, slug FROM public.restaurants WHERE name ILIKE 'RoyalDine%' OR name ILIKE 'Royal Spice%' OR slug ILIKE 'royaldine%') LOOP
        RAISE NOTICE 'Deleting test restaurant: % (Slug: %, ID: %)', r_record.name, r_record.slug, r_record.id;

        -- 1. Unlink profiles
        UPDATE public.profiles 
        SET restaurant_id = NULL 
        WHERE restaurant_id = r_record.id;

        -- 2. Delete dependent records
        DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE restaurant_id = r_record.id);
        DELETE FROM public.orders WHERE restaurant_id = r_record.id;
        DELETE FROM public.menu_items WHERE restaurant_id = r_record.id;
        DELETE FROM public.categories WHERE restaurant_id = r_record.id;
        DELETE FROM public.tables WHERE restaurant_id = r_record.id;

        -- 3. Delete restaurant
        DELETE FROM public.restaurants WHERE id = r_record.id;
    END LOOP;
END $$;

-- Return Exact Verification Query Output Requested by User
SELECT id, name, slug
FROM public.restaurants
WHERE name ILIKE 'RoyalDine%' OR name ILIKE 'Royal Spice%';
