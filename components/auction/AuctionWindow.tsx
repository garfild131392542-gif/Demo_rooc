"use client";

import Image from "next/image";
import { Dispatch, SetStateAction, useState } from "react";
import { ITEM_CONFIG } from "./constants";

type AuctionItemType = "Album" | "Puppet" | "White" | "RedBlack";

type AuctionSlot = {
  id: string;
  type: AuctionItemType;
  icon: string;
  color: string;
  assignedTo: string;
  uid?: string;
  queueId?: string;
  requestedQty?: number;
  receivedQty?: number;
  remainingQty?: number;
  status?: string;
  isMe?: boolean;
  isEmpty?: boolean;
  isCompleted?: boolean;
  bookingSessionSize?: number;
  queueTimestamp?: string;
  isFirstInSession?: boolean;
};

type AuctionHistoryEntry = {
  id: string | number;
  item_name: AuctionItemType;
  display_name: string;
  uid_game: string;
  awarded_qty: number;
  requested_qty: number;
  status: string;
  note?: string | null;
  awarded_at?: string | null;
};

// 💡 เรียกใช้ actions ต่างๆ ของระบบประมูลคิว
import {
  awardAuctionQueue,
  deleteAuctionQueueReservation,
  revertAuctionQueue,
  syncMemberAuctionQueue,
  clearQueueByItemType,
} from "@/app/actions/auction";
import QueueSummaryTable from "./QueueSummaryTable";
import { captureAndDownload } from "@/lib/export-image";

type AuctionWindowProps = {
  isAdmin: boolean;
  history?: AuctionHistoryEntry[];
  memberQueues?: {
    id: string;
    user_id: string | null;
    display_name: string;
    uid_game: string;
    item_type: AuctionItemType;
    requested_qty: number;
    received_qty: number;
    status: string;
    queue_timestamp: string | null;
  }[];
  mappedSlots: AuctionSlot[];
  waitlistSlots?: AuctionSlot[];
  rawSlots?: AuctionSlot[];
  todayItems?: any[];
  activeSubTab: "all" | 'Album' | 'Puppet' | 'Feathers';
  setActiveSubTab: (tab: "all" | 'Album' | 'Puppet' | 'Feathers') => void;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  currentSlots: AuctionSlot[];
  onRefresh: () => void;
  isSaving: boolean;
  limits?: Record<AuctionItemType, number | "">;
  positions?: Record<
    AuctionItemType,
    {
      startPage: string;
      startSlot: string;
      endPage: string;
      endSlot: string;
      total: number | "";
    }
  >;
};

export default function AuctionWindow({
  isAdmin,
  history = [],
  memberQueues = [],
  mappedSlots,
  waitlistSlots = [],
  rawSlots = [],
  todayItems = [],
  activeSubTab,
  setActiveSubTab,
  currentPage,
  setCurrentPage,
  totalPages,
  currentSlots,
  onRefresh,
  isSaving,
}: AuctionWindowProps) {
  const [viewMode, setViewMode] = useState<"slots" | "history" | "queue" | "summary">(
    "slots",
  );
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [confirmedSlots, setConfirmedSlots] = useState<
    Record<string, { awardedQty?: number; status?: string }>
  >({});
  const [editQueueId, setEditQueueId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<string>("");
  const [editLoading, setEditLoading] = useState(false);
  const [exportingType, setExportingType] = useState<AuctionItemType | null>(null);

  const editingQueue = editQueueId
    ? memberQueues.find((q) => q.id === editQueueId)
    : undefined;

  const closeEditModal = () => {
    setEditQueueId(null);
    setEditQty("");
    setEditLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!editingQueue || !editingQueue.user_id) return;
    
    // 💡 คำนวณหายอดที่ได้ของแล้วของคนนี้ในกรุ๊ปนี้จริงๆ ป้องกันค่าต่ำสุดผิดพลาด
    const tsWithoutMs = editingQueue.queue_timestamp ? editingQueue.queue_timestamp.replace(/\.\d{3}/, '') : 'no-ts';
    const currentGroupKey = `${editingQueue.display_name}|${editingQueue.item_type}|${tsWithoutMs}`;
    const groupQueues = memberQueues.filter(q => {
      const ts = q.queue_timestamp ? q.queue_timestamp.replace(/\.\d{3}/, '') : 'no-ts';
      return `${q.display_name}|${q.item_type}|${ts}` === currentGroupKey;
    });
    const totalReceived = groupQueues.reduce((sum, q) => sum + q.received_qty, 0);

    const requestedQty = parseInt(editQty, 10);
    if (
      isNaN(requestedQty) ||
      requestedQty < Math.max(1, totalReceived)
    ) {
      alert(
        `จำนวนที่แก้ไขต้องไม่น้อยกว่าจำนวนที่ได้รับแล้ว (${totalReceived})`,
      );
      return;
    }

    if (requestedQty > 10) {
      alert("ท่านสามารถจองไอเทมแต่ละประเภทได้ไม่เกิน 10 ชิ้น");
      return;
    }

    setEditLoading(true);
    // 💡 เรียกใช้ Sync ด้วยการระบุเป้าหมายตัวเลขสัมบูรณ์ ลบส่วนเกิน เพิ่มส่วนขาดออโต้
    const result = await syncMemberAuctionQueue(
      editingQueue.user_id,
      editingQueue.item_type,
      requestedQty
    );
    setEditLoading(false);

    if (!result.success) {
      alert("ไม่สามารถแก้ไขได้: " + result.error);
      return;
    }
    closeEditModal();
    await onRefresh();
  };

  const renderSlotRow = (slot: AuctionSlot, index: number) => {
    const confirmed = slot.queueId ? confirmedSlots[slot.queueId] : undefined;
    const localReceived = confirmed?.awardedQty !== undefined
      ? Math.max(confirmed.awardedQty, slot.receivedQty ?? 0)
      : (slot.receivedQty ?? 0);
    
    const hasReserve = !slot.isEmpty && typeof slot.requestedQty === "number";
    const localRemaining = hasReserve
      ? Math.max((slot.requestedQty ?? 1) - localReceived, 0)
      : 0;

    const computedCompleted = localReceived >= (slot.requestedQty ?? 0);

    return (
      <div
        key={slot.id}
        className={`flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${slot.isMe ? "bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-500 shadow-md" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md"} ${slot.isEmpty ? "opacity-80 hover:opacity-100 bg-slate-50/50 dark:bg-slate-800/50" : ""}`}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="shrink-0 flex items-center justify-center">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-b ${slot.color} rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center relative shadow-inner`}
            >
              <Image
                src={slot.icon}
                alt="item"
                fill
                className="object-contain p-2"
                sizes="80px"
              />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Assigned To
            </div>
            <div
              className={`text-base sm:text-lg font-black truncate ${slot.isEmpty && !computedCompleted ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}
            >
              {slot.isEmpty && !computedCompleted ? "ไม่มีผู้ลงคิวล่วงหน้า" : slot.assignedTo}{" "}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">
                หน้า {(slot as any).originalPage || currentPage} ช่องที่ {(slot as any).originalSlot || (index + 1)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-700/50 w-full xl:w-auto xl:justify-end shrink-0">
          {slot.isEmpty ? (
            <div className="flex items-center justify-center w-full xl:w-auto bg-slate-100 dark:bg-slate-900/50 px-6 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span></span> ไม่มีใครจอง
              </span>
            </div>
          ) : (
            <>
              <div className="flex flex-col justify-center order-1">
                {computedCompleted ? (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 font-bold whitespace-nowrap">
                    ประมูลเสร็จแล้ว
                  </span>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 font-bold whitespace-nowrap">
                    รอประมูล
                  </span>
                )}
              </div>

              {isAdmin && slot.queueId ? (
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 order-2">
                  <div className="text-center">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {slot.requestedQty ?? "-"}{" "}
                      <span className="text-slate-400 dark:text-slate-600 mx-0.5">
                        /
                      </span>{" "}
                      <span className="text-blue-600 dark:text-blue-400">
                        {localReceived}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                      จอง/ได้แล้ว
                    </div>
                  </div>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {localRemaining}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                      เหลือ
                    </div>
                  </div>
                </div>
              ) : null}

              {isAdmin && slot.queueId ? (
                <div className="w-full sm:w-auto order-3 mt-2 sm:mt-0 xl:ml-2">
                  <button
                    type="button"
                    disabled={
                      actionLoading[slot.queueId] || localRemaining <= 0 || computedCompleted
                    }
                    onClick={async () => {
                      if (!slot.queueId) return;

                      setActionLoading((prev) => ({
                        ...prev,
                        [slot.queueId!]: true,
                      }));
                      
                      const targetQty = (slot.receivedQty ?? 0) + 1;
                      setConfirmedSlots((prev) => ({
                        ...prev,
                        [slot.queueId!]: {
                          awardedQty: targetQty,
                          status: "confirmed",
                        },
                      }));
                      
                      const result = await awardAuctionQueue(slot.queueId, 1);
                      
                      setActionLoading((prev) => ({
                        ...prev,
                        [slot.queueId!]: false,
                      }));

                      if (result?.success) {
                        if (onRefresh) await onRefresh();
                        setConfirmedSlots((prev) => {
                          const next = { ...prev };
                          delete next[slot.queueId!];
                          return next;
                        });
                      } else {
                         setConfirmedSlots((prev) => {
                          const next = { ...prev };
                          delete next[slot.queueId!];
                          return next;
                        });
                         alert(result?.error || 'เกิดข้อผิดพลาดในการประมูล');
                      }
                    }}
                    className={`w-full sm:w-auto rounded-xl text-sm font-bold px-6 py-3 disabled:opacity-50 transition-all shadow-md whitespace-nowrap flex items-center justify-center gap-2 ${
                      computedCompleted 
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none' 
                        : 'cursor-pointer bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-500/20'
                    }`}
                  >
                    {actionLoading[slot.queueId] ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        กำลัง...
                      </>
                    ) : computedCompleted ? (
                      <><span>✅</span> สำเร็จ</>
                    ) : (
                      <>ประมูล</>
                    )}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    if (!editingQueue) return null;

    // 💡 ดึงยอดรวมที่ได้รับแล้วของกรุ๊ปนี้เพื่อนำมาเซ็ตค่า Validation ขั้นต่ำที่ถูกต้อง
    const tsWithoutMs = editingQueue.queue_timestamp ? editingQueue.queue_timestamp.replace(/\.\d{3}/, '') : 'no-ts';
    const currentGroupKey = `${editingQueue.display_name}|${editingQueue.item_type}|${tsWithoutMs}`;
    const groupQueues = memberQueues.filter(q => {
      const ts = q.queue_timestamp ? q.queue_timestamp.replace(/\.\d{3}/, '') : 'no-ts';
      return `${q.display_name}|${q.item_type}|${ts}` === currentGroupKey;
    });
    const totalReceived = groupQueues.reduce((sum, q) => sum + q.received_qty, 0);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                แก้ไขจำนวนคิวประมูล
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {editingQueue.display_name} • {editingQueue.item_type}
              </div>
            </div>
            <button
              type="button"
              onClick={closeEditModal}
              className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              ปิด
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                ระบุจำนวนจองทั้งหมดที่ควรจะเป็น
              </label>
              <input
                type="number"
                min={Math.max(1, totalReceived)}
                max={10}
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                จำนวนต้องอยู่ระหว่าง {Math.max(1, totalReceived)} ถึง 10 (ไม่เกินยอดสูงสุด 10 ชิ้น)
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {editLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
              <button
                type="button"
                onClick={closeEditModal}
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-3xl p-2.5 shadow-xl relative overflow-hidden font-sans border-2 border-slate-200 dark:border-slate-700 transition-colors h-full flex flex-col">
      <div className="flex justify-between items-center px-4 py-3 bg-blue-600 dark:bg-blue-900 rounded-t-[18px] border-b border-blue-700 dark:border-slate-700 shadow-sm text-white transition-colors gap-4 flex-wrap">
        <div className="flex items-center gap-2 font-bold">
          <span className="text-xl">⚖️</span>
          <span>
            Today&apos;s Queue & Slot Mapping{" "}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("slots")}
            className={`cursor-pointer text-xs px-4 py-1.5 rounded-full font-bold transition-colors ${viewMode === "slots" ? "bg-white text-blue-600 shadow-sm" : "bg-white/20 hover:bg-white/30"}`}
          >
            Guild Auction
          </button>
          <button
            onClick={() => setViewMode("queue")}
            className={`cursor-pointer text-xs px-4 py-1.5 rounded-full font-bold transition-colors ${viewMode === "queue" ? "bg-white text-blue-600 shadow-sm" : "bg-white/20 hover:bg-white/30"}`}
          >
            คิวประมูล
          </button>
          {isAdmin && (
            <button
              onClick={() => setViewMode("summary")}
              className={`cursor-pointer text-xs px-4 py-1.5 rounded-full font-bold transition-colors ${viewMode === "summary" ? "bg-white text-blue-600 shadow-sm" : "bg-white/20 hover:bg-white/30"}`}
            >
              สรุปจัดสรรคิว
            </button>
          )}
          <button
            onClick={() => setViewMode("history")}
            className={`cursor-pointer text-xs px-4 py-1.5 rounded-full font-bold transition-colors ${viewMode === "history" ? "bg-white text-blue-600 shadow-sm" : "bg-white/20 hover:bg-white/30"}`}
          >
            ประวัติการประมูล
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onRefresh}
            disabled={isSaving}
            className="text-xs bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-full font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1">
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 border-t-0 rounded-b-2xl p-4 md:p-6 shadow-inner transition-colors mt-2.5 mx-2.5 mb-2.5">
          {viewMode === "slots" ? (
            <>
              <div className="flex justify-center mb-6">
                <div className="flex flex-wrap justify-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 transition-colors">
                  {(
                    ["all", "Album", "Puppet", "Feathers"] as const
                  ).filter(tab => {
                    if (tab === "all") return true;
                    if (tab === "Feathers") {
                      const whiteSession = todayItems?.find((s: any) => s.item_name === 'White');
                      const redBlackSession = todayItems?.find((s: any) => s.item_name === 'RedBlack');
                      const whiteActive = whiteSession && whiteSession.status === 'active' && (whiteSession.total_quantity ?? 0) > 0;
                      const redBlackActive = redBlackSession && redBlackSession.status === 'active' && (redBlackSession.total_quantity ?? 0) > 0;
                      return whiteActive || redBlackActive;
                    }
                    const session = todayItems?.find((s: any) => s.item_name === tab);
                    return session && session.status === 'active' && (session.total_quantity ?? 0) > 0;
                  }).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveSubTab(tab);
                        setCurrentPage(1);
                      }}
                      className={`px-4 sm:px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${activeSubTab === tab ? "bg-blue-600 text-white shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
                    >
                      {tab === "all" ? "All Items" : tab}
                    </button>
                  ))}
                </div>
              </div>



              <div className="flex-1 flex flex-col gap-4 content-start overflow-y-auto pr-2">
                {currentSlots.map((slot, index) => {
                  return (
                    <div key={slot.id}>
                      {renderSlotRow(slot, index)}
                    </div>
                  );
                })}

                {currentSlots.length === 0 && (
                  <div className="text-center text-slate-500 py-10 italic flex-1 flex items-center justify-center">
                    ยังไม่มีไอเทมแสดงผลในหน้านี้
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 transition-colors">
                <span className="font-semibold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {mappedSlots.length} Total Slots
                </span>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl shadow-sm">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer font-bold text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    &lt;&lt;
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer font-bold text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    &lt;
                  </button>
                  <span className="font-bold text-slate-700 dark:text-slate-300 mx-2 sm:mx-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer font-bold text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    &gt;
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer font-bold text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    &gt;&gt;
                  </button>
                </div>
              </div>


            </>
          ) : viewMode === "queue" ? (
            <div className="flex-1 flex flex-col justify-start space-y-4">
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2 mb-4 bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    เครื่องมือแอดมิน:
                  </span>
                  {(['Album', 'Puppet', 'White', 'RedBlack'] as const).filter(type => {
                    const session = todayItems?.find((s: any) => s.item_name === type);
                    return session && session.status === 'active' && (session.total_quantity ?? 0) > 0;
                  }).map(type => (
                    <button
                      key={`clear-${type}`}
                      type="button"
                      disabled={actionLoading[`clear-${type}`]}
                      onClick={async () => {
                        if (!confirm(`ยืนยันการล้างคิว (ลบคิวรอรอบถัดไปและคิวประมูลเสร็จแล้วออกจากฐานข้อมูลจริง ๆ) ของไอเทม ${type}?`)) {
                          return;
                        }

                        setActionLoading((prev) => ({
                          ...prev,
                          [`clear-${type}`]: true,
                        }));

                        const result = await clearQueueByItemType(type);

                        setActionLoading((prev) => ({
                          ...prev,
                          [`clear-${type}`]: false,
                        }));

                        if (result.success) {
                          alert(`ล้างคิว ${type} สำเร็จ! ลบออกจากฐานข้อมูลไปทั้งหมด ${result.count} คิว`);
                          if (onRefresh) await onRefresh();
                        } else {
                          alert(`ไม่สามารถล้างคิวได้: ${result.error}`);
                        }
                      }}
                      className="cursor-pointer text-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
                    >
                      {actionLoading[`clear-${type}`] ? "กำลัง..." : `ล้างคิว ${type}`}
                    </button>
                  ))}
                </div>
              )}
              {memberQueues.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    const groupMap = new Map<string, typeof memberQueues>();
                    const groupOrder: string[] = [];
                    const qualifiedQueueIds = new Set(rawSlots?.map(s => s.queueId).filter(Boolean) || []);
                    const waitlistQueueIds = new Set(waitlistSlots?.map(s => s.queueId).filter(Boolean) || []);

                    const filteredMemberQueues = (memberQueues || []).filter((queue) => {
                      if (queue.status === 'waiting') {
                        const session = todayItems?.find((s: any) => s.item_name === queue.item_type);
                        const hasActiveSession = session && session.status === 'active' && (session.total_quantity ?? 0) > 0;
                        if (hasActiveSession) {
                          return qualifiedQueueIds.has(queue.id);
                        }
                      }
                      return true;
                    });

                    filteredMemberQueues.forEach((queue) => {
                      const tsWithoutMs = queue.queue_timestamp
                        ? queue.queue_timestamp.replace(/\.\d{3}/, '')
                        : 'no-ts';
                      const groupKey = `${queue.display_name}|${queue.item_type}|${tsWithoutMs}`;
                      if (!groupMap.has(groupKey)) {
                        groupMap.set(groupKey, []);
                        groupOrder.push(groupKey);
                      }
                      groupMap.get(groupKey)!.push(queue);
                    });

                    return groupOrder.map((groupKey) => {
                      const groupQueues = groupMap.get(groupKey) || [];
                      const firstQueue = groupQueues[0];
                      const totalRequested = groupQueues.reduce(
                        (sum, q) => sum + q.requested_qty,
                        0,
                      );
                      const totalReceived = groupQueues.reduce(
                        (sum, q) => sum + q.received_qty,
                        0,
                      );
                      const activeWaitingCount = groupQueues.filter(
                        (q) => q.status === 'waiting' && !waitlistQueueIds.has(q.id)
                      ).length;
                      const waitlistedCount = groupQueues.filter(
                        (q) => q.status === 'waiting' && waitlistQueueIds.has(q.id)
                      ).length;
                      const formattedTime = firstQueue.queue_timestamp
                        ? new Date(firstQueue.queue_timestamp).toLocaleString(
                            "th-TH",
                          )
                        : "-";

                      return (
                        <div
                          key={groupKey}
                          className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(280px,260px)] gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl"
                        >
                          <div>
                            <div className="flex items-center gap-0 flex-1">
                              <div className="grid grid-cols-5 gap-4 w-full items-center">
                                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                  {firstQueue.display_name}
                                </div>
                                <div>
                                  <div className="inline-flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 w-16 h-16 overflow-hidden border-2 border-blue-200 dark:border-blue-800 flex-shrink-0 shadow-md">
                                    <Image
                                      src={
                                        ITEM_CONFIG[
                                          firstQueue
                                            .item_type as keyof typeof ITEM_CONFIG
                                        ]?.icon || "/auction/Puppet.png"
                                      }
                                      alt={firstQueue.item_type}
                                      width={48}
                                      height={48}
                                      className="object-contain"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="text-slate-900 dark:text-slate-100">
                                      จอง {totalRequested}
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <div className="gap-3 flex items-center justify-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="text-slate-900 dark:text-slate-100">
                                      ได้รับ {totalReceived}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-center text-xs font-semibold">
                                  {activeWaitingCount > 0 && (
                                    <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                                      รอจัดสรร {activeWaitingCount} อัน
                                    </span>
                                  )}
                                  {waitlistedCount > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800 animate-pulse">
                                      รอรอบถัดไป {waitlistedCount} อัน
                                    </span>
                                  )}
                                  {totalRequested - totalReceived === 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                      สำเร็จ
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                              {formattedTime}
                            </div>
                          </div>
                          <div className="space-y-2 flex justify-end items-center gap-2">
                            {isAdmin ? (
                              <>
                                {/* 💡 เพิ่มปุ่มแก้ไขตรงนี้ให้กับ Admin */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditQueueId(firstQueue.id);
                                    setEditQty(totalRequested.toString());
                                  }}
                                  className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 px-4 h-13 border-2 border-blue-100 dark:border-blue-800/50 flex-shrink-0 shadow-md text-blue-600 dark:text-blue-400 text-sm font-semibold transition-colors"
                                >
                                  แก้ไข
                                </button>
                                
                                <button
                                  type="button"
                                  disabled={groupQueues.some(
                                    (q) => actionLoading[q.id],
                                  )}
                                  onClick={async () => {
                                    if (
                                      !confirm(
                                        "ยืนยันการลบคิวนี้ทั้งหมด?",
                                      )
                                    )
                                      return;
                                    for (const queue of groupQueues) {
                                      setActionLoading((prev) => ({
                                        ...prev,
                                        [queue.id]: true,
                                      }));
                                      const result =
                                        await deleteAuctionQueueReservation(
                                          queue.id,
                                        );
                                      setActionLoading((prev) => ({
                                        ...prev,
                                        [queue.id]: false,
                                      }));
                                      if (!result.success) {
                                        alert(
                                          "ไม่สามารถลบได้: " + result.error,
                                        );
                                        break;
                                      }
                                    }
                                    await onRefresh();
                                  }}
                                  className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/20 px-4 h-13 border-2 border-rose-100 dark:border-rose-800/50 flex-shrink-0 shadow-md text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-100"
                                >
                                  {groupQueues.some((q) => actionLoading[q.id])
                                    ? "กำลัง..."
                                    : "ลบ"}
                                </button>
                              </>
                            ) : (
                              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-3 text-sm font-semibold text-slate-600 dark:text-slate-300 h-full flex items-center justify-center text-center">
                                ผู้ดูแลจัดคิวและแจกของ
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="text-center text-slate-500 dark:text-slate-400 py-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  ไม่มีรายการคิวในระบบ
                </div>
              )}
            </div>
          ) : viewMode === "history" ? (
            <div className="flex-1 flex flex-col justify-start space-y-4">
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Auction History
              </div>
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap xl:flex-nowrap justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl items-center">
                      
                      <div className="flex items-center gap-3">
                        <div
                          className={`relative w-14 h-14 bg-linear-to-b ${ITEM_CONFIG[entry.item_name as AuctionItemType]?.color || "from-slate-200/40 to-slate-400/10"} rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center`}
                        >
                          <Image
                            src={
                              ITEM_CONFIG[entry.item_name as AuctionItemType]
                                ?.icon || "/auction/Puppet.png"
                            }
                            alt={entry.item_name}
                            fill
                            className="object-contain p-2"
                            sizes="56px"
                          />
                        </div>
                        
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {entry.display_name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {entry.uid_game}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2 xl:mt-0">
                        <div className="flex items-center justify-center w-24 sm:w-30 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            จอง {entry.requested_qty}
                          </div>
                        </div>
                        <div className="flex items-center justify-center w-24 sm:w-30 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            ได้รับ {entry.awarded_qty}
                          </div>
                        </div>
                        <div className="flex items-center justify-center w-24 sm:w-30 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            {entry.status}
                          </div>
                        </div>
                        <div className="gap-2 flex flex-col sm:flex-row items-center justify-center w-full sm:w-auto bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            วันที่ประมูล
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
                            {entry.awarded_at
                              ? new Date(entry.awarded_at).toLocaleString("th-TH")
                              : "ไม่ระบุ"}
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            disabled={actionLoading[entry.id]}
                            onClick={async () => {
                              if (!confirm("ยืนยันการลบประวัติ? (คิวจะถูกดึงกลับไปรอแจกใหม่ที่หน้ากระดานหลัก)")) return;
                              
                              setActionLoading((prev) => ({ ...prev, [entry.id]: true }));
                              
                              const result = await revertAuctionQueue(entry.id)
                              
                              setActionLoading((prev) => ({ ...prev, [entry.id]: false }));
                              
                              if (!result.success) {
                                alert("ไม่สามารถลบได้: " + result.error);
                              } else {
                                await onRefresh();
                              }
                            }}
                            className="w-full sm:w-auto cursor-pointer flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 px-6 py-2 h-[42px] rounded-xl border border-rose-200 dark:border-rose-800/50 text-sm font-bold transition-all disabled:opacity-50 shadow-sm"
                          >
                            {actionLoading[entry.id] ? (
                              <>
                                <svg className="animate-spin h-4 w-4 mr-2 text-rose-500" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                </svg>
                                กำลังลบ...
                              </>
                            ) : (
                              "ลบ"
                            )}
                          </button>
                        )}
                      </div>
                      
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-500 dark:text-slate-400 py-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  ยังไม่มีประวัติการประมูล
                </div>
               )}
             </div>
          ) : (
            <div className="flex-1 flex flex-col justify-start space-y-6 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                สรุปจัดสรรคิว (Queue Summary)
              </div>
              {(() => {
                const priorityOrder = ['Album', 'Puppet', 'White', 'RedBlack'] as const;
                const activeTypes = activeSubTab === 'all'
                  ? priorityOrder.filter(type => {
                      const session = todayItems?.find((s: any) => s.item_name === type);
                      return session && session.status === 'active' && (session.total_quantity ?? 0) > 0;
                    })
                  : activeSubTab === 'Feathers'
                  ? (['White', 'RedBlack'] as const).filter(type => {
                      const session = todayItems?.find((s: any) => s.item_name === type);
                      return session && session.status === 'active' && (session.total_quantity ?? 0) > 0;
                    })
                  : [activeSubTab];

                if (activeTypes.length === 0) {
                  return (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      ไม่มีไอเทมที่เปิดประมูลในวันนี้
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {activeTypes.map(type => {
                      return (
                        <div key={type} id={`queue-summary-${type}`} className="space-y-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative">
                          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📦</span>
                              <span>{ITEM_CONFIG[type]?.label || type}</span>
                            </div>
                            <button
                              type="button"
                              disabled={exportingType !== null}
                              onClick={async () => {
                                const el = document.getElementById(`queue-summary-${type}`);
                                if (el) {
                                  setExportingType(type);
                                  // Hide the export button itself during screenshot capture
                                  const btn = el.querySelector(`.export-btn-${type}`) as HTMLElement;
                                  if (btn) btn.style.setProperty('display', 'none', 'important');
                                  
                                  try {
                                    // small timeout to let the state change render/flush
                                    await new Promise(resolve => setTimeout(resolve, 80));
                                    await captureAndDownload(el, `queue_${type}_${new Date().toISOString().split('T')[0]}.jpg`, {
                                      backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                                      width: 900
                                    });
                                  } catch (err: any) {
                                    alert('ไม่สามารถส่งออกรูปภาพได้: ' + err.message);
                                  } finally {
                                    if (btn) btn.style.removeProperty('display');
                                    setExportingType(null);
                                  }
                                }
                              }}
                              className={`export-btn-${type} cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-blue-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0`}
                            >
                              {exportingType === type ? (
                                <>
                                  <svg className="animate-spin h-3.5 w-3.5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                  </svg>
                                  <span>กำลังส่งออก...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                  <span>Export รูปภาพ</span>
                                </>
                              )}
                            </button>
                          </div>
                          <QueueSummaryTable
                            itemName={type}
                            mappedSlots={mappedSlots}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      {renderEditModal()}
      {/* Processing Loader Removed */}
    </div>
  );
}