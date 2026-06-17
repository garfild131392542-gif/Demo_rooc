-- Migration: Create Storage Bucket for Guild Logos and RLS Policies
-- Version: 008
-- Description: Create 'guild-logos' bucket in storage and configure policies.

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('guild-logos', 'guild-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Setup RLS Policies for the bucket
-- Allow public read access to all files inside 'guild-logos'
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'guild-logos');

-- Allow authenticated users to upload/insert logos
DROP POLICY IF EXISTS "Authenticated Insert Access" ON storage.objects;
CREATE POLICY "Authenticated Insert Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'guild-logos');

-- Allow authenticated users to update their logos
DROP POLICY IF EXISTS "Authenticated Update Access" ON storage.objects;
CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'guild-logos');

-- Allow authenticated users to delete their logos
DROP POLICY IF EXISTS "Authenticated Delete Access" ON storage.objects;
CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'guild-logos');
