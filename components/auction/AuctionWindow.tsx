'use client'

import { ITEM_CONFIG } from './constants'

export default function AuctionWindow({ 
  isAdmin, limits, positions, // 🌟 รับ Props เพิ่ม
  todayItems, mappedSlots, activeSubTab, setActiveSubTab, 
  currentPage, setCurrentPage, totalPages, currentSlots, 
  onRefresh, isSaving 
}: any) {
  return (
    <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-[24px] p-2.5 shadow-xl relative overflow-hidden font-sans border-2 border-slate-200 dark:border-slate-700 transition-colors h-full flex flex-col">
      
      <div className="flex justify-between items-center px-4 py-3 bg-blue-600 dark:bg-blue-900 rounded-t-[18px] border-b border-blue-700 dark:border-slate-700 shadow-sm text-white transition-colors">
        <div className="flex items-center gap-2 font-bold">
          <span className="text-xl">⚖️</span>
          <span>Today's Queue & Slot Mapping {isAdmin && <span className="ml-2 text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded-full">Live Preview Mode</span>}</span>
        </div>
        <button onClick={onRefresh} disabled={isSaving} className="text-xs bg-black/20 hover:bg-black/30 px-3 py-1 rounded-full font-bold transition-colors disabled:opacity-50 cursor-pointer">
          🔄 Refresh
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mt-4 flex-1">
        <div className="w-full md:w-44 flex md:flex-col gap-2 pt-1.5">
          <button className="w-full text-left pl-4 py-3 rounded-r-2xl font-black text-xs bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600 dark:border-blue-500 shadow-sm transition-colors">Guild Auction</button>
          <div className="w-full text-left pl-4 py-3 rounded-r-2xl font-bold text-xs text-slate-400 dark:text-slate-500 cursor-not-allowed">Trade History</div>
        </div>

        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-inner transition-colors">
          <div className="flex justify-center mb-4">
            <div className="flex flex-wrap justify-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 transition-colors">
              {(['all', 'Album', 'Puppet', 'White', 'RedBlack'] as const).map(tab => (
                <button key={tab} onClick={() => { setActiveSubTab(tab); setCurrentPage(1) }} className={`px-4 sm:px-6 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${activeSubTab === tab ? 'bg-blue-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                  {tab === 'all' ? 'All Items' : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-inner transition-colors">
            {(['Album', 'Puppet', 'White', 'RedBlack'] as const).map(type => {
              // 🌟 โชว์ยอด Live Preview ถ้าเป็นแอดมิน
              let totalQty = 0;
              if (isAdmin && positions) {
                totalQty = positions[type].total;
              } else {
                const sessionItem = todayItems.find((s: any) => s.item_name === type);
                totalQty = sessionItem ? sessionItem.total_quantity : 0;
              }
              
              return (
                <div key={`summary-${type}`} className="flex items-center gap-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-lg p-2 shadow-sm transition-colors">
                  <div className={`w-8 h-8 bg-gradient-to-b ${ITEM_CONFIG[type].color} rounded-md border border-slate-200 dark:border-slate-600/30 flex items-center justify-center text-lg shrink-0`}>{ITEM_CONFIG[type].icon}</div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase block truncate">{ITEM_CONFIG[type].label}</span>
                    <span className="text-sm font-black text-orange-600 dark:text-amber-400 font-mono">{totalQty} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">ชิ้น</span></span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex-1 flex flex-col justify-start space-y-3">
            {currentSlots.map((slot: any, index: number) => (
              <div key={slot.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${slot.isMe ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-600/50 shadow-sm'}`}>
                <div className="flex items-center gap-3 w-1/3">
                  <div className={`w-12 h-12 bg-gradient-to-b ${slot.color} rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xl shadow-inner shrink-0`}>{slot.icon}</div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">{slot.label}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{slot.desc}</p>
                  </div>
                </div>
                <div className="text-center w-1/3 bg-slate-50 dark:bg-slate-900/50 rounded-lg py-1 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Assigned To</span>
                  <p className={`text-xs sm:text-sm font-black truncate px-1 ${slot.isEmpty ? 'text-slate-400 dark:text-slate-500' : 'text-green-600 dark:text-green-400'}`}>{slot.assignedTo} {slot.isMe && '⭐'}</p>
                  {slot.uid && <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500">UID: {slot.uid}</p>}
                </div>
                <div className="text-right w-1/3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Position</span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/80 px-2 sm:px-3 py-1.5 rounded border border-slate-200 dark:border-slate-600 whitespace-nowrap">หน้า {currentPage} อันที่ {index + 1}</span>
                </div>
              </div>
            ))}
            {currentSlots.length === 0 && <div className="text-center text-slate-500 py-10 italic flex-1 flex items-center justify-center">ยังไม่มีไอเทมแสดงผลในหน้านี้</div>}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-4 flex justify-between items-center text-xs font-mono text-slate-500 dark:text-slate-400 transition-colors">
            <span>{mappedSlots.length} Total Slots</span>
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 sm:px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer">&lt;&lt;</button>
              <button onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 sm:px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer">&lt;</button>
              <span className="font-bold text-slate-700 dark:text-slate-300 mx-1 sm:mx-2">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 sm:px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer">&gt;</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 sm:px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer">&gt;&gt;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}