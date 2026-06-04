import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import GuildInviteForm from './GuildInviteForm'

export default async function GuildInvitePage({
  params,
}: {
  params: Promise<{ guild_url: string }> // ประกาศให้ชัดว่าเป็น Promise
}) {
  // ต้องรอให้ params พร้อมก่อนถึงจะดึงค่าออกมาได้
  const { guild_url } = await params
  const rawGuildUrl = guild_url ?? ''
  
  const guildUrl = decodeURIComponent(rawGuildUrl).trim().toLowerCase()

  const supabaseAdmin = await createAdminClient()

  const { data: guild, error: guildError } = await (supabaseAdmin as any)
    .from('guilds')
    .select('id, name, server_name, guild_url')
    .eq('guild_url', guildUrl)
    .maybeSingle()

  if (guildError || !(guild as any)?.id) {
    return notFound()
  }
  const guildAny = guild as any

  return (
    <div className="w-full mt-10 max-w-5xl mx-auto px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-blue-600">Guild Invite</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          เข้าร่วมกิลด์: <span className="font-bold">{guildAny.name}</span>
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          เซิร์ฟเวอร์: <span className="font-bold">{guildAny.server_name}</span>
        </p>
      </div>

      <GuildInviteForm
        guildId={guildAny.id}
        guildName={guildAny.name}
        serverName={guildAny.server_name}
      />
    </div>
  )
}

