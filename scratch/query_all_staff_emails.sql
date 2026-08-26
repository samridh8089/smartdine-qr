SELECT id, email, email_confirmed_at, confirmation_sent_at, created_at
FROM auth.users
WHERE email ILIKE '%deepak%' OR email ILIKE '%soni%' OR email ILIKE '%9492%';

SELECT id, user_id, restaurant_id, role, full_name, email, created_at
FROM public.profiles
WHERE email ILIKE '%deepak%' OR email ILIKE '%soni%' OR email ILIKE '%9492%';
