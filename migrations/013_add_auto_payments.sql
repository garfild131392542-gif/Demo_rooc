-- SQL Migration: Add Auto Payments
-- Description: Create payments table to log slip uploads and verification statuses

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    slip_url TEXT NOT NULL,
    trans_ref TEXT UNIQUE, -- Unique reference code of the slip (prevents duplicates)
    sender_name TEXT,
    receiver_name TEXT,
    trans_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'success', 'failed', 'pending'
    raw_payload JSONB, -- Store full payload from SlipOK for audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
-- 1. Users can view payments for their own guild
DROP POLICY IF EXISTS "guilds_view_payments" ON public.payments;
CREATE POLICY "guilds_view_payments" ON public.payments
    FOR SELECT
    USING (
        guild_id IN (
            SELECT guild_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. Users can insert payments (slip uploads) for themselves
DROP POLICY IF EXISTS "users_insert_payments" ON public.payments;
CREATE POLICY "users_insert_payments" ON public.payments
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Admins can view all payments
DROP POLICY IF EXISTS "admins_view_all_payments" ON public.payments;
CREATE POLICY "admins_view_all_payments" ON public.payments
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));
