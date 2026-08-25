'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'
import { ItemType } from './auction'

export type RoundStatus = 'active' | 'completed' | 'archived'
export type RoundMemberStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'transferred' | 'left_guild'

// 1. ดึงข้อมูลภาพรวมของรอบทั้งหมดในกิลด์ (สำหรับหน้าแสดงผลทั้งสมาชิกและหัวกิลด์)
export async function getGuildRoundsOverview(selectedItem?: ItemType) {
  try {
    const session = await getSession()
    if (!session?.profile?.guild_id) {
      return { success: false, error: 'ไม่พบข้อมูลกิลด์' }
    }

    const supabase = await createClient()
    const guildId = session.profile.guild_id
    const currentUserId = session.profile.id
    const isAdmin = session.profile.role === 'admin'

    // ดึงรอบที่ active ของแต่ละไอเทม
    let query = supabase
      .from('auction_rounds')
      .select('*')
      .eq('guild_id', guildId)
      .eq('status', 'active')

    if (selectedItem) {
      query = query.eq('item_name', selectedItem)
    }

    const { data: activeRounds, error: roundsError } = await query
    if (roundsError) throw roundsError

    // ดึงข้อมูลสมาชิกและโควตาของตนเองในรอบปัจจุบัน
    const { data: myQuotas, error: myQuotaError } = await supabase
      .from('auction_round_members')
      .select('*, auction_rounds!inner(*)')
      .eq('guild_id', guildId)
      .eq('user_id', currentUserId)
      .eq('auction_rounds.status', 'active')

    if (myQuotaError) console.error('Error fetching myQuotas:', myQuotaError)

    // ดึงสมาชิกทั้งหมดในกิลด์เพื่อใช้คำนวณ total หรือ dropdown
    const { data: guildProfiles } = await supabase
      .from('profiles')
      .select('id, display_name, uid_game, role, avatar_url')
      .eq('guild_id', guildId)
      .order('display_name', { ascending: true })

    return {
      success: true,
      isAdmin,
      activeRounds: activeRounds || [],
      myQuotas: myQuotas || [],
      guildMembers: guildProfiles || [],
    }
  } catch (err: any) {
    console.error('getGuildRoundsOverview error:', err)
    return { success: false, error: err.message }
  }
}

// 2. ดึงรายชื่อสมาชิกในรอบเจาะลึก (แยกแท็บ ได้รับแล้ว / กำลังรอ / โอนสิทธิ์)
export async function getRoundMembersList(roundId: string) {
  try {
    const session = await getSession()
    if (!session?.profile?.guild_id) {
      return { success: false, error: 'ไม่พบข้อมูลกิลด์' }
    }

    const supabase = await createClient()

    const { data: members, error } = await supabase
      .from('auction_round_members')
      .select('*, profiles:user_id(id, display_name, uid_game, role, avatar_url)')
      .eq('round_id', roundId)
      .order('queue_order', { ascending: true })

    if (error) throw error

    return {
      success: true,
      members: members || [],
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 3. หัวกิลด์เปิดรอบใหม่ หรือ ปรับแต่งโควตาพื้นฐานของรอบ
export async function startOrConfigureRound(itemName: ItemType, baseQuota: number, roundNumber?: number) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()
    const guildId = session.profile.guild_id

    // ดึงสมาชิกทั้งหมดในกิลด์
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('guild_id', guildId)

    if (profilesError) throw profilesError
    const totalMembers = profiles?.length || 0

    // ตรวจสอบว่ามีรอบ active อยู่แล้วหรือไม่
    const { data: existingRound } = await supabase
      .from('auction_rounds')
      .select('*')
      .eq('guild_id', guildId)
      .eq('item_name', itemName)
      .eq('status', 'active')
      .maybeSingle()

    let roundId: string
    let currentRoundNum = roundNumber || (existingRound ? existingRound.round_number : 1)

    if (existingRound) {
      // อัปเดตโควตาและจำนวนสมาชิก
      const { data: updated, error: updateError } = await supabase
        .from('auction_rounds')
        .update({
          base_quota_per_member: baseQuota,
          total_eligible_members: totalMembers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRound.id)
        .select()
        .single()

      if (updateError) throw updateError
      roundId = existingRound.id
    } else {
      // สร้างรอบใหม่
      const { data: created, error: createError } = await supabase
        .from('auction_rounds')
        .insert({
          guild_id: guildId,
          item_name: itemName,
          round_number: currentRoundNum,
          base_quota_per_member: baseQuota,
          status: 'active',
          total_eligible_members: totalMembers,
          completed_members_count: 0,
          created_by: session.profile.id,
        })
        .select()
        .single()

      if (createError) throw createError
      roundId = created.id

      // เขียน Audit Log การเริ่มรอบ
      await supabase.from('auction_round_logs').insert({
        guild_id: guildId,
        round_id: roundId,
        round_number: currentRoundNum,
        item_name: itemName,
        action_type: 'ROUND_START',
        performed_by: session.profile.id,
        note: `เริ่มต้นรอบที่ ${currentRoundNum} (โควตาคนละ ${baseQuota} ชิ้น, สมาชิก ${totalMembers} คน)`,
      })
    }

    // ซิงค์สมาชิกทุกคนเข้าตาราง auction_round_members และอัปเดต base_quota ให้ทุกคนในรอบ
    if (profiles && profiles.length > 0) {
      const { data: existingMembers } = await supabase
        .from('auction_round_members')
        .select('*')
        .eq('round_id', roundId)

      const existingMap = new Map((existingMembers || []).map(m => [m.user_id, m]))

      // 1. อัปเดต base_quota และ status ของสมาชิกเดิมทุกคนในรอบ
      if (existingMembers && existingMembers.length > 0) {
        for (const m of existingMembers) {
          const target = baseQuota + (m.transferred_in_quota || 0) - (m.transferred_out_quota || 0)
          let newStatus = m.status
          if (m.status !== 'skipped' && m.status !== 'transferred') {
            if (m.received_qty >= target && target > 0) {
              newStatus = 'completed'
            } else if (m.received_qty > 0) {
              newStatus = 'in_progress'
            } else {
              newStatus = 'pending'
            }
          }

          await supabase
            .from('auction_round_members')
            .update({
              base_quota: baseQuota,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', m.id)
        }
      }

      // 2. ถ้ามีสมาชิกใหม่ที่ยังไม่มีในรอบนี้ ให้เพิ่มเข้าไป
      const newMembers = profiles
        .filter(p => !existingMap.has(p.id))
        .map((p, idx) => ({
          round_id: roundId,
          guild_id: guildId,
          user_id: p.id,
          item_name: itemName,
          round_number: currentRoundNum,
          base_quota: baseQuota,
          transferred_in_quota: 0,
          transferred_out_quota: 0,
          received_qty: 0,
          status: 'pending',
          queue_order: (existingMembers?.length || 0) + idx + 1,
        }))

      if (newMembers.length > 0) {
        await supabase.from('auction_round_members').insert(newMembers)
      }

      // 3. คำนวณยอด completed members count ให้ถูกต้อง
      const { count: completedCount } = await supabase
        .from('auction_round_members')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', roundId)
        .eq('status', 'completed')

      await supabase
        .from('auction_rounds')
        .update({
          completed_members_count: completedCount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roundId)

      // 4. ⚡ Auto Re-allocate สล็อตของวันนี้ทันที (ถ้ามี session เปิดใช้งานอยู่)
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySession } = await supabase
        .from('auction_sessions')
        .select('*')
        .eq('guild_id', guildId)
        .eq('item_name', itemName)
        .eq('session_date', today)
        .maybeSingle()

      if (todaySession && Number(todaySession.total_quantity) > 0) {
        await autoPopulateSlotsFromRound(
          itemName,
          Number(todaySession.total_quantity),
          Number(todaySession.personal_limit) || baseQuota
        )
      }
    }

    revalidatePath('/auction')
    return { success: true, roundId }
  } catch (err: any) {
    console.error('startOrConfigureRound error:', err)
    return { success: false, error: err.message }
  }
}

// 4. โอนสิทธิ์ / ยกสิทธิ์ให้เพื่อน (Rights & Quota Transfer)
export async function transferRoundQuota(
  fromUserId: string,
  toUserId: string,
  itemName: ItemType,
  transferQty: number,
  transferType: 'partial' | 'full' = 'partial',
  note?: string
) {
  try {
    const session = await getSession()
    if (!session?.profile) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
    }

    // เฉพาะ Admin หรือเจ้าของสิทธิ์ที่ทำรายการได้
    if (session.profile.role !== 'admin' && session.profile.id !== fromUserId) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ทำรายการโอนสิทธิ์แทนผู้อื่น' }
    }

    if (fromUserId === toUserId) {
      return { success: false, error: 'ไม่สามารถโอนสิทธิ์ให้ตัวเองได้' }
    }

    const supabase = await createClient()
    const guildId = session.profile.guild_id

    // ดึงรอบ active
    const { data: activeRound } = await supabase
      .from('auction_rounds')
      .select('*')
      .eq('guild_id', guildId)
      .eq('item_name', itemName)
      .eq('status', 'active')
      .single()

    if (!activeRound) {
      return { success: false, error: 'ไม่พบรอบการประมูลที่เปิดอยู่สำหรับไอเทมนี้' }
    }

    // ดึงข้อมูลผู้โอน
    const { data: fromMember } = await supabase
      .from('auction_round_members')
      .select('*')
      .eq('round_id', activeRound.id)
      .eq('user_id', fromUserId)
      .single()

    if (!fromMember) {
      return { success: false, error: 'ไม่พบข้อมูลผู้โอนสิทธิ์ในรอบนี้' }
    }

    // คำนวณโควตาคงเหลือของผู้โอน
    const fromTarget = fromMember.base_quota + fromMember.transferred_in_quota - fromMember.transferred_out_quota
    const fromRemaining = Math.max(0, fromTarget - fromMember.received_qty)

    const actualTransferQty = transferType === 'full' ? fromRemaining : Math.min(transferQty, fromRemaining)

    if (actualTransferQty <= 0) {
      return { success: false, error: 'ผู้โอนไม่มีโควตาสิทธิ์คงเหลือให้โอนในรอบนี้' }
    }

    // ดึงข้อมูลผู้รับโอน
    let { data: toMember } = await supabase
      .from('auction_round_members')
      .select('*')
      .eq('round_id', activeRound.id)
      .eq('user_id', toUserId)
      .maybeSingle()

    // ถ้าผู้รับยังไม่มีแถวใน round (เช่น เพิ่งเข้ากิลด์) ให้สร้างใหม่
    if (!toMember) {
      const { data: newTo, error: newToErr } = await supabase
        .from('auction_round_members')
        .insert({
          round_id: activeRound.id,
          guild_id: guildId,
          user_id: toUserId,
          item_name: itemName,
          round_number: activeRound.round_number,
          base_quota: activeRound.base_quota_per_member,
          transferred_in_quota: 0,
          transferred_out_quota: 0,
          received_qty: 0,
          status: 'pending',
          queue_order: 999,
        })
        .select()
        .single()

      if (newToErr) throw newToErr
      toMember = newTo
    }

    // 1. ตัดโควตาผู้โอน
    const newFromTransferredOut = fromMember.transferred_out_quota + actualTransferQty
    const newFromTarget = fromMember.base_quota + fromMember.transferred_in_quota - newFromTransferredOut
    const newFromStatus = newFromTarget <= fromMember.received_qty ? (fromMember.received_qty > 0 ? 'completed' : 'transferred') : fromMember.status

    await supabase
      .from('auction_round_members')
      .update({
        transferred_out_quota: newFromTransferredOut,
        status: newFromStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fromMember.id)

    // 2. เพิ่มโควตาผู้รับ
    const newToTransferredIn = toMember.transferred_in_quota + actualTransferQty
    await supabase
      .from('auction_round_members')
      .update({
        transferred_in_quota: newToTransferredIn,
        status: toMember.status === 'transferred' ? 'pending' : toMember.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', toMember.id)

    // 3. บันทึกประวัติการโอน
    await supabase.from('auction_round_transfers').insert({
      guild_id: guildId,
      round_id: activeRound.id,
      round_number: activeRound.round_number,
      item_name: itemName,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      transfer_qty: actualTransferQty,
      transfer_type: transferType,
      performed_by: session.profile.id,
      note: note || `โอนสิทธิ์ ${itemName} จำนวน ${actualTransferQty} ชิ้น`,
    })

    // 4. บันทึก Audit Log
    await supabase.from('auction_round_logs').insert({
      guild_id: guildId,
      round_id: activeRound.id,
      round_number: activeRound.round_number,
      item_name: itemName,
      action_type: 'TRANSFER',
      target_user_id: toUserId,
      related_user_id: fromUserId,
      qty: actualTransferQty,
      performed_by: session.profile.id,
      note: note || `โอนสิทธิ์ ${actualTransferQty} ชิ้น จากผู้ใช้ให้ผู้รับ`,
    })

    revalidatePath('/auction')
    return { success: true, transferredQty: actualTransferQty }
  } catch (err: any) {
    console.error('transferRoundQuota error:', err)
    return { success: false, error: err.message }
  }
}

// 5. สลับลำดับคิวของสมาชิก 2 คน (Swap Queue Order)
export async function swapRoundQueueOrder(memberId1: string, memberId2: string, reason?: string) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()

    const { data: member1 } = await supabase.from('auction_round_members').select('*').eq('id', memberId1).single()
    const { data: member2 } = await supabase.from('auction_round_members').select('*').eq('id', memberId2).single()

    if (!member1 || !member2) {
      return { success: false, error: 'ไม่พบข้อมูลสมาชิกที่ต้องการสลับคิว' }
    }

    const order1 = member1.queue_order
    const order2 = member2.queue_order

    await supabase.from('auction_round_members').update({ queue_order: order2 }).eq('id', memberId1)
    await supabase.from('auction_round_members').update({ queue_order: order1 }).eq('id', memberId2)

    // บันทึก Log
    await supabase.from('auction_round_logs').insert({
      guild_id: member1.guild_id,
      round_id: member1.round_id,
      round_number: member1.round_number,
      item_name: member1.item_name,
      action_type: 'SWAP',
      target_user_id: member1.user_id,
      related_user_id: member2.user_id,
      performed_by: session.profile.id,
      note: reason || `สลับลำดับคิว ${order1} <-> ${order2}`,
    })

    revalidatePath('/auction')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 6. ข้ามคิว / สละสิทธิ์รอบนี้ (Skip / Defer Member)
export async function skipOrDeferRoundMember(roundMemberId: string, reason?: string) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()

    const { data: member } = await supabase.from('auction_round_members').select('*').eq('id', roundMemberId).single()
    if (!member) return { success: false, error: 'ไม่พบข้อมูลสมาชิก' }

    await supabase
      .from('auction_round_members')
      .update({
        status: 'skipped',
        note: reason || 'สละสิทธิ์/ข้ามคิวในรอบนี้',
        updated_at: new Date().toISOString(),
      })
      .eq('id', roundMemberId)

    // บันทึก Log
    await supabase.from('auction_round_logs').insert({
      guild_id: member.guild_id,
      round_id: member.round_id,
      round_number: member.round_number,
      item_name: member.item_name,
      action_type: 'SKIP',
      target_user_id: member.user_id,
      performed_by: session.profile.id,
      note: reason || 'สละสิทธิ์/ข้ามคิวในรอบนี้',
    })

    revalidatePath('/auction')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 7. จัดสล็อตอัตโนมัติตามรอบ (Auto Slot Allocation Engine)
// ใช้ตอนหัวกิลด์กดบันทึกยอดไอเทมรายวัน หรือกดเติมสล็อตอัตโนมัติ
export async function autoPopulateSlotsFromRound(itemName: ItemType, availableQty: number, personalLimit: number) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()
    const guildId = session.profile.guild_id
    const today = new Date().toISOString().split('T')[0]

    // ดึงรอบ active
    let { data: activeRound } = await supabase
      .from('auction_rounds')
      .select('*')
      .eq('guild_id', guildId)
      .eq('item_name', itemName)
      .eq('status', 'active')
      .maybeSingle()

    // ถ้ารอบยังไม่มี ให้สร้างรอบ 1 เริ่มต้นให้อัตโนมัติ (โควตาตาม personalLimit หรือ 2)
    if (!activeRound) {
      const initRound = await startOrConfigureRound(itemName, personalLimit || 2, 1)
      if (!initRound.success) throw new Error(initRound.error)
      const { data: created } = await supabase
        .from('auction_rounds')
        .select('*')
        .eq('guild_id', guildId)
        .eq('item_name', itemName)
        .eq('status', 'active')
        .single()
      activeRound = created
    }

    if (!activeRound) return { success: false, error: 'ไม่สามารถสร้างหรือค้นหารอบได้' }

    // ดึงสมาชิกในรอบที่ยังได้ของไม่ครบ เรียงตาม queue_order
    const { data: members, error: memErr } = await supabase
      .from('auction_round_members')
      .select('*')
      .eq('round_id', activeRound.id)
      .in('status', ['pending', 'in_progress'])
      .order('queue_order', { ascending: true })

    if (memErr) throw memErr
    if (!members || members.length === 0) {
      return { success: true, allocatedSlotsCount: 0, message: 'สมาชิกทุกคนในรอบนี้ได้รับครบโควตาแล้ว' }
    }

    // ลบคิวเดิมของวันนี้ที่ยังเป็น 'waiting' ออกก่อน เพื่อรันจัดสรรใหม่
    await supabase
      .from('auction_queues')
      .delete()
      .eq('guild_id', guildId)
      .eq('item_name', itemName)
      .eq('status', 'waiting')

    let remainingSlots = availableQty
    const insertQueues: any[] = []
    const baseTime = Date.now()

    members.forEach((member, memberIndex) => {
      if (remainingSlots <= 0) return

      const targetQuota = member.base_quota + member.transferred_in_quota - member.transferred_out_quota
      const remainingQuota = Math.max(0, targetQuota - member.received_qty)
      if (remainingQuota <= 0) return

      // กฎสูตร: min(โควตาคงเหลือ, ลิมิตวันนี้, สล็อตที่เหลืออยู่)
      const slotsForUser = Math.min(remainingQuota, personalLimit, remainingSlots)
      const userTimestamp = new Date(baseTime + memberIndex * 1000).toISOString()

      for (let s = 1; s <= slotsForUser; s++) {
        insertQueues.push({
          guild_id: guildId,
          user_id: member.user_id,
          item_name: itemName,
          requested_qty: 1,
          received_qty: 0,
          status: 'waiting',
          slot_number: s,
          queue_timestamp: userTimestamp,
        })
      }

      remainingSlots -= slotsForUser
    })

    if (insertQueues.length > 0) {
      const { error: insertErr } = await supabase.from('auction_queues').insert(insertQueues)
      if (insertErr) throw insertErr
    }

    revalidatePath('/auction')
    return {
      success: true,
      allocatedSlotsCount: insertQueues.length,
      remainingItemQty: remainingSlots,
    }
  } catch (err: any) {
    console.error('autoPopulateSlotsFromRound error:', err)
    return { success: false, error: err.message }
  }
}

// 8. Auto-Link: อัปเดตสะสมยอดในรอบเมื่อมีการกดแจกบนกระดาน Live Session
export async function awardRoundProgress(guildId: string, userId: string, itemName: ItemType, qty: number = 1, adminId: string, note?: string) {
  try {
    const supabase = await createClient()

    // ค้นหารอบ active ของไอเทมนี้ในกิลด์
    const { data: activeRound } = await supabase
      .from('auction_rounds')
      .select('*')
      .eq('guild_id', guildId)
      .eq('item_name', itemName)
      .eq('status', 'active')
      .maybeSingle()

    if (!activeRound) return { success: false, error: 'ไม่มีรอบ active' }

    // ค้นหาสมาชิกในรอบ
    const { data: member } = await supabase
      .from('auction_round_members')
      .select('*')
      .eq('round_id', activeRound.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!member) return { success: false, error: 'ไม่พบสมาชิกในรอบ' }

    const targetQuota = member.base_quota + member.transferred_in_quota - member.transferred_out_quota
    const remaining = Math.max(0, targetQuota - member.received_qty)

    // 🛑 ป้องกันการแจกเกินโควตารอบ (Capped to Target Quota)
    if (remaining <= 0 && targetQuota > 0) {
      return { success: true, isComplete: true, newReceived: member.received_qty, targetQuota }
    }

    const actualQty = Math.min(qty, remaining > 0 ? remaining : qty)
    const newReceived = Math.min(targetQuota, member.received_qty + actualQty)
    const isComplete = newReceived >= targetQuota && targetQuota > 0

    const newStatus: RoundMemberStatus = isComplete ? 'completed' : 'in_progress'

    await supabase
      .from('auction_round_members')
      .update({
        received_qty: newReceived,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id)

    // บันทึก Log การแจก
    await supabase.from('auction_round_logs').insert({
      guild_id: guildId,
      round_id: activeRound.id,
      round_number: activeRound.round_number,
      item_name: itemName,
      action_type: 'AWARD',
      target_user_id: userId,
      qty: actualQty,
      performed_by: adminId,
      note: note || `ได้รับ ${itemName} สะสมเป็น ${newReceived}/${targetQuota} ชิ้น`,
    })

    // อัปเดตจำนวนคนที่ได้ครบแล้วในตาราง auction_rounds
    const { count: completedCount } = await supabase
      .from('auction_round_members')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', activeRound.id)
      .eq('status', 'completed')

    await supabase
      .from('auction_rounds')
      .update({
        completed_members_count: completedCount || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeRound.id)

    return { success: true, isComplete, newReceived, targetQuota }
  } catch (err: any) {
    console.error('awardRoundProgress error:', err)
    return { success: false, error: err.message }
  }
}

// 8.1 Auto-Link: ย้อนคืนสิทธิ์ในรอบเมื่อมีการกดยกเลิกประมูลหรือลบประวัติ
export async function revertRoundProgress(guildId: string, userId: string, itemName: ItemType, qty: number = 1, adminId: string, note?: string) {
  try {
    const supabase = await createClient()

    const { data: activeRound } = await supabase
      .from('auction_rounds')
      .select('*')
      .eq('guild_id', guildId)
      .eq('item_name', itemName)
      .eq('status', 'active')
      .maybeSingle()

    if (!activeRound) return { success: false, error: 'ไม่มีรอบ active' }

    const { data: member } = await supabase
      .from('auction_round_members')
      .select('*')
      .eq('round_id', activeRound.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!member) return { success: false, error: 'ไม่พบสมาชิกในรอบ' }

    const newReceived = Math.max(0, member.received_qty - qty)
    const targetQuota = member.base_quota + member.transferred_in_quota - member.transferred_out_quota
    const isComplete = newReceived >= targetQuota && targetQuota > 0

    const newStatus: RoundMemberStatus = isComplete ? 'completed' : (newReceived > 0 ? 'in_progress' : 'pending')

    await supabase
      .from('auction_round_members')
      .update({
        received_qty: newReceived,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id)

    // บันทึก Log การย้อนคืนสิทธิ์
    await supabase.from('auction_round_logs').insert({
      guild_id: guildId,
      round_id: activeRound.id,
      round_number: activeRound.round_number,
      item_name: itemName,
      action_type: 'MANUAL_OVERRIDE',
      target_user_id: userId,
      qty: -qty,
      performed_by: adminId,
      note: note || `ย้อนคืนสิทธิ์ ${itemName} (สะสมเหลือ ${newReceived}/${targetQuota} ชิ้น)`,
    })

    // อัปเดตยอด completed count ใหม่
    const { count: completedCount } = await supabase
      .from('auction_round_members')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', activeRound.id)
      .eq('status', 'completed')

    await supabase
      .from('auction_rounds')
      .update({
        completed_members_count: completedCount || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeRound.id)

    return { success: true, newReceived }
  } catch (err: any) {
    console.error('revertRoundProgress error:', err)
    return { success: false, error: err.message }
  }
}

// 8.2 ซิงค์และจัดระเบียบโควตารอบ (Sanitize / Recalculate Quotas for anomalies)
export async function syncAndFixRoundQuota(itemName: ItemType) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()
    const guildId = session.profile.guild_id

    const { data: activeRound } = await supabase
      .from('auction_rounds')
      .select('*')
      .eq('guild_id', guildId)
      .eq('item_name', itemName)
      .eq('status', 'active')
      .maybeSingle()

    if (!activeRound) return { success: false, error: 'ไม่พบรอบ active' }

    const { data: members } = await supabase
      .from('auction_round_members')
      .select('*')
      .eq('round_id', activeRound.id)

    if (members && members.length > 0) {
      for (const m of members) {
        const target = m.base_quota + (m.transferred_in_quota || 0) - (m.transferred_out_quota || 0)
        const cappedReceived = Math.min(target, Math.max(0, m.received_qty))
        const isComplete = cappedReceived >= target && target > 0
        let newStatus = m.status
        if (m.status !== 'skipped' && m.status !== 'transferred') {
          newStatus = isComplete ? 'completed' : (cappedReceived > 0 ? 'in_progress' : 'pending')
        }

        await supabase
          .from('auction_round_members')
          .update({
            received_qty: cappedReceived,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', m.id)
      }

      const { count: completedCount } = await supabase
        .from('auction_round_members')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', activeRound.id)
        .eq('status', 'completed')

      await supabase
        .from('auction_rounds')
        .update({
          completed_members_count: completedCount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeRound.id)
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 9. ปิดรอบและเลื่อนสู่รอบถัดไป (Advance to Next Round & Rollover)
export async function advanceToNextRound(itemName: ItemType, nextBaseQuota: number, rolloverIncomplete: boolean = true) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()
    const guildId = session.profile.guild_id

    const { data: currentRound } = await supabase
      .from('auction_rounds')
      .select('*')
      .eq('guild_id', guildId)
      .eq('item_name', itemName)
      .eq('status', 'active')
      .single()

    if (!currentRound) return { success: false, error: 'ไม่พบรอบที่กำลังดำเนินการ' }

    // 1. ปิดรอบปัจจุบัน
    await supabase
      .from('auction_rounds')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentRound.id)

    // บันทึก Log ปิดรอบ
    await supabase.from('auction_round_logs').insert({
      guild_id: guildId,
      round_id: currentRound.id,
      round_number: currentRound.round_number,
      item_name: itemName,
      action_type: 'ROUND_CLOSE',
      performed_by: session.profile.id,
      note: `ปิดรอบที่ ${currentRound.round_number}`,
    })

    // 2. ดึงสมาชิกที่ยังไม่ครบในรอบที่ผ่านมา (หากต้องการ rollover สิทธิ์)
    let priorityUserIds: string[] = []
    if (rolloverIncomplete) {
      const { data: incompleteMembers } = await supabase
        .from('auction_round_members')
        .select('user_id')
        .eq('round_id', currentRound.id)
        .in('status', ['pending', 'in_progress'])
        .order('queue_order', { ascending: true })

      priorityUserIds = (incompleteMembers || []).map(m => m.user_id)
    }

    // 3. เริ่มรอบใหม่
    const nextRoundNum = currentRound.round_number + 1
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('guild_id', guildId)

    const totalMembers = profiles?.length || 0

    const { data: newRound, error: newRoundErr } = await supabase
      .from('auction_rounds')
      .insert({
        guild_id: guildId,
        item_name: itemName,
        round_number: nextRoundNum,
        base_quota_per_member: nextBaseQuota,
        status: 'active',
        total_eligible_members: totalMembers,
        completed_members_count: 0,
        created_by: session.profile.id,
      })
      .select()
      .single()

    if (newRoundErr) throw newRoundErr

    // จัดเรียงสมาชิก: คนที่ตกหล่นในรอบก่อนหน้าขึ้นมาก่อน
    const prioritySet = new Set(priorityUserIds)
    const sortedProfiles = [
      ...(profiles?.filter(p => prioritySet.has(p.id)) || []),
      ...(profiles?.filter(p => !prioritySet.has(p.id)) || []),
    ]

    const newMembersData = sortedProfiles.map((p, idx) => ({
      round_id: newRound.id,
      guild_id: guildId,
      user_id: p.id,
      item_name: itemName,
      round_number: nextRoundNum,
      base_quota: nextBaseQuota,
      transferred_in_quota: 0,
      transferred_out_quota: 0,
      received_qty: 0,
      status: 'pending',
      queue_order: idx + 1,
    }))

    if (newMembersData.length > 0) {
      await supabase.from('auction_round_members').insert(newMembersData)
    }

    // บันทึก Log เริ่มรอบใหม่
    await supabase.from('auction_round_logs').insert({
      guild_id: guildId,
      round_id: newRound.id,
      round_number: nextRoundNum,
      item_name: itemName,
      action_type: 'ROUND_START',
      performed_by: session.profile.id,
      note: `เริ่มต้นรอบที่ ${nextRoundNum} (โควตาคนละ ${nextBaseQuota} ชิ้น, มีสิทธิ์บุริมสิทธิ์ตกหล่น ${priorityUserIds.length} คน)`,
    })

    revalidatePath('/auction')
    return { success: true, nextRoundNumber: nextRoundNum }
  } catch (err: any) {
    console.error('advanceToNextRound error:', err)
    return { success: false, error: err.message }
  }
}

// 10. ดึง Audit Logs ย้อนหลัง
export async function getRoundAuditLogs(itemName?: ItemType, roundNumber?: number) {
  try {
    const session = await getSession()
    if (!session?.profile?.guild_id) return { success: false, error: 'ไม่พบกิลด์' }

    const supabase = await createClient()
    let query = supabase
      .from('auction_round_logs')
      .select('*, target:target_user_id(display_name, uid_game), related:related_user_id(display_name, uid_game), admin:performed_by(display_name)')
      .eq('guild_id', session.profile.guild_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (itemName) query = query.eq('item_name', itemName)
    if (roundNumber) query = query.eq('round_number', roundNumber)

    const { data: logs, error } = await query
    if (error) throw error

    return { success: true, logs: logs || [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 11. หัวกิลด์เลือกคนและกดแจก/บันทึกผลโดยตรงจากตารางรอบ (Manual Direct Award)
export async function manualAwardRoundMember(roundMemberId: string, awardQty: number = 1, note?: string) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()

    const { data: member, error: memErr } = await supabase
      .from('auction_round_members')
      .select('*')
      .eq('id', roundMemberId)
      .single()

    if (memErr || !member) return { success: false, error: 'ไม่พบข้อมูลสมาชิกในรอบ' }

    const targetQuota = member.base_quota + member.transferred_in_quota - member.transferred_out_quota
    const remaining = Math.max(0, targetQuota - member.received_qty)

    if (remaining <= 0) {
      return { success: false, error: 'สมาชิกคนนี้ได้รับครบตามโควตาในรอบนี้แล้ว' }
    }

    const actualQty = Math.min(awardQty, remaining)
    const newReceived = member.received_qty + actualQty
    const isComplete = newReceived >= targetQuota

    const newStatus: RoundMemberStatus = isComplete ? 'completed' : 'in_progress'

    await supabase
      .from('auction_round_members')
      .update({
        received_qty: newReceived,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id)

    // บันทึก Log การแจก
    await supabase.from('auction_round_logs').insert({
      guild_id: member.guild_id,
      round_id: member.round_id,
      round_number: member.round_number,
      item_name: member.item_name,
      action_type: 'MANUAL_OVERRIDE',
      target_user_id: member.user_id,
      qty: actualQty,
      performed_by: session.profile.id,
      note: note || `หัวกิลด์มอบรางวัลโดยตรง จำนวน ${actualQty} ชิ้น (สะสม ${newReceived}/${targetQuota})`,
    })

    // อัปเดตยอด completed count
    const { count: completedCount } = await supabase
      .from('auction_round_members')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', member.round_id)
      .eq('status', 'completed')

    await supabase
      .from('auction_rounds')
      .update({
        completed_members_count: completedCount || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.round_id)

    revalidatePath('/auction')
    return { success: true, isComplete, newReceived, targetQuota }
  } catch (err: any) {
    console.error('manualAwardRoundMember error:', err)
    return { success: false, error: err.message }
  }
}

