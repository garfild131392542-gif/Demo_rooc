'use client'

import { useState, useEffect, useMemo, useTransition, useRef } from 'react'
import { AttendanceRecordItem, GuildAttendanceLog, AttendanceStatus } from '@/types/database'
import { saveAttendanceLog, getAttendanceLogs } from '@/app/actions/attendance'
import { getJobIconUrl } from '@/components/helpers'
import { captureAndDownload } from '@/lib/export-image'
import dynamic from 'next/dynamic'

const AttendanceLogHistoryModal = dynamic(() => import('./AttendanceLogHistoryModal'), {
  ssr: false,
})

type ProfileForAttendance = {
  id: string
  display_name: string | null
  job_name: string | null
  avatar_url?: string | null
  party_id: number | null
  slot_index: number | null
  is_on_leave?: boolean | null
}

interface Props {
  profiles: ProfileForAttendance[]
  isAdmin: boolean
  guildId: string
  guildName?: string
}

export default function AttendanceManager({
  profiles,
  isAdmin,
  guildId,
  guildName = 'ROOC Guild',
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [logs, setLogs] = useState<GuildAttendanceLog[]>([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Current Attendance Session State
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [title, setTitle] = useState<string>('เช็คชื่อ Guild League ประจำสัปดาห์')
  const [activityType, setActivityType] = useState<string>('guild_league')
  const [generalNote, setGeneralNote] = useState<string>('')

  // Member records state
  const [records, setRecords] = useState<AttendanceRecordItem[]>([])

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [roomFilter, setRoomFilter] = useState<'all' | 'main' | 'sub'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'leave'>('all')

  // Export Ref
  const exportCardRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Initialize records from profiles
  const initDefaultRecords = () => {
    const initial: AttendanceRecordItem[] = profiles.map((p) => {
      let room: 'main' | 'sub' | 'reserve' = 'reserve'
      if (p.party_id && p.party_id >= 1 && p.party_id <= 8) room = 'main'
      else if (p.party_id && p.party_id >= 9 && p.party_id <= 16) room = 'sub'

      return {
        profile_id: p.id,
        display_name: p.display_name || 'ไม่ระบุชื่อ',
        job_name: p.job_name || 'Novice',
        avatar_url: p.avatar_url || null,
        party_id: p.party_id,
        slot_index: p.slot_index,
        room: room,
        status: p.is_on_leave ? 'leave' : 'present', // Smart Auto-Leave
        note: p.is_on_leave ? 'ติดสถานะลาในระบบ' : '',
      }
    })
    setRecords(initial)
  }

  // Load logs on mount
  const refreshLogs = async () => {
    try {
      const res = await getAttendanceLogs(guildId)
      if (res.success && res.data) {
        setLogs(res.data)
      }
    } catch (e) {
      console.error('Failed to load logs:', e)
    }
  }

  useEffect(() => {
    initDefaultRecords()
    refreshLogs()
  }, [profiles, guildId])

  // Change individual member status
  const handleStatusChange = (profileId: string, newStatus: AttendanceStatus) => {
    setRecords((prev) =>
      prev.map((r) => (r.profile_id === profileId ? { ...r, status: newStatus } : r))
    )
  }

  // Change individual member note
  const handleNoteChange = (profileId: string, newNote: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.profile_id === profileId ? { ...r, note: newNote } : r))
    )
  }

  // Quick action: Mark all filtered as Present
  const handleMarkAllPresent = () => {
    const targetIds = new Set(filteredRecords.map((r) => r.profile_id))
    setRecords((prev) =>
      prev.map((r) => (targetIds.has(r.profile_id) ? { ...r, status: 'present' } : r))
    )
  }

  // Quick action: Mark all filtered as Absent
  const handleMarkAllAbsent = () => {
    const targetIds = new Set(filteredRecords.map((r) => r.profile_id))
    setRecords((prev) =>
      prev.map((r) => (targetIds.has(r.profile_id) ? { ...r, status: 'absent' } : r))
    )
  }

  // Reset to default
  const handleReset = () => {
    setEditingLogId(null)
    setDate(new Date().toISOString().split('T')[0])
    setTitle('เช็คชื่อ Guild League ประจำสัปดาห์')
    setGeneralNote('')
    initDefaultRecords()
    setStatusMessage({ type: 'success', text: 'รีเซ็ตข้อมูลเรียบร้อยแล้ว' })
    setTimeout(() => setStatusMessage(null), 3000)
  }

  // Load log for editing
  const handleLoadEditLog = (log: GuildAttendanceLog) => {
    setEditingLogId(log.id)
    setDate(log.date)
    setTitle(log.title)
    setActivityType(log.activity_type)
    setGeneralNote(log.note || '')

    // Merge existing records with current profiles in case new profiles were added
    const logRecordsMap = new Map(log.records.map((r) => [r.profile_id, r]))

    const mergedRecords: AttendanceRecordItem[] = profiles.map((p) => {
      const existing = logRecordsMap.get(p.id)
      if (existing) {
        return existing
      }
      let room: 'main' | 'sub' | 'reserve' = 'reserve'
      if (p.party_id && p.party_id >= 1 && p.party_id <= 8) room = 'main'
      else if (p.party_id && p.party_id >= 9 && p.party_id <= 16) room = 'sub'

      return {
        profile_id: p.id,
        display_name: p.display_name || 'ไม่ระบุชื่อ',
        job_name: p.job_name || 'Novice',
        avatar_url: p.avatar_url || null,
        party_id: p.party_id,
        slot_index: p.slot_index,
        room: room,
        status: 'absent',
        note: 'เพิ่มใหม่หลังจากบันทึก Log',
      }
    })

    setRecords(mergedRecords)
    setShowHistoryModal(false)
    setStatusMessage({
      type: 'success',
      text: `กำลังแก้ไขข้อมูล Log: "${log.title}" (อย่าลืมกดบันทึกหลังจากปรับปรุงเสร็จ)`,
    })
  }

  // Save / Update Log
  const handleSaveLog = () => {
    if (!isAdmin) {
      alert('เฉพาะหัวหน้ากิลด์หรือแอดมินเท่านั้นที่สามารถบันทึกการเช็คชื่อได้')
      return
    }

    if (!title.trim()) {
      alert('กรุณาระบุชื่อกิจกรรมหรือหัวข้อการเช็คชื่อ')
      return
    }

    startTransition(async () => {
      setStatusMessage(null)
      const res = await saveAttendanceLog({
        id: editingLogId || undefined,
        title: title.trim(),
        date: date,
        activity_type: activityType,
        note: generalNote,
        records: records,
      })

      if (res.success && res.data) {
        setStatusMessage({
          type: 'success',
          text: editingLogId ? '✅ อัปเดตข้อมูล Log เดิมเรียบร้อยแล้ว!' : '✅ บันทึก Log การเช็คชื่อใหม่สำเร็จ!',
        })
        setEditingLogId(res.data.id)
        refreshLogs()
      } else {
        setStatusMessage({
          type: 'error',
          text: `❌ ${res.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'}`,
        })
      }
    })
  }

  // Export Attendance Summary Image
  const handleExportImage = async () => {
    if (!exportCardRef.current) return
    setIsExporting(true)
    try {
      const filename = `attendance_${date}_${title.replace(/\s+/g, '_')}.jpg`
      await captureAndDownload(exportCardRef.current, filename, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      })
    } catch (e) {
      console.error(e)
      alert('เกิดข้อผิดพลาดในการสร้างรูปภาพ')
    } finally {
      setIsExporting(false)
    }
  }

  // Statistics calculation
  const stats = useMemo(() => {
    const total = records.length
    const present = records.filter((r) => r.status === 'present').length
    const absent = records.filter((r) => r.status === 'absent').length
    const leave = records.filter((r) => r.status === 'leave').length
    const rate = total > 0 ? Math.round((present / total) * 100) : 0
    return { total, present, absent, leave, rate }
  }, [records])

  // Filtered records for display
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        r.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.job_name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchRoom =
        roomFilter === 'all' ||
        (roomFilter === 'main' && r.room === 'main') ||
        (roomFilter === 'sub' && r.room === 'sub')

      const matchStatus =
        statusFilter === 'all' || r.status === statusFilter

      return matchSearch && matchRoom && matchStatus
    })
  }, [records, searchTerm, roomFilter, statusFilter])

  return (
    <div className="space-y-6">
      {/* Alert banner if editing a past log */}
      {editingLogId && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✏️</span>
            <div>
              <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                คุณกำลังอยู่ในโหมดแก้ไข Log ในอดีต (ID: {editingLogId.substring(0, 8)}...)
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                การกดบันทึกจะทำการอัปเดตข้อมูลของ Log เดิมนี้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white/60 dark:bg-slate-900/60 cursor-pointer"
          >
            ยกเลิกการแก้ไข / เริ่มใหม่
          </button>
        </div>
      )}

      {/* Status feedback message */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── REALTIME STATISTICS BANNER ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">👥 สมาชิกทั้งหมด</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total} <span className="text-xs font-normal text-slate-400">คน</span>
          </span>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">✅ มา (Present)</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.present} <span className="text-xs font-normal text-emerald-600/70">คน</span>
          </span>
        </div>

        <div className="bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-rose-700 dark:text-rose-400">❌ ขาด (Absent)</span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {stats.absent} <span className="text-xs font-normal text-rose-600/70">คน</span>
          </span>
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">📝 ลา (Leave)</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.leave} <span className="text-xs font-normal text-amber-600/70">คน</span>
          </span>
        </div>

        <div className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/40 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-blue-700 dark:text-blue-400">📊 อัตราเข้าร่วม</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {stats.rate}%
          </span>
        </div>
      </div>

      {/* ─── CONTROLS TOOLBAR & SESSION INFO ─── */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-grow">
            {/* Date selector */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 dark:text-slate-400 mb-1">
                📅 วันที่ (วัน/เดือน/ปี)
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Title / Activity Name */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 dark:text-slate-400 mb-1">
                🎯 ชื่อกิจกรรม / หัวข้อรอบเช็คชื่อ
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น Guild League รอบชิง, วอร์วันเสาร์"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Activity Type */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 dark:text-slate-400 mb-1">
                🏷️ ประเภทกิจกรรม
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="guild_league">🏆 Guild League (กิลด์ลีก)</option>
                <option value="gvg">⚔️ Guild War (GvG)</option>
                <option value="emperium_overrun">🏰 Emperium Overrun</option>
                <option value="dungeon">🐉 กิจกรรมดันเจี้ยนกิลด์</option>
                <option value="general">📋 ซ้อมทีม / เช็คชื่อประจำวัน</option>
              </select>
            </div>
          </div>

          {/* Action buttons (Save, View Logs, Export Image) */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveLog}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>💾</span>
                <span>{isPending ? 'กำลังบันทึก...' : editingLogId ? 'อัปเดต Log นี้' : 'บันทึก Log การเช็คชื่อ'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <span>📜</span>
              <span>ประวัติ Log ({logs.length})</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportImage}
              className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>📸</span>
              <span>{isExporting ? 'กำลังสร้างรูป...' : 'Export รูปภาพ'}</span>
            </button>
          </div>
        </div>

        {/* ─── FILTERS & QUICK SELECTION BAR ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Left: Search and Room Filter */}
          <div className="flex flex-wrap items-center gap-2.5 flex-grow">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 ค้นหาชื่อ หรือ อาชีพ..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Room Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold select-none">
              <button
                type="button"
                onClick={() => setRoomFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  roomFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setRoomFilter('main')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  roomFilter === 'main'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                🛡️ ห้องหลัก (1-8)
              </button>
              <button
                type="button"
                onClick={() => setRoomFilter('sub')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  roomFilter === 'sub'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                ⚔️ ห้องรอง (9-16)
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-2.5 py-1.5 font-bold cursor-pointer outline-none"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="present">เฉพาะคนมา (Present)</option>
              <option value="absent">เฉพาะคนขาด (Absent)</option>
              <option value="leave">เฉพาะคนลา (Leave)</option>
            </select>
          </div>

          {/* Right: Quick Select Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-black px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              ✅ เลือกทั้งหมด (มา)
            </button>

            <button
              type="button"
              onClick={handleMarkAllAbsent}
              className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-[11px] font-black px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              ❌ ยกเลิกทั้งหมด (ขาด)
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer"
              title="รีเซ็ตค่าเริ่มต้น"
            >
              🔄 รีเซ็ต
            </button>
          </div>
        </div>
      </div>

      {/* ─── MEMBER CHECK-IN TABLE ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 font-bold w-12 text-center">#</th>
                <th className="py-3 px-4 font-bold">ชื่อตัวละคร</th>
                <th className="py-3 px-4 font-bold">สายอาชีพ</th>
                <th className="py-3 px-4 font-bold text-center">ห้อง / ปาร์ตี้</th>
                <th className="py-3 px-4 font-bold text-center w-56">การเช็คชื่อ (สถานะ)</th>
                <th className="py-3 px-4 font-bold">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500 font-semibold">
                    ไม่พบสมาชิกตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item, idx) => {
                  const isPresent = item.status === 'present'
                  const isAbsent = item.status === 'absent'
                  const isLeave = item.status === 'leave'

                  return (
                    <tr
                      key={item.profile_id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isAbsent ? 'bg-rose-50/15 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{item.display_name}</span>
                        </div>
                      </td>

                      {/* Job */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={getJobIconUrl(item.job_name)}
                            alt=""
                            className="w-4 h-4 object-contain shrink-0"
                          />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.job_name}
                          </span>
                        </div>
                      </td>

                      {/* Room / Party */}
                      <td className="py-2.5 px-4 text-center">
                        {item.room === 'main' ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            🛡️ ห้องหลัก (P.{item.party_id || '?'})
                          </span>
                        ) : item.room === 'sub' ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                            ⚔️ ห้องรอง (P.{item.party_id || '?'})
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs">-</span>
                        )}
                      </td>

                      {/* Status Pills */}
                      <td className="py-2.5 px-4 text-center">
                        <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.profile_id, 'present')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                              isPresent
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            ✅ มา
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.profile_id, 'absent')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                              isAbsent
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            ❌ ขาด
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.profile_id, 'leave')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                              isLeave
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            📝 ลา
                          </button>
                        </div>
                      </td>

                      {/* Note */}
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={item.note || ''}
                          onChange={(e) => handleNoteChange(item.profile_id, e.target.value)}
                          placeholder="หมายเหตุ..."
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── HIDDEN CANVAS FOR CAPTURING ATTENDANCE SUMMARY IMAGE ─── */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div
          ref={exportCardRef}
          style={{
            width: '1000px',
            background: '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            fontFamily: 'Arial, sans-serif',
            color: '#0f172a',
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '2.5px solid #1e293b', paddingBottom: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#2563eb' }}>
                  🛡️ {guildName}
                </span>
                <h1 style={{ fontSize: '22px', fontWeight: 900, margin: '4px 0 0 0' }}>
                  ใบสรุปการเช็คชื่อ: {title}
                </h1>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0' }}>
                  วันที่ {date} • บันทึกอัตราเข้าร่วม {stats.rate}%
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                  มา: {stats.present} / {stats.total} คน
                </div>
                <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>
                  ขาด: {stats.absent} • ลา: {stats.leave}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '6px', textAlign: 'center', width: '30px' }}>#</th>
                <th style={{ padding: '6px', textAlign: 'left', width: '180px' }}>ชื่อตัวละคร</th>
                <th style={{ padding: '6px', textAlign: 'left', width: '140px' }}>สายอาชีพ</th>
                <th style={{ padding: '6px', textAlign: 'center', width: '120px' }}>ห้อง / ปาร์ตี้</th>
                <th style={{ padding: '6px', textAlign: 'center', width: '80px' }}>สถานะ</th>
                <th style={{ padding: '6px', textAlign: 'left' }}>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item, i) => (
                <tr
                  key={item.profile_id}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                  }}
                >
                  <td style={{ padding: '4px 6px', textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                  <td style={{ padding: '4px 6px', fontWeight: 700 }}>{item.display_name}</td>
                  <td style={{ padding: '4px 6px' }}>{item.job_name}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    {item.room === 'main'
                      ? `ห้องหลัก (P.${item.party_id || '?'})`
                      : item.room === 'sub'
                      ? `ห้องรอง (P.${item.party_id || '?'})`
                      : '-'}
                  </td>
                  <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 800 }}>
                    {item.status === 'present' ? '✅ มา' : item.status === 'absent' ? '❌ ขาด' : '📝 ลา'}
                  </td>
                  <td style={{ padding: '4px 6px', color: '#64748b' }}>{item.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '9px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>ระบบบริหารจัดการกิลด์ ROOC Management • www.rooc-manage.xyz</span>
            <span>บันทึกประวัติการเช็คชื่อ ณ วันที่ {new Date().toLocaleDateString('th-TH')}</span>
          </div>
        </div>
      </div>

      {/* ─── LOG HISTORY MODAL ─── */}
      {showHistoryModal && (
        <AttendanceLogHistoryModal
          logs={logs}
          isAdmin={isAdmin}
          onClose={() => setShowHistoryModal(false)}
          onSelectEdit={handleLoadEditLog}
          onRefreshLogs={refreshLogs}
        />
      )}
    </div>
  )
}
