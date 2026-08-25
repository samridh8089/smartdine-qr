SELECT id, name, slug
FROM public.restaurants
WHERE name ILIKE 'RoyalDine%' OR name ILIKE 'Royal Spice%';
