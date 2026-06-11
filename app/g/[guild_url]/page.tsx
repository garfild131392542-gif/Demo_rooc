import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
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
    .select('id, name, guild_url')
    .eq('guild_url', guildUrl)
    .maybeSingle()

  if (guildError || !(guild as any)?.id) {
    return notFound()
  }
  const guildAny = guild as any

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        <Image src="/invite.png" alt="Invite background" fill priority className="object-cover" sizes="100vw" />
      </div>
      <div className="absolute inset-0 bg-black/25 dark:bg-black/40" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <GuildInviteForm
            guildId={guildAny.id}
            guildName={guildAny.name}
          />
        </div>
      </div>
    </div>
  )
}

