'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { ITEM_CONFIG } from './constants'
import { adminBookAuctionQueueForMember, syncMemberAuctionQueue, ItemType } from '@/app/actions/auction'
import { Search, UserCheck, Users, Check, AlertCircle, Sparkles, RefreshCw, X, ChevronDown } from 'lucide-react'

type GuildMember = {
  id: string
  display_name: string
  uid_game: string
  role: string
  avatar_url?: string
}

type AdminProxyBookingProps = {
  guildMembers: GuildMember[]
  memberQueues: any[]
  todayItems: any[]
  onSuccess: () => void
}

const ITEM_TYPES: { key: ItemType; label: string }[] = [
  { key: 'Album', label: 'สมุดการ์ด' },
  { key: 'Puppet', label: 'เศษการ์ดบอส' },
  { key: 'White', label: 'ขนขาว' },
  { key: 'RedBlack', label: 'ขนดำแดง' },
]

export default function AdminProxyBooking({
  guildMembers = [],
  memberQueues = [],
  todayItems = [],
  onSuccess
}: AdminProxyBookingProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [reservationQtys, setReservationQtys] = useState<Record<ItemType, string>>({
    Album: '',
    Puppet: '',
    White: '',
    RedBlack: ''
  })
  const [submittingItem, setSubmittingItem] = useState<ItemType | 'all' | null>(null)
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filter guild members by name or UID
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return guildMembers
    const q = searchQuery.toLowerCase().trim()
    return guildMembers.filter(
      m => m.display_name.toLowerCase().includes(q) || (m.uid_game && m.uid_game.toLowerCase().includes(q))
    )
  }, [guildMembers, searchQuery])

  // Selected member profile
  const selectedMember = useMemo(() => {
    return guildMembers.find(m => m.id === selectedUserId) || null
  }, [guildMembers, selectedUserId])

  // Current queues of the selected member
  const memberCurrentStats = useMemo(() => {
    if (!selectedUserId) return null
    const stats: Record<ItemType, { waiting: number; received: number; total: number }> = {
      Album: { waiting: 0, received: 0, total: 0 },
      Puppet: { waiting: 0, received: 0, total: 0 },
      White: { waiting: 0, received: 0, total: 0 },
      RedBlack: { waiting: 0, received: 0, total: 0 }
    }

    memberQueues.forEach(q => {
      if (q.user_id === selectedUserId && q.item_type in stats) {
        const type = q.item_type as ItemType
        if (q.status === 'waiting') {
          stats[type].waiting += (q.requested_qty || 1)
        } else if (q.status === 'completed' || q.status === 'partial') {
          stats[type].received += (q.received_qty || 1)
        }
        stats[type].total += (q.requested_qty || 1)
      }
    })

    return stats
  }, [memberQueues, selectedUserId])

  const handleSelectMember = (member: GuildMember) => {
    setSelectedUserId(member.id)
    setIsDropdownOpen(false)
    setSearchQuery('')
    setAlertMsg(null)
  }

  // Handle single item booking
  const handleBookSingle = async (itemType: ItemType) => {
    if (!selectedUserId) {
      setAlertMsg({ type: 'error', text: 'กรุณาเลือกสมาชิกที่ต้องการจองให้ก่อนครับ' })
      return
    }

    const qty = parseInt(reservationQtys[itemType] || '0', 10)
    if (qty <= 0) {
      setAlertMsg({ type: 'error', text: 'กรุณาระบุจำนวนไอเทมที่ต้องการจองอย่างน้อย 1 ชิ้น' })
      return
    }

    setSubmittingItem(itemType)
    setAlertMsg(null)

    const result = await adminBookAuctionQueueForMember(selectedUserId, [
      { itemType, requestedQty: qty }
    ])

    setSubmittingItem(null)

    if (result.success) {
      setAlertMsg({
        type: 'success',
        text: `จอง ${ITEM_CONFIG[itemType].label} จำนวน ${qty} ชิ้น ให้ ${selectedMember?.display_name} เรียบร้อยแล้ว!`
      })
      setReservationQtys(prev => ({ ...prev, [itemType]: '' }))
      onSuccess()
      setTimeout(() => setAlertMsg(null), 4000)
    } else {
      setAlertMsg({ type: 'error', text: result.error || 'เกิดข้อผิดพลาดในการจอง' })
    }
  }

  // Handle batch booking of all non-empty items
  const handleBookAll = async () => {
    if (!selectedUserId) {
      setAlertMsg({ type: 'error', text: 'กรุณาเลือกสมาชิกที่ต้องการจองให้ก่อนครับ' })
      return
    }

    const itemsToBook = ITEM_TYPES.map(it => ({
      itemType: it.key,
      requestedQty: parseInt(reservationQtys[it.key] || '0', 10)
    })).filter(it => it.requestedQty > 0)

    if (itemsToBook.length === 0) {
      setAlertMsg({ type: 'error', text: 'กรุณาระบุจำนวนไอเทมที่ต้องการจองอย่างน้อย 1 รายการ' })
      return
    }

    setSubmittingItem('all')
    setAlertMsg(null)

    const result = await adminBookAuctionQueueForMember(selectedUserId, itemsToBook)

    setSubmittingItem(null)

    if (result.success) {
      setAlertMsg({
        type: 'success',
        text: `บันทึกการจองไอเทมทั้งหมดให้ ${selectedMember?.display_name} สำเร็จแล้ว!`
      })
      setReservationQtys({
        Album: '',
        Puppet: '',
        White: '',
        RedBlack: ''
      })
      onSuccess()
      setTimeout(() => setAlertMsg(null), 4000)
    } else {
      setAlertMsg({ type: 'error', text: result.error || 'เกิดข้อผิดพลาดในการจอง' })
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl transition-all space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              จองคิวประมูลแทนสมาชิกในกิลด์
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                สิทธิ์หัวกิลด์
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              เลือกสมาชิกในกิลด์ที่ไม่ได้ใช้งานเว็บด้วยตนเอง เพื่อกดจองคิวประมูลแทนในหน้าเดียว
            </p>
          </div>
        </div>
      </div>

      {/* Alert Notification */}
      {alertMsg && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in duration-200 ${alertMsg.type === 'success'
          ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300'
          : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
          }`}>
          {alertMsg.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p className="text-xs font-bold leading-relaxed">{alertMsg.text}</p>
        </div>
      )}

      {/* 🌟 1. Search & Select Member */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
          1. เลือกสมาชิกเป้าหมาย ({guildMembers.length} คนในกิลด์)
        </label>

        <div className="relative">
          {/* Member Picker Trigger */}
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="cursor-pointer flex items-center justify-between p-3 rounded-2xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/80 dark:hover:bg-white/5 transition-all shadow-inner"
          >
            {selectedMember ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm border border-blue-500/20 shrink-0">
                  {selectedMember.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {selectedMember.display_name} {selectedMember.role === 'admin' && '• 👑 แอดมิน'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-slate-400 dark:text-slate-500 text-xs font-semibold py-1">
                <Users className="w-4 h-4" />
                <span>คลิกเพื่อค้นหาและเลือกสมาชิก...</span>
              </div>
            )}

            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Member Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Search Box */}
              <div className="p-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/50 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="พิมพ์ค้นหาชื่อสมาชิก..."
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none font-semibold"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Members List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 p-1">
                {filteredMembers.map(member => {
                  const isSelected = member.id === selectedUserId
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSelectMember(member)}
                      className={`cursor-pointer w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors ${isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                          }`}>
                          {member.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{member.display_name}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-white shrink-0" strokeWidth={3} />}
                    </button>
                  )
                })}
                {filteredMembers.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6 font-medium">
                    ไม่พบรายชื่อสมาชิกที่ค้นหา
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🌟 2. Member Status & Current Bookings */}
      {selectedMember && memberCurrentStats && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              📊 คิวปัจจุบันของ {selectedMember.display_name}
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
              * จองได้ไม่เกิน 10 ชิ้นต่อประเภท
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ITEM_TYPES.map(it => {
              const stat = memberCurrentStats[it.key]
              const isMax = stat.waiting + stat.received >= 10
              return (
                <div key={it.key} className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{it.label}</span>
                  </div>
                  <div className="text-xs font-extrabold">
                    <span className={stat.waiting > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-400'}>
                      รอ {stat.waiting}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600 mx-1">|</span>
                    <span className={stat.received > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
                      ได้ {stat.received}
                    </span>
                  </div>
                  {isMax && (
                    <span className="text-[9px] font-bold text-red-500 block mt-0.5">เต็มโควตา 10 ชิ้น</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 🌟 3. Item Selection & Quantity Inputs */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
          2. เลือกจำนวนไอเทมที่ต้องการจอง
        </label>

        <div className="grid gap-3">
          {ITEM_TYPES.map(item => {
            const currentVal = reservationQtys[item.key]
            const parsedVal = parseInt(currentVal || '0', 10)
            const isSubmittingThis = submittingItem === item.key
            const isSubmittingAll = submittingItem === 'all'
            const isSessionActive = todayItems.some(s => s.item_name === item.key && s.status === 'active' && s.total_quantity > 0)

            return (
              <div
                key={item.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 hover:border-blue-400/50 transition-all"
              >
                {/* Item Label & Icon */}
                <div className="flex items-center gap-3 min-w-[140px]">
                  <div className={`w-10 h-10 bg-linear-to-b ${ITEM_CONFIG[item.key].color} rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center relative shrink-0 shadow-inner`}>
                    <Image src={ITEM_CONFIG[item.key].icon} alt={item.label} fill className="object-contain p-1" sizes="40px" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">{item.label}</span>
                    <span className={`text-[10px] font-semibold ${isSessionActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {isSessionActive ? '🟢 มีเปิดประมูลวันนี้' : '⚪ ยังไม่มีรอบประมูล'}
                    </span>
                  </div>
                </div>

                {/* Input & Action */}
                <div className="flex items-center gap-3 flex-1 max-w-xs justify-end">
                  <div className="relative w-28">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={currentVal}
                      onChange={e => {
                        const raw = e.target.value
                        if (raw === '') {
                          setReservationQtys(prev => ({ ...prev, [item.key]: '' }))
                          return
                        }
                        const num = parseInt(raw, 10)
                        if (isNaN(num)) return
                        if (num < 0) {
                          setReservationQtys(prev => ({ ...prev, [item.key]: '0' }))
                        } else if (num > 10) {
                          setReservationQtys(prev => ({ ...prev, [item.key]: '10' }))
                        } else {
                          setReservationQtys(prev => ({ ...prev, [item.key]: String(num) }))
                        }
                      }}

                      className="w-full text-center font-bold font-mono rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-inner"
                    />
                  </div>

                  {/* Single Book Button */}
                  <button
                    type="button"
                    disabled={!selectedUserId || parsedVal <= 0 || isSubmittingThis || isSubmittingAll}
                    onClick={() => handleBookSingle(item.key)}
                    className="cursor-pointer px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-blue-500/10 shrink-0 flex items-center gap-1"
                  >
                    {isSubmittingThis ? 'จอง...' : 'จอง'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 🌟 4. Batch Actions Footer */}
      <div className="border-t border-slate-100 dark:border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          💡 สมาชิกที่ถูกจองแทนจะได้รับคิวเรียงลำดับตามเวลาจริง และปรากฏบนกระดานประมูลทันที
        </p>


      </div>
    </div>
  )
}
