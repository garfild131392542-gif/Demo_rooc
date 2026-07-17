-- Migration: 019_add_update_ticker_setting.sql
-- Description: Create public.system_settings table to store global configurations (like the Update Ticker text) and seed initial data.

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can read settings
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;
CREATE POLICY "Anyone can view system settings" ON public.system_settings
    FOR SELECT USING (true);

-- 2. Only Super Admins can insert/update/delete
DROP POLICY IF EXISTS "Super Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Super Admins can manage system settings" ON public.system_settings
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- Seed initial scrolling ticker text
INSERT INTO public.system_settings (key, value)
VALUES (
    'update_ticker',
    '{"text": "📢 อัปเดตใหม่ล่าสุด: ปรับลดราคาแพ็กเกจเป็น 259 บาท/30 วัน | เปิดให้ใช้งานระบบจัดทีมปาร์ตี้ หน้าข้อมูลส่วนตัว และบอร์ดกิลด์ฟรี! (จำกัดสิทธิ์เฉพาะส่วนการประมูลหากยังไม่ได้ชำระเงิน) | เชื่อมต่อบอต Discord ได้ปกติแล้ววันนี้!", "is_visible": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
