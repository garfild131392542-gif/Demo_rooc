-- Migration: 024_add_auction_queue_templates.sql
-- Description: Custom Auction Queue Templates for Guild Leaders
-- Date: 2026-09-16

CREATE TABLE IF NOT EXISTS public.auction_queue_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    member_ids JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of profile UUID strings in custom queue order
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_queue_templates_guild ON public.auction_queue_templates(guild_id);

-- Enable RLS
ALTER TABLE public.auction_queue_templates ENABLE ROW LEVEL SECURITY;

-- Guild members can view queue templates of their guild
CREATE POLICY "Guild members can view auction queue templates"
ON public.auction_queue_templates FOR SELECT
TO authenticated
USING (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Guild admins can insert, update, delete queue templates of their guild
CREATE POLICY "Guild admins can manage auction queue templates"
ON public.auction_queue_templates FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND guild_id = auction_queue_templates.guild_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND guild_id = auction_queue_templates.guild_id
    )
);
