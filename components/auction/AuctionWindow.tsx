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
  // ✨ Booking session info
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

import {
  awardAuctionQueue,
  deleteAuctionQueueReservation,
  updateAuctionQueueReservation,
} from "@/app/actions/auction";

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
    queue_timestamp: string | null;
  }[];
  mappedSlots: AuctionSlot[];
  activeSubTab: "all" | AuctionItemType;
  setActiveSubTab: (tab: "all" | AuctionItemType) => void;
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
  activeSubTab,
  setActiveSubTab,
  currentPage,
  setCurrentPage,
  totalPages,
  currentSlots,
  onRefresh,
  isSaving,
}: AuctionWindowProps) {
  const [viewMode, setViewMode] = useState<"slots" | "history" | "queue">(
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

  const editingQueue = editQueueId
    ? memberQueues.find((q) => q.id === editQueueId)
    : undefined;

  const closeEditModal = () => {
    setEditQueueId(null);
    setEditQty("");
    setEditLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!editingQueue) return;
    const requestedQty = parseInt(editQty, 10);
    if (
      isNaN(requestedQty) ||
      requestedQty < Math.max(1, editingQueue.received_qty)
    ) {
      alert(
        `จำนวนที่แก้ไขต้องไม่น้อยกว่าจำนวนที่ได้รับแล้ว (${editingQueue.received_qty})`,
      );
      return;
    }
    setEditLoading(true);
    const result = await updateAuctionQueueReservation(
      editingQueue.id,
      requestedQty,
    );
    setEditLoading(false);
    if (!result.success) {
      alert("ไม่สามารถแก้ไขได้: " + result.error);
      return;
    }
    closeEditModal();
    await onRefresh();
  };

  // 🌟 ไม่ต้องแยก Assigned กับ Free แล้ว จับรวมกันไปเลย!

  const renderSlotRow = (slot: AuctionSlot, index: number) => {
    const confirmed = confirmedSlots[slot.id];
    // ✨ ไม่ต้องนับซ้ำ - server แล้ว update received_qty
    const localReceived = (slot.receivedQty ?? 0);
    const hasReserve = !slot.isEmpty && typeof slot.requestedQty === "number";
    const localRemaining = hasReserve
      ? Math.max((slot.requestedQty ?? 1) - (slot.receivedQty ?? 0), 0)
      : 0;
    const localStatus = slot.isEmpty
      ? "waiting"
      : confirmed?.status ||
        slot.status ||
        (localRemaining === 0 ? "สำเร็จ" : "รอประมูล");

    // ✨ ใหม่: แต่ละ row = 1 slot, completed = receivedQty >= requestedQty
    const isCompleted = (slot.receivedQty ?? 0) >= (slot.requestedQty ?? 0);

    return (
      <div
        key={slot.id}
        className={`flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${slot.isMe ? "bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-500 shadow-md" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md"} ${slot.isEmpty ? "opacity-80 hover:opacity-100 bg-slate-50/50 dark:bg-slate-800/50" : ""}`}
      >
        {/* 1. ด้านซ้าย: ไอคอน + ข้อมูลหลัก */}
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
  className={`text-base sm:text-lg font-black truncate ${slot.isEmpty && !isCompleted ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}
>
  {slot.isEmpty && !isCompleted ? "ไม่มีผู้ลงคิวล่วงหน้า" : slot.assignedTo}{" "}
</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">
                หน้า {currentPage} คิว {index + 1}
              </span>
            </div>
          </div>
        </div>

        {/* 2. ตรงกลาง & ขวา: จัดการ UI ตามสถานะว่า "ว่าง" หรือ "มีคนจอง" */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-700/50 w-full xl:w-auto xl:justify-end shrink-0">
          {slot.isEmpty ? (
            // 🌟 กรณี "ไอเทมเปิดว่าง" โชว์กล่องสถานะยาวๆ กลางจอไปเลย
            <div className="flex items-center justify-center w-full xl:w-auto bg-slate-100 dark:bg-slate-900/50 px-6 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span></span> ไม่มีใครจอง
              </span>
            </div>
          ) : (
            // 🌟 กรณี "มีคนจอง" โชว์ Badge + โควต้า + ปุ่ม เหมือนเดิม
            <>
              {/* ป้ายสถานะ เปลี่ยนสีตาม isCompleted (fallback ถ้า prop หายไป) */}
              <div className="flex flex-col justify-center order-1">
                {(() => {
                  // ✨ ใหม่: แต่ละ row = 1 slot, completed = receivedQty >= requestedQty
                  const computedCompleted = (slot.receivedQty ?? 0) >= (slot.requestedQty ?? 0);
                  return computedCompleted ? (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 font-bold whitespace-nowrap">
                      ประมูลเสร็จแล้ว
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 font-bold whitespace-nowrap">
                      รอประมูล
                    </span>
                  );
                })()}
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
                      actionLoading[slot.queueId] || localRemaining <= 0
                    }
                    onClick={async () => {
                      setActionLoading((prev) => ({
                        ...prev,
                        [slot.queueId!]: true,
                      }));
                      await awardAuctionQueue(slot.queueId!, 1);
                      setActionLoading((prev) => ({
                        ...prev,
                        [slot.queueId!]: false,
                      }));
                      setConfirmedSlots((prev) => ({
                        ...prev,
                        [slot.id]: {
                          awardedQty: (prev[slot.id]?.awardedQty ?? 0) + 1,
                          status: "confirmed",
                        },
                      }));
                      await onRefresh();
                    }}
                    className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold px-6 py-3 disabled:opacity-50 disabled:bg-slate-400 transition-all shadow-md shadow-emerald-500/20 whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    {actionLoading[slot.queueId] ? (
                      <>
                        <svg
                          className=" animate-spin h-4 w-4 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          ></path>
                        </svg>
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        {" "}
                        <span className="cursor-pointer">ประมูล</span>
                      </>
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
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                แก้ไขจำนวนคิว
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
                จำนวนที่จอง
              </label>
              <input
                type="number"
                min={Math.max(1, editingQueue.received_qty)}
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                จำนวนต้องไม่น้อยกว่าที่ได้รับแล้ว ({editingQueue.received_qty})
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

  // ---------------- HTML โครงสร้างเดิมด้านล่าง ----------------
  return (
    <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-3xl p-2.5 shadow-xl relative overflow-hidden font-sans border-2 border-slate-200 dark:border-slate-700 transition-colors h-full flex flex-col">
      {/* 🔹 Header ปกติ */}
      <div className="flex justify-between items-center px-4 py-3 bg-blue-600 dark:bg-blue-900 rounded-t-[18px] border-b border-blue-700 dark:border-slate-700 shadow-sm text-white transition-colors gap-4 flex-wrap">
        <div className="flex items-center gap-2 font-bold">
          <span className="text-xl">⚖️</span>
          <span>
            Today&apos;s Queue & Slot Mapping{" "}
            {isAdmin && (
              <span className="ml-2 text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded-full">
                
              </span>
            )}
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
              {/* 🔹 Tabs */}
              <div className="flex justify-center mb-6">
                <div className="flex flex-wrap justify-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 transition-colors">
                  {(
                    ["all", "Album", "Puppet", "White", "RedBlack"] as const
                  ).map((tab) => (
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

              {/* 🌟 แสดงผลแบบ List Row ยาวต่อเนื่องทั้งหมด */}
              <div className="flex-1 flex flex-col gap-4 content-start overflow-y-auto pr-2">
                {currentSlots.map((slot, index) => {
                  // ✨ NEW: Show booking session header for first slot in session
                  const bookingSessionSize = (slot as any)?.bookingSessionSize ?? 1;
                  const queueTimestamp = (slot as any)?.queueTimestamp;
                  const isFirstInSession = (slot as any)?.isFirstInSession ?? false;
                  
                  // Format timestamp for display
                  let formattedTime = '';
                  if (queueTimestamp && queueTimestamp !== 'no-timestamp') {
                    try {
                      formattedTime = new Date(queueTimestamp).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      });
                    } catch (e) {
                      formattedTime = '';
                    }
                  }
                  
                  return (
                    <div key={slot.id}>
                      {/* Show booking session header only for first slot in a session */}
                      
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

              {/* 🔹 Pagination */}
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
              {memberQueues.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    // ✨ Group queues by display_name + item_type + queue_timestamp (without milliseconds)
                    const groupMap = new Map<string, typeof memberQueues>();
                    const groupOrder: string[] = [];

                    memberQueues.forEach((queue) => {
                      // Remove milliseconds from timestamp to group by seconds
                      const tsWithoutMs = queue.queue_timestamp
                        ? queue.queue_timestamp.replace(/\.\d{3}/, '')
                        : 'no-ts';
                      const groupKey = `${queue.display_name}|${queue.item_type}|${tsWithoutMs}`;
                      console.log('DEBUG Queue:', { display_name: queue.display_name, item_type: queue.item_type, raw_ts: queue.queue_timestamp, normalized_ts: tsWithoutMs, groupKey });
                      if (!groupMap.has(groupKey)) {
                        groupMap.set(groupKey, []);
                        groupOrder.push(groupKey);
                      }
                      groupMap.get(groupKey)!.push(queue);
                    });

                    // Render each group
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
                      const formattedTime = firstQueue.queue_timestamp
                        ? new Date(firstQueue.queue_timestamp).toLocaleString(
                            "th-TH",
                          )
                        : "-";

                      return (
                        <div
                          key={groupKey}
                          className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(240px,220px)] gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl"
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
                                <div className="flex justify-center text-xs text-slate-500 dark:text-slate-400">
                                  {totalRequested - totalReceived > 0
                                    ? `กำลังรอ ${totalRequested - totalReceived} อัน`
                                    : "สำเร็จ"}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                              {formattedTime}
                            </div>
                          </div>
                          <div className="space-y-2 flex justify-end gap-2">
                            {isAdmin ? (
                              <>
                                
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
                                  className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3 w-22 h-13 overflow-hidden border-2 border-rose-100 dark:border-rose-800/50 flex-shrink-0 shadow-md text-rose-600 dark:text-rose-400 text-sm font-semibold"
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
          ) : (
            <div className="flex-1 flex flex-col justify-start space-y-4">
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Auction History
              </div>
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl  items-center">
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
                        
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {entry.display_name}
                          </div>
                          
                          
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {entry.uid_game}
                          </div>
                        
                      </div>
                      
                        
                        <div className="flex items-center justify-center w-30 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className=" text-slate-900 dark:text-slate-100">
                            จอง {entry.requested_qty}
                          </div>
                        </div>
                        <div className="flex items-center justify-center w-30 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className=" text-slate-900 dark:text-slate-100">
                            ได้รับ {entry.awarded_qty}
                          </div>
                        </div>
                        <div className="flex items-center justify-center w-30 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 col-span-2">
                          <div className=" text-slate-900 dark:text-slate-100">
                            {entry.status}
                          </div>
                          
                        </div>
                        <div className="gap-2 flex items-center justify-center w-50 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 col-span-2">
                          <div className="  text-slate-900 dark:text-slate-100">
                            วันที่ประมูล
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {entry.awarded_at
                              ? new Date(entry.awarded_at).toLocaleString(
                                  "th-TH",
                                )
                              : "ไม่ระบุ"}
                          </div>
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
          )}
        </div>
      </div>
      {renderEditModal()}
    </div>
  );
}
