SELECT id, email, created_at
FROM auth.users
WHERE email ILIKE '%dsoni1281%' OR email ILIKE '%dsoni%';

SELECT id, user_id, restaurant_id, email, full_name, role
FROM public.profiles
WHERE email ILIKE '%dsoni1281%' OR email ILIKE '%dsoni%';

SELECT id, name, slug, owner_id, subscription_plan, subscription_status
FROM public.restaurants
WHERE owner_id IN (
  SELECT id FROM auth.users WHERE email ILIKE '%dsoni1281%' OR email ILIKE '%dsoni%'
) OR id IN (
  SELECT restaurant_id FROM public.profiles WHERE email ILIKE '%dsoni1281%' OR email ILIKE '%dsoni%'
);
