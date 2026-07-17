'use client'

import { useState, useTransition } from 'react'
import { 
  Shield, 
  Users, 
  Bell, 
  Edit3, 
  Calendar, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { updateGuildPlanAndExpiry, saveAnnouncementWithTargets } from '@/app/actions/admin-guilds'

type GuildItem = {
  id: string
  name: string
  server_name: string
  status: 'pending' | 'approved' | 'rejected'
  plan_type: string
  trial_ends_at: string | null
  created_at: string
  member_count: number
  owner?: {
    display_name: string
    email: string | null
  } | null
}

type AnnouncementConfig = {
  id: string
  title: string
  subtitle?: string | null
  items: Array<{
    icon: string
    label: string
    detail: string
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
    youtubeUrl?: string | null
  }>
  footer?: string | null
  is_active: boolean
  targetGuildIds: string[]
}

type Props = {
  initialGuilds: GuildItem[]
  initialAnnouncement: AnnouncementConfig | null
}

export default function AdminControlClient({ initialGuilds, initialAnnouncement }: Props) {
  const [activeTab, setActiveTab] = useState<'guilds' | 'announcement'>('guilds')
  const [guilds, setGuilds] = useState<GuildItem[]>(initialGuilds)
  
  // Expiry / Plan Edit Modal State
  const [editingGuild, setEditingGuild] = useState<GuildItem | null>(null)
  const [editPlanType, setEditPlanType] = useState<string>('free')
  const [editExpiryDate, setEditExpiryDate] = useState<string>('')
  const [isSavingGuild, setIsSavingGuild] = useState(false)
  const [guildError, setGuildError] = useState<string | null>(null)

  // Announcement Editor State
  const [annTitle, setAnnTitle] = useState(initialAnnouncement?.title || '📢 อัปเดตระบบล่าสุด')
  const [annSubtitle, setAnnSubtitle] = useState(initialAnnouncement?.subtitle || '')
  const [annFooter, setAnnFooter] = useState(initialAnnouncement?.footer || '')
  const [annIsActive, setAnnIsActive] = useState(initialAnnouncement?.is_active ?? true)
  const [annItems, setAnnItems] = useState<AnnouncementConfig['items']>(
    initialAnnouncement?.items || [
      {
        icon: '🤖',
        label: 'รายละเอียดหัวข้อย่อย',
        detail: 'อธิบายรายละเอียดของฟีเจอร์ใหม่...',
        color: 'blue',
        youtubeUrl: ''
      }
    ]
  )
  const [targetGuildIds, setTargetGuildIds] = useState<string[]>(initialAnnouncement?.targetGuildIds || [])
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false)
  const [annMsg, setAnnMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [isPending, startTransition] = useTransition()

  // Format Date Helper
  const formatDateString = (isoString: string | null) => {
    if (!isoString) return 'ไม่มีวันหมดอายุ (Pro ถาวร)'
    const date = new Date(isoString)
    return date.toLocaleDateString('th-TH', { dateStyle: 'medium' })
  };

  const getDaysRemaining = (isoString: string | null) => {
    if (!isoString) return Infinity
    const diffTime = new Date(isoString).getTime() - Date.now()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  };

  // Guild Edit Modal Functions
  const openEditModal = (guild: GuildItem) => {
    setEditingGuild(guild)
    setEditPlanType(guild.plan_type)
    if (guild.trial_ends_at) {
      setEditExpiryDate(new Date(guild.trial_ends_at).toISOString().split('T')[0])
    } else {
      setEditExpiryDate('')
    }
    setGuildError(null)
  }

  const handleSaveGuild = async () => {
    if (!editingGuild) return
    setIsSavingGuild(true)
    setGuildError(null)

    const trial_ends_at = editExpiryDate ? new Date(editExpiryDate).toISOString() : null

    const result = await updateGuildPlanAndExpiry(editingGuild.id, {
      plan_type: editPlanType,
      trial_ends_at
    })

    setIsSavingGuild(false)

    if (result.success) {
      setGuilds(prev => prev.map(g => g.id === editingGuild.id ? { ...g, plan_type: editPlanType, trial_ends_at } : g))
      setEditingGuild(null)
    } else {
      setGuildError(result.error || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล')
    }
  }

  // Announcement Items Functions
  const handleAddItem = () => {
    setAnnItems(prev => [
      ...prev,
      { icon: '🚀', label: 'ฟีเจอร์ใหม่', detail: 'รายละเอียดเพิ่มเติม...', color: 'blue', youtubeUrl: '' }
    ])
  }

  const handleRemoveItem = (index: number) => {
    setAnnItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpdateItemField = (index: number, field: keyof AnnouncementConfig['items'][0], value: any) => {
    setAnnItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  // Guild Checklist Functions
  const handleToggleGuild = (guildId: string) => {
    setTargetGuildIds(prev => 
      prev.includes(guildId) ? prev.filter(id => id !== guildId) : [...prev, guildId]
    )
  }

  const handleSelectAllGuilds = () => {
    setTargetGuildIds(guilds.map(g => g.id))
  }

  const handleClearAllGuilds = () => {
    setTargetGuildIds([])
  }

  // Save Announcement
  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true)
    setAnnMsg(null)

    const result = await saveAnnouncementWithTargets({
      title: annTitle,
      subtitle: annSubtitle || undefined,
      items: annItems,
      footer: annFooter || undefined,
      is_active: annIsActive
    }, targetGuildIds)

    setIsSavingAnnouncement(false)

    if (result.success) {
      setAnnMsg({ type: 'success', text: 'บันทึกข้อมูลประกาศและกลุ่มเป้าหมายเรียบร้อยแล้ว!' })
      // Auto clear message after 3 seconds
      setTimeout(() => setAnnMsg(null), 3000)
    } else {
      setAnnMsg({ type: 'error', text: result.error || 'ไม่สามารถบันทึกประกาศได้' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/20">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                หน้าจัดการควบคุม (Admin Control)
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                สำหรับผู้ดูแลระบบสูงสุดในการควบคุมข้อมูลกิลด์ สมาชิก และสร้างระบบการแจ้งเตือน Modal เจาะกลุ่มเป้าหมาย
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab('guilds')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'guilds'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              จัดการสิทธิ์กิลด์ ({guilds.length})
            </button>
            <button
              onClick={() => setActiveTab('announcement')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'announcement'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              ระบบประกาศเจาะกิลด์ ({targetGuildIds.length})
            </button>
          </div>
        </div>

        {/* Tab content 1: Guilds List & Expiry management */}
        {activeTab === 'guilds' && (
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-bold">รายชื่อกิลด์และอายุสมาชิกในระบบ</h3>
              <p className="text-xs text-slate-400 mt-1">แสดงข้อมูลภาพรวมของกิลด์ทั้งหมดที่อนุมัติเข้ามาใช้งาน</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">ข้อมูลกิลด์</th>
                    <th className="px-6 py-4">หัวหน้ากิลด์</th>
                    <th className="px-6 py-4 text-center">สมาชิก</th>
                    <th className="px-6 py-4">แผนการใช้งาน</th>
                    <th className="px-6 py-4">วันหมดอายุกิลด์</th>
                    <th className="px-6 py-4 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {guilds.map((guild) => {
                    const daysRemaining = getDaysRemaining(guild.trial_ends_at)
                    const isExpired = daysRemaining <= 0
                    
                    return (
                      <tr key={guild.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{guild.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">เซิร์ฟเวอร์: {guild.server_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-200">{guild.owner?.display_name || 'ไม่พบหัวหน้ากิลด์'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{guild.owner?.email || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-blue-400">
                          {guild.member_count} คน
                        </td>
                        <td className="px-6 py-4">
                          {guild.plan_type === 'pro' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              🏆 PRO Plan
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                              🆓 FREE Trial
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`font-semibold ${isExpired ? 'text-red-400' : 'text-slate-200'}`}>
                            {formatDateString(guild.trial_ends_at)}
                          </div>
                          {guild.trial_ends_at && (
                            <div className={`text-[10px] font-bold mt-1 ${
                              isExpired 
                                ? 'text-red-400/80' 
                                : daysRemaining <= 3 
                                  ? 'text-yellow-400/80 animate-pulse' 
                                  : 'text-slate-400'
                            }`}>
                              {isExpired ? '🚨 หมดอายุการใช้งานแล้ว' : `⌛ เหลืออีก ${daysRemaining} วัน`}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openEditModal(guild)}
                            className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            แก้ไขสิทธิ์
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {guilds.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                        ไม่พบข้อมูลกิลด์ในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab content 2: Targeted Announcement modal builder */}
        {activeTab === 'announcement' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Col 1 & 2: Announcement Editor Form */}
            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-md">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold">แก้ไขเนื้อหาของประกาศโพลแอป (Modal)</h3>
                <p className="text-xs text-slate-400 mt-1">ประกาศนี้จะเด้งแสดงผลตอนล็อกอินแรกสุดของวัน เฉพาะกิลด์ที่ถูกติ๊กเลือกเท่านั้น</p>
              </div>

              {/* Status Message */}
              {annMsg && (
                <div className={`p-4 rounded-xl border flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 ${
                  annMsg.type === 'success' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-300' 
                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                }`}>
                  {annMsg.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <p className="text-xs font-bold">{annMsg.text}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Switch Active */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-xs font-bold">สถานะประกาศ</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">เปิด-ปิดการเด้งแจ้งเตือนของประกาศฉบับนี้</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={annIsActive} 
                      onChange={(e) => setAnnIsActive(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">หัวข้อหลัก</label>
                    <input
                      type="text"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      className="block w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs font-semibold"
                      placeholder="กรอกหัวข้อใหญ่..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">คำบรรยายสั้นๆ</label>
                    <input
                      type="text"
                      value={annSubtitle}
                      onChange={(e) => setAnnSubtitle(e.target.value)}
                      className="block w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs font-semibold"
                      placeholder="กรอกคำอธิบายเพิ่มเติมใต้หัวข้อ..."
                    />
                  </div>
                </div>

                {/* Dynamic list items */}
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <label className="block text-xs font-bold uppercase text-slate-400">รายการเนื้อหาประกาศ ({annItems.length})</label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-[10px] font-bold border border-blue-500/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มรายการย่อย
                    </button>
                  </div>

                  <div className="space-y-3">
                    {annItems.map((item, index) => (
                      <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 relative group">
                        
                        {/* Remove item button */}
                        {annItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="cursor-pointer absolute top-3 right-3 p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          {/* Emoji Icon */}
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">ไอคอน (Emoji)</label>
                            <input
                              type="text"
                              value={item.icon}
                              onChange={(e) => handleUpdateItemField(index, 'icon', e.target.value)}
                              className="text-center block w-full rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs"
                              placeholder="เช่น 🤖"
                            />
                          </div>

                          {/* Item Title/Badge */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">หัวข้อย่อย</label>
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => handleUpdateItemField(index, 'label', e.target.value)}
                              className="block w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs font-bold"
                              placeholder="หัวข้อประกาศย่อย..."
                            />
                          </div>

                          {/* Badge Color */}
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">สีของกรอบ</label>
                            <select
                              value={item.color}
                              onChange={(e) => handleUpdateItemField(index, 'color', e.target.value)}
                              className="cursor-pointer block w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-white shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs"
                            >
                              <option value="blue">🔵 ฟ้า (Blue)</option>
                              <option value="green">🟢 เขียว (Green)</option>
                              <option value="yellow">🟡 เหลือง (Yellow)</option>
                              <option value="red">🔴 แดง (Red)</option>
                              <option value="purple">🟣 ม่วง (Purple)</option>
                            </select>
                          </div>
                        </div>

                        {/* Item Detail */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">เนื้อหาคำอธิบาย</label>
                          <textarea
                            value={item.detail}
                            onChange={(e) => handleUpdateItemField(index, 'detail', e.target.value)}
                            rows={2}
                            className="block w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-slate-200 placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs resize-none leading-relaxed"
                            placeholder="กรอกรายละเอียดอธิบายเพิ่มเติม..."
                          />
                        </div>

                        {/* Optional Youtube URL */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">ลิงก์วิดีโอ YouTube (ถ้ามี)</label>
                          <input
                            type="url"
                            value={item.youtubeUrl || ''}
                            onChange={(e) => handleUpdateItemField(index, 'youtubeUrl', e.target.value || null)}
                            className="block w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs"
                            placeholder="https://youtu.be/..."
                          />
                        </div>

                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer text */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">ข้อความปิดท้าย (Footer)</label>
                  <input
                    type="text"
                    value={annFooter}
                    onChange={(e) => setAnnFooter(e.target.value)}
                    className="block w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs font-semibold"
                    placeholder="เช่น ขอบคุณสมาชิกทุกท่าน 🙏"
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="border-t border-white/10 pt-4 flex justify-between items-center gap-3">
                <p className="text-[10px] text-slate-500">
                  * การกดบันทึกจะสร้าง ID ประกาศใหม่ทันที ซึ่งจะทำให้หน้าต่างเด้งแสดงผลอีกครั้งแม้ผู้ใช้กดปิดไปแล้ววันนี้
                </p>
                <button
                  type="button"
                  onClick={handleSaveAnnouncement}
                  disabled={isSavingAnnouncement || annItems.length === 0}
                  className="cursor-pointer px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-md shadow-blue-500/10 hover:scale-105 active:scale-95"
                >
                  {isSavingAnnouncement ? 'กำลังบันทึก...' : '💾 บันทึกประกาศและการติ๊กกิลด์'}
                </button>
              </div>
            </div>

            {/* Col 3: Guild Targeting Checkbox List */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl backdrop-blur-md max-h-[85vh] flex flex-col">
              <div>
                <h3 className="text-md font-bold">🎯 ติ๊กกิลด์เป้าหมาย</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">ติ๊กเลือกกิลด์เฉพาะที่คุณต้องการให้เห็นประกาศนี้</p>
              </div>

              {/* Selector Helpers */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllGuilds}
                  className="cursor-pointer flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-300"
                >
                  ☑️ เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={handleClearAllGuilds}
                  className="cursor-pointer flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-300"
                >
                  ⬜ ล้างทั้งหมด
                </button>
              </div>

              {/* Checkbox list */}
              <div className="overflow-y-auto flex-1 space-y-2 pr-1 divide-y divide-white/5">
                {guilds.map((g) => {
                  const isChecked = targetGuildIds.includes(g.id)
                  return (
                    <label 
                      key={g.id}
                      className="flex items-center justify-between py-2.5 px-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                          {g.name}
                        </span>
                        <span className="text-[9px] text-slate-500 truncate mt-0.5">
                          {g.server_name} | {g.member_count} สมาชิก
                        </span>
                      </div>
                      
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleGuild(g.id)}
                          className="peer sr-only"
                        />
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-500/20'
                            : 'border-slate-600 group-hover:border-slate-400'
                        }`}>
                          {isChecked && (
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
                {guilds.length === 0 && (
                  <p className="text-center text-xs text-slate-500 py-6">ไม่พบข้อมูลกิลด์ในระบบ</p>
                )}
              </div>

              {/* Summary Counter */}
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center text-xs">
                <span>เลือกกิลด์เป้าหมายแล้ว: </span>
                <span className="font-bold text-blue-400">{targetGuildIds.length} กิลด์</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Expiry & Plan Edit Modal */}
      {editingGuild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-sm p-6 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h4 className="text-lg font-bold text-white">แก้ไขข้อมูลสิทธิ์กิลด์</h4>
              <p className="text-xs text-slate-400 mt-1">กิลด์: <span className="text-white font-bold">{editingGuild.name}</span></p>
            </div>

            {guildError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold rounded-xl text-center">
                {guildError}
              </div>
            )}

            <div className="space-y-4">
              {/* Plan Type dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">แผนการใช้งาน (Plan Type)</label>
                <select
                  value={editPlanType}
                  onChange={(e) => setEditPlanType(e.target.value)}
                  className="cursor-pointer w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-white shadow-inner focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-xs font-bold"
                >
                  <option value="free">🆓 FREE Trial (ทดลองฟรี 14 วัน)</option>
                  <option value="pro">🏆 PRO Plan (ต่ออายุทีละ 30 วัน)</option>
                </select>
              </div>

              {/* Expiry datepicker */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">วันสิ้นสุดอายุการใช้งาน (Expiry Date)</label>
                <div className="relative">
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-white shadow-inner focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-xs font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">* เว้นว่างไว้หากไม่มีกำหนดหมดอายุการใช้งาน (Pro ถาวร)</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setEditingGuild(null)}
                className="cursor-pointer flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveGuild}
                disabled={isSavingGuild}
                className="cursor-pointer flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/10"
              >
                {isSavingGuild ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
