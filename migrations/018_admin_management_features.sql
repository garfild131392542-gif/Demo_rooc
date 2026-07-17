-- Migration: 018_admin_management_features.sql
-- Description:
--   1. Add plan_type to public.guilds table
--   2. Create public.announcements table to store dynamic announcements
--   3. Create public.announcement_guilds junction table for targeting specific guilds
--   4. Enable RLS on new tables and setup policies
--   5. Seed the initial global announcement

-- ============================================
-- 1. ADD PLAN_TYPE AND SERVER_NAME COLUMNS TO GUILDS TABLE
-- ============================================
ALTER TABLE public.guilds
ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS server_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guilds_plan_type ON public.guilds(plan_type);
CREATE INDEX IF NOT EXISTS idx_guilds_server_name ON public.guilds(server_name);

-- ============================================
-- 2. CREATE ANNOUNCEMENTS TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    footer TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.announcement_guilds (
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
    guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
    PRIMARY KEY (announcement_id, guild_id)
);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_guilds ENABLE ROW LEVEL SECURITY;

-- 3.1 announcements policies
-- Anyone can select active announcements
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements" ON public.announcements
    FOR SELECT USING (true);

-- Only Super Admins can insert/update/delete
DROP POLICY IF EXISTS "Super Admins can manage announcements" ON public.announcements;
CREATE POLICY "Super Admins can manage announcements" ON public.announcements
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 3.2 announcement_guilds policies
-- Anyone can select target guilds
DROP POLICY IF EXISTS "Anyone can view announcement targets" ON public.announcement_guilds;
CREATE POLICY "Anyone can view announcement targets" ON public.announcement_guilds
    FOR SELECT USING (true);

-- Only Super Admins can insert/update/delete
DROP POLICY IF EXISTS "Super Admins can manage announcement targets" ON public.announcement_guilds;
CREATE POLICY "Super Admins can manage announcement targets" ON public.announcement_guilds
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- ============================================
-- 4. SEED INITIAL ANNOUNCEMENT DATA
-- ============================================
-- Seeding the default announcement so the DB is populated immediately.
-- Using a static UUID so it can be re-run safely.
INSERT INTO public.announcements (id, title, subtitle, items, footer, is_active)
VALUES (
    '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    '📢 อัปเดตระบบล่าสุด',
    'มีการปรับปรุงและเพิ่มฟีเจอร์ใหม่ กรุณาอ่านรายละเอียดด้านล่าง',
    '[{"icon": "🤖", "label": "เชื่อมต่อบอท Discord ได้แล้ว!", "detail": "สามารถเชิญบอทเข้าเซิร์ฟเวอร์ Discord และตั้งค่า Channel ID ได้จากหน้า \"ตั้งค่าบอท\" ใน Guild Settings — ดูวิดีโอสอนตั้งค่าด้านล่างได้เลย", "color": "blue", "youtubeUrl": "https://youtu.be/Lo3N6FFQD0M?si=fV3CLspigDaLTUxa"}]'::jsonb,
    'ขอบคุณที่ใช้งานระบบครับ 🙏',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Associate this default announcement with all existing guilds by default
INSERT INTO public.announcement_guilds (announcement_id, guild_id)
SELECT '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', id
FROM public.guilds
ON CONFLICT DO NOTHING;
