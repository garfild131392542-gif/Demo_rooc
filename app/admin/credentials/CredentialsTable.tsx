'use client'
//
import { useState, useTransition } from 'react'
import { resetMemberPassword, changeMemberRole, createMember, updateMember, deleteMember, toggleMemberLeave } from '@/app/actions/admin'

type ManagementItem = {
  id: string
  uid_game: string
  display_name: string
  job_name: string
  role: string
  pvp_reduc: number
  pvp_dmg: number
  isPasswordSet: boolean
  is_on_leave: boolean
  updated_at?: string
  last_stat_update?: string;
}

function needsUpdate(last_stat_update?: string) {
  if (!last_stat_update) return true;

  const updatedDate = new Date(last_stat_update);
  const now = new Date();

  let daysSinceTuesday = now.getDay() - 2;
  if (daysSinceTuesday < 0) {
    daysSinceTuesday += 7;
  }

  const mostRecentTuesday = new Date(now);
  mostRecentTuesday.setDate(now.getDate() - daysSinceTuesday);
  mostRecentTuesday.setHours(0, 0, 0, 0);

  return updatedDate < mostRecentTuesday;
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('') // 2. สร้าง State สำหรับเก็บคำค้นหา
  const [showOnlyNotUpdated, setShowOnlyNotUpdated] = useState(false)


  const handleResetPassword = (id: string, uid_game: string) => {
    if (!confirm(`Are you sure you want to reset the password for ${uid_game}? They will need to set a new password on their next login.`)) return

    startTransition(async () => {
      const result = await resetMemberPassword(id)
      if (result?.success) {
        setData(prev => prev.map(p => p.id === id ? { ...p, isPasswordSet: false } : p))
      }
    })
  }

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
    if (!confirm('Are you sure you want to delete this member?')) return
    startTransition(async () => {
      const result = await deleteMember(id)
      if (result?.success) {
        setData(prev => prev.filter(p => p.id !== id))
      }
    })
  }

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>, id: string) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateMember(id, formData)
      if (result?.success) {
        setEditingId(null)
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
      // Optimistic update
      setData(prev => prev.map(p => p.id === id ? { ...p, is_on_leave: !currentStatus } : p))
      const result = await toggleMemberLeave(id, !currentStatus)
      if (!result?.success) {
        // Revert on failure
        setData(prev => prev.map(p => p.id === id ? { ...p, is_on_leave: currentStatus } : p))
        alert(result?.error || 'Failed to update leave status')
      }
    })
  }

  // 3. กรองรายชื่อตามชื่อตัวละคร (Display Name) หรือ อาชีพ (Job Name) และการอัพเดท
  const filteredProfiles = data.filter(p => {
    const matchesSearch = p.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.uid_game.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.job_name && p.job_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (showOnlyNotUpdated) {
      return matchesSearch && needsUpdate(p.updated_at);
    }
    return matchesSearch;
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold">จัดการสมาชิกในกิล</h2>
        <div className='flex items-center space-x-4'>
          <label className="flex items-center space-x-2 text-sm cursor-pointer text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showOnlyNotUpdated}
              onChange={(e) => setShowOnlyNotUpdated(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
            onClick={() => setIsCreating(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            + เพิ่มสมาชิก
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">UID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ชื่อตัวละคร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">อาชีพ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PVP REDUC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PVP DMG</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ลากิจกรรม</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">อัพเดทล่าสุด</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {isCreating && (
              <tr>
                <td colSpan={10} className="p-4 bg-indigo-50 dark:bg-indigo-900/20">
                  <form onSubmit={handleCreateSubmit} className="flex items-center space-x-4 flex-wrap gap-y-2">
                    <input name="uid_game" placeholder="UID Game" required className="flex-1 min-w-[120px] px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input name="display_name" placeholder="ชื่อตัวละคร" required className="flex-1 min-w-[120px] px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <select name="job_name" defaultValue="" className="flex-1 min-w-[100px] px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="" disabled>-- กรุณาเลือกอาชีพ --</option>
                      <option value="Lord Knight">Lord Knight</option>
                      <option value="Paladin">Paladin</option>
                      <option value="Biochemist">Biochemist</option>
                      <option value="Mastersmith">Mastersmith</option>
                      <option value="Bard">Bard</option>
                      <option value="Gypsy">Gypsy</option>
                      <option value="Sniper">Sniper</option>
                      <option value="Monk">Monk</option>
                      <option value="Priest">Priest</option>
                      <option value="Assassin">Assassin</option>
                      <option value="Rogue">Rogue</option>
                      <option value="Wizard">Wizard</option>
                      <option value="Sage">Sage</option>
                    </select>
                    <input name="pvp_reduc" type="number" placeholder="PvP Reduc" defaultValue={0} className="w-24 px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input name="pvp_dmg" type="number" placeholder="PvP DMG" defaultValue={0} className="w-24 px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <select name="role" defaultValue="member" className="px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="flex space-x-2">
                      <button type="submit" disabled={isPending} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Save</button>
                      <button type="button" onClick={() => setIsCreating(false)} className="bg-gray-400 text-white px-3 py-1 rounded text-sm">Cancel</button>
                    </div>
                  </form>
                </td>
              </tr>
            )}

            {filteredProfiles.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                {editingId === item.id ? (
                  <td colSpan={10} className="p-4">
                    <form onSubmit={(e) => handleEditSubmit(e, item.id)} className="flex items-center space-x-4 flex-wrap gap-y-2">
                      <input name="uid_game" defaultValue={item.uid_game} required className="flex-1 min-w-[120px] px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      <input name="display_name" defaultValue={item.display_name} required className="flex-1 min-w-[120px] px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      <select name="job_name" defaultValue={item.job_name || ''} className="flex-1 min-w-[100px] px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="" disabled>-- กรุณาเลือกอาชีพ --</option>
                        <option value="Lord Knight">Lord Knight</option>
                        <option value="Paladin">Paladin</option>
                        <option value="Biochemist">Biochemist</option>
                        <option value="Mastersmith">Mastersmith</option>
                        <option value="Bard">Bard</option>
                        <option value="Gypsy">Gypsy</option>
                        <option value="Sniper">Sniper</option>
                        <option value="Monk">Monk</option>
                        <option value="Priest">Priest</option>
                        <option value="Assassin">Assassin</option>
                        <option value="Rogue">Rogue</option>
                        <option value="Wizard">Wizard</option>
                        <option value="Sage">Sage</option>
                      </select>
                      <input name="pvp_reduc" type="number" placeholder="PvP Reduc" defaultValue={item.pvp_reduc} className="w-24 px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      <input name="pvp_dmg" type="number" placeholder="PvP DMG" defaultValue={item.pvp_dmg} className="w-24 px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      <select name="role" defaultValue={item.role} className="px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div className="flex space-x-2">
                        <button type="submit" disabled={isPending} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-3 py-1 rounded text-sm">Cancel</button>
                      </div>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.uid_game}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.display_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.job_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity ${item.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`} onClick={() => handleRoleChange(item.id, item.role)}>
                        {item.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-500 font-semibold">
                      {item.pvp_reduc}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-rose-500 font-semibold ">
                      {item.pvp_dmg}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.isPasswordSet ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Set</span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-medium">Null (Pending)</span>
                      )}
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-800/50 dark:border-indigo-700"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleResetPassword(item.id, item.uid_game)}
                        disabled={isPending || !item.isPasswordSet}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-800/50 dark:border-orange-700 dark:disabled:hover:bg-orange-900/30"
                      >
                        Reset PW
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-50 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-800/50 dark:border-red-700 dark:disabled:hover:bg-red-900/30"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
