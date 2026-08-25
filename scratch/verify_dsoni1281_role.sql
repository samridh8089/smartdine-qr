SELECT id, user_id, email, full_name, role, restaurant_id
FROM public.profiles
WHERE email ILIKE '%dsoni1281%' OR email ILIKE '%dsoni%';
