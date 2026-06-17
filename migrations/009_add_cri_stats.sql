-- Migration: Add Cri and Cri Dam Stats to Profiles
-- Version: 009
-- Description: Add cri and cri_dmg columns to public.profiles table.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cri DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS cri_dmg DOUBLE PRECISION;
