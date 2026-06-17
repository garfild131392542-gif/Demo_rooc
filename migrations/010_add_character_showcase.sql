-- Add character_showcase_url to profiles table to support character image showcases in Hall of Fame
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS character_showcase_url TEXT;
