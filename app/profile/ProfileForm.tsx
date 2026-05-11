'use client'

import { useState, useTransition } from 'react'
import { updateMyProfile } from '@/app/actions/profile'
import { Profile } from '@/components/Dashboard'

export default function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateMyProfile(formData)
      if (result.success) {
        setMessage({ type: 'success', text: 'อัปเดตข้อมูลสำเร็จ!' })
      } else {
        setMessage({ type: 'error', text: result.error || 'ไม่สามารถอัปเดตข้อมูลได้' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">UID (Game) - อ่านได้อย่างเดียว</label>
        <input
          type="text"
          value={initialProfile.uid_game}
          disabled
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-900 dark:border-gray-600 dark:text-gray-400"
        />
      </div>

      <div>
        <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อตัวละคร (Display Name)</label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={initialProfile.display_name}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="job_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">อาชีพ (Job Name)</label>
        <select
          id="job_name"
          name="job_name"
          defaultValue={initialProfile.job_name || ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="pvp_reduc" className="block text-sm font-medium text-gray-700 dark:text-gray-300">PvP Reduc</label>
          <input
            id="pvp_reduc"
            name="pvp_reduc"
            type="number"
            min="0"
            defaultValue={initialProfile.pvp_reduc}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="pvp_dmg" className="block text-sm font-medium text-gray-700 dark:text-gray-300">PvP DMG</label>
          <input
            id="pvp_dmg"
            name="pvp_dmg"
            type="number"
            min="0"
            defaultValue={initialProfile.pvp_dmg}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>


      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
      </div>
    </form>
  )
}