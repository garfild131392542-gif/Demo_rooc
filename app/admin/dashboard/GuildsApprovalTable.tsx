'use client'

import { useState, useTransition } from 'react'
import { approveGuild, rejectGuild } from '@/app/actions/admin'

interface Guild {
  id: string
  name: string
  server_name: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at?: string
  guild_url?: string | null
  trial_ends_at?: string | null
  profiles?:
    | {
        display_name: string
        email?: string
      }
    | Array<{
        id: string
        display_name: string
        email?: string
      }>
  owner_id?: string
}

export default function GuildsApprovalTable({ initialGuilds }: { initialGuilds: Guild[] }) {
  const [guilds, setGuilds] = useState(initialGuilds)
  const [isPending, startTransition] = useTransition()
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [rejectingGuildId, setRejectingGuildId] = useState<string | null>(null)

  const handleApprove = (guildId: string) => {
    if (!confirm('ยืนยันการอนุมัติกิลด์นี้หรือไม่?')) return

    startTransition(async () => {
      const result = await approveGuild(guildId)
      if (result.success) {
        // ลบกิลด์ออกจากรายการ pending
        setGuilds(prev => prev.filter(g => g.id !== guildId))
      } else {
        alert(`เกิดข้อผิดพลาด: ${result.error}`)
      }
    })
  }

  const handleRejectClick = (guildId: string) => {
    setRejectingGuildId(guildId)
    setRejectionReason('')
  }

  const handleRejectSubmit = (guildId: string) => {
    if (!rejectionReason?.trim()) {
      alert('กรุณาระบุเหตุผลในการปฏิเสธ')
      return
    }

    startTransition(async () => {
      const result = await rejectGuild(guildId, rejectionReason)
      if (result.success) {
        setGuilds(prev => prev.filter(g => g.id !== guildId))
        setRejectingGuildId(null)
        setRejectionReason(null)
      } else {
        alert(`เกิดข้อผิดพลาด: ${result.error}`)
      }
    })
  }

  if (guilds.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium mb-2">ไม่มีกิลด์ที่รอการอนุมัติ</p>
          <p className="text-sm">ทุกกิลด์ได้รับการอนุมัติแล้ว</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          กิลด์ที่รอการอนุมัติ ({guilds.length})
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ชื่อกิลด์
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                เซิร์ฟเวอร์
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                เจ้าของ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                วันที่ขอ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                การกระทำ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {guilds.map(guild => (
              <tr
                key={guild.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {guild.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {guild.server_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {Array.isArray(guild.profiles)
                    ? guild.profiles[0]?.display_name || 'ไม่ระบุ'
                    : guild.profiles?.display_name || 'ไม่ระบุ'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {new Date(guild.created_at).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                  {rejectingGuildId === guild.id ? (
                    <div className="flex items-center gap-2 justify-end">
                      <input
                        type="text"
                        placeholder="เหตุผลในการปฏิเสธ..."
                        value={rejectionReason || ''}
                        onChange={e => setRejectionReason(e.target.value)}
                        className="px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={isPending}
                      />
                      <button
                        onClick={() => handleRejectSubmit(guild.id)}
                        disabled={isPending}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        ยืนยัน
                      </button>
                      <button
                        onClick={() => {
                          setRejectingGuildId(null)
                          setRejectionReason(null)
                        }}
                        disabled={isPending}
                        className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500 disabled:opacity-50"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(guild.id)}
                        disabled={isPending}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => handleRejectClick(guild.id)}
                        disabled={isPending}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        ปฏิเสธ
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
