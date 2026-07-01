-- Migrations 015: Add CP (Character Power) stat column to profiles table

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cp INTEGER DEFAULT 0;

COMMENT ON COLUMN public.profiles.cp IS 'Character Power (CP) of the member';
