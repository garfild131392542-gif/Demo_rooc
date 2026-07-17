'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validateUsername } from '@/lib/validations'

const VIRTUAL_EMAIL_DOMAIN = '@member.rooc'

export async function registerMemberWithGuildInvite(
  guildId: string,
  username: string,
  password: string,
  displayName: string,
  jobName: string,
) {
  const normalizedGuildId = (guildId || '').trim()
  const normalizedUsername = (username || '').trim()
  const normalizedPassword = (password || '').toString()
  const normalizedDisplayName = (displayName || '').trim()
  const normalizedJobName = (jobName || '').trim()

  if (!normalizedGuildId) return { success: false, error: 'ไม่พบกิลด์ที่ต้องการลงทะเบียน' }
  
  const usernameValidation = validateUsername(normalizedUsername)
  if (!usernameValidation.valid) {
    return { success: false, error: usernameValidation.error }
  }
  if (!normalizedPassword) return { success: false, error: 'กรุณากรอกรหัสผ่าน' }
  if (normalizedPassword.length < 6) return { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }
  if (!normalizedDisplayName) return { success: false, error: 'กรุณากรอกชื่อตัวละคร' }
  if (!normalizedJobName) return { success: false, error: 'กรุณากรอกอาชีพ' }

  // Virtual email trick: members sign up with a "username" (no '@')
  const virtualEmail = normalizedUsername.includes('@')
    ? normalizedUsername.toLowerCase()
    : `${normalizedUsername.toLowerCase()}${VIRTUAL_EMAIL_DOMAIN}`

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: virtualEmail,
    password: normalizedPassword,
  })

  if (authError) {
    // Keep it simple but user-friendly
    return { success: false, error: authError.message }
  }

  const userId = authData.user?.id
  if (!userId) {
    return { success: false, error: 'ไม่สามารถสร้างบัญชีผู้ใช้งานได้' }
  }

  const supabaseAdmin = await createAdminClient()

  // Ensure guild exists (also helps prevent FK issues)
  const { data: guild, error: guildError } = await (supabaseAdmin as any)
    .from('guilds')
    .select('id')
    .eq('id', normalizedGuildId)
    .maybeSingle()

  if (guildError) return { success: false, error: guildError.message }
  if (!(guild as any)?.id) return { success: false, error: 'ไม่พบกิลด์ที่ต้องการลงทะเบียน' }

  const { error: profileError } = await (supabaseAdmin as any)
    .from('profiles')
    .upsert(
      [
        {
          id: userId,
          uid_game: normalizedUsername,
          
          display_name: normalizedDisplayName,
          job_name: normalizedJobName,
          role: 'member',
          guild_id: normalizedGuildId,
          avatar_url: '',
          p_atk: 0,
          m_atk: 0,
          p_def: 0,
          m_def: 0,
          p_dmg: 0,
          m_dmg: 0,
          p_reduc: 0,
          m_reduc: 0,
          pvp_dmg: 0,
          pvp_reduc: 0,
          cri: 0,
          cri_dmg: 0,
          party_id: null,
          slot_index: null,
          is_on_leave: false,
          created_at: new Date().toISOString(),
        },
      ] as any,
      { onConflict: 'id' },
    )

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  // ✅ สร้าง session ให้กับผู้ใช้หลัง signup เพื่อให้ logged in ทันที
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: virtualEmail,
    password: normalizedPassword,
  })

  if (signInError) {
    return { success: false, error: 'สมัครสมาชิกสำเร็จ แต่ไม่สามารถเข้าสู่ระบบได้ โปรดลองล็อกอินด้วยตนเอง' }
  }

  redirect('/')
}

