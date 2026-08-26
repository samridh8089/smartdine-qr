-- SQL Script: delete_zero_failure_test_restaurants.sql
DO $$
DECLARE
    r_record RECORD;
BEGIN
    FOR r_record IN (SELECT id, name FROM public.restaurants WHERE name ILIKE 'Zero Failure Cafe%') LOOP
        UPDATE public.profiles SET restaurant_id = NULL WHERE restaurant_id = r_record.id;
        DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE restaurant_id = r_record.id);
        DELETE FROM public.orders WHERE restaurant_id = r_record.id;
        DELETE FROM public.menu_items WHERE restaurant_id = r_record.id;
        DELETE FROM public.categories WHERE restaurant_id = r_record.id;
        DELETE FROM public.tables WHERE restaurant_id = r_record.id;
        DELETE FROM public.restaurants WHERE id = r_record.id;
    END LOOP;
END $$;

SELECT id, name FROM public.restaurants WHERE name ILIKE 'Zero Failure Cafe%';
