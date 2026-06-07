'use client'

import { useState, useTransition } from 'react'
import { Profile } from '@/components/Dashboard'
import { createMember, updateMember, deleteMember } from '@/app/actions/admin'

export default function MembersTable({ initialProfiles }: { initialProfiles: Profile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return
    startTransition(async () => {
      await deleteMember(id)
      setProfiles(prev => prev.filter(p => p.id !== id))
    })
  }

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>, id: string) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await updateMember(id, formData)
      setEditingId(null)
      // Since revalidatePath runs, the page will refresh with new data. 
      // But we can eagerly update local state too. For simplicity, let server sync handle it.
      window.location.reload()
    })
  }

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await createMember(formData)
      setIsCreating(false)
      window.location.reload()
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold">รายชื่อสมาชิก</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + เพิ่มสมาชิก
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">UID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ชื่อตัวละคร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">อาชีพ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {isCreating && (
              <tr>
                <td colSpan={5} className="p-4 bg-indigo-50 dark:bg-indigo-900/20">
                  <form onSubmit={handleCreateSubmit} className="flex items-center space-x-4">
                    <input name="uid_game" placeholder="UID Game" required className="flex-1 px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input name="display_name" placeholder="Display Name" required className="flex-1 px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input name="job_name" placeholder="Job Name" className="flex-1 px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
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

            {profiles.map(profile => (
              <tr key={profile.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                {editingId === profile.id ? (
                  <td colSpan={5} className="p-4">
                    <form onSubmit={(e) => handleEditSubmit(e, profile.id)} className="flex items-center space-x-4">
                      <input name="uid_game" defaultValue={profile.uid_game} required className="flex-1 px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      <input name="display_name" defaultValue={profile.display_name} required className="flex-1 px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      <input name="job_name" defaultValue={profile.job_name} className="flex-1 px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      <select name="role" defaultValue={profile.role} className="px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{profile.uid_game}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{profile.display_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{profile.job_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${profile.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {profile.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button onClick={() => setEditingId(profile.id)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Edit</button>
                      <button onClick={() => handleDelete(profile.id)} disabled={isPending} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Delete</button>
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
