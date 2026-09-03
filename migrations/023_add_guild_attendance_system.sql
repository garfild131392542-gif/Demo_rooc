-- Migration: 023_add_guild_attendance_system.sql
-- Description:
--   1. Create public.guild_attendance_logs table for recording guild event attendance logs
--   2. Setup performance indexes on guild_id and date
--   3. Enable RLS and setup policies for guild members and admins

-- ============================================
-- 1. CREATE GUILD ATTENDANCE LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.guild_attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,                                       -- เช่น "Guild League นัดสำคัญ", "เช็คชื่อวอร์ประจำสัปดาห์"
    date DATE NOT NULL DEFAULT CURRENT_DATE,                   -- วันที่จัดกิจกรรม (YYYY-MM-DD)
    activity_type TEXT NOT NULL DEFAULT 'guild_league',        -- 'guild_league' | 'general' | 'emperium_overrun' | 'other'
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_name TEXT,                                      -- ชื่อแอดมินหรือหัวกิลด์ผู้บันทึก (Snapshot)
    total_members INT NOT NULL DEFAULT 0,
    present_count INT NOT NULL DEFAULT 0,
    absent_count INT NOT NULL DEFAULT 0,
    leave_count INT NOT NULL DEFAULT 0,
    note TEXT,                                                 -- บันทึกหรือหมายเหตุรวม
    records JSONB NOT NULL DEFAULT '[]'::jsonb,                -- Array ของสมาชิกและสถานะการเช็คชื่อ ณ วันนั้น
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for speedy lookups by guild and date
CREATE INDEX IF NOT EXISTS idx_attendance_guild_date 
ON public.guild_attendance_logs(guild_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_created_at 
ON public.guild_attendance_logs(created_at DESC);

-- ============================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE public.guild_attendance_logs ENABLE ROW LEVEL SECURITY;

-- 2.1 Members can view their guild's attendance logs
DROP POLICY IF EXISTS "Guild members can view attendance logs" ON public.guild_attendance_logs;
CREATE POLICY "Guild members can view attendance logs" ON public.guild_attendance_logs
    FOR SELECT USING (
        guild_id IN (
            SELECT guild_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2.2 Guild admins can manage (insert/update/delete) their guild's attendance logs
DROP POLICY IF EXISTS "Guild admins can insert attendance logs" ON public.guild_attendance_logs;
CREATE POLICY "Guild admins can insert attendance logs" ON public.guild_attendance_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
              AND guild_id = public.guild_attendance_logs.guild_id 
              AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Guild admins can update attendance logs" ON public.guild_attendance_logs;
CREATE POLICY "Guild admins can update attendance logs" ON public.guild_attendance_logs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
              AND guild_id = public.guild_attendance_logs.guild_id 
              AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
              AND guild_id = public.guild_attendance_logs.guild_id 
              AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Guild admins can delete attendance logs" ON public.guild_attendance_logs;
CREATE POLICY "Guild admins can delete attendance logs" ON public.guild_attendance_logs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
              AND guild_id = public.guild_attendance_logs.guild_id 
              AND role = 'admin'
        )
    );
