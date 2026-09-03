'use client'

import { useState, useTransition } from 'react'
import { GuildAttendanceLog } from '@/types/database'
import { deleteAttendanceLog } from '@/app/actions/attendance'
import { getJobIconUrl } from '@/components/helpers'

interface Props {
  logs: GuildAttendanceLog[]
  isAdmin: boolean
  onClose: () => void
  onSelectEdit: (log: GuildAttendanceLog) => void
  onRefreshLogs: () => void
}

export default function AttendanceLogHistoryModal({
  logs,
  isAdmin,
  onClose,
  onSelectEdit,
  onRefreshLogs,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLog, setSelectedLog] = useState<GuildAttendanceLog | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter logs by search term
  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase()
    return (
      log.title.toLowerCase().includes(q) ||
      log.date.includes(q) ||
      (log.created_by_name && log.created_by_name.toLowerCase().includes(q))
    )
  })

  const handleDelete = async (logId: string, title: string) => {
    if (!isAdmin) return
    const confirmed = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการเช็คชื่อ "${title}" ?\n\nเมื่อลบแล้วจะไม่สามารถกู้คืนได้`)
    if (!confirmed) return

    setDeletingId(logId)
    startTransition(async () => {
      const res = await deleteAttendanceLog(logId)
      setDeletingId(null)
      if (res.success) {
        if (selectedLog?.id === logId) {
          setSelectedLog(null)
        }
        onRefreshLogs()
      } else {
        alert(res.error || 'เกิดข้อผิดพลาดในการลบ Log')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl w-full max-w-[1200px] flex flex-col overflow-hidden max-h-[92vh] border border-slate-200 dark:border-slate-800">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📜</span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                ประวัติการเช็คชื่อกิจกรรมกิลด์ (Attendance Logs)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                บันทึกและสถิติการเช็คชื่อย้อนหลัง สามารถเรียกดู แก้ไข หรือลบข้อมูลได้
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body: Split view (List on left, Detail on right when selected) */}
        <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
          
          {/* LEFT: Logs List */}
          <div className={`w-full ${selectedLog ? 'md:w-1/2 lg:w-5/12' : 'w-full'} flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-hidden`}>
            {/* Search toolbar */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 ค้นหาตามชื่อกิจกรรม หรือ วันที่ (เช่น 2026-09)..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* List items */}
            <div className="flex-grow overflow-y-auto p-3 space-y-2.5">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs">
                  {searchTerm ? 'ไม่พบ Log การเช็คชื่อที่ตรงกับคำค้นหา' : 'ยังไม่มีประวัติการเช็คชื่อในระบบ'}
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isSelected = selectedLog?.id === log.id
                  const attendanceRate = log.total_members > 0 
                    ? Math.round((log.present_count / log.total_members) * 100) 
                    : 0

                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {log.title}
                            </span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-bold">
                              {log.activity_type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <span>📅 {log.date}</span>
                            {log.created_by_name && (
                              <span>• บันทึกโดย: {log.created_by_name}</span>
                            )}
                          </p>
                        </div>

                        {/* Rate Badge */}
                        <div className="text-right shrink-0">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            attendanceRate >= 80
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : attendanceRate >= 50
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {attendanceRate}% เข้าร่วม
                          </span>
                        </div>
                      </div>

                      {/* Stat badges */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 text-[10px] font-bold">
                        <span className="text-slate-500">รวม {log.total_members} คน</span>
                        <span className="text-emerald-600 dark:text-emerald-400">✅ มา {log.present_count}</span>
                        <span className="text-rose-600 dark:text-rose-400">❌ ขาด {log.absent_count}</span>
                        {log.leave_count > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">📝 ลา {log.leave_count}</span>
                        )}
                      </div>

                      {/* Action buttons inside card */}
                      <div className="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/40">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectEdit(log)
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                          >
                            ✏️ แก้ไขข้อมูลนี้
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            disabled={deletingId === log.id || isPending}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(log.id, log.title)
                            }}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {deletingId === log.id ? 'กำลังลบ...' : '🗑️ ลบ'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* RIGHT: Selected Log Detail View */}
          {selectedLog ? (
            <div className="w-full md:w-1/2 lg:w-7/12 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-850/40">
              {/* Detail Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {selectedLog.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    วันที่ {selectedLog.date} • ผู้บันทึก: {selectedLog.created_by_name || 'แอดมิน'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onSelectEdit(selectedLog)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                    >
                      ✏️ โหลดขึ้นแก้ไข
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1.5 rounded cursor-pointer"
                  >
                    ✕ ปิด
                  </button>
                </div>
              </div>

              {/* Note banner if available */}
              {selectedLog.note && (
                <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold">📝 หมายเหตุ:</span> {selectedLog.note}
                </div>
              )}

              {/* Roster snapshot table */}
              <div className="flex-grow overflow-y-auto p-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2 px-3 font-bold">#</th>
                        <th className="py-2 px-3 font-bold">ชื่อตัวละคร</th>
                        <th className="py-2 px-3 font-bold">สายอาชีพ</th>
                        <th className="py-2 px-3 font-bold text-center">ห้อง / ปาร์ตี้</th>
                        <th className="py-2 px-3 font-bold text-center">สถานะ</th>
                        <th className="py-2 px-3 font-bold">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedLog.records.map((rec, idx) => {
                        const isPresent = rec.status === 'present'
                        const isAbsent = rec.status === 'absent'
                        const isLeave = rec.status === 'leave'

                        return (
                          <tr
                            key={rec.profile_id || idx}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                              isAbsent ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-slate-400 font-semibold">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                              {rec.display_name}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <img
                                  src={getJobIconUrl(rec.job_name)}
                                  alt=""
                                  className="w-4 h-4 object-contain"
                                />
                                <span className="text-slate-600 dark:text-slate-400">{rec.job_name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rec.room === 'main'
                                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                    : rec.room === 'sub'
                                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {rec.room === 'main'
                                  ? `ห้องหลัก ${rec.party_id ? `(P.${rec.party_id})` : ''}`
                                  : rec.room === 'sub'
                                  ? `ห้องรอง ${rec.party_id ? `(P.${rec.party_id})` : ''}`
                                  : 'กองหนุน'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isPresent && (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                                  ✅ มา
                                </span>
                              )}
                              {isAbsent && (
                                <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                                  ❌ ขาด
                                </span>
                              )}
                              {isLeave && (
                                <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                                  📝 ลา
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                              {rec.note || '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-grow items-center justify-center p-8 text-center text-slate-400 dark:text-slate-600">
              <div>
                <span className="text-4xl">👈</span>
                <p className="text-xs font-semibold mt-2">คลิกเลือกรายการ Log ทางซ้ายเพื่อดูรายละเอียด</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
