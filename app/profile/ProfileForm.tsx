"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import MemberForm from "@/components/auction/MemberForm";
import { updateMyProfile } from "@/app/actions/profile";
import { extractStatsFromImage } from "@/app/actions/ai";
import { toggleMemberLeave } from "@/app/actions/admin";
import { getMyAuctionReservations, updateAuctionQueueReservation, deleteAuctionQueueReservation, joinAuctionQueue } from "@/app/actions/auction";
import { ITEM_CONFIG } from "@/components/auction/constants";
import { Profile } from "@/components/Dashboard";

type AuctionItemType = keyof typeof ITEM_CONFIG;

type QueueReservation = {
  id: string;
  item_name: AuctionItemType | string;
  requested_qty: number;
  received_qty: number;
  status: string | null;
  queue_timestamp: string | null;
};

// 💡 ย้าย StatInput ออกมาไว้นอก ProfileForm
const StatInput = ({ 
  label, 
  name, 
  value, 
  colorClass,
  onChange 
}: { 
  label: string, 
  name: string, 
  value: number, 
  colorClass: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void 
}) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors hover:border-indigo-300 dark:hover:border-indigo-500/50">
    <label htmlFor={name} className={`block text-xs font-bold mb-2 ${colorClass}`}>
      {label}
    </label>
    <input
      id={name}
      name={name}
      type="number"
      step={name.includes('dmg') || name.includes('reduc') ? "0.01" : "1"}
      min="0"
      value={value}
      onChange={onChange}
      className="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm font-mono transition-shadow"
    />
  </div>
);

export default function ProfileForm({
  initialProfile,
}: {
  initialProfile: Profile;
}) {
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingText = isAiLoading
    ? "กำลังอ่านภาพจาก AI..."
    : isPending
      ? "กำลังบันทึกข้อมูล..."
      : "";

  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [reservations, setReservations] = useState<QueueReservation[]>([]);
  const [isReservationLoading, setIsReservationLoading] = useState(false);
  const [reservationActionLoading, setReservationActionLoading] = useState(false);
  const [reservationDraftQty, setReservationDraftQty] = useState<Record<string, string>>({});
  const [reservationQtys, setReservationQtys] = useState<Record<'Album' | 'Puppet' | 'White' | 'RedBlack', string>>({ Album: '', Puppet: '', White: '', RedBlack: '' });
  const [isReservationSubmitting, setIsReservationSubmitting] = useState(false);

  const openReservationModal = () => {
    setReservationModalOpen(true);
    fetchReservations();
  };

  const closeReservationModal = () => {
    setReservationModalOpen(false);
    setReservations([]);
    setReservationDraftQty({});
    setIsReservationLoading(false);
  };


  const fetchReservations = async () => {
    setIsReservationLoading(true);
    setMessage(null);

    try {
      const result = await getMyAuctionReservations();
      if (result.success) {
        const list = (result.reservations || []) as QueueReservation[];
        setReservations(list);
        setReservationDraftQty(
          list.reduce(
            (acc, reservation) => ({
              ...acc,
              [String(reservation.id)]: String(reservation.requested_qty),
            }),
            {} as Record<string, string>,
          ),
        );
      } else {
        setMessage({ type: "error", text: result.error || "ไม่สามารถโหลดรายการจองคิวได้" });
      }
    } catch {
      setMessage({ type: "error", text: "เกิดข้อผิดพลาดขณะโหลดรายการจองคิว" });
    } finally {
      setIsReservationLoading(false);
    }
  };

  const handleDraftQtyChange = (id: string, value: string) => {
    setReservationDraftQty((prev) => ({ ...prev, [id]: value }));
  };

  const handleUpdateReservation = async (id: string) => {
    const value = reservationDraftQty[id];
    const requestedQty = parseInt(value);

    if (isNaN(requestedQty) || requestedQty < 1) {
      setMessage({ type: "error", text: "กรุณาใส่จำนวนที่ถูกต้องก่อนบันทึก" });
      return;
    }

    setReservationActionLoading(true);
    setMessage(null);

    try {
      const result = await updateAuctionQueueReservation(id, requestedQty);
      if (result.success) {
        setMessage({ type: "success", text: "อัปเดตรายการจองคิวเรียบร้อยแล้ว" });
        await fetchReservations();
      } else {
        setMessage({ type: "error", text: result.error || "ไม่สามารถอัปเดตรายการได้" });
      }
    } catch {
      setMessage({ type: "error", text: "ระบบผิดพลาด กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setReservationActionLoading(false);
    }
  };

  const handleDeleteReservation = async (id: string) => {
    if (!confirm("ยืนยันการยกเลิกการจองคิวนี้?")) return;

    setReservationActionLoading(true);
    setMessage(null);

    try {
      const result = await deleteAuctionQueueReservation(id);
      if (result.success) {
        setMessage({ type: "success", text: "ลบรายการจองคิวเรียบร้อยแล้ว" });
        await fetchReservations();
      } else {
        setMessage({ type: "error", text: result.error || "ไม่สามารถลบรายการได้" });
      }
    } catch {
      setMessage({ type: "error", text: "ระบบผิดพลาด กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setReservationActionLoading(false);
    }
  };

  const handleMemberRegister = async () => {
    const selectedItems = Object.entries(reservationQtys)
      .map(([key, value]) => ({
        itemType: key as 'Album' | 'Puppet' | 'White' | 'RedBlack',
        qty: parseInt(value, 10),
      }))
      .filter((entry) => !isNaN(entry.qty) && entry.qty > 0);

    if (selectedItems.length === 0) {
      setMessage({ type: 'error', text: 'กรุณาเลือกไอเทมและจำนวนก่อนครับ' });
      return;
    }

    setIsReservationSubmitting(true);
    setMessage(null);
    let lastError = '';

    for (const { itemType, qty } of selectedItems) {
      const res = await joinAuctionQueue(itemType as any, qty);
      if (!res.success) {
        lastError = res.error || 'เกิดข้อผิดพลาดขณะบันทึก';
        break;
      }
    }

    if (!lastError) {
      setMessage({ type: 'success', text: 'ลงทะเบียนจองคิวสำเร็จ!' });
      setReservationQtys({ Album: '', Puppet: '', White: '', RedBlack: '' });
      await fetchReservations();
    } else {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด: ' + lastError });
    }

    setIsReservationSubmitting(false);
  };

  const [isOnLeave, setIsOnLeave] = useState(!!initialProfile.is_on_leave);

  const [stats, setStats] = useState({
    p_atk: initialProfile.p_atk ?? 0,
    m_atk: initialProfile.m_atk ?? 0,
    p_def: initialProfile.p_def ?? 0,
    m_def: initialProfile.m_def ?? 0,
    pvp_dmg: initialProfile.pvp_dmg ?? 0,
    pvp_reduc: initialProfile.pvp_reduc ?? 0,
    p_dmg: initialProfile.p_dmg ?? 0,
    m_dmg: initialProfile.m_dmg ?? 0,
    p_reduc: initialProfile.p_reduc ?? 0,
    m_reduc: initialProfile.m_reduc ?? 0,
    hp: initialProfile.hp ?? 0,
    sp: initialProfile.sp ?? 0,
    ignore_pdef: initialProfile.ignore_pdef ?? 0,
    ignore_mdef: initialProfile.ignore_mdef ?? 0,
  });

  const handleStatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStats((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleToggleLeave = () => {
    const newStatus = !isOnLeave;
    setIsOnLeave(newStatus);
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await toggleMemberLeave(initialProfile.id, newStatus);
        if (!result?.success) {
          setIsOnLeave(!newStatus);
          setMessage({ type: "error", text: result?.error || "ไม่สามารถอัปเดตสถานะลากิจกรรมได้" });
        } else {
          setMessage({
            type: "success",
            text: newStatus ? "🏖️ เปิดสถานะลากิจกรรมเรียบร้อยแล้ว" : "✅ ปิดสถานะลากิจกรรม (พร้อมเข้าร่วมปกติ)",
          });
        }
      } catch {
        setIsOnLeave(!newStatus);
        setMessage({ type: "error", text: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง" });
      } finally {
        if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
        alertTimerRef.current = setTimeout(() => { setMessage(null); }, 2000);
      }
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const filesToProcess = files.slice(0, 2);
    setMessage(null);
    setIsAiLoading(true);

    try {
      const base64Images = await Promise.all(
        filesToProcess.map(
          (file) =>
            new Promise<{ base64: string; type: string }>((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => {
                resolve({ base64: reader.result as string, type: file.type });
              };
            }),
        ),
      );

      const results = await Promise.all(
        base64Images.map((img) => extractStatsFromImage(img.base64, img.type)),
      );

      const successResults = results.filter((r) => r.success && r.data);

      if (successResults.length > 0) {
        const mergedData = successResults[0].data;

        if (successResults.length === 2 && successResults[1].data) {
          const data2 = successResults[1].data;
          const selectValue = (val1: number | undefined, val2: number | undefined) => {
            return val1 !== undefined && val1 !== 0 ? val1 : val2 || 0;
          };

          mergedData.p_atk = selectValue(mergedData.p_atk, data2.p_atk);
          mergedData.m_atk = selectValue(mergedData.m_atk, data2.m_atk);
          mergedData.p_def = selectValue(mergedData.p_def, data2.p_def);
          mergedData.m_def = selectValue(mergedData.m_def, data2.m_def);
          mergedData.p_dmg = selectValue(mergedData.p_dmg, data2.p_dmg);
          mergedData.m_dmg = selectValue(mergedData.m_dmg, data2.m_dmg);
          mergedData.p_reduc = selectValue(mergedData.p_reduc, data2.p_reduc);
          mergedData.m_reduc = selectValue(mergedData.m_reduc, data2.m_reduc);
          mergedData.pvp_dmg = selectValue(mergedData.pvp_dmg, data2.pvp_dmg);
          mergedData.pvp_reduc = selectValue(mergedData.pvp_reduc, data2.pvp_reduc);
          mergedData.hp = selectValue(mergedData.hp, data2.hp);
          mergedData.sp = selectValue(mergedData.sp, data2.sp);
          mergedData.ignore_pdef = selectValue(mergedData.ignore_pdef, data2.ignore_pdef);
          mergedData.ignore_mdef = selectValue(mergedData.ignore_mdef, data2.ignore_mdef);
        }

        setStats({
          p_atk: mergedData.p_atk || stats.p_atk,
          m_atk: mergedData.m_atk || stats.m_atk,
          p_def: mergedData.p_def || stats.p_def,
          m_def: mergedData.m_def || stats.m_def,
          p_dmg: mergedData.p_dmg || stats.p_dmg,
          m_dmg: mergedData.m_dmg || stats.m_dmg,
          p_reduc: mergedData.p_reduc || stats.p_reduc,
          m_reduc: mergedData.m_reduc || stats.m_reduc,
          pvp_dmg: mergedData.pvp_dmg || stats.pvp_dmg,
          pvp_reduc: mergedData.pvp_reduc || stats.pvp_reduc,
          hp: mergedData.hp || stats.hp,
          sp: mergedData.sp || stats.sp,
          ignore_pdef: mergedData.ignore_pdef || stats.ignore_pdef,
          ignore_mdef: mergedData.ignore_mdef || stats.ignore_mdef,
        });

        const imageCount = filesToProcess.length;
        setMessage({
          type: "success",
          text: imageCount === 2
            ? "🤖 AI อ่านสเตตัสจากทั้ง 2 รูปเรียบร้อยแล้ว! กรุณาตรวจสอบและกดบันทึก!"
            : "🤖 AI อ่านสเตตัสเรียบร้อยแล้ว กรุณาตรวจสอบและกดบันทึก!",
        });
      } else {
        let userFriendlyMessage = "🤔 AI มองเห็นตัวเลขไม่ชัดเจน รบกวนแคปรูปใหม่ให้เห็นสเตตัสครบถ้วน แล้วลองอีกครั้งนะครับ";
        const errorMessage = results[0]?.error || "";

        if (errorMessage.includes("503")) userFriendlyMessage = "⏳ ตอนนี้มีผู้ใช้งาน AI พร้อมกันจำนวนมาก รบกวนรอสัก 1 นาทีแล้วกดอัปโหลดใหม่นะครับ";
        else if (errorMessage.includes("429") || errorMessage.includes("Quota")) userFriendlyMessage = "🛑 โควต้า AI สำหรับวันนี้เต็มแล้วครับ รบกวนกรอกตัวเลขด้วยตัวเองไปก่อนนะครับ";
        else if (errorMessage.includes("404")) userFriendlyMessage = "🔧 ระบบ AI กำลังปิดปรับปรุงชั่วคราว รบกวนกรอกข้อมูลด้วยตัวเองไปก่อนนะครับ";

        setMessage({ type: "error", text: userFriendlyMessage });
      }

      setIsAiLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setMessage({ type: "error", text: "⚠️ เกิดข้อผิดพลาดในการโหลดไฟล์รูปภาพ รบกวนตรวจสอบแล้วลองใหม่อีกครั้ง" });
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateMyProfile(formData);
      if (result.success) {
        setMessage({ type: "success", text: "อัปเดตข้อมูลสำเร็จ!" });
      } else {
        setMessage({ type: "error", text: result.error || "ไม่สามารถอัปเดตข้อมูลได้" });
      }
    });
  };

  return (
    // 🌟 ขยายความกว้างสูงสุดเป็น 1450px และเพิ่ม Padding
    <div className="relative w-full max-w-362.5 mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Loading Overlay */}
      {(isAiLoading || isPending) && (
        <div className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-8 text-center shadow-2xl dark:bg-slate-900/95 dark:text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
              <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{loadingText}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isAiLoading ? "กำลังประมวลผลสเตตัสจากภาพ โปรดรอสักครู่..." : "กำลังบันทึกข้อมูล โปรดอย่าปิดหน้าจอ..."}
            </p>
          </div>
        </div>
      )}

      {/* Global Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl font-medium text-sm flex items-center gap-3 shadow-sm border ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
            : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
        }`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      {/* 🌟 ปรับ Grid Gap ให้กว้างขึ้น (xl:gap-8) */}
      <form
        onSubmit={handleSubmit}
        className={`${isAiLoading || isPending ? "pointer-events-none opacity-70 blur-sm" : ""} transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8`}
      >
        
        {/* 📱 Column ซ้าย: ปรับให้เล็กลงในจอใหญ่ (xl:col-span-3) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          
          {/* 🏖️ Leave Status Card */}
          <div className={`p-5 rounded-2xl border transition-colors ${
            isOnLeave 
              ? "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50" 
              : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700"
          } shadow-sm`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {isOnLeave ? "🏖️ ลากิจกรรมอยู่" : "⚔️ พร้อมรบ"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {isOnLeave 
                    ? "คุณกำลังอยู่ในสถานะลากิจกรรม จะไม่ถูกนำไปจัดปาร์ตี้" 
                    : "สถานะปกติ หากไม่ว่างเข้าร่วมกิลด์วอร์ สามารถเปิดโหมดลาได้"}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4 mt-1">
                <input type="checkbox" className="sr-only peer" checked={isOnLeave} onChange={handleToggleLeave} disabled={isPending || isAiLoading} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-rose-500 disabled:opacity-50"></div>
              </label>
            </div>
          </div>

          {/* 👤 Basic Info Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              ข้อมูลตัวละคร
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">UID (อ้างอิงระบบ)</label>
                <input type="text" value={initialProfile.uid_game} disabled className="block w-full rounded-lg border-0 py-2.5 px-3 bg-slate-100 text-slate-500 cursor-not-allowed dark:bg-slate-900 dark:text-slate-500 text-sm" />
              </div>
              <div>
                <label htmlFor="display_name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ชื่อตัวละคร</label>
                <input id="display_name" name="display_name" type="text" defaultValue={initialProfile.display_name} required className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-900 dark:text-white dark:ring-slate-700 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="job_name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">สายอาชีพ</label>
                <select id="job_name" name="job_name" defaultValue={initialProfile.job_name || ""} className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-900 dark:text-white dark:ring-slate-700 sm:text-sm cursor-pointer">
                  <option value="" disabled>-- เลือกอาชีพ --</option>
                  <option value="Lord Knight">Lord Knight</option>
                  <option value="Paladin">Paladin</option>
                  <option value="Biochemist">Biochemist</option>
                  <option value="Mastersmith">Mastersmith</option>
                  <option value="Bard">Bard</option>
                  <option value="Gypsy">Gypsy</option>
                  <option value="Sniper">Sniper</option>
                  <option value="Champion">Champion</option>
                  <option value="Priest">Priest</option>
                  <option value="Assassin">Assassin</option>
                  <option value="Rogue">Rogue</option>
                  <option value="Wizard">Wizard</option>
                  <option value="Sage">Sage</option>
                  <option value="Summoner">Summoner</option>
                </select>
              </div>
            </div>
          </div>

          
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
            <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2">จัดการคิวประมูล</h3>
            <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-5">ดูประวัติหรือแก้ไขจำนวนกล่องที่คุณต้องการรับจากการประมูล</p>
            <button type="button" onClick={openReservationModal} disabled={isPending || isAiLoading} className="w-full inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-200 dark:shadow-none">
              📦 เปิดดูรายการจองคิว
            </button>
          </div>

        </div>

        {/* 💻 Column ขวา: ให้พื้นที่กว้างขึ้นในจอใหญ่ (xl:col-span-9) */}
        <div className="lg:col-span-5 xl:col-span-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full">
            
            <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">ข้อมูลสเตตัสตัวละคร</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">กรอกข้อมูลด้วยตัวเอง หรือใช้ AI ช่วยดึงตัวเลขจากรูปภาพในเกมเพื่อความรวดเร็ว</p>
              </div>
              
              <div className="shrink-0">
                <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isAiLoading || isPending} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:hover:bg-indigo-600 disabled:opacity-50 shadow-md">
                  {isAiLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                  ) : "ให้ AI ช่วยอ่านค่า"}
                </button>
              </div>
            </div>

            {/* 🌟 เพิ่มช่องไฟให้กว้างขึ้น (p-8, gap-5, xl:gap-6) */}
            <div className="p-6 xl:p-8 flex-1 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 xl:gap-4">
                <StatInput label="Max HP" name="hp" value={stats.hp} colorClass="text-emerald-600 dark:text-emerald-400" onChange={handleStatChange} />
                <StatInput label="Max SP" name="sp" value={stats.sp} colorClass="text-sky-500 dark:text-sky-400" onChange={handleStatChange} />
                <StatInput label="P.ATK" name="p_atk" value={stats.p_atk} colorClass="text-rose-600 dark:text-rose-400" onChange={handleStatChange} />
                <StatInput label="M.ATK" name="m_atk" value={stats.m_atk} colorClass="text-orange-500 dark:text-orange-400" onChange={handleStatChange} />
                
                <StatInput label="P.DEF" name="p_def" value={stats.p_def} colorClass="text-blue-600 dark:text-blue-400" onChange={handleStatChange} />
                <StatInput label="M.DEF" name="m_def" value={stats.m_def} colorClass="text-purple-600 dark:text-purple-400" onChange={handleStatChange} />
                <StatInput label="Ignore P.DEF" name="ignore_pdef" value={stats.ignore_pdef} colorClass="text-slate-600 dark:text-slate-400" onChange={handleStatChange} />
                <StatInput label="Ignore M.DEF" name="ignore_mdef" value={stats.ignore_mdef} colorClass="text-slate-600 dark:text-slate-400" onChange={handleStatChange} />
                
                <StatInput label="P.DMG (%)" name="p_dmg" value={stats.p_dmg} colorClass="text-rose-700 dark:text-rose-500" onChange={handleStatChange} />
                <StatInput label="M.DMG (%)" name="m_dmg" value={stats.m_dmg} colorClass="text-orange-700 dark:text-orange-500" onChange={handleStatChange} />
                <StatInput label="P.Reduc (%)" name="p_reduc" value={stats.p_reduc} colorClass="text-blue-700 dark:text-blue-500" onChange={handleStatChange} />
                <StatInput label="M.Reduc (%)" name="m_reduc" value={stats.m_reduc} colorClass="text-purple-700 dark:text-purple-500" onChange={handleStatChange} />
                
                <StatInput label="PvP DMG" name="pvp_dmg" value={stats.pvp_dmg} colorClass="text-amber-600 dark:text-amber-500" onChange={handleStatChange} />
                <StatInput label="PvP Reduc" name="pvp_reduc" value={stats.pvp_reduc} colorClass="text-teal-600 dark:text-teal-400" onChange={handleStatChange} />
              </div>
            </div>

            <div className="p-6 xl:px-8 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <button type="submit" disabled={isPending || isAiLoading} className="w-full flex justify-center py-4 px-4 rounded-xl shadow-md shadow-emerald-500/20 text-base font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all duration-200 transform hover:-translate-y-0.5">
                {isPending ? "กำลังอัปเดตข้อมูลเข้าสู่ระบบ..." : "💾 บันทึกสเตตัสและการเปลี่ยนแปลง"}
              </button>
            </div>
          </div>
        </div>

      </form>

      {/* Modal จองคิว */}
      {reservationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-indigo-50 to-indigo-50/50 dark:from-indigo-950/20 dark:to-slate-950 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="text-xl">📦</span> คิวประมูลของฉัน
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <span>✏️</span> เลือกจำนวนไอเทมและจัดการคิวประมูลของคุณในหน้าต่างเดียว
                </p>
              </div>
              <button type="button" onClick={closeReservationModal} className="self-start rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 transition-colors">
                ปิดหน้าต่าง
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              <MemberForm
                reservationQtys={reservationQtys}
                setReservationQtys={setReservationQtys}
                handleMemberRegister={handleMemberRegister}
                isSaving={isReservationSubmitting || isPending || isAiLoading}
              />
              {isReservationLoading ? (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
                  <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                  กำลังโหลดข้อมูล...
                </div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400">ยังไม่มีรายการจองคิวในขณะนี้</div>
              ) : (
                <div className="space-y-4">
                  {reservations.map((reservation) => (
                    <div key={reservation.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700/50 dark:bg-slate-800/30">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <div className="w-6 h-6 relative shrink-0">
                              <Image src={ITEM_CONFIG[reservation.item_name as keyof typeof ITEM_CONFIG].icon} alt={ITEM_CONFIG[reservation.item_name as keyof typeof ITEM_CONFIG].label} fill className="object-contain" sizes="24px" />
                            </div>
                            {ITEM_CONFIG[reservation.item_name as keyof typeof ITEM_CONFIG].label}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              reservation.status === 'partial' 
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            }`}>
                              <span>{reservation.status === 'partial' ? '📦' : '⏳'}</span>
                              {reservation.status === 'partial' ? 'รับแล้วบางส่วน' : 'รอรับการจัดสรร'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 text-[11px]">
                              <span>📅</span> {reservation.queue_timestamp ? new Date(reservation.queue_timestamp).toLocaleString('th-TH') : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-xl bg-linear-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10 border border-indigo-200 dark:border-indigo-800/30 px-4 py-3 text-sm font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm flex items-center gap-2">
                          <span>✅</span>
                          <span>ได้รับแล้ว <span className="text-indigo-600 dark:text-indigo-400 text-lg mx-1 font-bold">{reservation.received_qty}</span> ชิ้น</span>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                            <span>📝</span> ระบุจำนวนที่ต้องการ
                          </label>
                          <input type="number" min={Math.max(1, reservation.received_qty)} value={reservationDraftQty[String(reservation.id)] ?? String(reservation.requested_qty)} onChange={(e) => handleDraftQtyChange(String(reservation.id), e.target.value)} className="block w-full rounded-xl border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-900 dark:text-white dark:ring-slate-700 sm:text-sm font-semibold" />
                          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-500">จำนวนขั้นต่ำต้องไม่น้อยกว่าที่รับไปแล้ว ({reservation.received_qty})</p>
                        </div>
                        <button type="button" onClick={() => handleUpdateReservation(String(reservation.id))} disabled={reservationActionLoading} className="mt-6 sm:mt-0 h-9 self-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors flex items-center justify-center gap-1.5">
                          ✏️ อัปเดตยอด
                        </button>
                        <button type="button" onClick={() => handleDeleteReservation(String(reservation.id))} disabled={reservationActionLoading} className="mt-3 sm:mt-0 h-9 self-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                          🗑️ ยกเลิกคิวนี้
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}