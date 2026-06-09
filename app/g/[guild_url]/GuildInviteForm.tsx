'use client'

import { useState } from 'react'
import { registerMemberWithGuildInvite } from '@/app/actions/guild-invite'

type Props = {
  guildId: string
  guildName: string
}

export default function GuildInviteForm({ guildId, guildName }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [jobName, setJobName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await registerMemberWithGuildInvite(
        guildId,
        username,
        password,
        displayName,
        jobName,
      )

      if (!result?.success) {
        setError(result?.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก')
        setLoading(false)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-4xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-black/20 backdrop-blur-3xl ring-1 ring-white/10 dark:border-white/10 dark:bg-black/30 transition-all duration-300 sm:p-10">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          สมัครสมาชิกเพื่อเข้าร่วมกิลด์
        </h2>
        <p className="mt-2 text-sm text-white/80">
          กิลด์: <span className="font-semibold text-white">{guildName}</span>
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-500/10 p-4 shadow-sm border border-red-500/20">
          <p className="text-sm font-medium text-red-200 text-center">
            {error}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-white/80">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            name="username"
            className="mt-1 block w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/50 shadow-sm shadow-black/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 sm:text-sm"
            placeholder="กรอก username"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80">
            Password
          </label>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              name="password"
              className="block w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 pr-12 text-white placeholder-white/50 shadow-sm shadow-black/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 sm:text-sm"
              placeholder="กรอกรหัสผ่าน"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M9.172 9.172a4 4 0 015.656 5.656m-6.364-1.414A6 6 0 1119.071 11" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80">
            ชื่อตัวละคร
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            name="displayName"
            className="mt-1 block w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/50 shadow-sm shadow-black/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 sm:text-sm"
            placeholder="กรอกชื่อตัวละคร"
          />
        </div>

        <div>
  <label
    htmlFor="jobName"
    className="block text-sm font-medium text-white/80 mb-1"
  >
    Job Name (อาชีพ)
  </label>
  <select
    id="jobName"
    name="jobName"
    required
    value={jobName}
    onChange={(e) => setJobName(e.target.value)}
    className="cursor-pointer w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-black outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
  >
    <option value="" disabled>
      -- กรุณาเลือกอาชีพ --
    </option>
    <option value="Lord Knight">Lord Knight</option>
    <option value="Paladin">Paladin</option>
    <option value="Biochemist">Biochemist</option>
    <option value="Mastersmith">Mastersmith</option>
    <option value="Bard">Bard</option>
    <option value="Gypsy">Gypsy</option>
    <option value="Sniper">Sniper</option>
    <option value="Champion">Champion</option>
    <option value="Priest">Priest</option>
    <option value="Assassin">Assassin</option>
    <option value="Rogue">Rogue</option>
    <option value="Wizard">Wizard</option>
    <option value="Sage">Sage</option>
    <option value="Summoner">Summoner</option>
  </select>
</div>

        <button
          type="submit"
          disabled={loading}
          className="group relative flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 transition-colors shadow-md"
        >
          {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
        </button>
      </form>
    </div>
  
  )
}

