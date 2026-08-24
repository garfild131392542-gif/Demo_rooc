-- Migration: 020_add_auction_rounds_system.sql
-- Description: Guild Auction Round-Robin Rotation System with Quota, Transfers, and Audit Logs
-- Date: 2026-08-24

-- =========================================================================
-- 1. ตารางรอบการประมูลของแต่ละกิลด์ (auction_rounds)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.auction_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL, -- 'Album' | 'Puppet' | 'White' | 'RedBlack'
    round_number INTEGER NOT NULL DEFAULT 1,
    base_quota_per_member INTEGER NOT NULL DEFAULT 1, -- โควตาเป้าหมายต่อคนในรอบนี้
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'archived'
    total_eligible_members INTEGER NOT NULL DEFAULT 0, -- สมาชิกกิลด์จริง ณ ตอนเริ่มรอบ
    completed_members_count INTEGER NOT NULL DEFAULT 0, -- จำนวนคนที่ได้ครบโควตาแล้ว
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_guild_item_round UNIQUE(guild_id, item_name, round_number)
);

CREATE INDEX IF NOT EXISTS idx_auction_rounds_guild_status ON public.auction_rounds(guild_id, item_name, status);

-- =========================================================================
-- 2. ตารางสมาชิกและสถานะโควตารายบุคคลในแต่ละรอบ (auction_round_members)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.auction_round_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.auction_rounds(id) ON DELETE CASCADE,
    guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    base_quota INTEGER NOT NULL DEFAULT 1,
    transferred_in_quota INTEGER NOT NULL DEFAULT 0, -- โควตาที่ได้รับโอนมา (+)
    transferred_out_quota INTEGER NOT NULL DEFAULT 0, -- โควตาที่โอนออกไป (-)
    target_quota INTEGER GENERATED ALWAYS AS (base_quota + transferred_in_quota - transferred_out_quota) STORED, -- โควตาสุทธิ
    received_qty INTEGER NOT NULL DEFAULT 0, -- จำนวนที่ได้รับจริง
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed' | 'skipped' | 'transferred' | 'left_guild'
    queue_order INTEGER NOT NULL DEFAULT 1, -- ลำดับคิว
    note TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_round_member UNIQUE(round_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_round_members_lookup ON public.auction_round_members(round_id, status, queue_order);
CREATE INDEX IF NOT EXISTS idx_round_members_user ON public.auction_round_members(user_id, item_name);

-- =========================================================================
-- 3. ตารางประวัติการโอนสิทธิ์ / ยกสิทธิ์ (auction_round_transfers)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.auction_round_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
    round_id UUID NOT NULL REFERENCES public.auction_rounds(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transfer_qty INTEGER NOT NULL, -- จำนวนชิ้นที่โอน
    transfer_type TEXT NOT NULL DEFAULT 'partial', -- 'full' (ทุกไอเทม) | 'partial' (เฉพาะไอเทมนี้)
    performed_by UUID NOT NULL REFERENCES public.profiles(id), -- ผู้ทำรายการ
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfers_guild ON public.auction_round_transfers(guild_id, round_number, item_name);

-- =========================================================================
-- 4. ตารางบันทึก Audit Log ครบวงจร (auction_round_logs)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.auction_round_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
    round_id UUID REFERENCES public.auction_rounds(id) ON DELETE SET NULL,
    round_number INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'AWARD' | 'TRANSFER' | 'SWAP' | 'SKIP' | 'ROLLOVER' | 'MANUAL_OVERRIDE' | 'ROUND_START' | 'ROUND_CLOSE'
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    related_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    qty INTEGER DEFAULT 1,
    performed_by UUID NOT NULL REFERENCES public.profiles(id),
    details JSONB DEFAULT '{}'::jsonb,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_round_logs_guild ON public.auction_round_logs(guild_id, round_number, item_name);

-- =========================================================================
-- 5. Row Level Security (RLS) Policies
-- =========================================================================
ALTER TABLE public.auction_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_round_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_round_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_round_logs ENABLE ROW LEVEL SECURITY;

-- Allow guild members to view rounds in their guild
CREATE POLICY "Guild members can view auction rounds"
ON public.auction_rounds FOR SELECT
TO authenticated
USING (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Guild members can view round members"
ON public.auction_round_members FOR SELECT
TO authenticated
USING (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Guild members can view round transfers"
ON public.auction_round_transfers FOR SELECT
TO authenticated
USING (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Guild members can view round logs"
ON public.auction_round_logs FOR SELECT
TO authenticated
USING (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Admin write policies
CREATE POLICY "Admins can manage auction rounds"
ON public.auction_rounds FOR ALL
TO authenticated
USING (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can manage round members"
ON public.auction_round_members FOR ALL
TO authenticated
USING (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can manage round transfers"
ON public.auction_round_transfers FOR ALL
TO authenticated
USING (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can manage round logs"
ON public.auction_round_logs FOR ALL
TO authenticated
USING (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    guild_id IN (
        SELECT guild_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_round_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_round_transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_round_logs;
