'use client'

import { useState, useTransition } from 'react'
import * as XLSX from 'xlsx';
import { changeMemberRole, createMember, updateMember, deleteMember, toggleMemberLeave } from '@/app/actions/admin'

type ManagementItem = {
  id: string
  uid_game: string
  display_name: string
  job_name: string
  role: string
  pvp_reduc: number
  pvp_dmg: number
  p_def: number
  m_def: number
  // 6 stat fields
  p_atk: number
  m_atk: number
  p_dmg: number
  m_dmg: number
  p_reduc: number
  m_reduc: number
  is_on_leave: boolean
  updated_at?: string
  last_stat_update?: string;
}

function needsUpdate(last_stat_update?: string) {
  if (!last_stat_update) return true;

  const updateDate = new Date(last_stat_update);
  updateDate.setHours(0, 0, 0, 0);

  const expirationDate = new Date(updateDate);
  expirationDate.setDate(expirationDate.getDate() + 7);

  const dayOfWeek = expirationDate.getDay();
  if (dayOfWeek !== 2) {
    const daysToTuesday = (2 - dayOfWeek + 7) % 7;
    expirationDate.setDate(expirationDate.getDate() + daysToTuesday);
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return now >= expirationDate;
}
function formatUpdatedAt(last_stat_update?: string) {
  if (!last_stat_update) return '-';
  const d = new Date(last_stat_update);
  return d.toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function CredentialsTable({ initialData }: { initialData: ManagementItem[] }) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()

  const [editingMember, setEditingMember] = useState<ManagementItem | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyNotUpdated, setShowOnlyNotUpdated] = useState(false)

  // TODO: Phase 2 - Password management will be handled by Supabase Auth

  const handleRoleChange = (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    if (!confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return

    startTransition(async () => {
      const result = await changeMemberRole(id, newRole as 'admin' | 'member')
      if (result?.success) {
        setData(prev => prev.map(p => p.id === id ? { ...p, role: newRole } : p))
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('คุณต้องการลบสมาชิกคนนี้หรือไม่?')) return
    startTransition(async () => {
      const result = await deleteMember(id)
      if (result?.success) {
        setData(prev => prev.filter(p => p.id !== id))
      }
    })
  }

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingMember) return
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateMember(editingMember.id, formData)
      if (result?.success) {
        setEditingMember(null)
        window.location.reload()
      } else {
        alert(result?.error || 'Failed to update member')
      }
    })
  }

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createMember(formData)
      if (result?.success) {
        setIsCreating(false)
        window.location.reload()
      } else {
        alert(result?.error || 'Failed to create member')
      }
    })
  }

  const handleToggleLeave = (id: string, currentStatus: boolean) => {
  startTransition(async () => {
    try {
      setData(prev => prev.map(p => p.id === id ? { ...p, is_on_leave: !currentStatus } : p))
      const result = await toggleMemberLeave(id, !currentStatus)
      if (!result?.success) {
        setData(prev => prev.map(p => p.id === id ? { ...p, is_on_leave: currentStatus } : p))
        alert(result?.error || 'Failed to update leave status')
      }
    } catch (err) {
      setData(prev => prev.map(p => p.id === id ? { ...p, is_on_leave: currentStatus } : p))
      alert('ระบบหลังบ้านขัดข้อง กรุณาลองใหม่อีกครั้ง')
    }
  })
}

  const handleExportExcel = () => {
    if (!filteredProfiles || filteredProfiles.length === 0) {
      alert("ไม่มีข้อมูลสำหรับ Export");
      return;
    }

    const formattedData = filteredProfiles.map((item, index) => ({
      "ลำดับ": index + 1,
      "UID (เกม)": item.uid_game || "-",
      "ชื่อตัวละคร": item.display_name || "-",
      "อาชีพ": item.job_name || "-",
      "ระดับสิทธิ์": item.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก',
      "P.ATK": item.p_atk || 0,
      "M.ATK": item.m_atk || 0,
      "P.DEF": item.p_def || 0,
      "M.DEF": item.m_def || 0,
      "P.DMG": item.p_dmg || 0,
      "M.DMG": item.m_dmg || 0,
      "P.REDUC": item.p_reduc || 0,
      "M.REDUC": item.m_reduc || 0,
      "PVP DMG": item.pvp_dmg || 0,
      "PVP REDUC": item.pvp_reduc || 0,
      "ลากิจกรรม": item.is_on_leave ? "ลา" : "ปกติ",
      "อัพเดทล่าสุด": formatUpdatedAt(item.last_stat_update),
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();

    worksheet['!cols'] = [
      { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 15 }, { wch: 10 }, { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Credentials");
    XLSX.writeFile(workbook, "รายชื่อสมาชิกกิลด์.xlsx");
  };

  const filteredProfiles = data.filter(p => {
    const matchesSearch = p.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.uid_game.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.job_name && p.job_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (showOnlyNotUpdated) {
      return matchesSearch && needsUpdate(p.last_stat_update);
    }
    return matchesSearch;
  })

  const JOB_OPTIONS = [
    "Lord Knight", "Paladin", "Biochemist", "Mastersmith", "Bard", "Gypsy",
    "Sniper", "Champion", "Priest", "Assassin", "Rogue", "Wizard", "Sage", "Summoner"
  ];

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden relative z-10">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold">จัดการสมาชิกในกิล</h2>
          <div className='flex items-center space-x-4'>
            <label className="flex items-center space-x-2 text-sm cursor-pointer text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showOnlyNotUpdated}
                onChange={(e) => setShowOnlyNotUpdated(e.target.checked)}
                className="cursor-pointer w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>📌 คัดกรองคนที่ยังไม่อัพเดท</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาชื่อหรืออาชีพ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
              <div className="absolute left-3 top-2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            <button
              onClick={handleExportExcel}
              className="cursor-pointer flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="8" y1="13" x2="16" y2="13"></line>
                <line x1="8" y1="17" x2="16" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Export Excel
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="cursor-pointer flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              + เพิ่มสมาชิก
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {/* 💡 เพิ่ม w-[เปอร์เซ็นต์] เพื่อควบคุมความกว้างของแต่ละคอลัมน์ให้คงที่ */}
                <th className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User name</th>
                <th className="w-[15%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ชื่อตัวละคร</th>
                <th className="w-[13%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">อาชีพ</th>
                <th className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ลากิจกรรม</th>
                <th className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">อัพเดทล่าสุด</th>
                <th className="w-[20%] px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProfiles.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.uid_game}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.display_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.job_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity ${item.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`} onClick={() => handleRoleChange(item.id, item.role)}>
                      {item.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!item.is_on_leave}
                        onChange={() => handleToggleLeave(item.id, !!item.is_on_leave)}
                        disabled={isPending}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-500 disabled:opacity-50"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col space-y-1">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{formatUpdatedAt(item.last_stat_update)}</span>
                      {needsUpdate(item.last_stat_update) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 w-fit">
                          🔴 ยังไม่อัพเดท
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 w-fit">
                          🟢 อัพเดทแล้ว
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 💡 เปลี่ยน text-right เป็น text-center เพื่อดึงกลุ่มปุ่มกลับมาไว้ตรงกลางของคอลัมน์ */}
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                    <button
                      onClick={() => setEditingMember(item)}
                      className="cursor-pointer inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-800/50 dark:border-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isPending}
                      className="cursor-pointer inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-50 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-800/50 dark:border-red-700 dark:disabled:hover:bg-red-900/30"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 💡 Modal สำหรับ เพิ่มสมาชิก (Create Modal) */}
      {/* ───────────────────────────────────────────────────────── */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/30 shrink-0">
              <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                 เพิ่มสมาชิกใหม่
              </h3>
            </div>
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleCreateSubmit} id="create-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UID Game <span className="text-red-500">*</span></label>
                    <input name="uid_game" required className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อตัวละคร <span className="text-red-500">*</span></label>
                    <input name="display_name" required className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">อาชีพ</label>
                    <select name="job_name" defaultValue="" className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="" disabled>-- กรุณาเลือก --</option>
                      {JOB_OPTIONS.map(job => <option key={job} value={job}>{job}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ระดับสิทธิ์ (Role)</label>
                    <select name="role" defaultValue="member" className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  {/* Stats Inputs */}
                  <div>
                    <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-1">P.ATK</label>
                    <input name="p_atk" type="number" defaultValue={0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">M.ATK</label>
                    <input name="m_atk" type="number" defaultValue={0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">P.DEF</label>
                    <input name="p_def" type="number" defaultValue={0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">M.DEF</label>
                    <input name="m_def" type="number" defaultValue={0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-1">P.DMG</label>
                    <input name="p_dmg" type="number" defaultValue={0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">M.DMG</label>
                    <input name="m_dmg" type="number" defaultValue={0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">P.Reduc</label>
                    <input name="p_reduc" type="number" defaultValue={0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">M.Reduc</label>
                    <input name="m_reduc" type="number" defaultValue={0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">PvP Reduc</label>
                    <input name="pvp_reduc" type="number" defaultValue={0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-rose-600 dark:text-rose-400 mb-1">PvP DMG</label>
                    <input name="pvp_dmg" type="number" defaultValue={0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 shrink-0 bg-gray-50 dark:bg-gray-900/50">
              <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">ยกเลิก</button>
              <button type="submit" form="create-form" disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50">บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* 💡 Modal สำหรับ แก้ไขข้อมูล (Edit Modal) */}
      {/* ───────────────────────────────────────────────────────── */}
      {editingMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/30 shrink-0">
              <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                ✏️ แก้ไขข้อมูล: {editingMember.display_name}
              </h3>
            </div>
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleEditSubmit} id="edit-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UID Game <span className="text-red-500">*</span></label>
                    <input name="uid_game" defaultValue={editingMember.uid_game} required className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อตัวละคร <span className="text-red-500">*</span></label>
                    <input name="display_name" defaultValue={editingMember.display_name} required className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">อาชีพ</label>
                    <select name="job_name" defaultValue={editingMember.job_name || ''} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="" disabled>-- กรุณาเลือก --</option>
                      {JOB_OPTIONS.map(job => <option key={job} value={job}>{job}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ระดับสิทธิ์ (Role)</label>
                    <select name="role" defaultValue={editingMember.role} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  {/* Stats Inputs */}
                  <div>
                    <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-1">P.ATK</label>
                    <input name="p_atk" type="number" defaultValue={editingMember.p_atk ?? 0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">M.ATK</label>
                    <input name="m_atk" type="number" defaultValue={editingMember.m_atk ?? 0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">P.DEF</label>
                    <input name="p_def" type="number" defaultValue={editingMember.p_def ?? 0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">M.DEF</label>
                    <input name="m_def" type="number" defaultValue={editingMember.m_def ?? 0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-1">P.DMG</label>
                    <input name="p_dmg" type="number" defaultValue={editingMember.p_dmg ?? 0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">M.DMG</label>
                    <input name="m_dmg" type="number" defaultValue={editingMember.m_dmg ?? 0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">P.Reduc</label>
                    <input name="p_reduc" type="number" defaultValue={editingMember.p_reduc ?? 0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">M.Reduc</label>
                    <input name="m_reduc" type="number" defaultValue={editingMember.m_reduc ?? 0} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">PvP Reduc</label>
                    <input name="pvp_reduc" type="number" defaultValue={editingMember.pvp_reduc} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-rose-600 dark:text-rose-400 mb-1">PvP DMG</label>
                    <input name="pvp_dmg" type="number" defaultValue={editingMember.pvp_dmg} className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 shrink-0 bg-gray-50 dark:bg-gray-900/50">
              <button type="button" onClick={() => setEditingMember(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">ยกเลิก</button>
              <button type="submit" form="edit-form" disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50">บันทึกการแก้ไข</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}