"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface QueueHistoryItem {
  id: string;
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
  requested_qty: number;
  received_qty: number;
  calculated_status: string;
}

interface HistoryClientProps {
  initialQueues: QueueHistoryItem[];
  rawQueues: RawQueueItem[];
}

export default function HistoryClient({ initialQueues, rawQueues }: HistoryClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "waiting" | "completed" | "canceled">("all");

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      return date.toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            สำเร็จแล้ว
          </span>
        );
      case "waiting":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            รอจัดสรร
          </span>
        );
      case "waitlist":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse">
            รอรอบถัดไป
          </span>
        );
      case "partial":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            ได้รับบางส่วน
          </span>
        );
      case "canceled":
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            ยกเลิกแล้ว
          </span>
        );
    }
  };

  // กรองตามคำค้นหาและแท็บสถานะที่เลือก
  const filteredQueues = initialQueues.filter((q) => {
    const matchesSearch = q.item_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "waiting") {
      return matchesSearch && (q.calculated_status === "waiting" || q.calculated_status === "waitlist" || q.calculated_status === "partial");
    }
    if (activeTab === "completed") {
      return matchesSearch && q.calculated_status === "completed";
    }
    if (activeTab === "canceled") {
      return matchesSearch && q.calculated_status === "canceled";
    }
    return matchesSearch;
  });

  // คำนวณสรุปสถิติจริง (นับจากจำนวนไอเทม rawQueues)
  const totalCount = rawQueues.reduce((sum, q) => sum + q.requested_qty, 0);
  const waitingCount = rawQueues
    .filter((q) => q.calculated_status === "waiting" || q.calculated_status === "waitlist" || q.calculated_status === "partial")
    .reduce((sum, q) => sum + q.requested_qty, 0);
  const completedCount = rawQueues
    .filter((q) => q.calculated_status === "completed")
    .reduce((sum, q) => sum + (q.received_qty || 0), 0);
  const canceledCount = rawQueues
    .filter((q) => q.calculated_status === "canceled")
    .reduce((sum, q) => sum + q.requested_qty, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ส่วนหัว และปุ่มย้อนกลับ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/profile"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ประวัติการจองคิวของคุณ</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ตรวจสอบคิวปัจจุบันและประวัติการได้รับจัดสรรไอเทมทั้งหมด
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-2xl bg-guild-primary px-4 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90 transition border border-white/10"
        >
          กลับหน้าหลัก
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-5 shadow-sm text-center glass-panel">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">จำนวนจองสะสม</p>
          <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{totalCount} ชิ้น</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-5 shadow-sm text-center glass-panel">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">กำลังรอจัดสรร</p>
          <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{waitingCount} ชิ้น</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-5 shadow-sm text-center glass-panel">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ได้รับสำเร็จแล้ว</p>
          <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">{completedCount} ชิ้น</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-5 shadow-sm text-center glass-panel">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ยกเลิกแล้ว</p>
          <p className="text-3xl font-extrabold text-slate-500 dark:text-slate-400">{canceledCount} ชิ้น</p>
        </div>
      </div>

      {/* บล็อกกรอง และค้นหา */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm space-y-4 glass-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* แท็บคัดกรองสถานะ */}
          <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-900/60 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-800/40">
            {(
              [
                { id: "all", label: "ทั้งหมด" },
                { id: "waiting", label: "กำลังรอจัดสรร" },
                { id: "completed", label: "สำเร็จแล้ว" },
                { id: "canceled", label: "ยกเลิกแล้ว" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === tab.id
                  ? "bg-guild-primary text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ค้นหาชื่อไอเทม */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่อไอเทม..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-guild-primary focus:ring-1 focus:ring-guild-primary text-slate-900 dark:text-white transition-colors"
            />
          </div>
        </div>

        {/* รายการประวัติ - ตาราง (สำหรับ Desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200/60 dark:border-slate-700 rounded-2xl overflow-hidden">
            <thead className="bg-slate-50 dark:bg-slate-900/40">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ผู้จอง (Member)</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ชื่อไอเทม</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ลำดับคิว (Slot No.)</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">จำนวนที่จอง</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">ได้รับ</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ตำแหน่งบนบอร์ด</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">วันเวลาที่ต่อคิว</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">สถานะ</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredQueues.length > 0 ? (
                filteredQueues.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                      {item.display_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 dark:text-slate-200">
                      {item.item_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-slate-500 dark:text-slate-400">
                      {item.slot_range}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-slate-600 dark:text-slate-400">
                      {item.requested_qty} ชิ้น
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-green-600 dark:text-green-400">
                      {item.received_qty} ชิ้น
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
                      {item.position_text}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(item.queue_timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.calculated_status)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
                    - ไม่มีรายการประวัติการจองที่สอดคล้องกับตัวกรอง -
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* รายการประวัติ - การ์ด (สำหรับ Mobile) */}
        <div className="block md:hidden space-y-4">
          {filteredQueues.length > 0 ? (
            filteredQueues.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 dark:bg-slate-900/35 border border-slate-200/70 dark:border-slate-700/50 rounded-2xl p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 block">
                      คิวที่ {item.slot_range} ({item.display_name})
                    </span>
                    <span className="text-md font-bold text-slate-900 dark:text-white">
                      {item.item_name}
                    </span>
                  </div>
                  {getStatusBadge(item.calculated_status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-b border-slate-200/40 dark:border-slate-800/40">
                  <div>
                    <span className="text-slate-400 block font-semibold">จำนวนที่จอง</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{item.requested_qty} ชิ้น</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">ได้รับแล้ว</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{item.received_qty} ชิ้น</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>ตำแหน่ง: {item.position_text}</span>
                  <span>จองเมื่อ: {formatDate(item.queue_timestamp)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
              - ไม่มีรายการประวัติการจองที่สอดคล้องกับตัวกรอง -
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
