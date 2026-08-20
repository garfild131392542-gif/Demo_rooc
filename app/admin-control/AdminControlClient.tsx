'use client'

import { useState, useTransition, useMemo } from 'react'
import { 
  Shield, 
  Users, 
  Bell, 
  Edit3, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { updateGuildPlanAndExpiry, saveAnnouncementCampaign, deleteAnnouncementCampaign, saveUpdateTickerSetting } from '@/app/actions/admin-guilds'

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

type TickerConfig = {
  text: string
  is_visible: boolean
}

type Props = {
  initialGuilds: GuildItem[]
  initialAnnouncements: AnnouncementConfig[]
  initialTicker: TickerConfig
}

export default function AdminControlClient({ initialGuilds, initialAnnouncements, initialTicker }: Props) {
  const [activeTab, setActiveTab] = useState<'guilds' | 'announcement'>('guilds')

  // Update Ticker Editor State
  const [tickerText, setTickerText] = useState(initialTicker?.text || '')
  const [tickerIsVisible, setTickerIsVisible] = useState(initialTicker?.is_visible ?? true)
  const [isSavingTicker, setIsSavingTicker] = useState(false)
  const [tickerMsg, setTickerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSaveTicker = async () => {
    setIsSavingTicker(true)
    setTickerMsg(null)

    const result = await saveUpdateTickerSetting({
      text: tickerText,
      is_visible: tickerIsVisible
    })

    setIsSavingTicker(false)

    if (result.success) {
      setTickerMsg({ type: 'success', text: 'บันทึกข้อความวิ่งเรียบร้อยแล้ว!' })
      setTimeout(() => setTickerMsg(null), 3000)
    } else {
      setTickerMsg({ type: 'error', text: result.error || 'ไม่สามารถบันทึกข้อความวิ่งได้' })
    }
  }
  
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

  // Sorting comparator: Unexpired at the top (ascending by days remaining), Expired at the bottom
  const sortGuilds = (list: GuildItem[]) => {
    return [...list].sort((a, b) => {
      const daysA = getDaysRemaining(a.trial_ends_at)
      const daysB = getDaysRemaining(b.trial_ends_at)
      
      const isExpiredA = daysA <= 0
      const isExpiredB = daysB <= 0
      
      // 1. Unexpired comes before Expired
      if (!isExpiredA && isExpiredB) return -1
      if (isExpiredA && !isExpiredB) return 1
      
      // 2. Both are unexpired
      if (!isExpiredA && !isExpiredB) {
        // Handle null (Infinity) days remaining (Pro lifetime)
        if (a.trial_ends_at === null && b.trial_ends_at !== null) return 1
        if (a.trial_ends_at !== null && b.trial_ends_at === null) return -1
        if (a.trial_ends_at === null && b.trial_ends_at === null) return 0
        
        // Sort by soonest to expire first (ascending order)
        return new Date(a.trial_ends_at!).getTime() - new Date(b.trial_ends_at!).getTime()
      }
      
      // 3. Both are expired
      // Sort by recently expired first (descending order)
      const timeA = a.trial_ends_at ? new Date(a.trial_ends_at).getTime() : 0
      const timeB = b.trial_ends_at ? new Date(b.trial_ends_at).getTime() : 0
      return timeB - timeA
    })
  }

  const [guilds, setGuilds] = useState<GuildItem[]>(() => sortGuilds(initialGuilds))
  
  // Search, Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'subscribed' | 'trial' | 'expired'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Status counts
  const statusCounts = useMemo(() => {
    let subscribed = 0
    let trial = 0
    let expired = 0

    guilds.forEach(g => {
      const days = getDaysRemaining(g.trial_ends_at)
      if (days <= 0) {
        expired++
      } else if (days > 14) {
        subscribed++
      } else {
        trial++
      }
    })

    return { total: guilds.length, subscribed, trial, expired }
  }, [guilds])

  // Filtered & Sorted guilds
  const filteredGuilds = useMemo(() => {
    let list = sortGuilds(guilds)

    if (statusFilter !== 'all') {
      list = list.filter(g => {
        const days = getDaysRemaining(g.trial_ends_at)
        const isExp = days <= 0
        if (statusFilter === 'expired') return isExp
        if (statusFilter === 'subscribed') return !isExp && days > 14
        if (statusFilter === 'trial') return !isExp && days <= 14
        return true
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(g => 
        g.name.toLowerCase().includes(q) ||
        (g.server_name && g.server_name.toLowerCase().includes(q)) ||
        (g.owner?.display_name && g.owner.display_name.toLowerCase().includes(q)) ||
        (g.owner?.email && g.owner.email.toLowerCase().includes(q))
      )
    }

    return list
  }, [guilds, statusFilter, searchQuery])

  const totalPages = Math.ceil(filteredGuilds.length / pageSize) || 1
  const paginatedGuilds = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredGuilds.slice(start, start + pageSize)
  }, [filteredGuilds, currentPage, pageSize])

  // Reset to page 1 on filter or search change
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (val: 'all' | 'subscribed' | 'trial' | 'expired') => {
    setStatusFilter(val)
    setCurrentPage(1)
  }

  const handlePageSizeChange = (val: number) => {
    setPageSize(val)
    setCurrentPage(1)
  }

  // Expiry Edit Modal State
  const [editingGuild, setEditingGuild] = useState<GuildItem | null>(null)
  const [editExpiryDate, setEditExpiryDate] = useState<string>('')
  const [isPermanent, setIsPermanent] = useState(false)
  const [isSavingGuild, setIsSavingGuild] = useState(false)
  const [guildError, setGuildError] = useState<string | null>(null)

  // 🌟 MULTI-ANNOUNCEMENT CAMPAIGN STATE
  const [announcements, setAnnouncements] = useState<AnnouncementConfig[]>(initialAnnouncements || [])
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(() => {
    return initialAnnouncements && initialAnnouncements.length > 0 ? initialAnnouncements[0].id : null
  })

  // Current editing announcement state
  const [annTitle, setAnnTitle] = useState(() => {
    return (initialAnnouncements && initialAnnouncements.length > 0) ? initialAnnouncements[0].title : '📢 ประกาศใหม่'
  })
  const [annSubtitle, setAnnSubtitle] = useState(() => {
    return (initialAnnouncements && initialAnnouncements.length > 0) ? initialAnnouncements[0].subtitle || '' : ''
  })
  const [annFooter, setAnnFooter] = useState(() => {
    return (initialAnnouncements && initialAnnouncements.length > 0) ? initialAnnouncements[0].footer || '' : 'ขอบคุณที่ใช้งานระบบครับ 🙏'
  })
  const [annIsActive, setAnnIsActive] = useState(() => {
    return (initialAnnouncements && initialAnnouncements.length > 0) ? initialAnnouncements[0].is_active : true
  })
  const [annItems, setAnnItems] = useState<AnnouncementConfig['items']>(() => {
    return (initialAnnouncements && initialAnnouncements.length > 0 && initialAnnouncements[0].items && initialAnnouncements[0].items.length > 0)
      ? initialAnnouncements[0].items
      : [{ icon: '🤖', label: 'รายละเอียดหัวข้อย่อย', detail: 'อธิบายรายละเอียด...', color: 'blue', youtubeUrl: '' }]
  })
  const [targetGuildIds, setTargetGuildIds] = useState<string[]>(() => {
    return (initialAnnouncements && initialAnnouncements.length > 0) ? initialAnnouncements[0].targetGuildIds || [] : []
  })
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false)
  const [isDeletingAnnouncement, setIsDeletingAnnouncement] = useState(false)
  const [annMsg, setAnnMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Switch to an existing campaign
  const handleSelectCampaign = (ann: AnnouncementConfig) => {
    setSelectedAnnId(ann.id)
    setAnnTitle(ann.title || '')
    setAnnSubtitle(ann.subtitle || '')
    setAnnFooter(ann.footer || '')
    setAnnIsActive(ann.is_active)
    setAnnItems(ann.items && ann.items.length > 0 ? ann.items : [
      { icon: '🚀', label: 'รายละเอียดหัวข้อย่อย', detail: 'อธิบายรายละเอียด...', color: 'blue', youtubeUrl: '' }
    ])
    setTargetGuildIds(ann.targetGuildIds || [])
    setAnnMsg(null)
  }

  // Create a new blank campaign
  const handleNewCampaign = () => {
    setSelectedAnnId(null)
    setAnnTitle('📢 ประกาศชุดใหม่')
    setAnnSubtitle('')
    setAnnFooter('ขอบคุณที่ใช้งานระบบครับ 🙏')
    setAnnIsActive(true)
    setAnnItems([
      { icon: '🤖', label: 'หัวข้อย่อย', detail: 'กรอกเนื้อหาที่ต้องการแจ้งเตือน...', color: 'blue', youtubeUrl: '' }
    ])
    setTargetGuildIds([])
    setAnnMsg(null)
  }

  // Guild Edit Modal Functions
  const openEditModal = (guild: GuildItem) => {
    setEditingGuild(guild)
    if (guild.trial_ends_at) {
      setIsPermanent(false)
      setEditExpiryDate(new Date(guild.trial_ends_at).toISOString().split('T')[0])
    } else {
      setIsPermanent(true)
      setEditExpiryDate('')
    }
    setGuildError(null)
  }

  const handleAdjustDays = (days: number) => {
    setIsPermanent(false)
    let base = new Date()
    if (editExpiryDate) {
      const current = new Date(editExpiryDate)
      if (current.getTime() > Date.now() && days > 0) {
        base = current
      } else if (days < 0) {
        base = current
      }
    }
    base.setDate(base.getDate() + days)
    setEditExpiryDate(base.toISOString().split('T')[0])
  }

  const handleSetDaysFromToday = (days: number) => {
    setIsPermanent(false)
    const base = new Date()
    base.setDate(base.getDate() + days)
    setEditExpiryDate(base.toISOString().split('T')[0])
  }

  const handleSaveGuild = async () => {
    if (!editingGuild) return
    setIsSavingGuild(true)
    setGuildError(null)

    const trial_ends_at = isPermanent 
      ? null 
      : editExpiryDate 
        ? new Date(editExpiryDate + 'T23:59:59').toISOString() 
        : null

    const newDays = trial_ends_at ? getDaysRemaining(trial_ends_at) : Infinity
    const plan_type = newDays > 14 ? 'pro' : 'free'

    const result = await updateGuildPlanAndExpiry(editingGuild.id, {
      plan_type,
      trial_ends_at
    })

    setIsSavingGuild(false)

    if (result.success) {
      const updated = guilds.map(g => g.id === editingGuild.id ? { ...g, plan_type, trial_ends_at } : g)
      setGuilds(sortGuilds(updated))
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

  // Save Announcement Campaign
  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true)
    setAnnMsg(null)

    const payload = {
      id: selectedAnnId || undefined,
      title: annTitle.trim() || '📢 ประกาศระบบ',
      subtitle: annSubtitle.trim() || undefined,
      items: annItems,
      footer: annFooter.trim() || undefined,
      is_active: annIsActive
    }

    const result = await saveAnnouncementCampaign(payload, targetGuildIds)

    setIsSavingAnnouncement(false)

    if (result.success) {
      const newId = result.id || selectedAnnId || 'temp-id'
      setAnnMsg({ type: 'success', text: selectedAnnId ? 'อัปเดตชุดประกาศเรียบร้อยแล้ว!' : 'สร้างชุดประกาศใหม่เรียบร้อยแล้ว!' })
      
      const updatedCampaign: AnnouncementConfig = {
        id: newId,
        title: payload.title,
        subtitle: payload.subtitle || null,
        items: payload.items,
        footer: payload.footer || null,
        is_active: payload.is_active,
        targetGuildIds: targetGuildIds
      }

      setAnnouncements(prev => {
        const exists = prev.some(a => a.id === updatedCampaign.id)
        if (exists) {
          return prev.map(a => a.id === updatedCampaign.id ? updatedCampaign : a)
        } else {
          return [updatedCampaign, ...prev]
        }
      })
      setSelectedAnnId(newId)
      setTimeout(() => setAnnMsg(null), 3000)
    } else {
      setAnnMsg({ type: 'error', text: result.error || 'ไม่สามารถบันทึกประกาศได้' })
    }
  }

  // Delete Announcement Campaign
  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnId) return
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบชุดประกาศนี้?')) return

    setIsDeletingAnnouncement(true)
    setAnnMsg(null)

    const result = await deleteAnnouncementCampaign(selectedAnnId)
    setIsDeletingAnnouncement(false)

    if (result.success) {
      setAnnMsg({ type: 'success', text: 'ลบชุดประกาศเรียบร้อยแล้ว' })
      const remaining = announcements.filter(a => a.id !== selectedAnnId)
      setAnnouncements(remaining)
      if (remaining.length > 0) {
        handleSelectCampaign(remaining[0])
      } else {
        handleNewCampaign()
      }
      setTimeout(() => setAnnMsg(null), 3000)
    } else {
      setAnnMsg({ type: 'error', text: result.error || 'ไม่สามารถลบประกาศได้' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                หน้าจัดการควบคุม (Admin Control)
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                สำหรับผู้ดูแลระบบสูงสุดในการควบคุมข้อมูลกิลด์ สมาชิก และสร้างระบบการแจ้งเตือน Modal เจาะกลุ่มเป้าหมาย
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-200/60 dark:bg-white/5 border border-slate-300/40 dark:border-white/10 p-1.5 rounded-2xl self-start lg:self-auto">
            <button
              onClick={() => setActiveTab('guilds')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'guilds'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              จัดการสิทธิ์กิลด์ ({guilds.length})
            </button>
            <button
              onClick={() => setActiveTab('announcement')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'announcement'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              ระบบประกาศเจาะกิลด์ ({targetGuildIds.length})
            </button>
          </div>
        </div>

        {/* Tab content 1: Guilds List & Expiry management */}
        {activeTab === 'guilds' && (
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md transition-all duration-200">
            {/* Header & Search / Filter Controls */}
            <div className="p-6 border-b border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">รายชื่อกิลด์และอายุสมาชิกในระบบ</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">แสดงข้อมูลภาพรวมเรียงลำดับกิลด์ที่ยังไม่หมดอายุไว้ด้านบนสุด</p>
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700">
                  ทั้งหมด <span className="text-blue-600 dark:text-blue-400 font-bold">{guilds.length}</span> กิลด์
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="ค้นหากิลด์, เซิร์ฟเวอร์, หัวหน้ากิลด์, อีเมล..."
                    className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  <button
                    onClick={() => handleStatusFilterChange('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    ทั้งหมด ({statusCounts.total})
                  </button>
                  <button
                    onClick={() => handleStatusFilterChange('subscribed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      statusFilter === 'subscribed'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200/50 dark:border-purple-800/50'
                    }`}
                  >
                    ⭐ Subscribed ({statusCounts.subscribed})
                  </button>
                  <button
                    onClick={() => handleStatusFilterChange('trial')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      statusFilter === 'trial'
                        ? 'bg-slate-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    🆓 FREE Trial ({statusCounts.trial})
                  </button>
                  <button
                    onClick={() => handleStatusFilterChange('expired')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      statusFilter === 'expired'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-800/50'
                    }`}
                  >
                    🚨 Expired ({statusCounts.expired})
                  </button>
                </div>
              </div>
            </div>
            
            {/* Table Area */}
            <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
                  <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-4 bg-slate-100/95 dark:bg-slate-900/95">ข้อมูลกิลด์</th>
                    <th className="px-6 py-4 bg-slate-100/95 dark:bg-slate-900/95">หัวหน้ากิลด์</th>
                    <th className="px-6 py-4 text-center bg-slate-100/95 dark:bg-slate-900/95">สมาชิก</th>
                    <th className="px-6 py-4 bg-slate-100/95 dark:bg-slate-900/95">แผนการใช้งาน</th>
                    <th className="px-6 py-4 bg-slate-100/95 dark:bg-slate-900/95">วันหมดอายุกิลด์</th>
                    <th className="px-6 py-4 text-center bg-slate-100/95 dark:bg-slate-900/95">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm text-slate-800 dark:text-slate-200">
                  {paginatedGuilds.map((guild) => {
                    const daysRemaining = getDaysRemaining(guild.trial_ends_at)
                    const isExpired = daysRemaining <= 0
                    
                    return (
                      <tr key={guild.id} className="hover:bg-slate-100/30 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{guild.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">เซิร์ฟเวอร์: {guild.server_name || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">{guild.owner?.display_name || 'ไม่พบหัวหน้ากิลด์'}</div>
                          <div className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">{guild.owner?.email || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-blue-600 dark:text-blue-400">
                          {guild.member_count} คน
                        </td>
                        <td className="px-6 py-4">
                          {isExpired ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-300/30 dark:border-red-500/30">
                              🚨 Expired
                            </span>
                          ) : daysRemaining > 14 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300/30 dark:border-purple-500/30">
                              ⭐ Subscribed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-300/30 dark:border-slate-500/30">
                              🆓 FREE Trial
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`font-semibold ${isExpired ? 'text-red-650 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {formatDateString(guild.trial_ends_at)}
                          </div>
                          {guild.trial_ends_at && (
                            <div className={`text-[10px] font-bold mt-1 ${
                              isExpired 
                                ? 'text-red-500/80 dark:text-red-400/80' 
                                : daysRemaining <= 3 
                                  ? 'text-yellow-600 dark:text-yellow-400/80 animate-pulse' 
                                  : 'text-slate-500 dark:text-slate-400'
                            }`}>
                              {isExpired ? '🚨 หมดอายุการใช้งานแล้ว' : `⌛ เหลืออีก ${daysRemaining} วัน`}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openEditModal(guild)}
                            className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            แก้ไขสิทธิ์
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {paginatedGuilds.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                        {searchQuery || statusFilter !== 'all' ? 'ไม่พบกิลด์ที่ตรงกับเงื่อนไขการค้นหา' : 'ไม่พบข้อมูลกิลด์ในระบบ'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar */}
            {filteredGuilds.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/2 text-xs">
                {/* Left: Range Info & Page Size */}
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400">
                    แสดง <span className="font-bold text-slate-800 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</span> - <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredGuilds.length)}</span> จากทั้งหมด <span className="font-bold text-slate-800 dark:text-slate-200">{filteredGuilds.length}</span> กิลด์
                  </span>

                  <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400">แสดงต่อหน้า:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Right: Page Navigation Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="หน้าแรก"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="หน้าก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="px-3 py-1 font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    หน้า {currentPage} / {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="หน้าถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="หน้าสุดท้าย"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab content 2: Targeted Announcement modal builder */}
        {activeTab === 'announcement' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 🌟 Multi-Campaign Selector Bar */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-3xl p-5 md:p-6 shadow-xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📢</span> รายการชุดประกาศทั้งหมด ({announcements.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    คลิกแท็บเพื่อสลับแก้ไขประกาศของแต่ละกิลด์ หรือกดปุ่ม <strong>+ เพิ่มชุดประกาศใหม่</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNewCampaign}
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มชุดประกาศใหม่
                </button>
              </div>

              {/* Campaign Tabs */}
              <div className="flex items-center gap-2.5 overflow-x-auto pt-4 pb-1">
                {announcements.map((ann, idx) => {
                  const isSelected = selectedAnnId === ann.id
                  return (
                    <button
                      key={ann.id}
                      type="button"
                      onClick={() => handleSelectCampaign(ann)}
                      className={`cursor-pointer px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2.5 border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                          : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${ann.is_active ? (isSelected ? 'bg-emerald-300' : 'bg-emerald-500') : 'bg-slate-400'}`} />
                      <span className="max-w-[150px] truncate">{ann.title || `ชุดที่ ${idx + 1}`}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                      }`}>
                        🎯 {ann.targetGuildIds?.length || 0} กิลด์
                      </span>
                    </button>
                  )
                })}
                {announcements.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 py-2">
                    ยังไม่มีชุดประกาศในระบบ กดปุ่ม &quot;+ เพิ่มชุดประกาศใหม่&quot; ด้านบนเพื่อสร้างประกาศแรก
                  </p>
                )}
              </div>
            </div>

            {/* Editor Grid: Form on Left, Guild Selector on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Col 1 & 2: Announcement Editor Form */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {selectedAnnId ? '✏️ แก้ไขชุดประกาศ' : '✨ สร้างชุดประกาศใหม่'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    กำหนดหัวข้อ เนื้อหา และติ๊กเลือกกิลด์เป้าหมายเฉพาะที่ต้องการให้เห็นประกาศนี้
                  </p>
                </div>
                {selectedAnnId && (
                  <button
                    type="button"
                    onClick={handleDeleteAnnouncement}
                    disabled={isDeletingAnnouncement || isSavingAnnouncement}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold border border-red-500/20 transition-all shrink-0 self-start sm:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isDeletingAnnouncement ? 'กำลังลบ...' : 'ลบชุดประกาศนี้'}
                  </button>
                )}
              </div>

              {/* Status Message */}
              {annMsg && (
                <div className={`p-4 rounded-xl border flex items-center gap-2.5 animate-in fade-in ${
                  annMsg.type === 'success' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300' 
                    : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
                }`}>
                  {annMsg.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <p className="text-xs font-bold">{annMsg.text}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Switch Active */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">สถานะประกาศ</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">เปิด-ปิดการเด้งแจ้งเตือนของประกาศฉบับนี้</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={annIsActive} 
                      onChange={(e) => setAnnIsActive(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">หัวข้อหลัก</label>
                    <input
                      type="text"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      className="block w-full rounded-xl border border-slate-350 dark:border-white/15 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs font-semibold"
                      placeholder="กรอกหัวข้อใหญ่..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">คำบรรยายสั้นๆ</label>
                    <input
                      type="text"
                      value={annSubtitle}
                      onChange={(e) => setAnnSubtitle(e.target.value)}
                      className="block w-full rounded-xl border border-slate-350 dark:border-white/15 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs font-semibold"
                      placeholder="กรอกคำอธิบายเพิ่มเติมใต้หัวข้อ..."
                    />
                  </div>
                </div>

                {/* Dynamic list items */}
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                    <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">รายการเนื้อหาประกาศ ({annItems.length})</label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-600/20 text-blue-650 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-[10px] font-bold border border-blue-200 dark:border-blue-500/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มรายการย่อย
                    </button>
                  </div>

                  <div className="space-y-3">
                    {annItems.map((item, index) => (
                      <div key={index} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3 relative group">
                        
                        {/* Remove item button */}
                        {annItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="cursor-pointer absolute top-3 right-3 p-1 text-slate-450 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          {/* Emoji Icon */}
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">ไอคอน (Emoji)</label>
                            <input
                              type="text"
                              value={item.icon}
                              onChange={(e) => handleUpdateItemField(index, 'icon', e.target.value)}
                              className="text-center block w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-955 px-2 py-2 text-slate-900 dark:text-white placeholder-slate-450 focus:border-blue-400 focus:outline-none text-xs"
                              placeholder="เช่น 🤖"
                            />
                          </div>

                          {/* Item Title/Badge */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">หัวข้อย่อย</label>
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => handleUpdateItemField(index, 'label', e.target.value)}
                              className="block w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-955 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-450 focus:border-blue-400 focus:outline-none text-xs font-bold"
                              placeholder="หัวข้อประกาศย่อย..."
                            />
                          </div>

                          {/* Badge Color */}
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">สีของกรอบ</label>
                            <select
                              value={item.color}
                              onChange={(e) => handleUpdateItemField(index, 'color', e.target.value)}
                              className="cursor-pointer block w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-400 text-xs"
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
                          <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">เนื้อหาคำอธิบาย</label>
                          <textarea
                            value={item.detail}
                            onChange={(e) => handleUpdateItemField(index, 'detail', e.target.value)}
                            rows={2}
                            className="block w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-955 px-3 py-2 text-slate-800 dark:text-slate-200 placeholder-slate-455 focus:border-blue-400 focus:outline-none text-xs resize-none leading-relaxed"
                            placeholder="กรอกรายละเอียดอธิบายเพิ่มเติม..."
                          />
                        </div>

                        {/* Optional Youtube URL */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">ลิงก์วิดีโอ YouTube (ถ้ามี)</label>
                          <input
                            type="url"
                            value={item.youtubeUrl || ''}
                            onChange={(e) => handleUpdateItemField(index, 'youtubeUrl', e.target.value || null)}
                            className="block w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-955 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-455 focus:border-blue-400 focus:outline-none text-xs"
                            placeholder="https://youtu.be/..."
                          />
                        </div>

                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer text */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">ข้อความปิดท้าย (Footer)</label>
                  <input
                    type="text"
                    value={annFooter}
                    onChange={(e) => setAnnFooter(e.target.value)}
                    className="block w-full rounded-xl border border-slate-350 dark:border-white/15 bg-white dark:bg-slate-955 px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs font-semibold"
                    placeholder="เช่น ขอบคุณสมาชิกทุกท่าน 🙏"
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="border-t border-slate-200 dark:border-white/10 pt-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <p className="text-[10px] text-slate-450 dark:text-slate-500 max-w-md">
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
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-xl backdrop-blur-md max-h-[85vh] flex flex-col">
              <div>
                <h3 className="text-md font-bold text-slate-900 dark:text-white">🎯 ติ๊กกิลด์เป้าหมาย</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">ติ๊กเลือกกิลด์เฉพาะที่คุณต้องการให้เห็นประกาศนี้</p>
              </div>

              {/* Selector Helpers */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllGuilds}
                  className="cursor-pointer flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-650 dark:text-slate-300 transition-colors"
                >
                  ☑️ เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={handleClearAllGuilds}
                  className="cursor-pointer flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-650 dark:text-slate-300 transition-colors"
                >
                  ⬜ ล้างทั้งหมด
                </button>
              </div>

              {/* Checkbox list */}
              <div className="overflow-y-auto flex-1 space-y-2 pr-1 divide-y divide-slate-100 dark:divide-white/5">
                {guilds.map((g) => {
                  const isChecked = targetGuildIds.includes(g.id)
                  return (
                    <label 
                      key={g.id}
                      className="flex items-center justify-between py-2.5 px-2.5 rounded-xl hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors truncate">
                          {g.name}
                        </span>
                        <span className="text-[9px] text-slate-550 dark:text-slate-500 truncate mt-0.5">
                          {g.server_name || '-'} | {g.member_count} สมาชิก
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
                            ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/20'
                            : 'border-slate-350 dark:border-slate-650 group-hover:border-slate-400'
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
                  <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-6">ไม่พบข้อมูลกิลด์ในระบบ</p>
                )}
              </div>

              {/* Summary Counter */}
              <div className="bg-slate-100/50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5 text-center text-xs text-slate-700 dark:text-slate-300">
                <span>เลือกกิลด์เป้าหมายแล้ว: </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{targetGuildIds.length} กิลด์</span>
              </div>
            </div>

          </div>

          {/* Section 2: Global Update Ticker Form */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl backdrop-blur-md mt-6 transition-all duration-200">
            <div className="border-b border-slate-200 dark:border-white/10 pb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">📢 ตั้งค่าแถบข้อความวิ่งด้านบนสุด (Update Ticker)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ข้อความวิ่งนี้จะแสดงบนแถบสีน้ำเงินด้านบนสุดของทุกหน้าเว็บให้กับสมาชิกทุกคนที่เข้าสู่ระบบ</p>
            </div>
            
            {/* Ticker status message */}
            {tickerMsg && (
              <div className={`p-4 rounded-xl border flex items-center gap-2.5 animate-in fade-in ${
                tickerMsg.type === 'success' 
                  ? 'bg-green-50/10 border-green-50/20 text-green-700 dark:text-green-300' 
                  : 'bg-red-50/10 border-red-50/20 text-red-700 dark:text-red-300'
              }`}>
                {tickerMsg.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <p className="text-xs font-bold">{tickerMsg.text}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Switch Active Ticker */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">สถานะการแสดงแถบข้อความวิ่ง</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">เปิด-ปิดการแสดงผลแถบวิ่งด้านบนสุด</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={tickerIsVisible} 
                    onChange={(e) => setTickerIsVisible(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Ticker Textarea */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">ข้อความวิ่ง</label>
                <textarea
                  value={tickerText}
                  onChange={(e) => setTickerText(e.target.value)}
                  rows={3}
                  className="block w-full rounded-xl border border-slate-350 dark:border-white/15 bg-white dark:bg-slate-955 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 shadow-inner focus:border-blue-500 focus:outline-none text-xs font-semibold leading-relaxed"
                  placeholder="พิมพ์ข้อความที่ต้องการให้วิ่งที่นี่..."
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="border-t border-slate-200 dark:border-white/10 pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveTicker}
                disabled={isSavingTicker || !tickerText.trim()}
                className="cursor-pointer px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-md shadow-blue-500/10 hover:scale-105 active:scale-95"
              >
                {isSavingTicker ? 'กำลังบันทึก...' : '💾 บันทึกข้อความวิ่ง'}
              </button>
            </div>
          </div>
          </div>
        )}

      </div>

      {/* Expiry & Plan Edit Card Pop-up */}
      {editingGuild && (() => {
        const previewDaysRemaining = isPermanent 
          ? Infinity 
          : editExpiryDate 
            ? getDaysRemaining(editExpiryDate + 'T23:59:59')
            : 0
        const previewIsExpired = previewDaysRemaining <= 0

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 dark:bg-black/50 animate-in fade-in duration-150"
            onClick={() => setEditingGuild(null)}
          >
            <div 
              className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl relative space-y-5 text-slate-800 dark:text-slate-200 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-3.5">
                <div>
                  <h4 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>⚡</span> ปรับอายุการใช้งานกิลด์
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    กิลด์: <span className="font-bold text-blue-600 dark:text-blue-400">{editingGuild.name}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingGuild(null)}
                  className="cursor-pointer p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {guildError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl text-center">
                  {guildError}
                </div>
              )}

              {/* Status Comparison Preview Box */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">สถานะปัจจุบัน</span>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {formatDateString(editingGuild.trial_ends_at)}
                  </div>
                  <div className="text-[11px] font-bold mt-1 text-slate-500">
                    {editingGuild.trial_ends_at ? (
                      getDaysRemaining(editingGuild.trial_ends_at) <= 0 
                        ? '🚨 หมดอายุแล้ว' 
                        : `⌛ เหลืออีก ${getDaysRemaining(editingGuild.trial_ends_at)} วัน`
                    ) : '♾️ Pro ถาวร'}
                  </div>
                </div>
                <div className="border-l border-slate-200 dark:border-white/10 pl-3">
                  <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block mb-1">สถานะใหม่ที่จะได้รับ</span>
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {isPermanent ? 'ไม่มีวันหมดอายุ (ถาวร)' : editExpiryDate ? formatDateString(editExpiryDate + 'T23:59:59') : 'ยังไม่ได้ระบุ'}
                  </div>
                  <div className="mt-1">
                    {isPermanent ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300/30">
                        ⭐ Subscribed (ถาวร)
                      </span>
                    ) : previewIsExpired ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-300/30">
                        🚨 Expired (หมดอายุ)
                      </span>
                    ) : previewDaysRemaining > 14 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300/30">
                        ⭐ Subscribed ({previewDaysRemaining} วัน)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-300/30">
                        🆓 FREE Trial ({previewDaysRemaining} วัน)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Increase / Decrease Days Buttons */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  ⚡ เพิ่ม / ลด อายุการใช้งาน (Quick Adjust)
                </label>
                
                {/* Add Days */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustDays(7)}
                    className="cursor-pointer py-2 px-1 rounded-xl bg-blue-50 dark:bg-blue-600/15 hover:bg-blue-100 dark:hover:bg-blue-600/25 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all hover:scale-105 active:scale-95 text-center"
                  >
                    +7 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustDays(14)}
                    className="cursor-pointer py-2 px-1 rounded-xl bg-blue-50 dark:bg-blue-600/15 hover:bg-blue-100 dark:hover:bg-blue-600/25 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all hover:scale-105 active:scale-95 text-center"
                  >
                    +14 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustDays(30)}
                    className="cursor-pointer py-2 px-1 rounded-xl bg-purple-50 dark:bg-purple-600/15 hover:bg-purple-100 dark:hover:bg-purple-600/25 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold transition-all hover:scale-105 active:scale-95 text-center"
                  >
                    +30 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustDays(90)}
                    className="cursor-pointer py-2 px-1 rounded-xl bg-purple-50 dark:bg-purple-600/15 hover:bg-purple-100 dark:hover:bg-purple-600/25 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold transition-all hover:scale-105 active:scale-95 text-center"
                  >
                    +90 วัน
                  </button>
                </div>

                {/* Reduce Days / Presets */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustDays(-7)}
                    className="cursor-pointer py-1.5 px-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all text-center"
                  >
                    -7 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustDays(-30)}
                    className="cursor-pointer py-1.5 px-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all text-center"
                  >
                    -30 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetDaysFromToday(14)}
                    className="cursor-pointer py-1.5 px-1 rounded-xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold transition-all text-center"
                  >
                    รีเซ็ต 14 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsPermanent(true); setEditExpiryDate(''); }}
                    className={`cursor-pointer py-1.5 px-1 rounded-xl border text-[11px] font-bold transition-all text-center ${
                      isPermanent
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-500/20'
                        : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    ♾️ ถาวร
                  </button>
                </div>
              </div>

              {/* Specific Date Picker Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    📅 กำหนดวันหมดอายุเจาะจง
                  </label>
                  {isPermanent && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                      (เปิดโหมดถาวรอยู่)
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  disabled={isPermanent}
                  value={editExpiryDate}
                  onChange={(e) => {
                    setIsPermanent(false)
                    setEditExpiryDate(e.target.value)
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white shadow-inner focus:border-blue-500 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingGuild(null)}
                  className="cursor-pointer flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveGuild}
                  disabled={isSavingGuild}
                  className="cursor-pointer flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/10 hover:scale-105 active:scale-95"
                >
                  {isSavingGuild ? 'กำลังบันทึก...' : '💾 บันทึก'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
