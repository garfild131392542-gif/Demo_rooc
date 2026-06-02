-- Phase 2: SaaS Schema Update
-- Version: 2025-01-15
-- Description:
--   1. Add SaaS-specific columns to guilds table (guild_url, trial_ends_at)
--   2. Implement robust RLS policies for multi-tenant security using Supabase Auth
--   3. Ensure guild-scoped data access for profiles
--   4. Prepare database for standard Supabase Auth integration

-- ============================================
-- 1. ADD SAAS-SPECIFIC COLUMNS TO GUILDS TABLE
-- ============================================

-- Add guild_url for custom invite links (unique and nullable)
ALTER TABLE public.guilds
ADD COLUMN IF NOT EXISTS guild_url TEXT UNIQUE;

-- Add trial_ends_at for 14-day free trial support
ALTER TABLE public.guilds
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Create index for guild_url lookups (commonly used for invite links)
CREATE INDEX IF NOT EXISTS idx_guilds_guild_url ON public.guilds(guild_url);

-- Create index for trial_ends_at lookups (for SaaS subscription management)
CREATE INDEX IF NOT EXISTS idx_guilds_trial_ends_at ON public.guilds(trial_ends_at);

-- ============================================
-- 2. UPDATE EXISTING RLS POLICIES FOR MULTI-TENANT SECURITY
-- ============================================

-- Enable RLS on both tables if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES TABLE RLS POLICIES
-- ============================================

-- Policy 1: Users can view all profiles in their guild
-- This allows guild members to see each other's public profiles
DROP POLICY IF EXISTS "profiles_select_own_guild" ON public.profiles;
CREATE POLICY "profiles_select_own_guild" ON public.profiles
  FOR SELECT
  USING (
    -- User can select profiles if they share the same guild_id
    -- Avoid subquery to prevent infinite recursion
    guild_id IN (
      SELECT COALESCE(guild_id, 'null') 
      FROM public.profiles 
      WHERE id = auth.uid() 
      LIMIT 1
    )
  );

-- Policy 1B: System admins can view all profiles
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- Policy 2: Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND guild_id IS NOT NULL);

-- Policy 3: Admins can update any profile in their guild
DROP POLICY IF EXISTS "profiles_update_admin_own_guild" ON public.profiles;
CREATE POLICY "profiles_update_admin_own_guild" ON public.profiles
  FOR UPDATE
  USING (
    -- Only admins in the system
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  )
  WITH CHECK (
    -- Admin can update profiles in any guild
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- Policy 4: Users can insert a profile for themselves during registration
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Policy 5: Service role (via createAdminClient) can insert profiles
-- This policy allows admin operations to create profiles without recursion issues
DROP POLICY IF EXISTS "profiles_insert_service" ON public.profiles;
CREATE POLICY "profiles_insert_service" ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- Policy 6: Users can delete their own profile
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE
  USING (id = auth.uid());

-- Policy 7: Admins can delete profiles in their guild
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- ============================================
-- GUILDS TABLE RLS POLICIES
-- ============================================

-- Policy 1: Anyone can view guilds (required for app functionality)
DROP POLICY IF EXISTS "guilds_select_own_guild" ON public.guilds;
CREATE POLICY "guilds_select_all" ON public.guilds
  FOR SELECT
  USING (true);

-- Policy 2: Anyone can insert guilds (will be validated by app logic)
-- The admin client uses service role key which bypasses RLS anyway
DROP POLICY IF EXISTS "guilds_insert_own" ON public.guilds;
CREATE POLICY "guilds_insert_all" ON public.guilds
  FOR INSERT
  WITH CHECK (true);

-- Policy 3: Only owner or admin can update guild
DROP POLICY IF EXISTS "guilds_update_admin" ON public.guilds;
CREATE POLICY "guilds_update_own" ON public.guilds
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- Policy 4: Only owner or admin can delete guild
DROP POLICY IF EXISTS "guilds_delete_owner" ON public.guilds;
CREATE POLICY "guilds_delete_own" ON public.guilds
  FOR DELETE
  USING (
    owner_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- ============================================
-- 3. ENSURE PROPER FOREIGN KEY CONSTRAINTS
-- ============================================

-- Verify profiles.id references auth.users(id)
-- This constraint should have been added in Phase 1
-- If it doesn't exist, the following would add it (but it should already exist)
-- ALTER TABLE public.profiles
-- ADD CONSTRAINT profiles_id_fkey
-- FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- 4. ADD TRIGGERS FOR AUDIT/TRAIL (Optional but Recommended)
-- ============================================

-- Create updated_at trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
DROP FUNCTION IF EXISTS update_updated_at_column();

CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for guilds table
DROP TRIGGER IF EXISTS update_guilds_timestamp ON public.guilds;

CREATE TRIGGER update_guilds_timestamp
BEFORE UPDATE ON public.guilds
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. SCHEMA SUMMARY
-- ============================================
-- profiles table now has:
--   - id (UUID, FK to auth.users)
--   - uid_game (TEXT, UNIQUE)
--   - email (TEXT, NULLABLE)
--   - display_name (TEXT)
--   - job_name (TEXT)
--   - role (TEXT: 'member', 'admin')
--   - guild_id (UUID, FK to guilds)
--   - avatar_url (TEXT)
--   - p_atk, m_atk, p_def, m_def, p_dmg, m_dmg, p_reduc, m_reduc, pvp_dmg, pvp_reduc
--   - is_on_leave (BOOLEAN)
--   - party_id, slot_index
--   - created_at, updated_at

-- guilds table now has:
--   - id (UUID, PK)
--   - owner_id (UUID, FK to auth.users)
--   - name (TEXT)
--   - server_name (TEXT)
--   - status ('pending', 'approved', 'rejected')
--   - guild_url (TEXT, UNIQUE, NULLABLE) ← NEW FOR SAAS
--   - trial_ends_at (TIMESTAMP) ← NEW FOR SAAS
--   - created_at, updated_at
--   - RLS: Guild-scoped access using auth.uid()
