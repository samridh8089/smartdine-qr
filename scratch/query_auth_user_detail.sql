SELECT id, email, email_confirmed_at, confirmation_sent_at, created_at, raw_user_meta_data
FROM auth.users
WHERE id = '2f7c1518-8d20-4d58-920c-824f54749f65' OR email ILIKE '%deepak%';
