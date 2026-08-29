-- ==============================================================================
-- Migration: 022_add_auction_and_party_rpcs.sql
-- Description: Stored Procedures (RPCs) for atomic transactions, row locking,
--              and high-performance batch updates.
-- ==============================================================================

-- 1. Atomic Award for a Single Auction Slot
CREATE OR REPLACE FUNCTION process_award_auction_slot(
    p_queue_id UUID,
    p_admin_id UUID,
    p_guild_id UUID,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_queue RECORD;
    v_personal_limit INT;
    v_received_today INT;
    v_today DATE := CURRENT_DATE;
    v_round_member RECORD;
BEGIN
    -- 1. ล็อกแถวของคิวนี้ทันที ป้องกันการกดแจกซ้ำจากแอดมินคนอื่นพร้อมกัน (Row Locking)
    SELECT * INTO v_queue 
    FROM auction_queues 
    WHERE id = p_queue_id AND guild_id = p_guild_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่พบรายการคิวนี้ในระบบ');
    END IF;

    IF v_queue.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'คิวนี้ได้รับการประมูลและมอบรางวัลไปเรียบร้อยแล้ว');
    END IF;

    -- 2. ดึง Personal Limit ของวันนี้
    SELECT personal_limit INTO v_personal_limit
    FROM auction_sessions
    WHERE guild_id = p_guild_id 
      AND item_name = v_queue.item_name 
      AND session_date = v_today
      AND status = 'active'
    LIMIT 1;

    -- 3. ตรวจสอบยอดที่ได้รับไปแล้วของวันนี้
    SELECT COALESCE(SUM(received_qty), 0) INTO v_received_today
    FROM auction_queues
    WHERE user_id = v_queue.user_id 
      AND item_name = v_queue.item_name 
      AND status = 'completed'
      AND (
        (updated_at IS NOT NULL AND updated_at::date = v_today) OR
        (updated_at IS NULL AND queue_timestamp::date = v_today)
      );

    IF v_personal_limit IS NOT NULL AND v_received_today >= v_personal_limit THEN
        RETURN jsonb_build_object('success', false, 'error', format('วันนี้สมาชิกได้รับครบโควตา %s ชิ้นแล้วครับ', v_personal_limit));
    END IF;

    -- 4. อัปเดตสถานะคิว
    UPDATE auction_queues
    SET status = 'completed', 
        received_qty = 1, 
        updated_at = NOW()
    WHERE id = p_queue_id;

    -- 5. ตัดยอดสะสมในรอบการประมูล (Round Quota) ใน Transaction เดียวกัน
    SELECT * INTO v_round_member
    FROM auction_round_members
    WHERE guild_id = p_guild_id 
      AND user_id = v_queue.user_id 
      AND item_name = v_queue.item_name 
      AND status IN ('pending', 'in_progress')
    ORDER BY queue_order ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        UPDATE auction_round_members
        SET received_qty = received_qty + 1,
            status = CASE 
                WHEN (received_qty + 1) >= (base_quota + transferred_in_quota - transferred_out_quota) THEN 'completed' 
                ELSE 'in_progress' 
            END,
            updated_at = NOW()
        WHERE id = v_round_member.id;

        -- บันทึก Log การแจกในรอบ
        INSERT INTO auction_round_logs (
            guild_id, 
            round_id, 
            round_number, 
            target_user_id, 
            performed_by, 
            item_name, 
            qty, 
            action_type, 
            details,
            note, 
            created_at
        ) VALUES (
            p_guild_id, 
            v_round_member.round_id, 
            v_round_member.round_number, 
            v_queue.user_id, 
            p_admin_id, 
            v_queue.item_name, 
            1, 
            'MANUAL_OVERRIDE', 
            jsonb_build_object('round_member_id', v_round_member.id),
            COALESCE(p_note, 'บันทึกการประมูลผ่านผังสล็อต'), 
            NOW()
        );
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


-- 2. Batch Award for Multiple Auction Slots
CREATE OR REPLACE FUNCTION batch_award_auction_slots(
    p_queue_ids UUID[],
    p_admin_id UUID,
    p_guild_id UUID,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_qid UUID;
    v_res JSONB;
    v_awarded_count INT := 0;
    v_awarded_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    FOREACH v_qid IN ARRAY p_queue_ids
    LOOP
        v_res := process_award_auction_slot(v_qid, p_admin_id, p_guild_id, p_note);
        IF (v_res->>'success')::BOOLEAN = true THEN
            v_awarded_count := v_awarded_count + 1;
            v_awarded_ids := array_append(v_awarded_ids, v_qid);
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'awarded_count', v_awarded_count, 
        'awarded_ids', v_awarded_ids
    );
END;
$$;


-- 3. Batch Update Round Quotas for all guild members in 1 single SQL execution
CREATE OR REPLACE FUNCTION batch_configure_guild_round_quotas(
    p_guild_id UUID,
    p_album_quota INT,
    p_puppet_quota INT,
    p_white_quota INT,
    p_redblack_quota INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- อัปเดตโควตาพื้นฐานของรอบที่กำลัง active ทั้ง 4 ไอเทม
    UPDATE auction_rounds
    SET base_quota_per_member = CASE 
            WHEN item_name = 'Album' THEN p_album_quota
            WHEN item_name = 'Puppet' THEN p_puppet_quota
            WHEN item_name = 'White' THEN p_white_quota
            WHEN item_name = 'RedBlack' THEN p_redblack_quota
            ELSE base_quota_per_member
        END,
        updated_at = NOW()
    WHERE guild_id = p_guild_id AND status = 'active';

    -- อัปเดตสมาชิกทุกคนในรอบที่ active
    UPDATE auction_round_members arm
    SET base_quota = CASE 
            WHEN ar.item_name = 'Album' THEN p_album_quota
            WHEN ar.item_name = 'Puppet' THEN p_puppet_quota
            WHEN ar.item_name = 'White' THEN p_white_quota
            WHEN ar.item_name = 'RedBlack' THEN p_redblack_quota
            ELSE arm.base_quota
        END,
        status = CASE 
            WHEN arm.received_qty >= (
                CASE 
                    WHEN ar.item_name = 'Album' THEN p_album_quota
                    WHEN ar.item_name = 'Puppet' THEN p_puppet_quota
                    WHEN ar.item_name = 'White' THEN p_white_quota
                    WHEN ar.item_name = 'RedBlack' THEN p_redblack_quota
                    ELSE arm.base_quota
                END + arm.transferred_in_quota - arm.transferred_out_quota
            ) THEN 'completed'
            WHEN arm.received_qty > 0 THEN 'in_progress'
            ELSE 'pending'
        END,
        updated_at = NOW()
    FROM auction_rounds ar
    WHERE arm.round_id = ar.id 
      AND arm.guild_id = p_guild_id 
      AND ar.status = 'active';

    RETURN jsonb_build_object('success', true);
END;
$$;


-- 4. Atomic Swap for Party Management
CREATE OR REPLACE FUNCTION swap_party_members(
    p_guild_id UUID,
    p_source_id UUID,
    p_occupant_id UUID DEFAULT NULL,
    p_target_party INT DEFAULT NULL,
    p_target_slot INT DEFAULT NULL,
    p_activity TEXT DEFAULT 'general'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_activity = 'guild_league' THEN
        -- ปลด occupant เดิม (ถ้ามี)
        IF p_occupant_id IS NOT NULL THEN
            UPDATE profiles
            SET party_id_guild_league = NULL,
                slot_index_guild_league = NULL,
                updated_at = NOW()
            WHERE id = p_occupant_id AND guild_id = p_guild_id;
        END IF;

        -- ย้ายตัวละครหลักเข้าตำแหน่งใหม่
        UPDATE profiles
        SET party_id_guild_league = p_target_party,
            slot_index_guild_league = p_target_slot,
            updated_at = NOW()
        WHERE id = p_source_id AND guild_id = p_guild_id;

    ELSIF p_activity = 'emperium_overrun' THEN
        IF p_occupant_id IS NOT NULL THEN
            UPDATE profiles
            SET party_id_emperium_overrun = NULL,
                slot_index_emperium_overrun = NULL,
                updated_at = NOW()
            WHERE id = p_occupant_id AND guild_id = p_guild_id;
        END IF;

        UPDATE profiles
        SET party_id_emperium_overrun = p_target_party,
            slot_index_emperium_overrun = p_target_slot,
            updated_at = NOW()
        WHERE id = p_source_id AND guild_id = p_guild_id;

    ELSE
        IF p_occupant_id IS NOT NULL THEN
            UPDATE profiles
            SET party_id = NULL,
                slot_index = NULL,
                updated_at = NOW()
            WHERE id = p_occupant_id AND guild_id = p_guild_id;
        END IF;

        UPDATE profiles
        SET party_id = p_target_party,
            slot_index = p_target_slot,
            updated_at = NOW()
        WHERE id = p_source_id AND guild_id = p_guild_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;
