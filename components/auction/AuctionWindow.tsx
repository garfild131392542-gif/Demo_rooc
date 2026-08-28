"use client";

import Image from "next/image";
import { Dispatch, SetStateAction, useState, useEffect, useRef } from "react";
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
  batchAwardAuctionQueues,
  deleteAuctionQueueReservation,
  revertAuctionQueue,
  batchRevertAuctionQueues,
  syncMemberAuctionQueue,
  clearQueueByItemType,
} from "@/app/actions/auction";
import QueueSummaryTable from "./QueueSummaryTable";
import AdminProxyBooking from "./AdminProxyBooking";
import RoundStatusHeader from "./rounds/RoundStatusHeader";
import RoundMemberTabs from "./rounds/RoundMemberTabs";
import AdminTransferModal from "./rounds/AdminTransferModal";
import AdminRoundSettingsModal from "./rounds/AdminRoundSettingsModal";
import AdminSwapModal from "./rounds/AdminSwapModal";
import AdminReorderModal from "./rounds/AdminReorderModal";
import { getRoundMembersList, getRoundAuditLogs } from "@/app/actions/auction-rounds";
import { captureAndDownload } from "@/lib/export-image";
import { Pencil, Trash2, Clock, CheckCircle2, ShieldAlert, Sparkles, AlertCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";

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
  guildMembers?: {
    id: string;
    display_name: string;
    uid_game: string;
    role: string;
    avatar_url?: string;
  }[];
  roundsOverview?: any;
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
  onRefresh: () => void | Promise<void>;
  isSaving: boolean;
  viewMode?: "slots" | "history" | "queue" | "summary" | "proxy" | "rounds";
  setViewMode?: (mode: "slots" | "history" | "queue" | "summary" | "proxy" | "rounds") => void;
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
  viewMode: propsViewMode,
  setViewMode: propsSetViewMode,
  isAdmin,
  history = [],
  memberQueues = [],
  guildMembers = [],
  roundsOverview,
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
  const [internalViewMode, setInternalViewMode] = useState<"slots" | "history" | "queue" | "summary" | "proxy" | "rounds">(
    "slots",
  );
  const viewMode = propsViewMode ?? internalViewMode;
  const setViewMode = propsSetViewMode ?? setInternalViewMode;
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [deletedHistoryIds, setDeletedHistoryIds] = useState<Set<string | number>>(new Set());
  const [deletedQueueIds, setDeletedQueueIds] = useState<Set<string | number>>(new Set());
  const [confirmedSlots, setConfirmedSlots] = useState<
    Record<string, { awardedQty?: number; status?: string }>
  >({});
  const [editQueueId, setEditQueueId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<string>("");
  const [editLoading, setEditLoading] = useState(false);
  const [exportingType, setExportingType] = useState<AuctionItemType | null>(null);

  // 🌟 Batch Selection / Staging State (ติ๊กเลือกก่อน แล้วกดยืนยันบันทึกทีเดียว)
  const [stagedQueueIds, setStagedQueueIds] = useState<Set<string>>(new Set());
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  // 📜 History Tab Pagination, Filter & Local Optimistic States
  const [localHistory, setLocalHistory] = useState<AuctionHistoryEntry[]>(history || []);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyItemFilter, setHistoryItemFilter] = useState<"all" | AuctionItemType>("all");
  const [stagedHistoryIds, setStagedHistoryIds] = useState<Set<string | number>>(new Set());
  const [isBatchHistoryDeleting, setIsBatchHistoryDeleting] = useState(false);

  useEffect(() => {
    if (history) {
      setLocalHistory(history);
    }
  }, [history]);

  // 🌟 Sync confirmedSlots with memberQueues: If server says status is waiting or received_qty is 0, purge confirmedSlots
  useEffect(() => {
    if (memberQueues && Array.isArray(memberQueues)) {
      setConfirmedSlots((prev) => {
        let changed = false;
        const next = { ...prev };
        memberQueues.forEach((q: any) => {
          if (q.status === 'waiting' && next[String(q.id)]) {
            delete next[String(q.id)];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [memberQueues]);

  // 🏆 Round Management States
  const [activeRoundItem, setActiveRoundItem] = useState<AuctionItemType>("Album");
  const [roundMembers, setRoundMembers] = useState<any[]>([]);
  const [roundLogs, setRoundLogs] = useState<any[]>([]);
  const [isLoadingRoundData, setIsLoadingRoundData] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsMode, setSettingsMode] = useState<'settings' | 'advance'>('settings');
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [selectedMemberForAction, setSelectedMemberForAction] = useState<any>(null);
  // ⚡ In-Memory Cache for Instant 0ms Tab Switching between items
  const roundCacheRef = useRef<Record<string, { members: any[]; logs: any[]; fetchedAt: number }>>({});
  const roundTabsContainerRef = useRef<HTMLDivElement>(null);

  const scrollRoundTabs = (direction: 'left' | 'right') => {
    if (roundTabsContainerRef.current) {
      const amount = direction === 'left' ? -180 : 180;
      roundTabsContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Stable identifier for active round to prevent infinite re-render loops
  const currentActiveRoundObj = roundsOverview?.activeRounds?.find((r: any) => r.item_name === activeRoundItem);
  const activeRoundId = currentActiveRoundObj?.id;
  const activeRoundUpdated = currentActiveRoundObj?.updated_at;

  // ดึงข้อมูลสมาชิกและ Logs ของรอบเมื่อเปลี่ยนไอเทมหรือเปิดแท็บรอบ (Ultra-Fast SWR Pattern)
  const fetchRoundDetails = async (itemName: AuctionItemType, forceShowLoading: boolean = false) => {
    const activeRound = roundsOverview?.activeRounds?.find((r: any) => r.item_name === itemName);
    if (!activeRound) {
      setRoundMembers([]);
      setRoundLogs([]);
      return;
    }

    const cached = roundCacheRef.current[itemName];
    const hasCache = cached && Array.isArray(cached.members) && cached.members.length > 0;

    if (forceShowLoading) {
      setIsLoadingRoundData(true);
    } else if (hasCache) {
      setRoundMembers(cached.members);
      setRoundLogs(cached.logs);
    }

    try {
      const [membersRes, logsRes] = await Promise.all([
        getRoundMembersList(activeRound.id),
        getRoundAuditLogs(itemName),
      ]);

      const newMembers = membersRes.success ? (membersRes.members || []) : [];
      const newLogs = logsRes.success ? (logsRes.logs || []) : [];

      // บันทึกลงแคชในหน่วยความจำ
      roundCacheRef.current[itemName] = {
        members: newMembers,
        logs: newLogs,
        fetchedAt: Date.now(),
      };

      setRoundMembers(newMembers);
      setRoundLogs(newLogs);
    } catch (e) {
      console.error('fetchRoundDetails error:', e);
    } finally {
      setIsLoadingRoundData(false);
    }
  };

  useEffect(() => {
    if (viewMode === "rounds" && activeRoundId) {
      const cached = roundCacheRef.current[activeRoundItem];
      fetchRoundDetails(activeRoundItem, !cached || cached.members.length === 0);
    }
  }, [viewMode, activeRoundItem, activeRoundId, activeRoundUpdated]);

  const editingQueue = editQueueId
    ? memberQueues.find((q) => q.id === editQueueId)
    : undefined;

  const closeEditModal = () => {
    setEditQueueId(null);
    setEditQty("");
    setEditLoading(false);
  };

  // ⚡ Optimistic UI: สลับลำดับคิวใน State ทันที 0ms
  const handleOptimisticSwap = (memberId1: string, memberId2: string) => {
    setRoundMembers((prev) => {
      const idx1 = prev.findIndex((m) => m.id === memberId1);
      const idx2 = prev.findIndex((m) => m.id === memberId2);
      if (idx1 === -1 || idx2 === -1) return prev;
      const copy = [...prev];
      const order1 = copy[idx1].queue_order;
      const order2 = copy[idx2].queue_order;
      copy[idx1] = { ...copy[idx1], queue_order: order2 };
      copy[idx2] = { ...copy[idx2], queue_order: order1 };
      copy.sort((a, b) => (a.queue_order || 0) - (b.queue_order || 0));
      return copy;
    });
  };

  // ⚡ Optimistic UI: ปรับลำดับคิวทั้งชุดใน State ทันที 0ms (Bulk Reorder Instant Update)
  const handleOptimisticReorder = (orderedMemberIds: string[]) => {
    setRoundMembers((prev) => {
      const orderMap = new Map(orderedMemberIds.map((id, idx) => [id, idx + 1]));
      const updated = prev.map((m) => {
        const newOrder = orderMap.get(m.id);
        return newOrder !== undefined ? { ...m, queue_order: newOrder } : m;
      });
      return [...updated].sort((a, b) => (a.queue_order || 0) - (b.queue_order || 0));
    });
  };

  // ⚡ Optimistic UI: สละสิทธิ์ใน State ทันที 0ms
  const handleOptimisticSkip = (memberId: string) => {
    setRoundMembers((prev) => {
      return prev.map((m) => (m.id === memberId ? { ...m, status: 'skipped' } : m));
    });
  };

  // ⚡ Optimistic UI: โอนสิทธิ์ใน State ทันที 0ms
  const handleOptimisticTransfer = (fromUserId: string, toUserId: string, qty: number) => {
    setRoundMembers((prev) => {
      const exists = prev.some((m) => m.user_id === toUserId);
      let list = prev;
      if (!exists) {
        const targetProfile = guildMembers.find((gm) => gm.id === toUserId);
        const newMemberStub = {
          id: 'temp-' + toUserId,
          round_id: activeRoundId || '',
          guild_id: '',
          user_id: toUserId,
          item_name: activeRoundItem,
          round_number: currentActiveRoundObj?.round_number || 1,
          base_quota: currentActiveRoundObj?.base_quota_per_member || 2,
          transferred_in_quota: qty,
          transferred_out_quota: 0,
          received_qty: 0,
          status: 'pending',
          queue_order: prev.length + 1,
          profiles: targetProfile ? {
            display_name: targetProfile.display_name,
            uid_game: targetProfile.uid_game,
            role: targetProfile.role,
          } : { display_name: 'สมาชิก', uid_game: '', role: 'member' }
        };
        list = [...prev, newMemberStub];
      }

      return list.map((m) => {
        if (m.user_id === fromUserId) {
          const newTransferredOut = (m.transferred_out_quota || 0) + qty;
          const target = m.base_quota + (m.transferred_in_quota || 0) - newTransferredOut;
          const newStatus = target <= m.received_qty ? (m.received_qty > 0 ? 'completed' : 'transferred') : m.status;
          return { ...m, transferred_out_quota: newTransferredOut, status: newStatus };
        }
        if (m.user_id === toUserId) {
          const newTransferredIn = (m.transferred_in_quota || 0) + qty;
          return { ...m, transferred_in_quota: newTransferredIn, status: m.status === 'transferred' ? 'pending' : m.status };
        }
        return m;
      });
    });
  };

  // ⚡ Silent Parallel Refresh: รีเฟรชข้อมูลเบื้องหลังแบบขนาน ไม่บล็อก UI
  const handleFullRoundRefresh = async (silent: boolean = true) => {
    roundCacheRef.current = {};
    await Promise.all([
      onRefresh ? onRefresh() : Promise.resolve(),
      fetchRoundDetails(activeRoundItem, !silent),
    ]);
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

  // 🌟 Toggle เลือกสล็อต (Staging 0ms Instant Click)
  const toggleStageQueue = (queueId: string) => {
    setStagedQueueIds((prev) => {
      const next = new Set(prev);
      if (next.has(queueId)) {
        next.delete(queueId);
      } else {
        next.add(queueId);
      }
      return next;
    });
  };

  // 🌟 กดยืนยันบันทึกผลการประมูลแบบกลุ่ม (Batch 1-Click Multi-Award)
  const handleBatchSubmit = async () => {
    if (stagedQueueIds.size === 0) return;
    setIsBatchSubmitting(true);

    try {
      const queueIdArray = Array.from(stagedQueueIds);
      const result = await batchAwardAuctionQueues(queueIdArray);

      if (result.success) {
        // อัปเดต state ในเครื่องทันทีให้อยู่สถานะสำเร็จถาวร
        setConfirmedSlots((prev) => {
          const next = { ...prev };
          queueIdArray.forEach((qId) => {
            next[qId] = {
              status: "confirmed",
              awardedQty: 1,
            };
          });
          return next;
        });

        // 🌟 อัปเดตรายการประวัติทันที 0ms (Optimistic History Prepend)
        const newHistoryItems: AuctionHistoryEntry[] = queueIdArray.map((qId) => {
          const slotInfo = rawSlots?.find(s => s.queueId === qId) || memberQueues?.find(q => q.id === qId);
          return {
            id: qId,
            item_name: ((slotInfo as any)?.type || (slotInfo as any)?.item_type || 'Album') as AuctionItemType,
            display_name: (slotInfo as any)?.assignedTo || (slotInfo as any)?.display_name || 'สมาชิก',
            uid_game: (slotInfo as any)?.uid || (slotInfo as any)?.uid_game || '-',
            requested_qty: (slotInfo as any)?.requestedQty || (slotInfo as any)?.requested_qty || 1,
            awarded_qty: 1,
            status: 'completed',
            awarded_at: new Date().toISOString(),
          };
        });

        setLocalHistory((prev) => {
          const existingIds = new Set(prev.map((p) => String(p.id)));
          const toAdd = newHistoryItems.filter((item) => !existingIds.has(String(item.id)));
          return [...toAdd, ...prev];
        });

        // ล้างรายการที่เลือก
        setStagedQueueIds(new Set());

        // เคลียร์แคชรอบเพื่อให้ดึงยอดสะสมล่าสุด
        roundCacheRef.current = {};

        if (onRefresh) await onRefresh();
      } else {
        alert(result.error || "เกิดข้อผิดพลาดในการบันทึกผลการประมูล");
      }
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  // 🌟 Toggle เลือกประวัติเพื่อลบ (History Batch Selection)
  const toggleStageHistory = (historyId: string | number) => {
    setStagedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(historyId)) {
        next.delete(historyId);
      } else {
        next.add(historyId);
      }
      return next;
    });
  };

  // 🌟 เลือกทั้งหมดในหน้านี้ (Select All on current page)
  const handleSelectAllHistory = (itemsOnPage: any[]) => {
    setStagedHistoryIds((prev) => {
      const allSelected = itemsOnPage.every((item) => prev.has(item.id));
      const next = new Set(prev);
      if (allSelected) {
        itemsOnPage.forEach((item) => next.delete(item.id));
      } else {
        itemsOnPage.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  // 🌟 กดยืนยันลบประวัติแบบกลุ่ม (Batch Delete)
  const handleBatchHistoryDelete = async () => {
    if (stagedHistoryIds.size === 0) return;
    if (!confirm(`ยืนยันการลบประวัติ ${stagedHistoryIds.size} รายการ? (คิวทั้งหมดจะถูกดึงกลับไปรอแจกใหม่ที่หน้ากระดานหลัก)`)) {
      return;
    }

    setIsBatchHistoryDeleting(true);
    const idsToDelete = Array.from(stagedHistoryIds);

    // Optimistic Update: ซ่อนรายการออกจาก UI ทันที และเคลียร์สถานะสำเร็จของสล็อต
    setDeletedHistoryIds((prev) => {
      const next = new Set(prev);
      idsToDelete.forEach((id) => next.add(id));
      return next;
    });
    setLocalHistory((prev) => prev.filter((item) => !stagedHistoryIds.has(item.id)));
    setConfirmedSlots((prev) => {
      const next = { ...prev };
      idsToDelete.forEach((id) => delete next[String(id)]);
      return next;
    });

    try {
      const result = await batchRevertAuctionQueues(idsToDelete);

      if (result.success) {
        setStagedHistoryIds(new Set());
        roundCacheRef.current = {};
        if (onRefresh) await onRefresh();
      } else {
        // Rollback
        setDeletedHistoryIds((prev) => {
          const next = new Set(prev);
          idsToDelete.forEach((id) => next.delete(id));
          return next;
        });
        if (onRefresh) await onRefresh();
        alert(result.error || "เกิดข้อผิดพลาดในการลบประวัติแบบกลุ่ม");
      }
    } catch (err: any) {
      // Rollback
      setDeletedHistoryIds((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });
      if (onRefresh) await onRefresh();
      alert(err.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setIsBatchHistoryDeleting(false);
    }
  };

  const renderSlotRow = (slot: AuctionSlot, index: number) => {
    const isStaged = slot.queueId ? stagedQueueIds.has(slot.queueId) : false;
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
        className={`flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
          isStaged
            ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 shadow-sm"
            : slot.isMe
            ? "bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-500 shadow-md"
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md"
        } ${slot.isEmpty ? "opacity-80 hover:opacity-100 bg-slate-50/50 dark:bg-slate-800/50" : ""}`}
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
                ) : isStaged ? (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 font-bold whitespace-nowrap animate-pulse">
                    เลือกไว้แล้ว
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
                      localRemaining <= 0 || computedCompleted || isBatchSubmitting
                    }
                    onClick={() => {
                      if (!slot.queueId || computedCompleted) return;
                      toggleStageQueue(slot.queueId);
                    }}
                    className={`w-full sm:w-auto rounded-xl text-sm font-bold px-6 py-3 disabled:opacity-50 transition-all shadow-md whitespace-nowrap flex items-center justify-center gap-2 ${
                      computedCompleted
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                        : isStaged
                        ? 'cursor-pointer bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/30 ring-2 ring-blue-400'
                        : 'cursor-pointer bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-500/20'
                    }`}
                  >
                    {computedCompleted ? (
                      <><span>✅</span> สำเร็จ</>
                    ) : isStaged ? (
                      <><span>✓</span> เลือกแล้ว</>
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
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setViewMode("slots")}
            className={`cursor-pointer text-xs px-4 py-1.5 rounded-full font-bold transition-all duration-200 hover:scale-105 active:scale-95 ${viewMode === "slots" ? "bg-white text-blue-600 shadow-md font-extrabold" : "bg-white/15 hover:bg-white/25 text-white"}`}
          >
            Guild Auction
          </button>
          <button
            onClick={() => setViewMode("rounds")}
            className={`cursor-pointer text-xs px-4 py-1.5 rounded-full font-bold transition-all duration-200 hover:scale-105 active:scale-95 ${viewMode === "rounds" ? "bg-white text-blue-600 shadow-md font-extrabold" : "bg-white/15 hover:bg-white/25 text-white"}`}
          >
            🏆 รอบการประมูล
          </button>
          <button
            onClick={() => setViewMode("queue")}
            className={`cursor-pointer text-xs px-4 py-1.5 rounded-full font-bold transition-all duration-200 hover:scale-105 active:scale-95 ${viewMode === "queue" ? "bg-white text-blue-600 shadow-md font-extrabold" : "bg-white/15 hover:bg-white/25 text-white"}`}
          >
            คิวประมูล
          </button>
          {isAdmin && (
            <button
              onClick={() => setViewMode("proxy")}
              className={`cursor-pointer text-xs px-4 py-1.5 rounded-full font-bold transition-all duration-200 hover:scale-105 active:scale-95 ${viewMode === "proxy" ? "bg-white text-blue-600 shadow-md font-extrabold" : "bg-white/15 hover:bg-white/25 text-white"}`}
            >
              🎯 จองแทนสมาชิก
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setViewMode("summary")}
              className={`cursor-pointer text-xs px-4 py-1.5 rounded-full font-bold transition-all duration-200 hover:scale-105 active:scale-95 ${viewMode === "summary" ? "bg-white text-blue-600 shadow-md font-extrabold" : "bg-white/15 hover:bg-white/25 text-white"}`}
            >
              สรุปจัดสรรคิว
            </button>
          )}
          <button
            onClick={() => {
              setViewMode("history");
              if (onRefresh) onRefresh();
            }}
            className={`cursor-pointer text-xs px-4 py-1.5 rounded-full font-bold transition-all duration-200 hover:scale-105 active:scale-95 ${viewMode === "history" ? "bg-white text-blue-600 shadow-md font-extrabold" : "bg-white/15 hover:bg-white/25 text-white"}`}
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

      <div className="flex flex-col flex-1 relative">
        {/* Loading Overlay: แสดงเฉพาะตอนกดปุ่มคำนวณและบันทึก */}
        {isSaving && (
          <div className="absolute inset-0 z-30 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center rounded-b-2xl transition-all">
            <div className="flex flex-col items-center gap-3 p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
              <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                กำลังบันทึกและจัดคิวข้อมูล...
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-xs">
                ระบบกำลังคำนวณและแจกจ่ายสล็อตประมูลใหม่ กรุณารอสักครู่
              </p>
            </div>
          </div>
        )}

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
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      เครื่องมือล้างคิวแอดมิน:
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['Album', 'Puppet', 'White', 'RedBlack'] as const).filter(type => {
                      const session = todayItems?.find((s: any) => s.item_name === type);
                      return session && session.status === 'active' && (session.total_quantity ?? 0) > 0;
                    }).map(type => (
                      <button
                        key={`clear-${type}`}
                        type="button"
                        disabled={actionLoading[`clear-${type}`]}
                        onClick={async () => {
                          if (!confirm(`ยืนยันการล้างคิว (ลบคิวรอรอบถัดไปและคิวประมูลเสร็จแล้วออกจากฐานข้อมูลจริง ๆ) ของไอเทม ${ITEM_CONFIG[type]?.label || type}?`)) {
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
                            alert(`ล้างคิว ${ITEM_CONFIG[type]?.label || type} สำเร็จ! ลบออกจากฐานข้อมูลไปทั้งหมด ${result.count} คิว`);
                            if (onRefresh) await onRefresh();
                          } else {
                            alert(`ไม่สามารถล้างคิวได้: ${result.error}`);
                          }
                        }}
                        className="cursor-pointer text-xs bg-rose-500/10 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-200 dark:border-rose-500/30 px-3 py-1.5 rounded-xl font-bold transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs flex items-center gap-1.5 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{actionLoading[`clear-${type}`] ? "กำลัง..." : `ล้างคิว ${ITEM_CONFIG[type]?.label || type}`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {memberQueues.length > 0 ? (
                <div className="space-y-3 max-h-[calc(100vh-270px)] overflow-y-auto pr-2">
                  {(() => {
                    const groupMap = new Map<string, typeof memberQueues>();
                    const groupOrder: string[] = [];
                    const qualifiedQueueIds = new Set(rawSlots?.map(s => s.queueId).filter(Boolean) || []);
                    const waitlistQueueIds = new Set(waitlistSlots?.map(s => s.queueId).filter(Boolean) || []);

                    const filteredMemberQueues = (memberQueues || []).filter((queue) => {
                      if (deletedQueueIds.has(queue.id)) return false;
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
                          className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/80 hover:border-blue-400/50 dark:hover:border-blue-500/40 rounded-2xl shadow-xs hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                        >
                          {/* Left: User Info + Timestamp + Item Icon */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            {/* User Info */}
                            <div className="min-w-0 flex-1 pl-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                                  {firstQueue.display_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{formattedTime}</span>
                              </div>
                            </div>

                            {/* Item Icon Box */}
                            <div className="flex items-center gap-2 shrink-0 pr-2">
                              <div className={`relative w-12 h-12 bg-linear-to-b ${ITEM_CONFIG[firstQueue.item_type as keyof typeof ITEM_CONFIG]?.color || "from-slate-200/40 to-slate-400/10"} rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200`}>
                                <Image
                                  src={
                                    ITEM_CONFIG[
                                      firstQueue
                                        .item_type as keyof typeof ITEM_CONFIG
                                    ]?.icon || "/auction/Puppet.png"
                                  }
                                  alt={firstQueue.item_type}
                                  fill
                                  className="object-contain p-1.5"
                                  sizes="48px"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Center & Right: Stats Pills + Action Buttons */}
                          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80">
                            {/* Stats Pills */}
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs">
                                <span className="text-[10px] text-slate-400">จอง</span>
                                <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">{totalRequested}</span>
                              </div>

                              <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs">
                                <span className="text-[10px] text-slate-400">ได้รับ</span>
                                <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{totalReceived}</span>
                              </div>

                              {/* Status Badge */}
                              <div>
                                {activeWaitingCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-500/20 shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                    รอจัดสรร {activeWaitingCount} ชิ้น
                                  </span>
                                )}
                                {waitlistedCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-500/20 shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                    รอรอบถัดไป {waitlistedCount} ชิ้น
                                  </span>
                                )}
                                {totalRequested - totalReceived === 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20 shadow-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    สำเร็จ
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Admin Action Buttons */}
                            {isAdmin ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditQueueId(firstQueue.id);
                                    setEditQty(totalRequested.toString());
                                  }}
                                  className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white border border-blue-200 dark:border-blue-500/30 text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs hover:shadow-md hover:shadow-blue-500/20"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>แก้ไข</span>
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

                                    const ids = groupQueues.map((q) => q.id);

                                    // Optimistic Update: ซ่อนรายการออกจากหน้าจอทันที
                                    setDeletedQueueIds((prev) => {
                                      const next = new Set(prev);
                                      ids.forEach(id => next.add(id));
                                      return next;
                                    });

                                    let hasError = false;
                                    for (const queue of groupQueues) {
                                      const result =
                                        await deleteAuctionQueueReservation(
                                          queue.id,
                                        );
                                      if (!result.success) {
                                        alert(
                                          "ไม่สามารถลบได้: " + result.error,
                                        );
                                        hasError = true;
                                        break;
                                      }
                                    }

                                    if (hasError) {
                                      // Rollback if error
                                      setDeletedQueueIds((prev) => {
                                        const next = new Set(prev);
                                        ids.forEach(id => next.delete(id));
                                        return next;
                                      });
                                    } else {
                                      if (onRefresh) await onRefresh();
                                    }
                                  }}
                                  className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-200 dark:border-rose-500/30 text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs hover:shadow-md hover:shadow-rose-500/20 disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>
                                    {groupQueues.some((q) => actionLoading[q.id])
                                      ? "กำลัง..."
                                      : "ลบ"}
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
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
            <div className="flex-1 flex flex-col justify-start space-y-3">
              {/* Row 1: Title & Item Filter Pills */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">
                    ประวัติการประมูล
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:inline">
                    Auction History
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                    {(localHistory || []).filter((entry) => !deletedHistoryIds.has(entry.id)).length} รายการ
                  </span>
                </div>

                {/* Item Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryItemFilter("all");
                      setHistoryPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      historyItemFilter === "all"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  {(['Album', 'Puppet', 'White', 'RedBlack'] as const).map(type => (
                    <button
                      key={`history-filter-${type}`}
                      type="button"
                      onClick={() => {
                        setHistoryItemFilter(type);
                        setHistoryPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        historyItemFilter === type
                          ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {ITEM_CONFIG[type]?.label || type}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const HISTORY_PER_PAGE = 8;
                let displayedHistory = (localHistory || []).filter((entry) => !deletedHistoryIds.has(entry.id));

                if (historyItemFilter !== "all") {
                  displayedHistory = displayedHistory.filter(e => e.item_name === historyItemFilter);
                }

                if (historySearchQuery.trim()) {
                  const q = historySearchQuery.toLowerCase().trim();
                  displayedHistory = displayedHistory.filter(e =>
                    e.display_name?.toLowerCase().includes(q) || e.uid_game?.toLowerCase().includes(q)
                  );
                }

                const totalHistoryPages = Math.max(1, Math.ceil(displayedHistory.length / HISTORY_PER_PAGE));
                const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
                const paginatedHistory = displayedHistory.slice(
                  (safeHistoryPage - 1) * HISTORY_PER_PAGE,
                  safeHistoryPage * HISTORY_PER_PAGE
                );

                return (
                  <>
                    {/* Row 2: Secondary Toolbar (Select All & Search Box) */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        {isAdmin && paginatedHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllHistory(paginatedHistory)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                              paginatedHistory.length > 0 && paginatedHistory.every(item => stagedHistoryIds.has(item.id))
                                ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            <span>{paginatedHistory.length > 0 && paginatedHistory.every(item => stagedHistoryIds.has(item.id)) ? "ยกเลิกเลือกทั้งหมดในหน้านี้" : "☑️ เลือกทั้งหมดในหน้านี้"}</span>
                          </button>
                        )}
                        {stagedHistoryIds.size > 0 && (
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 px-2.5 py-1 rounded-xl">
                            เลือกแล้ว {stagedHistoryIds.size} รายการ
                          </span>
                        )}
                      </div>

                      <div className="relative w-full sm:w-60">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อ หรือ UID..."
                          value={historySearchQuery}
                          onChange={(e) => {
                            setHistorySearchQuery(e.target.value);
                            setHistoryPage(1);
                          }}
                          className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {displayedHistory.length > 0 ? (
                      <div className="space-y-3">
                    {/* Scrollable Container with Custom Scrollbar */}
                    <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-300">
                      {paginatedHistory.map((entry) => {
                        const isStaged = stagedHistoryIds.has(entry.id);

                        return (
                          <div
                            key={entry.id}
                            className={`flex flex-wrap xl:flex-nowrap justify-between gap-4 p-4 rounded-2xl items-center transition ${
                              isStaged
                                ? "bg-rose-50/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 shadow-sm"
                                : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-xs"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isAdmin && (
                                <input
                                  type="checkbox"
                                  checked={isStaged}
                                  onChange={() => toggleStageHistory(entry.id)}
                                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                                />
                              )}

                              <div
                                className={`relative w-14 h-14 bg-linear-to-b ${ITEM_CONFIG[entry.item_name as AuctionItemType]?.color || "from-slate-200/40 to-slate-400/10"} rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0`}
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
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-2 xl:mt-0">
                              <div className="flex items-center justify-center w-24 sm:w-28 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono">
                                  จอง {entry.requested_qty}
                                </div>
                              </div>
                              <div className="flex items-center justify-center w-24 sm:w-28 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono font-bold text-green-600 dark:text-green-400">
                                  ได้รับ {entry.awarded_qty}
                                </div>
                              </div>
                              <div className="flex items-center justify-center w-24 sm:w-28 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                                  {entry.status}
                                </div>
                              </div>
                              <div className="gap-1.5 flex flex-col sm:flex-row items-center justify-center w-full sm:w-auto bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="text-[11px] text-slate-400">
                                  วันที่ประมูล:
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono text-center sm:text-left">
                                  {entry.awarded_at
                                    ? new Date(entry.awarded_at).toLocaleString("th-TH")
                                    : "ไม่ระบุ"}
                                </div>
                              </div>

                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => toggleStageHistory(entry.id)}
                                  className={`w-full sm:w-auto cursor-pointer flex items-center justify-center px-4 py-2 h-[40px] rounded-xl text-xs font-bold transition-all shadow-xs gap-1.5 ${
                                    isStaged
                                      ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white ring-2 ring-rose-400 shadow-rose-500/30"
                                      : "bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/50"
                                  }`}
                                >
                                  {isStaged ? (
                                    <><span>✓</span> เลือกแล้ว</>
                                  ) : (
                                    <><span>ลบ</span></>
                                  )}
                                </button>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Footer Controls */}
                    {totalHistoryPages > 1 && (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
                        <span className="text-[11px] text-slate-400 font-medium">
                          แสดงหน้า <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">{safeHistoryPage}</span> จากทั้งหมด <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">{totalHistoryPages}</span> หน้า
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setHistoryPage(1)}
                            disabled={safeHistoryPage <= 1}
                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                            title="หน้าแรกสุด"
                          >
                            ««
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                            disabled={safeHistoryPage <= 1}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                          >
                            ‹ ก่อนหน้า
                          </button>

                          {/* Page Numbers */}
                          {Array.from({ length: totalHistoryPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalHistoryPages || Math.abs(p - safeHistoryPage) <= 1)
                            .map((p, idx, arr) => {
                              const prev = arr[idx - 1];
                              return (
                                <span key={`history-page-${p}`} className="flex items-center">
                                  {prev && p - prev > 1 && <span className="px-1 text-slate-400">...</span>}
                                  <button
                                    type="button"
                                    onClick={() => setHistoryPage(p)}
                                    className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                                      p === safeHistoryPage
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    {p}
                                  </button>
                                </span>
                              );
                            })}

                          <button
                            type="button"
                            onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                            disabled={safeHistoryPage >= totalHistoryPages}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                          >
                            ถัดไป ›
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryPage(totalHistoryPages)}
                            disabled={safeHistoryPage >= totalHistoryPages}
                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                            title="หน้าสุดท้าย"
                          >
                            »»
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    ยังไม่มีประวัติการประมูล
                  </div>
                )}
                  </>
                );
              })()}
            </div>
          ) : viewMode === 'summary' ? (
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
          ) : viewMode === "proxy" ? (
            <div className="flex-1 flex flex-col justify-start">
              <AdminProxyBooking
                guildMembers={guildMembers}
                memberQueues={memberQueues}
                todayItems={todayItems}
                onSuccess={onRefresh}
              />
            </div>
          ) : viewMode === "rounds" ? (
            <div className="flex-1 flex flex-col justify-start">
              {/* Item Selector Sub-Tabs with Navigation Arrows (placed beside to avoid blocking cards) */}
              <div className="flex items-center gap-1.5 mb-4 w-full">
                {/* Left Scroll Arrow */}
                <button
                  type="button"
                  onClick={() => scrollRoundTabs('left')}
                  className="w-8 h-8 shrink-0 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-xs border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="เลื่อนซ้าย"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Tabs Container */}
                <div
                  ref={roundTabsContainerRef}
                  className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none snap-x touch-pan-x scroll-smooth flex-1 min-w-0"
                >
                  {(['Album', 'Puppet', 'White', 'RedBlack'] as const).map(type => {
                    const cfg = ITEM_CONFIG[type];
                    const isSelected = activeRoundItem === type;
                    const roundObj = roundsOverview?.activeRounds?.find((r: any) => r.item_name === type);
                    const roundNum = roundObj?.round_number || 1;
                    const completedCount = roundObj?.completed_members_count || 0;
                    const totalEligible = roundObj?.total_eligible_members || 0;

                    return (
                      <button
                        key={`round-tab-${type}`}
                        onClick={() => setActiveRoundItem(type)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer shrink-0 snap-start ${
                          isSelected
                            ? 'bg-white dark:bg-slate-800 border-blue-500 shadow-md ring-2 ring-blue-500/20 text-slate-900 dark:text-slate-100'
                            : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg bg-linear-to-b ${cfg.color} flex items-center justify-center relative shrink-0`}>
                          <Image src={cfg.icon} alt={cfg.label} fill className="object-contain p-0.5" sizes="24px" />
                        </div>
                        <span className="whitespace-nowrap">{cfg.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 font-mono whitespace-nowrap">
                          รอบ {roundNum} ({completedCount}/{totalEligible})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Scroll Arrow */}
                <button
                  type="button"
                  onClick={() => scrollRoundTabs('right')}
                  className="w-8 h-8 shrink-0 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-xs border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="เลื่อนขวา"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Round Status Header & Member Tabs */}
              {(() => {
                const currentActiveRound = roundsOverview?.activeRounds?.find((r: any) => r.item_name === activeRoundItem);
                const currentMyQuota = roundsOverview?.myQuotas?.find((q: any) => q.item_name === activeRoundItem);

                return (
                  <>
                    <RoundStatusHeader
                      activeItem={activeRoundItem}
                      activeRound={currentActiveRound}
                      myQuota={currentMyQuota}
                      isAdmin={isAdmin}
                      onOpenSettings={() => {
                        setSettingsMode('settings');
                        setIsSettingsModalOpen(true);
                      }}
                      onOpenTransfer={() => {
                        setSelectedMemberForAction(null);
                        setIsTransferModalOpen(true);
                      }}
                      onOpenAdvance={() => {
                        setSettingsMode('advance');
                        setIsSettingsModalOpen(true);
                      }}
                      onOpenReorder={() => {
                        setIsReorderModalOpen(true);
                      }}
                      onRefresh={async () => {
                        roundCacheRef.current = {};
                        try {
                          const { syncAndFixRoundQuota } = await import('@/app/actions/auction-rounds');
                          await syncAndFixRoundQuota(activeRoundItem);
                        } catch (e) {
                          console.error(e);
                        }
                        await handleFullRoundRefresh();
                      }}
                      isLoading={isLoadingRoundData}
                    />

                    <RoundMemberTabs
                      members={roundMembers}
                      logs={roundLogs}
                      isAdmin={isAdmin}
                      activeItem={activeRoundItem}
                      roundNumber={currentActiveRound?.round_number || 1}
                      onSwapOrder={(member) => {
                        setSelectedMemberForAction(member);
                        setIsSwapModalOpen(true);
                      }}
                      onOpenReorder={() => {
                        setIsReorderModalOpen(true);
                      }}
                      onSkipMember={async (member) => {
                        const reason = prompt(`ระบุเหตุผลในการข้ามคิวของ "${member.profiles?.display_name || 'สมาชิก'}":`, 'สละสิทธิ์รอบนี้');
                        if (reason !== null) {
                          handleOptimisticSkip(member.id);
                          const { skipOrDeferRoundMember } = await import('@/app/actions/auction-rounds');
                          const res = await skipOrDeferRoundMember(member.id, reason);
                          if (res.success) {
                            await handleFullRoundRefresh(true);
                          } else {
                            alert('เกิดข้อผิดพลาด: ' + res.error);
                            await handleFullRoundRefresh(true);
                          }
                        }
                      }}
                      onTransferForMember={(member) => {
                        setSelectedMemberForAction(member);
                        setIsTransferModalOpen(true);
                      }}
                      onRefreshData={() => {
                        handleFullRoundRefresh(true);
                      }}
                      isLoading={isLoadingRoundData}
                    />
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>
      </div>

      {/* 🌟 Floating Sticky Batch Action Bar */}
      {isAdmin && viewMode === "slots" && stagedQueueIds.size > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 inset-x-0 z-40 max-w-xl mx-auto px-4 animate-in slide-in-from-bottom duration-200">
          <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-blue-400 font-black font-mono text-base">
                {stagedQueueIds.size}
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate flex items-center gap-1.5">
                  <span>เลือกประมูลแล้ว</span>
                  <span className="font-extrabold text-blue-400 font-mono">{stagedQueueIds.size}</span>
                  <span>ช่อง</span>
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400 truncate">
                  คลิกช่องอื่นๆ เพื่อเลือกเพิ่ม หรือกดยืนยันบันทึก
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isBatchSubmitting}
                onClick={() => setStagedQueueIds(new Set())}
                className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isBatchSubmitting}
                onClick={handleBatchSubmit}
                className="px-4 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-black transition shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
              >
                {isBatchSubmitting ? (
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>{isBatchSubmitting ? "กำลังบันทึก..." : "ยืนยันบันทึก"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Floating Sticky History Batch Delete Action Bar */}
      {isAdmin && viewMode === "history" && stagedHistoryIds.size > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 inset-x-0 z-40 max-w-xl mx-auto px-4 animate-in slide-in-from-bottom duration-200">
          <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-rose-600/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center shrink-0 text-rose-400 font-black font-mono text-base">
                {stagedHistoryIds.size}
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate flex items-center gap-1.5">
                  <span>เลือกประวัติที่จะลบ</span>
                  <span className="font-extrabold text-rose-400 font-mono">{stagedHistoryIds.size}</span>
                  <span>รายการ</span>
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400 truncate">
                  คิวจะถูกย้อนคืนกลับสู่กระดานหลัก
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isBatchHistoryDeleting}
                onClick={() => setStagedHistoryIds(new Set())}
                className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isBatchHistoryDeleting}
                onClick={handleBatchHistoryDelete}
                className="px-4 sm:px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-black transition shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer"
              >
                {isBatchHistoryDeleting ? (
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                ) : (
                  <Trash2 size={16} />
                )}
                <span>{isBatchHistoryDeleting ? "กำลังลบ..." : "ยืนยันลบ"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {renderEditModal()}

      {/* 🏆 Round Modals */}
      <AdminTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={async () => {
          await handleFullRoundRefresh(true);
        }}
        onOptimisticTransfer={handleOptimisticTransfer}
        activeItem={activeRoundItem}
        guildMembers={guildMembers}
        preselectedFromMember={selectedMemberForAction}
        currentRoundNumber={roundsOverview?.activeRounds?.find((r: any) => r.item_name === activeRoundItem)?.round_number || 1}
      />

      <AdminRoundSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSuccess={async () => {
          await handleFullRoundRefresh(false);
        }}
        activeItem={activeRoundItem}
        activeRound={roundsOverview?.activeRounds?.find((r: any) => r.item_name === activeRoundItem)}
        activeRounds={roundsOverview?.activeRounds || []}
        mode={settingsMode}
      />

      <AdminSwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        onSuccess={async () => {
          await handleFullRoundRefresh(true);
        }}
        onOptimisticSwap={handleOptimisticSwap}
        targetMember={selectedMemberForAction}
        pendingMembers={roundMembers.filter(m => m.status !== 'completed')}
      />

      <AdminReorderModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        onSuccess={async () => {
          await handleFullRoundRefresh(true);
        }}
        onOptimisticReorder={handleOptimisticReorder}
        roundId={roundsOverview?.activeRounds?.find((r: any) => r.item_name === activeRoundItem)?.id}
        itemName={activeRoundItem}
        roundNumber={roundsOverview?.activeRounds?.find((r: any) => r.item_name === activeRoundItem)?.round_number || 1}
        members={roundMembers}
      />
    </div>
  );
}