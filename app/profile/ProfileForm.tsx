"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import MemberForm from "@/components/auction/MemberForm";
import Link from 'next/link';
import { updateMyProfile } from "@/app/actions/profile";
import { extractStatsFromImage } from "@/app/actions/ai";
import { toggleMemberLeave } from "@/app/actions/admin";
// ✨ เปลี่ยนมารับ syncUserAuctionQueues และเอา joinAuctionQueues ออก
import { getMyAuctionReservations, updateAuctionQueueReservation, deleteAuctionQueueReservation, syncUserAuctionQueues } from "@/app/actions/auction";
import { ITEM_CONFIG } from "@/components/auction/constants";
import { Profile } from "@/components/Dashboard";
import { STAT_LIMITS } from "@/lib/stat-limits";
import { createClient } from "@/lib/supabase/client";

type AuctionItemType = keyof typeof ITEM_CONFIG;

type QueueReservation = {
  id: string;
  item_name: AuctionItemType | string;
  requested_qty: number;
  received_qty: number;
  status: string | null;
  queue_timestamp: string | null;
};

const StatInput = ({ 
  label, 
  name, 
  value, 
  onChange 
}: { 
  label: string, 
  name: string, 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void 
}) => {
  const maxVal = STAT_LIMITS[name as keyof typeof STAT_LIMITS];
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm glass-panel">
      <label htmlFor={name} className="block text-xs font-semibold mb-2 text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        step={name.includes('dmg') || name.includes('reduc') ? "0.01" : "1"}
        min="0"
        max={maxVal}
        value={value}
        onChange={onChange}
        className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 py-2 px-3 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm font-mono"
      />
    </div>
  );
};

export default function ProfileForm({
  initialProfile,
}: {
  initialProfile: Profile;
}) {
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showcaseFileInputRef = useRef<HTMLInputElement>(null);

  const [showcaseUrl, setShowcaseUrl] = useState((initialProfile as any).character_showcase_url || "");
  const [isShowcaseUploading, setIsShowcaseUploading] = useState(false);
  const [removeBgAutomatic, setRemoveBgAutomatic] = useState(true);

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);

  const loadingText = isAiLoading
    ? "กำลังอ่านภาพจาก AI..."
    : isShowcaseUploading
      ? (removeBgAutomatic ? "🔮 AI กำลังลบพื้นหลัง..." : "กำลังอัปโหลดรูปตัวละคร...")
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
  const [showGoToAuctionLink, setShowGoToAuctionLink] = useState(false);

  const openReservationModal = () => {
    setMessage(null);
    setShowGoToAuctionLink(false);
    setReservationModalOpen(true);
    fetchReservations();
  };

  const closeReservationModal = () => {
    setMessage(null);
    setReservationModalOpen(false);
    setReservations([]);
    setReservationDraftQty({});
    setIsReservationLoading(false);
    setShowGoToAuctionLink(false);
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
        setShowGoToAuctionLink(true);
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

  // ✨ ฟังก์ชันสำหรับกดปุ่มฟอร์มด้านบน (ใช้ Sync)
  const handleMemberRegister = async () => {
    // 1. นำข้อมูลทุกไอเทมแปลงเป็นตัวเลข ถ้าช่องว่างให้มีค่าเป็น 0
    const selectedItems = Object.entries(reservationQtys)
      .map(([key, value]) => ({
        itemType: key as 'Album' | 'Puppet' | 'White' | 'RedBlack',
        qty: parseInt(value || "0", 10), 
      }));

    // ตรวจสอบ limit 10 ชิ้น
    for (const item of selectedItems) {
      if (item.qty > 10) {
        const itemLabel = ITEM_CONFIG[item.itemType]?.label || item.itemType;
        setMessage({ type: 'error', text: `ท่านสามารถจอง ${itemLabel} ได้ไม่เกิน 10 ชิ้น` });
        return;
      }
    }

    setIsReservationSubmitting(true);
    setMessage(null);

    try {
      // 2. เรียกใช้งาน Server Action ระบบ Sync ข้อมูล (ลบของที่ใส่ 0 อัตโนมัติ)
      const res = await syncUserAuctionQueues(selectedItems as any);
      if (res.success) {
        setMessage({ type: 'success', text: 'ซิงค์ข้อมูลการจองคิวสำเร็จ!' });
        setShowGoToAuctionLink(true);
        setReservationQtys({ Album: '', Puppet: '', White: '', RedBlack: '' });
        await fetchReservations();
      } else {
        setMessage({ type: 'error', text: res.error || 'เกิดข้อผิดพลาดขณะบันทึก' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'ระบบผิดพลาด กรุณาลองใหม่อีกครั้ง' });
    } finally {
      setIsReservationSubmitting(false);
    }
  };

  const [isOnLeave, setIsOnLeave] = useState(!!initialProfile.is_on_leave);

  const [stats, setStats] = useState({
    p_atk: initialProfile.p_atk ? String(initialProfile.p_atk) : "",
    m_atk: initialProfile.m_atk ? String(initialProfile.m_atk) : "",
    p_def: initialProfile.p_def ? String(initialProfile.p_def) : "",
    m_def: initialProfile.m_def ? String(initialProfile.m_def) : "",
    pvp_dmg: initialProfile.pvp_dmg ? String(initialProfile.pvp_dmg) : "",
    pvp_reduc: initialProfile.pvp_reduc ? String(initialProfile.pvp_reduc) : "",
    p_dmg: initialProfile.p_dmg ? String(initialProfile.p_dmg) : "",
    m_dmg: initialProfile.m_dmg ? String(initialProfile.m_dmg) : "",
    p_reduc: initialProfile.p_reduc ? String(initialProfile.p_reduc) : "",
    m_reduc: initialProfile.m_reduc ? String(initialProfile.m_reduc) : "",
    hp: initialProfile.hp ? String(initialProfile.hp) : "",
    sp: initialProfile.sp ? String(initialProfile.sp) : "",
    ignore_pdef: initialProfile.ignore_pdef ? String(initialProfile.ignore_pdef) : "",
    ignore_mdef: initialProfile.ignore_mdef ? String(initialProfile.ignore_mdef) : "",
    cri: (initialProfile as any).cri ? String((initialProfile as any).cri) : "",
    cri_dmg: (initialProfile as any).cri_dmg ? String((initialProfile as any).cri_dmg) : "",
  });

  const handleShowcaseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // 1. ตรวจสอบไฟล์รูปภาพ
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setMessage({ type: "error", text: "❌ อนุญาตเฉพาะไฟล์ภาพนามสกุล png, jpg, jpeg, และ webp เท่านั้น" });
        return;
      }

      // 2. ตรวจสอบขนาดไฟล์ไม่เกิน 5MB
      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        setMessage({ type: "error", text: "❌ ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB" });
        return;
      }

      setIsShowcaseUploading(true);
      setMessage(null);

      try {
        let fileToUpload = file;
        if (removeBgAutomatic) {
          try {
            // Dynamic import to support client-side only WASM/ONNX models
            const { removeBackground } = await import("@imgly/background-removal");
            const resultBlob = await removeBackground(file);
            fileToUpload = new File([resultBlob], "showcase_image.png", { type: "image/png" });
          } catch (bgError: any) {
            console.error("Failed to remove background:", bgError);
            setMessage({ type: "error", text: "⚠️ ไม่สามารถลบพื้นหลังด้วย AI ได้ ระบบจะอัปโหลดรูปภาพแบบปกติแทนครับ" });
            fileToUpload = file;
          }
        }

        const supabase = createClient();
        
        // 3. หลีกเลี่ยงไฟล์ขยะพูนสะสม: ลบไฟล์เก่าออกก่อนถ้ามี
        if (showcaseUrl && showcaseUrl.includes("guild-logos/")) {
          const oldPath = showcaseUrl.split("guild-logos/")[1];
          if (oldPath) {
            await supabase.storage.from("guild-logos").remove([oldPath]);
          }
        }

        const fileName = `showcase_image`;
        const filePath = `showcases/${initialProfile.id}/${fileName}`;

        // 4. อัปโหลดรูปภาพลง Storage
        const { error: uploadError } = await supabase.storage
          .from("guild-logos")
          .upload(filePath, fileToUpload, { upsert: true });

        if (uploadError) {
          throw new Error("อัปโหลดล้มเหลว: " + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from("guild-logos")
          .getPublicUrl(filePath);

        // Force browser update using cache-busting timestamp query parameter
        const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

        setShowcaseUrl(cacheBustedUrl);
        setMessage({ type: "success", text: "อัปโหลดรูปภาพตัวละครสำเร็จ! กรุณากดปุ่ม 'บันทึกสเตตัส' ด้านล่างเพื่อบันทึกข้อมูลครับ" });
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเพื่ออัปโหลด" });
      } finally {
        setIsShowcaseUploading(false);
        if (showcaseFileInputRef.current) showcaseFileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveShowcase = () => {
    setShowcaseUrl("");
  };

  const handleStatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStats((prev) => ({ ...prev, [name]: value }));
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
          mergedData.cri = selectValue(mergedData.cri, data2.cri);
          mergedData.cri_dmg = selectValue(mergedData.cri_dmg, data2.cri_dmg);
        }

        const toStringStat = (value?: number, currentValue?: string) =>
          value !== undefined && value !== null && value !== 0 ? String(value) : currentValue || "";

        setStats({
          p_atk: toStringStat(mergedData.p_atk, stats.p_atk),
          m_atk: toStringStat(mergedData.m_atk, stats.m_atk),
          p_def: toStringStat(mergedData.p_def, stats.p_def),
          m_def: toStringStat(mergedData.m_def, stats.m_def),
          p_dmg: toStringStat(mergedData.p_dmg, stats.p_dmg),
          m_dmg: toStringStat(mergedData.m_dmg, stats.m_dmg),
          p_reduc: toStringStat(mergedData.p_reduc, stats.p_reduc),
          m_reduc: toStringStat(mergedData.m_reduc, stats.m_reduc),
          pvp_dmg: toStringStat(mergedData.pvp_dmg, stats.pvp_dmg),
          pvp_reduc: toStringStat(mergedData.pvp_reduc, stats.pvp_reduc),
          hp: toStringStat(mergedData.hp, stats.hp),
          sp: toStringStat(mergedData.sp, stats.sp),
          ignore_pdef: toStringStat(mergedData.ignore_pdef, stats.ignore_pdef),
          ignore_mdef: toStringStat(mergedData.ignore_mdef, stats.ignore_mdef),
          cri: toStringStat(mergedData.cri, stats.cri),
          cri_dmg: toStringStat(mergedData.cri_dmg, stats.cri_dmg),
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
    
    // ตรวจสอบลิมิตของสเตตัสฝั่งหน้าบ้าน
    const formData = new FormData(e.currentTarget);
    for (const key of Object.keys(STAT_LIMITS) as (keyof typeof STAT_LIMITS)[]) {
      const value = formData.get(key);
      if (value !== null && value !== "") {
        const numVal = parseFloat(value as string);
        const maxVal = STAT_LIMITS[key];
        if (numVal > maxVal) {
          const labels: Record<string, string> = {
            hp: "Max HP", sp: "Max SP", p_atk: "P.ATK", m_atk: "M.ATK",
            p_def: "P.DEF", m_def: "M.DEF", ignore_pdef: "Ignore P.DEF", ignore_mdef: "Ignore M.DEF",
            p_dmg: "P.DMG (%)", m_dmg: "M.DMG (%)", p_reduc: "P.Reduc (%)", m_reduc: "M.Reduc (%)",
            pvp_dmg: "PvP DMG", pvp_reduc: "PvP Reduc", cri: "Cri", cri_dmg: "Cri Dam (%)"
          };
          setMessage({ type: "error", text: `ค่า ${labels[key] || key} ต้องไม่เกิน ${maxVal.toLocaleString()}` });
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    }

    setMessage({ type: "info", text: "กำลังบันทึกข้อมูล..." });
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);

    startTransition(async () => {
      const result = await updateMyProfile(formData);
      if (result.success) {
        setMessage({ type: "success", text: "อัปเดตข้อมูลสำเร็จ!" });
      } else {
        setMessage({ type: "error", text: result.error || "ไม่สามารถอัปเดตข้อมูลได้" });
      }

      alertTimerRef.current = setTimeout(() => setMessage(null), 3500);
    });
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Loading Overlay */}
      {(isAiLoading || isPending || isShowcaseUploading) && (
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
              {isAiLoading 
                ? "กำลังประมวลผลสเตตัสจากภาพ โปรดรอสักครู่..." 
                : isShowcaseUploading
                  ? (removeBgAutomatic ? "🔮 AI กำลังดาวน์โหลดโมเดลและประมวลผลลบพื้นหลัง (อาจใช้เวลาประมาณ 10-15 วินาทีในครั้งแรก)..." : "กำลังอัปโหลดรูปตัวละคร...")
                  : "กำลังบันทึกข้อมูล โปรดรอจนกว่าจะเสร็จสิ้น"}
            </p>
          </div>
        </div>
      )}

      {/* Global Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl font-medium text-sm shadow-sm border ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
            : message.type === "error"
              ? "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
              : "bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800"
        }`}>
          {message.text}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`${isAiLoading || isPending ? "pointer-events-none opacity-70 blur-sm" : ""} transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 gap-6`}
      >
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm glass-panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  สถานะสมาชิก
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {isOnLeave ? "กำลังอยู่ในสถานะลากิจกรรม" : "พร้อมเข้าร่วมกิลด์วอร์"}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isOnLeave} onChange={handleToggleLeave} disabled={isPending || isAiLoading || isShowcaseUploading} />
                <div className="w-11 h-6 rounded-full bg-slate-200 peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform"></div>
              </label>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 glass-panel">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              ข้อมูลตัวละคร
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">UID (อ้างอิงระบบ)</label>
                <input type="text" value={initialProfile.uid_game} disabled className="block w-full rounded-lg border-0 py-2.5 px-3 bg-slate-100 text-slate-500 cursor-not-allowed dark:bg-slate-900 dark:text-slate-500 text-sm" />
              </div>
              <div>
                <label htmlFor="display_name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ชื่อตัวละคร</label>
                <input id="display_name" name="display_name" type="text" defaultValue={initialProfile.display_name || ""} required className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-900 dark:text-white dark:ring-slate-700 sm:text-sm" />
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

              {/* 🌟 ช่องอัปโหลดรูปภาพตัวละครเกียรติยศ (Showcase Upload Box) */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  รูปภาพตัวละครเพื่อยืนแท่นทำเนียบเกียรติยศ
                </label>
                <input
                  type="hidden"
                  name="character_showcase_url"
                  value={showcaseUrl}
                />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={showcaseFileInputRef}
                      disabled={isShowcaseUploading || isPending}
                      onChange={handleShowcaseUpload}
                      className="w-full text-xs text-slate-500 dark:text-slate-400
                        file:mr-2 file:py-1.5 file:px-2.5
                        file:rounded-xl file:border-0
                        file:text-xs file:font-semibold
                        file:bg-slate-900 file:text-white dark:file:bg-slate-800
                        hover:file:opacity-90 file:cursor-pointer"
                    />
                    {showcaseUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveShowcase}
                        className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-950/20 px-2 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 cursor-pointer shrink-0"
                      >
                        ลบออก
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <input
                      id="remove_bg_toggle"
                      type="checkbox"
                      checked={removeBgAutomatic}
                      onChange={(e) => setRemoveBgAutomatic(e.target.checked)}
                      disabled={isShowcaseUploading || isPending}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 cursor-pointer"
                    />
                    <label htmlFor="remove_bg_toggle" className="text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      🔮 ลบพื้นหลังอัตโนมัติด้วย AI (แนะนำเพื่อให้ตัวละครยืนแท่นสวยงาม)
                    </label>
                  </div>
                  {showcaseUrl && (
                    <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      <img src={showcaseUrl} alt="Character Showcase" className="h-32 w-auto object-contain rounded" onError={(e) => { (e.target as any).src = 'https://placehold.co/150x150?text=Invalid+Image'; }} />
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                    * ขนาดไม่เกิน 5MB (ไฟล์ png, jpg, jpeg, webp) รูปนี้จะนำไปโชว์ที่หน้า Leaderboard ในโซนทำเนียบเกียรติยศเมื่อคุณติดอันดับ Top 3 ของสายอาชีพคุณ!
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 glass-panel">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">คิวประมูล</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">จัดการจำนวนกล่องที่ต้องการรับจากการประมูล</p>
            <button type="button" onClick={openReservationModal} disabled={isPending || isAiLoading || isShowcaseUploading} className="cursor-pointer w-full rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold transition hover:bg-slate-800 disabled:opacity-50">
              ดูรายการจองคิว
            </button>
          </div>

        </div>

        <div className="lg:col-span-8 xl:col-span-9">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full glass-panel">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">ข้อมูลสเตตัสตัวละคร</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">กรอกข้อมูล หรืออัปโหลดรูปภาพสเตตัสด้วย AI</p>
                </div>
                <div>
                  <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isAiLoading || isPending} className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-800 disabled:opacity-50">
                    {isAiLoading ? (
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                    ) : "อัปโหลดสเตตัส"}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 xl:p-8 flex-1 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatInput label="Max HP" name="hp" value={stats.hp} onChange={handleStatChange} />
                <StatInput label="Max SP" name="sp" value={stats.sp} onChange={handleStatChange} />
                <StatInput label="P.ATK" name="p_atk" value={stats.p_atk} onChange={handleStatChange} />
                <StatInput label="M.ATK" name="m_atk" value={stats.m_atk} onChange={handleStatChange} />
                
                <StatInput label="P.DEF" name="p_def" value={stats.p_def} onChange={handleStatChange} />
                <StatInput label="M.DEF" name="m_def" value={stats.m_def} onChange={handleStatChange} />
                <StatInput label="Ignore P.DEF" name="ignore_pdef" value={stats.ignore_pdef} onChange={handleStatChange} />
                <StatInput label="Ignore M.DEF" name="ignore_mdef" value={stats.ignore_mdef} onChange={handleStatChange} />
                
                <StatInput label="P.DMG (%)" name="p_dmg" value={stats.p_dmg} onChange={handleStatChange} />
                <StatInput label="M.DMG (%)" name="m_dmg" value={stats.m_dmg} onChange={handleStatChange} />
                <StatInput label="P.Reduc (%)" name="p_reduc" value={stats.p_reduc} onChange={handleStatChange} />
                <StatInput label="M.Reduc (%)" name="m_reduc" value={stats.m_reduc} onChange={handleStatChange} />
                
                <StatInput label="PvP DMG" name="pvp_dmg" value={stats.pvp_dmg} onChange={handleStatChange} />
                <StatInput label="PvP Reduc" name="pvp_reduc" value={stats.pvp_reduc} onChange={handleStatChange} />
                <StatInput label="Cri" name="cri" value={stats.cri} onChange={handleStatChange} />
                <StatInput label="Cri Dam (%)" name="cri_dmg" value={stats.cri_dmg} onChange={handleStatChange} />
              </div>
            </div>

            <div className="p-6 xl:px-8 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <button type="submit" disabled={isPending || isAiLoading} className="w-full rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50">
                {isPending ? "กำลังบันทึก..." : "บันทึกสเตตัส"}
              </button>
            </div>
          </div>
        </div>

      </form>

      {/* Modal จองคิว */}
      {reservationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  คิวประมูลของฉัน
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  จัดการคิวและจำนวนที่ต้องการรับได้จากที่นี่
                </p>
              </div>
              <button type="button" onClick={closeReservationModal} className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 transition-colors">
                ปิด
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {message && (
                <div className={`p-4 rounded-xl font-medium text-sm shadow-sm border ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                    : message.type === "error"
                      ? "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                      : "bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                }`}>
                  {message.text}
                </div>
              )}
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
                  {(() => {
                    const sessionMap = new Map<string, QueueReservation[]>();
                    const sessionOrder: string[] = [];
                    
                    reservations.forEach((res) => {
                      const sessionKey = `${res.item_name}|${res.queue_timestamp || 'no-timestamp'}`;
                      if (!sessionMap.has(sessionKey)) {
                        sessionMap.set(sessionKey, []);
                        sessionOrder.push(sessionKey);
                      }
                      sessionMap.get(sessionKey)!.push(res);
                    });
                    
                    return sessionOrder.map((sessionKey) => {
                      const sessionReservations = sessionMap.get(sessionKey) || [];
                      const firstRes = sessionReservations[0];
                      const itemLabel = ITEM_CONFIG[firstRes.item_name as keyof typeof ITEM_CONFIG].label;
                      const totalRequested = sessionReservations.reduce((sum, r) => sum + (r.requested_qty || 0), 0);
                      const totalReceived = sessionReservations.reduce((sum, r) => sum + (r.received_qty || 0), 0);
                      const formattedTime = firstRes.queue_timestamp 
                        ? new Date(firstRes.queue_timestamp).toLocaleString('th-TH')
                        : '-';
                      
                      return (
                        <div key={sessionKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700/50 dark:bg-slate-800/30">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                {itemLabel}
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 space-y-1">
                                <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {firstRes.status === 'partial' ? 'รับแล้วบางส่วน' : 'รอรับการจัดสรร'}
                                </div>
                                <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {formattedTime}
                                </div>
                              </div>
                            </div>
                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 shadow-sm">
                              ได้รับแล้ว {totalReceived} ชิ้น
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                                ระบุจำนวนที่ต้องการ
                              </label>
                              <input 
                                type="number" 
                                value={totalRequested}
                                disabled
                                className="block w-full rounded-xl border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 dark:bg-slate-900 dark:text-white dark:ring-slate-700 sm:text-sm font-semibold bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                              />
                              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-500">รวมจำนวนที่จอง ({sessionReservations.length} รายการ)</p>
                            </div>

                            {/* ✨ ปุ่มลบเปลี่ยน Logic เป็น Loop อัปเดตคิวลบให้เกลี้ยง */}
                            <button 
                              type="button" 
                              onClick={async () => {
                                if (!confirm("ยืนยันการยกเลิกการจองคิวไอเทมนี้ทั้งหมด?")) return;
                                
                                setReservationActionLoading(true);
                                try {
                                  // วนลูปใช้ deleteAuctionQueueReservation ยิงลบออกจากตาราง DB รัวๆ
                                  for (const res of sessionReservations) {
                                    await deleteAuctionQueueReservation(String(res.id));
                                  }
                                  setMessage({ type: "success", text: "ยกเลิกคิวไอเทมนี้ออกจากฐานข้อมูลสำเร็จ" });
                                  await fetchReservations();
                                } catch (err) {
                                  setMessage({ type: "error", text: "ไม่สามารถยกเลิกคิวได้ทั้งหมด" });
                                } finally {
                                  setReservationActionLoading(false);
                                }
                              }} 
                              disabled={reservationActionLoading} 
                              className="cursor-pointer mt-3 sm:mt-0 h-11 self-center w-full rounded-xl border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-400 disabled:opacity-50 transition-colors"
                            >
                              ยกเลิกคิวทั้งหมด
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
              {showGoToAuctionLink && (
                <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 bg-slate-50 dark:bg-slate-950/70 flex flex-col gap-3">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">บันทึกข้อมูลคิวเรียบร้อยแล้ว</div>
                  <Link href="/auction" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
                    ไปหน้าจัดการประมูลต่อ
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}