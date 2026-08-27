"use client";

import { useState } from "react";
import Image from "next/image";
import { ITEM_CONFIG } from "@/components/auction/constants";
import { 
  CheckCircle2, 
  Clock, 
  User, 
  ListOrdered, 
  History as HistoryIcon,
  Search
} from "lucide-react";

type ItemKey = 'Album' | 'Puppet' | 'White' | 'RedBlack';

const ITEM_KEYS: ItemKey[] = ['Album', 'Puppet', 'White', 'RedBlack'];

const getItemDisplayName = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower === 'album') return 'สมุดการ์ด';
  if (lower === 'puppet') return 'เศษการ์ดบอส';
  if (lower === 'white') return 'ขนขาว';
  if (lower === 'redblack' || lower === 'red_black') return 'ขนดำแดง';
  return name;
};

interface QueueHistoryItem {
  id: string;
  user_id?: string;
  item_name: string;
  requested_qty: number;
  received_qty: number;
  calculated_status: string;
  queue_timestamp: string | null;
  slot_range: string;
  position_text: string;
  display_name: string;
}

interface RawQueueItem {
  id: string;
  user_id: string;
  display_name: string;
  item_name: string;
  requested_qty: number;
  received_qty: number;
  calculated_status: string;
  queue_timestamp?: string | null;
}

interface HistoryClientProps {
  initialQueues: QueueHistoryItem[];
  rawQueues: RawQueueItem[];
  currentUserId?: string;
  currentUserDisplayName?: string;
}

export default function HistoryClient({ 
  initialQueues, 
  rawQueues, 
  currentUserId, 
  currentUserDisplayName = 'คุณ' 
}: HistoryClientProps) {
  const [mainTab, setMainTab] = useState<"my_queues" | "guild_board" | "all_history">("my_queues");
  const [boardItemTab, setBoardItemTab] = useState<"all" | ItemKey>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "waiting" | "completed" | "canceled">("all");

  const formatDate = (isoString: string | null | undefined) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      return date.toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
            ได้รับครบแล้ว
          </span>
        );
      case "waiting":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            กำลังรอคิว
          </span>
        );
      case "waitlist":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            รอรอบถัดไป
          </span>
        );
      case "partial":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            ได้รับบางส่วน
          </span>
        );
      case "canceled":
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            ยกเลิกแล้ว
          </span>
        );
    }
  };

  // 1. คำนวณสถิติรายไอเทม 4 ชนิด สำหรับการ์ดสรุปด้านบน
  const itemSummaries = ITEM_KEYS.map((key) => {
    const config = ITEM_CONFIG[key];
    const itemRaw = rawQueues.filter((q) => q.item_name === key);
    
    // สถิติกิลด์
    const waitingQueues = itemRaw.filter((q) => q.calculated_status === "waiting" || q.calculated_status === "waitlist" || q.calculated_status === "partial");
    const completedQueues = itemRaw.filter((q) => q.calculated_status === "completed");
    
    const waitingQty = waitingQueues.reduce((sum, q) => sum + q.requested_qty, 0);
    const waitingUsersCount = new Set(waitingQueues.map((q) => q.display_name)).size;
    const completedQty = completedQueues.reduce((sum, q) => sum + (q.received_qty || q.requested_qty || 0), 0);
    const completedUsersCount = new Set(completedQueues.map((q) => q.display_name)).size;

    // สถานะของตัวเราเอง (Current User)
    const myQueues = itemRaw.filter((q) => q.user_id === currentUserId);
    const myActiveQueues = myQueues.filter((q) => q.calculated_status === "waiting" || q.calculated_status === "waitlist" || q.calculated_status === "partial");
    const myCompletedQueues = myQueues.filter((q) => q.calculated_status === "completed");

    let myStatusText = "ยังไม่ได้จอง";
    let myStatusType: "none" | "waiting" | "completed" = "none";
    let myQueueOrder = 0;
    let queuesBeforeMe = 0;

    if (myActiveQueues.length > 0) {
      myStatusType = "waiting";
      // หาตำแหน่งคิวของฉันในบรรดาคิวรอทั้งหมดของไอเทมนี้
      const uniqueWaiters: string[] = [];
      waitingQueues.forEach((q) => {
        if (!uniqueWaiters.includes(q.user_id)) {
          uniqueWaiters.push(q.user_id);
        }
      });
      const userIndex = uniqueWaiters.indexOf(currentUserId || '');
      if (userIndex !== -1) {
        myQueueOrder = userIndex + 1;
        queuesBeforeMe = userIndex;
        myStatusText = `คิวที่ #${myQueueOrder} (รออีก ${queuesBeforeMe} คิว)`;
      } else {
        myStatusText = `กำลังรอจัดสรร (${myActiveQueues.reduce((s, q) => s + q.requested_qty, 0)} ชิ้น)`;
      }
    } else if (myCompletedQueues.length > 0) {
      myStatusType = "completed";
      const totalGot = myCompletedQueues.reduce((s, q) => s + (q.received_qty || q.requested_qty || 0), 0);
      myStatusText = `✅ ได้รับครบแล้ว (${totalGot} ชิ้น)`;
    }

    return {
      key,
      config,
      waitingQty,
      waitingUsersCount,
      completedQty,
      completedUsersCount,
      myStatusText,
      myStatusType,
      myQueueOrder,
      queuesBeforeMe,
    };
  });

  // 2. คิวของฉัน (My Queues)
  const myQueueList = initialQueues.filter((q) => q.user_id === currentUserId);

  // 3. กระดานคิวกิลด์ (Guild Queue Board)
  const filteredGuildRaw = rawQueues.filter((q) => {
    if (boardItemTab === "all") return true;
    return q.item_name === boardItemTab;
  });

  // 3.1 สมาชิกที่ได้รับสำเร็จแล้ว (Completed Members)
  const completedMembers = filteredGuildRaw
    .filter((q) => q.calculated_status === "completed")
    .map((q) => ({
      id: q.id,
      user_id: q.user_id,
      display_name: q.display_name,
      item_name: q.item_name,
      received_qty: q.received_qty || q.requested_qty || 0,
      isMe: q.user_id === currentUserId,
    }));

  // 3.2 สมาชิกที่กำลังรอคิว (Waiting Queue List)
  const waitingMembers = filteredGuildRaw
    .filter((q) => q.calculated_status === "waiting" || q.calculated_status === "waitlist" || q.calculated_status === "partial")
    .map((q, index) => ({
      id: q.id,
      user_id: q.user_id,
      display_name: q.display_name,
      item_name: q.item_name,
      requested_qty: q.requested_qty,
      queue_timestamp: q.queue_timestamp,
      calculated_status: q.calculated_status,
      isMe: q.user_id === currentUserId,
      order: index + 1,
    }));

  // 4. กรองประวัติทั้งหมดตาม Search & Status
  const filteredHistory = initialQueues.filter((q) => {
    const displayNameOfItem = getItemDisplayName(q.item_name);
    const matchesSearch =
      q.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      displayNameOfItem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.display_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (historyStatusFilter === "all") return true;
    if (historyStatusFilter === "waiting") {
      return q.calculated_status === "waiting" || q.calculated_status === "waitlist" || q.calculated_status === "partial";
    }
    if (historyStatusFilter === "completed") return q.calculated_status === "completed";
    if (historyStatusFilter === "canceled") return q.calculated_status === "canceled";
    return true;
  });

  return (
    <div className="max-w-6xl w-full mx-auto space-y-4 flex flex-col flex-1 min-h-0">
      {/* ส่วนหัว */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>ประวัติคิวประมูล</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          ตรวจสอบลำดับคิวของคุณและสถานะการประมูลของสมาชิกในกิลด์
        </p>
      </div>

      {/* 🌟 1. การ์ดสรุป 4 ไอเทม (Item-Centric Compact Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {itemSummaries.map((item) => (
          <div
            key={`summary-${item.key}`}
            className="p-3 sm:p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between"
          >
            {/* Header: Item Icon + Name */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 bg-linear-to-b ${item.config.color} rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center relative shrink-0 shadow-inner`}>
                <Image src={item.config.icon} alt={item.config.label} fill className="object-contain p-1" sizes="36px" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 block truncate">
                  {item.config.label}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  รอ {item.waitingUsersCount} คน • รับแล้ว {item.completedQty} ชิ้น
                </span>
              </div>
            </div>

            {/* My Queue Position Badge */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="text-[10px] font-semibold text-slate-400 mb-0.5">คิวของคุณ:</div>
              <div className={`text-xs font-bold truncate ${
                item.myStatusType === 'waiting'
                  ? 'text-blue-600 dark:text-blue-400'
                  : item.myStatusType === 'completed'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-slate-400 dark:text-slate-500 font-normal'
              }`}>
                {item.myStatusText}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🌟 2. แถบสลับมุมมองหลัก (Main Tab Navigation) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex-1 flex flex-col min-h-0 space-y-4">
        {/* Main Tab Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setMainTab("my_queues")}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mainTab === "my_queues"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <User size={14} />
              <span>คิวของฉัน ({myQueueList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("guild_board")}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mainTab === "guild_board"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <ListOrdered size={14} />
              <span>กระดานคิวกิลด์</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("all_history")}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mainTab === "all_history"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <HistoryIcon size={14} />
              <span>ประวัติทั้งหมด ({initialQueues.length})</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: คิวของฉัน (My Queues) */}
        {/* ========================================================================= */}
        {mainTab === "my_queues" && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {myQueueList.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                <p className="font-semibold text-slate-600 dark:text-slate-400 mb-1">คุณยังไม่มีรายการจองคิวประมูล</p>
                <p className="text-xs">สามารถไปที่หน้า "ประมูล" เพื่อจองคิวรับไอเทมได้เลยครับ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myQueueList.map((item) => {
                  const itemInfo = ITEM_CONFIG[item.item_name as ItemKey] || {
                    icon: '/auction/Puppet.png',
                    label: item.item_name,
                    color: 'from-slate-200 to-slate-300'
                  };

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 bg-linear-to-b ${itemInfo.color} rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center relative shrink-0 shadow-inner`}>
                            <Image src={itemInfo.icon} alt={itemInfo.label} fill className="object-contain p-1" sizes="44px" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-white block">
                              {itemInfo.label}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              จองเมื่อ: {formatDate(item.queue_timestamp)}
                            </span>
                          </div>
                        </div>
                        {getStatusBadge(item.calculated_status)}
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">จำนวนที่จอง:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.requested_qty} ชิ้น</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">ได้รับแล้ว:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">{item.received_qty} ชิ้น</span>
                        </div>
                      </div>

                      {item.position_text && item.position_text !== '-' && (
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-xl border border-blue-100 dark:border-blue-900/40">
                          📍 ตำแหน่งบนบอร์ด: {item.position_text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: กระดานคิวกิลด์ (Guild Queue Board) */}
        {/* ========================================================================= */}
        {mainTab === "guild_board" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Item Filter Subtabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBoardItemTab("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  boardItemTab === "all"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                ทั้งหมด
              </button>
              {ITEM_KEYS.map((k) => (
                <button
                  key={`board-tab-${k}`}
                  type="button"
                  onClick={() => setBoardItemTab(k)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    boardItemTab === k
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span>{ITEM_CONFIG[k].label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1 min-h-0">
              {/* Column 1: สมาชิกที่กำลังรอรับคิว (Waiting Queue List) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-500" />
                    <span>ลำดับคิวที่กำลังรอรับ ({waitingMembers.length} คน)</span>
                  </span>
                </div>

                {waitingMembers.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                    ไม่มีสมาชิกรอคิวในขณะนี้
                  </div>
                ) : (
                  <div className="space-y-2">
                    {waitingMembers.map((member) => (
                      <div
                        key={`waiting-${member.id}`}
                        className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 text-xs ${
                          member.isMe
                            ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-xs"
                            : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded shrink-0 ${
                            member.isMe
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}>
                            #{member.order}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {member.display_name}
                            {member.isMe && (
                              <span className="text-blue-600 dark:text-blue-400 font-bold ml-1">
                                (คุณ)
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                            จอง {member.requested_qty} ชิ้น
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {getItemDisplayName(member.item_name)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: สมาชิกที่ได้รับสำเร็จแล้ว (Completed Members) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <span>ผู้ที่ได้รับสำเร็จแล้ว ({completedMembers.length} คน)</span>
                  </span>
                </div>

                {completedMembers.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                    ยังไม่มีสมาชิกได้รับไอเทม
                  </div>
                ) : (
                  <div className="space-y-2">
                    {completedMembers.map((member) => (
                      <div
                        key={`completed-${member.id}`}
                        className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 text-xs ${
                          member.isMe
                            ? "bg-green-50/80 dark:bg-green-950/40 border-green-300 dark:border-green-800 shadow-xs"
                            : "bg-green-50/20 dark:bg-green-950/10 border-green-200/60 dark:border-green-900/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 shrink-0">
                            ✓
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {member.display_name}
                            {member.isMe && (
                              <span className="text-green-600 dark:text-green-400 font-bold ml-1">
                                (คุณ)
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-green-600 dark:text-green-400 font-mono">
                            ได้รับ {member.received_qty} ชิ้น
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {getItemDisplayName(member.item_name)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: ประวัติทั้งหมด (All History List / Search) */}
        {/* ========================================================================= */}
        {mainTab === "all_history" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                {(
                  [
                    { id: "all", label: "ทั้งหมด" },
                    { id: "waiting", label: "กำลังรอคิว" },
                    { id: "completed", label: "ได้รับแล้ว" },
                    { id: "canceled", label: "ยกเลิกแล้ว" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setHistoryStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      historyStatusFilter === tab.id
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อสมาชิก หรือไอเทม..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
                  ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          {item.display_name}
                          {item.user_id === currentUserId && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                              คุณ
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {getItemDisplayName(item.item_name)} • {formatDate(item.queue_timestamp)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-bold font-mono text-slate-700 dark:text-slate-300">
                          จอง {item.requested_qty} ชิ้น
                        </div>
                        {item.received_qty > 0 && (
                          <div className="text-[10px] text-green-600 font-bold font-mono">
                            ได้ {item.received_qty} ชิ้น
                          </div>
                        )}
                      </div>
                      {getStatusBadge(item.calculated_status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
