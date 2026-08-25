-- =========================================================
-- MIGRATION 021: PERFORMANCE OPTIMIZATION INDEXES
-- Optimizes queries for Guild Auction & Round Rotation (80+ Members Scale)
-- =========================================================

-- 1. Index on auction_round_members for rapid queue and status lookups
CREATE INDEX IF NOT EXISTS idx_round_members_lookup 
ON public.auction_round_members (round_id, status, queue_order);

CREATE INDEX IF NOT EXISTS idx_round_members_guild_user 
ON public.auction_round_members (guild_id, user_id);

CREATE INDEX IF NOT EXISTS idx_round_members_round_user 
ON public.auction_round_members (round_id, user_id);

-- 2. Index on auction_rounds for fast active round resolution
CREATE INDEX IF NOT EXISTS idx_rounds_guild_item_status 
ON public.auction_rounds (guild_id, item_name, status);

-- 3. Index on auction_round_transfers
CREATE INDEX IF NOT EXISTS idx_round_transfers_round_from_to 
ON public.auction_round_transfers (round_id, from_user_id, to_user_id);

-- 4. Index on auction_round_logs for fast audit history pagination
CREATE INDEX IF NOT EXISTS idx_round_logs_guild_item_round 
ON public.auction_round_logs (guild_id, item_name, round_number, created_at DESC);

-- 5. Index on auction_queues for instant slot mapping
CREATE INDEX IF NOT EXISTS idx_queues_guild_item_status_slot 
ON public.auction_queues (guild_id, item_name, status, slot_number);

CREATE INDEX IF NOT EXISTS idx_queues_session_lookup 
ON public.auction_queues (guild_id, status, queue_timestamp);

-- 6. Index on profiles for guild members listing
CREATE INDEX IF NOT EXISTS idx_profiles_guild_role 
ON public.profiles (guild_id, role, display_name);
