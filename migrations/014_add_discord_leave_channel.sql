-- Migration: Add Discord Leave Channel ID to Guilds Table
-- Version: 2026-06-19
-- Description: Adds a column for storing the Discord channel ID used for member leave notifications/actions.

ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS discord_leave_channel_id TEXT;
