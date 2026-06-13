-- Split Auction Queues: Each booking becomes individual slots (requested_qty = 1 per row)
-- Version: 2025-01-20
-- Description:
--   1. Add slot_number column to track slot index within a booking group
--   2. Migrate existing data: Each queue with requested_qty=N becomes N rows with requested_qty=1
--   3. Add unique constraint to prevent slot duplication

-- ============================================
-- 1. ADD SLOT_NUMBER COLUMN (for tracking slot index)
-- ============================================
ALTER TABLE public.auction_queues
ADD COLUMN IF NOT EXISTS slot_number INTEGER DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN public.auction_queues.slot_number IS 'Slot index within a booking group (1-based). For example, if member books 4 items, they get 4 rows with slot_number 1, 2, 3, 4';

-- ============================================
-- 2. ADD COMPOSITE UNIQUE CONSTRAINT (prevent duplicate slots)
-- ============================================
-- This ensures a member cannot have two row entries with same item_type and slot_number on same date
-- Note: PostgreSQL doesn't support IF NOT EXISTS for constraints, so we use DO block
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'auction_queues' 
    AND constraint_name = 'unique_member_slot_per_item_date'
  ) THEN
    ALTER TABLE public.auction_queues
    ADD CONSTRAINT unique_member_slot_per_item_date 
      UNIQUE (user_id, item_name, slot_number, guild_id);
  END IF;
END $$;

-- ============================================
-- 3. ADD INDEX for faster lookups by guild, status, and date
-- ============================================
CREATE INDEX IF NOT EXISTS idx_auction_queues_guild_status ON public.auction_queues(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_auction_queues_user_item ON public.auction_queues(user_id, item_name);

-- ============================================
-- 4. DATA MIGRATION (Optional - only if you have existing data)
-- ============================================
-- NOTE: This migration is data-destructive! 
-- If you have existing bookings, you should run this in a transaction and test first.
-- For a fresh database, this can be skipped or left as documentation.

-- Delete old queues (if migrating from old schema)
-- Uncomment this if you need to clear old data:
-- DELETE FROM public.auction_queues WHERE slot_number IS NULL OR slot_number = 1;

-- Create new rows from existing queues (if needed)
-- This would expand existing single rows into multiple rows
-- Uncomment and run carefully:
/*
WITH queue_expansion AS (
  SELECT 
    id,
    guild_id,
    user_id,
    item_name,
    requested_qty,
    received_qty,
    status,
    queue_timestamp,
    slot_number
  FROM public.auction_queues
  WHERE requested_qty > 1
)
INSERT INTO public.auction_queues (guild_id, user_id, item_name, requested_qty, received_qty, status, queue_timestamp, slot_number)
SELECT 
  aq.guild_id,
  aq.user_id,
  aq.item_name,
  1 as requested_qty,  -- Each slot is 1
  CASE WHEN row_num <= aq.received_qty THEN 1 ELSE 0 END as received_qty,  -- Maintain award count
  'waiting' as status,
  aq.queue_timestamp,
  row_num as slot_number
FROM 
  queue_expansion aq,
  LATERAL generate_series(1, aq.requested_qty) as row_num
ORDER BY aq.user_id, aq.item_name, row_num;

-- Then delete the original rows with requested_qty > 1
DELETE FROM public.auction_queues 
WHERE requested_qty > 1;
*/

-- ============================================
-- 5. ADD COMMENT TO TABLE
-- ============================================
COMMENT ON TABLE public.auction_queues IS 'Auction queue entries - each row represents a single slot. Member booking N items creates N rows with slot_number 1..N';
