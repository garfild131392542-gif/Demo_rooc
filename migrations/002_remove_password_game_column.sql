-- Phase 1: Clean up custom JWT authentication
-- Remove password_game column from profiles table (no longer needed for Supabase Auth)
-- Ensure profiles.id is properly linked to auth.users(id)

-- 1. Drop the password_game column
ALTER TABLE public.profiles DROP COLUMN password_game;

-- 2. Ensure the foreign key relationship between profiles.id and auth.users(id)
-- First, check if a foreign key already exists:
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name='profiles' AND constraint_type='FOREIGN KEY';

-- If no FK exists, add it with ON DELETE CASCADE:
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Note: If the constraint already exists, you may see an error. 
-- In that case, you can safely ignore it or modify the existing constraint.
