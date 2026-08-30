"use client";

import React, { useMemo } from 'react';

// โครงสร้าง Props ที่ต้องส่งเข้ามา
interface QueueSummaryTableProps {
    itemName: string;          // ชื่อไอเทม
    mappedSlots: any[];        // สล็อตที่ถูกจัดสรรแล้วทั้งหมดบนบอร์ด
}

export default function QueueSummaryTable({ itemName, mappedSlots }: QueueSummaryTableProps) {

    // ประมวลผลสล็อตทั้งหมดของไอเทมชนิดนี้บนกระดาน (ทั้งที่มีคนจอง และช่องว่างที่ไม่มีผู้ประมูล)
    const { tableData, allocatedCount, emptyCount, totalSlots } = useMemo(() => {
        // กรองสล็อตทั้งหมดสำหรับไอเทมชนิดนี้ที่อยู่บนบอร์ดจริง (ไม่ใช่ waitlist)
        const boardSlotsForType = (mappedSlots || []).filter(
            s => s.type === itemName && !s.isWaitlist
        );

        if (boardSlotsForType.length === 0) {
            return { tableData: [], allocatedCount: 0, emptyCount: 0, totalSlots: 0 };
        }

        let allocated = 0;
        let empty = 0;

        const groups: Array<{
            isUser: boolean;
            uid?: string;
            displayName: string;
            itemName: string;
            date: string;
            slots: any[];
        }> = [];

        let currentGroup: typeof groups[0] | null = null;

        for (const slot of boardSlotsForType) {
            const isUser = !slot.isEmpty && Boolean(slot.uid);
            if (isUser) {
                allocated++;
            } else {
                empty++;
            }

            const groupKey = isUser ? `user_${slot.uid}` : 'empty';

            if (currentGroup) {
                const currentGroupKey = currentGroup.isUser ? `user_${currentGroup.uid}` : 'empty';
                if (currentGroupKey === groupKey) {
                    currentGroup.slots.push(slot);
                    continue;
                }
            }

            // เริ่มกลุ่มใหม่
            if (isUser) {
                currentGroup = {
                    isUser: true,
                    uid: slot.uid,
                    displayName: slot.assignedTo || 'ไม่ระบุชื่อ',
                    itemName: slot.type || itemName,
                    date: slot.queueTimestamp
                        ? new Date(slot.queueTimestamp).toLocaleDateString('th-TH')
                        : new Date().toLocaleDateString('th-TH'),
                    slots: [slot],
                };
            } else {
                currentGroup = {
                    isUser: false,
                    displayName: '--- ว่าง (ไม่มีผู้ประมูล) ---',
                    itemName: slot.type || itemName,
                    date: '-',
                    slots: [slot],
                };
            }
            groups.push(currentGroup);
        }

        // แปลงข้อมูลกลุ่มให้พร้อมแสดงในตาราง
        const rows = groups.map(g => {
            const firstSlot = g.slots[0];
            const lastSlot = g.slots[g.slots.length - 1];
            
            let slotText = '-';
            if (firstSlot?.originalPage && firstSlot?.originalSlot) {
                if (g.slots.length === 1) {
                    slotText = `หน้า ${firstSlot.originalPage} ช่องที่ ${firstSlot.originalSlot}`;
                } else if (lastSlot?.originalPage && lastSlot?.originalSlot) {
                    slotText = `หน้า ${firstSlot.originalPage} ช่องที่ ${firstSlot.originalSlot} ถึง หน้า ${lastSlot.originalPage} ช่องที่ ${lastSlot.originalSlot}`;
                }
            }

            if (g.isUser) {
                const isAllComplete = g.slots.every(s => s.status === 'completed');
                const isAnyComplete = g.slots.some(s => s.status === 'completed');

                let statusText = 'รอรับของ';
                let statusColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';

                if (isAllComplete) {
                    statusText = 'เสร็จแล้ว';
                    statusColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
                } else if (isAnyComplete) {
                    statusText = 'กำลังแจก';
                    statusColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
                }

                return {
                    isUser: true,
                    date: g.date,
                    displayName: g.displayName,
                    itemName: g.itemName,
                    allocatedQty: g.slots.length,
                    slotText,
                    statusText,
                    statusColor
                };
            } else {
                return {
                    isUser: false,
                    date: '-',
                    displayName: '--- ว่าง (ไม่มีผู้ประมูล) ---',
                    itemName: g.itemName,
                    allocatedQty: g.slots.length,
                    slotText,
                    statusText: 'ว่าง (ไม่มีผู้ประมูล)',
                    statusColor: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                };
            }
        });

        return {
            tableData: rows,
            allocatedCount: allocated,
            emptyCount: empty,
            totalSlots: boardSlotsForType.length
        };
    }, [mappedSlots, itemName]);

    if (tableData.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                ยังไม่มีคิวจัดสรรสำหรับไอเทม "{itemName}" ในรอบปัจจุบัน
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            {/* 📊 Summary Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span>มีผู้ประมูล: <b className="text-slate-800 dark:text-slate-200">{allocatedCount}</b> ช่อง</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        <span>ว่าง: <b className="text-slate-800 dark:text-slate-200">{emptyCount}</b> ช่อง</span>
                    </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                    รวม {totalSlots} ช่องบนบอร์ด
                </span>
            </div>

            {/* 📋 Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">วันที่จอง</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">ชื่อสมาชิก</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">ชื่อไอเทม</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">จำนวนที่ได้รับ</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">ตำแหน่ง (Slot ในเกม)</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {tableData.map((row, idx) => (
                                <tr 
                                    key={idx} 
                                    className={`transition-colors ${
                                        row.isUser 
                                            ? "hover:bg-slate-50 dark:hover:bg-slate-800/30" 
                                            : "bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                                    }`}
                                >
                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {row.date}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {row.isUser ? (
                                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                {row.displayName}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 dark:text-slate-500 italic font-medium">
                                                {row.displayName}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                        {row.itemName}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className={`inline-flex items-center justify-center min-w-[2.5rem] rounded-lg px-2 py-1 font-bold ${
                                            row.isUser
                                                ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                                                : "bg-slate-100/70 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700"
                                        }`}>
                                            {row.allocatedQty}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono text-xs">
                                        {row.slotText}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${row.statusColor}`}>
                                            {row.statusText}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}