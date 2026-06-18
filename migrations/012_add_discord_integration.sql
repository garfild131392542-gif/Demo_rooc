-- Migration: Add Discord Integration to Profiles & Guilds
-- Version: 2026-06-18
-- Description: Adds columns for linking Discord account to profiles and storing bot channel IDs in guilds.

-- 1. Profiles Table Updates
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_user_id TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_link_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_link_expires TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_discord_user_id ON public.profiles(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_link_code ON public.profiles(discord_link_code);

-- 2. Guilds Table Updates
ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS discord_class_channel_id TEXT;
ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS discord_name_channel_id TEXT;
ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS discord_reserve_channel_id TEXT;
