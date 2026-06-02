-- Migration: Guild Approval System with Admin Authorization and RLS Policies
-- Version: 2025-01-01
-- Description: 
--   1. Create 'admins' table for admin authorization
--   2. Update 'guilds' table with approval workflow columns
--   3. Add RLS policies for secure admin access
--   4. Add RLS policies for guild status management

-- ============================================
-- 1. CREATE ADMINS TABLE
-- ============================================
-- สร้างตารางสำหรับเก็บรายชื่อแอดมินในระบบ

CREATE TABLE IF NOT EXISTS public.admins (
  -- Note: this system uses `profiles` for user identities (username-only auth).
  -- Use `profiles.id` for admin membership rather than `auth.users` which ties to Supabase Auth.
  id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  display_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. UPDATE GUILDS TABLE
-- ============================================
-- เพิ่มคอลัมน์สำหรับระบบอนุมัติกิลด์

-- Check if columns exist before adding them
ALTER TABLE public.guilds
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'suspended'));

ALTER TABLE public.guilds
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.guilds
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.guilds
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================================
-- 3. ENABLE RLS ON ADMINS TABLE
-- ============================================

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can view all admins
-- Helper: effective_user resolves either the app-set current_user (for cookie sessions)
-- or falls back to auth.uid() (for Supabase JWT-based auth).
-- Use: (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid

CREATE POLICY IF NOT EXISTS "admins_can_view_all_admins"
ON public.admins
FOR SELECT
USING (
  (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid IN (
    SELECT id FROM public.admins
  )
);

-- Policy 2: Super admins can insert new admins
CREATE POLICY IF NOT EXISTS "super_admins_can_insert_admins"
ON public.admins
FOR INSERT
WITH CHECK (
  (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid IN (
    SELECT id FROM public.admins WHERE role = 'super_admin'
  )
);

-- Policy 3: Admins can update their own profile
CREATE POLICY IF NOT EXISTS "admins_can_update_own_profile"
ON public.admins
FOR UPDATE
USING ((COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid = id)
WITH CHECK ((COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid = id);

-- Policy 4: Admins can delete from admins table (super admins only)
CREATE POLICY IF NOT EXISTS "super_admins_can_delete_admins"
ON public.admins
FOR DELETE
USING (
  (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid IN (
    SELECT id FROM public.admins WHERE role = 'super_admin'
  )
);

-- ============================================
-- 4. UPDATE RLS POLICIES ON PROFILES TABLE
-- ============================================

ALTER TABLE public.profiles ALTER COLUMN guild_id DROP NOT NULL;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "profiles_select_self_or_admin"
ON public.profiles
FOR SELECT
USING (
  (
    (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid = id
  ) OR (
    (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid IN (SELECT id FROM public.admins)
  )
);

CREATE POLICY IF NOT EXISTS "profiles_insert_self"
ON public.profiles
FOR INSERT
WITH CHECK (
  (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid = id
);

CREATE POLICY IF NOT EXISTS "profiles_update_self_or_admin"
ON public.profiles
FOR UPDATE
USING (
  (
    (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid = id
  ) OR (
    (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid IN (SELECT id FROM public.admins)
  )
)
WITH CHECK (
  (
    (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid = id
  ) OR (
    (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid IN (SELECT id FROM public.admins)
  )
);

-- ============================================
-- 5. UPDATE RLS POLICIES ON GUILDS TABLE
-- ============================================

-- First, enable RLS if not already enabled
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;

-- Policy: Regular users can view only their own guild
CREATE POLICY IF NOT EXISTS "users_can_view_own_guild"
ON public.guilds
FOR SELECT
USING (
  owner_id = (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid OR
  (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid IN (
    SELECT id FROM public.profiles WHERE guild_id = public.guilds.id
  )
);

-- Policy: Admins can view all guilds (especially pending ones)
CREATE POLICY IF NOT EXISTS "admins_can_view_all_guilds"
ON public.guilds
FOR SELECT
USING (
  (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid IN (
    SELECT id FROM public.admins
  )
);

-- Policy: Only guild owners can insert new guilds
CREATE POLICY IF NOT EXISTS "users_can_create_guilds"
ON public.guilds
FOR INSERT
WITH CHECK (
  owner_id = (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid
);

-- Policy: Admins can update guild status (for approval workflow)
CREATE POLICY IF NOT EXISTS "admins_can_update_guild_status"
ON public.guilds
FOR UPDATE
USING (
  (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid IN (
    SELECT id FROM public.admins
  )
)
WITH CHECK (
  (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid IN (
    SELECT id FROM public.admins
  )
);

-- Policy: Guild owners can update their own guild (but not status)
CREATE POLICY IF NOT EXISTS "owners_can_update_own_guild"
ON public.guilds
FOR UPDATE
USING (owner_id = (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid)
WITH CHECK (
  owner_id = (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid AND
  -- Prevent changing status without admin approval
  status = (SELECT status FROM public.guilds WHERE id = public.guilds.id)
);

-- ============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_guilds_status ON public.guilds(status);
CREATE INDEX IF NOT EXISTS idx_guilds_owner_id ON public.guilds(owner_id);
CREATE INDEX IF NOT EXISTS idx_guilds_created_at ON public.guilds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);

-- ============================================
-- 6. INSERT SAMPLE ADMIN (Optional)
-- ============================================
-- หมายเหตุ: ลบคอมเมนต์เพื่อเพิ่ม admin ตัวอย่าง
-- กรุณาแทนที่ uuid และ email ด้วยค่าที่ถูกต้อง

-- INSERT INTO public.admins (id, email, display_name, role)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'admin@example.com',
--   'Admin Name',
--   'super_admin'
-- )
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. CREATE AUDIT TRIGGER FOR GUILDS (Optional)
-- ============================================
-- สร้าง trigger เพื่อบันทึกการเปลี่ยนแปลงของกิลด์

CREATE TABLE IF NOT EXISTS public.guild_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.admins(id),
  action TEXT CHECK (action IN ('approved', 'rejected', 'suspended', 'reactivated')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for audit logs
CREATE INDEX IF NOT EXISTS idx_guild_audit_logs_guild_id ON public.guild_audit_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_audit_logs_admin_id ON public.guild_audit_logs(admin_id);

-- Enable RLS on audit logs
ALTER TABLE public.guild_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY IF NOT EXISTS "admins_can_view_audit_logs"
ON public.guild_audit_logs
FOR SELECT
USING (
  (COALESCE(NULLIF(current_setting('app.current_user', true), ''), auth.uid()))::uuid IN (
    SELECT id FROM public.admins
  )
);

-- ============================================
-- Notes:
-- ============================================
-- 1. เมื่อสร้างกิลด์ใหม่ status ตั้งค่าเป็น 'pending' โดยค่าเริ่มต้น
-- 2. เฉพาะแอดมินเท่านั้นที่สามารถเปลี่ยน status เป็น 'active' หรือ 'rejected'
-- 3. ตารางแอดมิน (admins) ใช้สำหรับตรวจสอบสิทธิ์ที่ละเอียดยิ่งขึ้น
-- 4. ส่วนความปลอดภัยหลักยังคงอาศัยบน middleware ที่ตรวจสอบ session.role
-- 5. RLS policy ทำหน้าที่เป็นชั้นป้องกันที่สอง
