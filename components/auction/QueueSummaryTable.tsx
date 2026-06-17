"use client";

import React, { useMemo } from 'react';

// โครงสร้าง Props ที่ต้องส่งเข้ามา
interface QueueSummaryTableProps {
    itemName: string;          // ชื่อไอเทม
    mappedSlots: any[];        // สล็อตที่ถูกจัดสรรแล้วทั้งหมดบนบอร์ด
}

export default function QueueSummaryTable({ itemName, mappedSlots }: QueueSummaryTableProps) {

    // ประมวลผลและจำลองการแจกของตามโควตาจากบอร์ดจริง
    const tableData = useMemo(() => {
        // กรองเฉพาะสล็อตที่ได้รับการจัดสรรจริง (ไม่ใช่ empty slots และไม่ใช่ waitlist) สำหรับไอเทมชนิดนี้
        const allocatedSlotsForType = (mappedSlots || []).filter(
            s => s.type === itemName && !s.isEmpty && !s.isWaitlist
        );

        const userAllocations = new Map<string, any[]>();

        // จัดกลุ่มตาม user ID (uid_game)
        for (const s of allocatedSlotsForType) {
            const uid = s.uid;
            if (!uid) continue;
            if (!userAllocations.has(uid)) {
                userAllocations.set(uid, []);
            }
            userAllocations.get(uid)!.push(s);
        }

        // แปลงข้อมูลกลุ่มให้พร้อมแสดงในตาราง
        return Array.from(userAllocations.values()).map(userSlots => {
            const firstSlot = userSlots[0];

            const isAllComplete = userSlots.every(s => s.status === 'completed');
            const isAnyComplete = userSlots.some(s => s.status === 'completed');

            let statusText = 'รอรับของ';
            let statusColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';

            if (isAllComplete) {
                statusText = 'เสร็จแล้ว';
                statusColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
            } else if (isAnyComplete) {
                statusText = 'กำลังแจก';
                statusColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            }

            // คำนวณตำแหน่งสล็อตในเกมจากค่า originalPage และ originalSlot
            const slotTexts = userSlots.map(s => `หน้า ${s.originalPage} ช่องที่ ${s.originalSlot}`);
            let slotText = '-';
            if (slotTexts.length === 1) {
                slotText = slotTexts[0];
            } else if (slotTexts.length > 1) {
                slotText = `${slotTexts[0]} ถึง ${slotTexts[slotTexts.length - 1]}`;
            }

            const dateStr = firstSlot.queueTimestamp
                ? new Date(firstSlot.queueTimestamp).toLocaleDateString('th-TH')
                : new Date().toLocaleDateString('th-TH');

            return {
                date: dateStr,
                displayName: firstSlot.assignedTo || 'ไม่ระบุชื่อ',
                itemName: firstSlot.type,
                allocatedQty: userSlots.length,
                slotText,
                statusText,
                statusColor
            };
        });
    }, [mappedSlots, itemName]);

    if (tableData.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                ยังไม่มีคิวจัดสรรสำหรับไอเทม "{itemName}" ในรอบปัจจุบัน
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
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
                            <tr key={idx} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    {row.date}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                    {row.displayName}
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                    {row.itemName}
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center justify-center min-w-[2.5rem] rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 font-bold text-slate-700 dark:text-slate-200">
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
    );
}