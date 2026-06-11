'use client'

export default function MemberForm({ 
  activeSubTab, 
  setActiveSubTab, 
  reqQty, 
  setReqQty, 
  handleMemberRegister, 
  isSaving 
}: any) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md transition-colors">
      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">My Auction Requests</h3>
      <form onSubmit={handleMemberRegister} className="space-y-4">
        <select 
          value={activeSubTab} 
          onChange={e => setActiveSubTab(e.target.value)} 
          className="cursor-pointer w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
        >
          <option value="all" disabled>-- เลือกไอเทมก่อน --</option>
          <option value="Album">Auction Album (สมุดการ์ด)</option>
          <option value="Puppet">Boss Puppet Fragment</option>
          <option value="White">White Feather</option>
          <option value="RedBlack">Red/Black Feather</option>
        </select>
        <input 
          type="number" min={1} value={reqQty} 
          onChange={e => setReqQty(parseInt(e.target.value))} 
          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors" 
          placeholder="จำนวนที่ต้องการ" 
        />
        <button 
          type="submit" disabled={activeSubTab === 'all' || isSaving} 
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isSaving ? 'กำลังดำเนินการ...' : 'Join Queue'}
        </button>
      </form>
    </div>
  )
}