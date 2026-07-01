-- Migration: Add Tactical Plans Table and Storage Bucket
-- Version: 016
-- Description: Creates the tactical_plans table and registers a new storage bucket 'guild-maps' with appropriate RLS policies.

-- 1. Create tactical_plans table
CREATE TABLE IF NOT EXISTS public.tactical_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    map_name TEXT NOT NULL,
    battle_notes TEXT,
    token_positions JSONB NOT NULL DEFAULT '{}'::jsonb,
    drawings JSONB NOT NULL DEFAULT '[]'::jsonb,
    parties_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS for public.tactical_plans
ALTER TABLE public.tactical_plans ENABLE ROW LEVEL SECURITY;

-- 2. Setup RLS Policies for public.tactical_plans
-- Allow all profiles within the same guild to view plans
CREATE POLICY "Select tactical plans in same guild"
ON public.tactical_plans FOR SELECT
USING (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Allow admins of the guild to create/edit/delete plans
CREATE POLICY "Admins can modify tactical plans"
ON public.tactical_plans FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND guild_id = tactical_plans.guild_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND guild_id = tactical_plans.guild_id
    )
);

-- 3. Create public bucket 'guild-maps' in storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('guild-maps', 'guild-maps', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Setup RLS Policies for the storage.objects bucket
-- Allow public read access to all files inside 'guild-maps'
CREATE POLICY "Public Read Access Maps"
ON storage.objects FOR SELECT
USING (bucket_id = 'guild-maps');

-- Allow authenticated users to upload/insert maps
CREATE POLICY "Authenticated Insert Access Maps"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'guild-maps');

-- Allow authenticated users to update their maps
CREATE POLICY "Authenticated Update Access Maps"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'guild-maps');

-- Allow authenticated users to delete their maps
CREATE POLICY "Authenticated Delete Access Maps"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'guild-maps');
