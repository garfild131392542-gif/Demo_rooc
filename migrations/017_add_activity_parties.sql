-- Migration: Add Activity-Specific Party Columns to Profiles
-- Version: 017
-- Description: Adds columns to support separate party layouts for General, Guild League, and Emperium Overrun.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS party_id_guild_league INT,
ADD COLUMN IF NOT EXISTS slot_index_guild_league INT,
ADD COLUMN IF NOT EXISTS party_id_emperium_overrun INT,
ADD COLUMN IF NOT EXISTS slot_index_emperium_overrun INT;
