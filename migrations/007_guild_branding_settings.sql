-- Migration: Add Guild Branding and Webhook Settings
-- Version: 007
-- Description: Add logo_url, primary_color, and discord_webhook_url columns to public.guilds table.

ALTER TABLE public.guilds
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;
