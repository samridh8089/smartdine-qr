-- ==============================================================================
-- CleverOps Security Hardening: Phase 3 Plaintext Password Sanitization
-- Drops plain_password column from public.profiles and purges stored plaintext
-- passwords from restaurants.settings.staff_metadata
-- ==============================================================================

-- 1. Drop plain_password column from public.profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS plain_password;

-- 2. Clean plain_password keys from restaurants.settings -> staff_metadata
UPDATE public.restaurants
SET settings = (
  CASE 
    WHEN settings ? 'staff_metadata' AND jsonb_typeof(settings->'staff_metadata') = 'object' THEN
      jsonb_set(
        settings,
        '{staff_metadata}',
        (
          SELECT COALESCE(
            jsonb_object_agg(
              key,
              value - 'plain_password'
            ),
            '{}'::jsonb
          )
          FROM jsonb_each(settings->'staff_metadata')
        )
      )
    ELSE settings
  END
)
WHERE settings ? 'staff_metadata';

-- 3. Verify clean state
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'plain_password';
