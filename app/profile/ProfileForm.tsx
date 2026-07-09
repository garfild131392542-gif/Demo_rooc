"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import MemberForm from "@/components/auction/MemberForm";
import Link from 'next/link';
import { updateCharacterInfoAction, updateCharacterStatsAction, generateDiscordLinkCodeAction, unlinkDiscordAction } from "@/app/actions/profile";
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
  const isCp = name === "cp";
  return (
    <div className={`p-3 rounded-lg border shadow-sm glass-panel flex flex-col justify-between min-h-[85px] transition-colors ${
      isCp 
        ? "bg-amber-500/5 dark:bg-amber-500/5 border-amber-500/30" 
        : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
    }`}>
      <label htmlFor={name} className={`block text-[11px] font-bold tracking-wider mb-1.5 uppercase font-sans ${
        isCp ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
      }`}>
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
        className={`block w-full rounded-md border py-1.5 px-2.5 bg-white dark:bg-slate-950 ring-0 text-xs sm:text-sm font-black font-mono ${
          isCp 
            ? "text-amber-600 dark:text-amber-400 border-amber-500/30 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20" 
            : "text-slate-950 dark:text-white border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
        }`}
      />
    </div>
  );
};

const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200): Promise<{ base64: string; type: string }> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ base64: "", type: file.type });
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement("img");
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL("image/jpeg", 0.8);
          resolve({ base64, type: "image/jpeg" });
        } else {
          resolve({ base64: reader.result as string, type: file.type });
        }
      };
      img.onerror = () => {
        resolve({ base64: reader.result as string, type: file.type });
      };
    };
    reader.onerror = () => {
      resolve({ base64: "", type: file.type });
    };
  });
};

export default function ProfileForm({
  initialProfile,
  isEligibleForShowcase = false,
}: {
  initialProfile: Profile;
  isEligibleForShowcase?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [discordUser, setDiscordUser] = useState<{ id: string | null; username: string | null }>({
    id: (initialProfile as any).discord_user_id || null,
    username: (initialProfile as any).discord_username || null
  });
  const [discordCode, setDiscordCode] = useState<string | null>(null);
  const [discordCodeExpires, setDiscordCodeExpires] = useState<string | null>(null);
  const [isDiscordActionPending, setIsDiscordActionPending] = useState(false);

  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showcaseFileInputRef = useRef<HTMLInputElement>(null);
  const infoFormRef = useRef<HTMLFormElement>(null);

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
    cp: initialProfile.cp ? String(initialProfile.cp) : "",
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
        setMessage({ type: "success", text: "อัปโหลดรูปภาพตัวละครสำเร็จ! กำลังบันทึกข้อมูลอัตโนมัติ..." });

        // Auto submit the form to save changes to DB
        setTimeout(() => {
          if (infoFormRef.current) {
            infoFormRef.current.requestSubmit();
          }
        }, 100);
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
    
    // Auto submit the form to save changes to DB
    setTimeout(() => {
      if (infoFormRef.current) {
        infoFormRef.current.requestSubmit();
      }
    }, 100);
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
        filesToProcess.map((file) => compressImage(file)),
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
          cp: toStringStat((mergedData as any).cp, stats.cp),
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

  const handleGenerateLinkCode = async () => {
    setIsDiscordActionPending(true);
    setMessage(null);
    try {
      const result = await generateDiscordLinkCodeAction();
      if (result.success && result.code) {
        setDiscordCode(result.code);
        setDiscordCodeExpires(result.expiresAt || null);
        setMessage({ type: "success", text: "สร้างโค้ดเชื่อมต่อ Discord สำเร็จ กรุณานำโค้ดไปใส่ใน Discord" });
      } else {
        setMessage({ type: "error", text: result.error || "ไม่สามารถสร้างโค้ดได้" });
      }
    } catch {
      setMessage({ type: "error", text: "ระบบผิดพลาด กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setIsDiscordActionPending(false);
    }
  };

  const handleUnlinkDiscord = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะยกเลิกการเชื่อมต่อ Discord กับตัวละครนี้?")) return;
    setIsDiscordActionPending(true);
    setMessage(null);
    try {
      const result = await unlinkDiscordAction();
      if (result.success) {
        setDiscordUser({ id: null, username: null });
        setDiscordCode(null);
        setDiscordCodeExpires(null);
        setMessage({ type: "success", text: "ยกเลิกการเชื่อมต่อ Discord สำเร็จ" });
      } else {
        setMessage({ type: "error", text: result.error || "ไม่สามารถยกเลิกการเชื่อมต่อได้" });
      }
    } catch {
      setMessage({ type: "error", text: "ระบบผิดพลาด กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setIsDiscordActionPending(false);
    }
  };

  const handleInfoSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    setMessage({ type: "info", text: "กำลังบันทึกข้อมูลตัวละคร..." });
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);

    startTransition(async () => {
      const result = await updateCharacterInfoAction(formData);
      if (result.success) {
        setMessage({ type: "success", text: "อัปเดตข้อมูลตัวละครสำเร็จ!" });
      } else {
        setMessage({ type: "error", text: result.error || "ไม่สามารถอัปเดตข้อมูลตัวละครได้" });
      }

      alertTimerRef.current = setTimeout(() => setMessage(null), 3500);
    });
  };

  const handleStatsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // ตรวจสอบลิมิตของสเตตัสฝั่งหน้าบ้าน
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

    setMessage({ type: "info", text: "กำลังบันทึกค่าสเตตัส..." });
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);

    startTransition(async () => {
      const result = await updateCharacterStatsAction(formData);
      if (result.success) {
        setMessage({ type: "success", text: "อัปเดตค่าสเตตัสสำเร็จ!" });
      } else {
        setMessage({ type: "error", text: result.error || "ไม่สามารถอัปเดตค่าสเตตัสได้" });
      }

      alertTimerRef.current = setTimeout(() => setMessage(null), 3500);
    });
  };

  return (
    <div className="relative w-full max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
      
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

      <div
        className={`${isAiLoading || isPending ? "pointer-events-none opacity-70 blur-sm" : ""} transition-all duration-300 space-y-6`}
      >
        {/* ═══════════════════════════════════════════════════════ */}
        {/* ROW 1: ข้อมูลตัวละคร + สถานะ + รูป Showcase (แถวบน) */}
        {/* ═══════════════════════════════════════════════════════ */}
        <form ref={infoFormRef} onSubmit={handleInfoSubmit}>
          <div className="rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 glass-panel overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* ── ฝั่งซ้าย: ข้อมูลตัวละคร + สถานะสมาชิก ── */}
              <div className="lg:col-span-7 xl:col-span-7 p-5 sm:p-6 space-y-5">
                {/* สถานะสมาชิก */}
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      สถานะสมาชิก
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isOnLeave ? "กำลังอยู่ในสถานะลากิจกรรม" : "พร้อมเข้าร่วมกิลด์วอร์"}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isOnLeave} onChange={handleToggleLeave} disabled={isPending || isAiLoading || isShowcaseUploading} />
                    <div className="w-11 h-6 rounded-full bg-slate-200 peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform"></div>
                  </label>
                </div>

                {/* ข้อมูลตัวละคร - Grid 2 คอลัมน์ */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">
                    ข้อมูลตัวละคร
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <option value="Rebellion">Rebellion</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={openReservationModal}
                        disabled={isPending || isAiLoading || isShowcaseUploading}
                        style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}
                        className="w-full rounded-lg bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 hover:from-slate-600 hover:to-slate-800 active:translate-y-[1px] text-white font-bold py-2.5 px-4 text-xs sm:text-sm shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] border border-slate-950 transition-all duration-150 cursor-pointer disabled:opacity-50"
                      >
                        📦 ดูรายการจองคิวประมูล
                      </button>
                    </div>
                  </div>
                </div>

                {/* เชื่อมต่อ Discord */}
                <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 127.14 96.36">
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.18,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.71,1.63,1.4,2.5,2a68.42,68.42,0,0,1-10.5,5A77.7,77.7,0,0,0,102.3,85.5a105.73,105.73,0,0,0,31-18.83C130.66,50.22,124.63,27.34,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
                    </svg>
                    <span>การเชื่อมต่อ Discord</span>
                  </h3>
                  
                  {discordUser.id ? (
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm glass-panel">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold">เชื่อมต่อบัญชีสำเร็จ</p>
                          <p className="text-sm text-slate-800 dark:text-slate-100 font-semibold font-mono mt-0.5">
                            {discordUser.username ? `@${discordUser.username}` : `ID: ${discordUser.id}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleUnlinkDiscord}
                        disabled={isDiscordActionPending}
                        className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900/50 active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50"
                      >
                        ยกเลิกการเชื่อมต่อ
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm glass-panel space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                            เชื่อมต่อบัญชีดิสคอร์ดของคุณเพื่อใช้งานคำสั่งเปลี่ยนสายอาชีพ เปลี่ยนชื่อ หรือจองคิวไอเทมผ่าน Discord ได้ทันที
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateLinkCode}
                          disabled={isDiscordActionPending}
                          style={{ textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)' }}
                          className="whitespace-nowrap px-4 py-2.5 bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 active:translate-y-[1px] text-white text-xs font-bold rounded-lg border border-indigo-950 shadow-md transition-all cursor-pointer disabled:opacity-50"
                        >
                          {discordCode ? "🔄 สร้างรหัสใหม่" : "🔗 เชื่อมต่อ Discord"}
                        </button>
                      </div>

                      {discordCode && (
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 rounded-lg p-3.5 space-y-2">
                          <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300">รหัสยืนยันตัวตนของคุณ:</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <span className="text-2xl font-black font-mono tracking-widest text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-950 px-3.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/70 shadow-inner w-fit">
                              {discordCode}
                            </span>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              <p>นำรหัสนี้ไปพิมพ์ในดิสคอร์ดห้องใดก็ได้ หรือส่งข้อความหาบอทโดยตรง:</p>
                              <code className="mt-1 block bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded text-slate-800 dark:text-slate-200 font-mono text-[10px] font-bold border border-slate-200 dark:border-slate-800/80 w-fit">
                                !link {discordCode}
                              </code>
                            </div>
                          </div>
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                            ⚠️ รหัสนี้จะหมดอายุภายใน 15 นาที
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── ฝั่งขวา: รูป Showcase + อัปโหลด ── */}
              <div className="lg:col-span-5 xl:col-span-5 p-5 sm:p-6 lg:border-l border-t lg:border-t-0 border-slate-200 dark:border-slate-700/60">
                <input type="hidden" name="character_showcase_url" value={showcaseUrl} />
                <div className="flex flex-col h-full">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                    รูปภาพสเตตัส / ตัวละคร
                  </label>
                  
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={showcaseFileInputRef}
                        disabled={isShowcaseUploading || isPending}
                        onChange={handleShowcaseUpload}
                        className="w-full text-xs text-slate-500 dark:text-slate-400
                          file:mr-2 file:py-1.5 file:px-2.5
                          file:rounded-md file:border
                          file:border-slate-800 dark:file:border-slate-950
                          file:text-xs file:font-bold
                          file:bg-gradient-to-b file:from-slate-700 file:to-slate-900 file:text-white
                          hover:file:opacity-95 file:cursor-pointer"
                      />
                      {showcaseUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveShowcase}
                          style={{ textShadow: '0 1px 1px rgba(0, 0, 0, 0.4)' }}
                          className="relative overflow-hidden text-xs font-bold text-red-100 hover:text-white bg-gradient-to-b from-rose-600 to-red-800 hover:from-rose-500 hover:to-red-700 active:translate-y-[1px] px-2.5 py-1.5 rounded border border-red-950 shadow-[0_1px_2px_rgba(0,0,0,0.3)] cursor-pointer shrink-0 transition-all duration-150"
                        >
                          ลบออก
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="remove_bg_toggle"
                        type="checkbox"
                        checked={removeBgAutomatic}
                        onChange={(e) => setRemoveBgAutomatic(e.target.checked)}
                        disabled={isShowcaseUploading || isPending}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 cursor-pointer"
                      />
                      <label htmlFor="remove_bg_toggle" className="text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                        🔮 ลบพื้นหลังอัตโนมัติด้วย AI
                      </label>
                    </div>
                    {showcaseUrl ? (
                      <div className="flex-1 min-h-[120px] p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                        <img src={showcaseUrl} alt="Character Showcase" className="max-h-[140px] w-auto object-contain rounded" onError={(e) => { (e.target as any).src = 'https://placehold.co/150x150?text=Invalid+Image'; }} />
                      </div>
                    ) : (
                      <div className="flex-1 min-h-[120px] p-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">ยังไม่มีรูปภาพ<br/>กดเลือกไฟล์เพื่ออัปโหลด</p>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                      * ขนาดไม่เกิน 5MB (png, jpg, jpeg, webp) รูปนี้จะโชว์ที่การ์ดตัวละครและในทำเนียบเกียรติยศ
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* ── ปุ่มบันทึกข้อมูลตัวละคร (อยู่ล่างสุดของแถวนี้) ── */}
            <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
              <button
                type="submit"
                disabled={isPending || isShowcaseUploading}
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}
                className="w-full sm:w-auto sm:min-w-[240px] rounded-md bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 active:translate-y-[1px] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] text-white font-bold py-2.5 px-6 text-xs sm:text-sm shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] border border-amber-800 transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {isPending ? "กำลังบันทึกข้อมูล..." : "💾 บันทึกข้อมูลตัวละคร"}
              </button>
            </div>
          </div>
        </form>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ROW 2: ข้อมูลสเตตัสตัวละคร (แถวล่าง - เต็มความกว้าง)  */}
        {/* ═══════════════════════════════════════════════════════ */}
        <form onSubmit={handleStatsSubmit}>
          <div className="rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col glass-panel">
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-700/60 bg-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">ข้อมูลสเตตัสตัวละคร</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">กรอกข้อมูล หรืออัปโหลดรูปภาพสเตตัสด้วย AI</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAiLoading || isPending}
                    style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}
                    className="relative overflow-hidden inline-flex items-center justify-center rounded-md bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 hover:from-slate-500 hover:to-slate-700 active:translate-y-[1px] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] border border-slate-900 transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {isAiLoading ? (
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                    ) : "อัปโหลดสเตตัส ด้วย AI"}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || isAiLoading}
                    style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}
                    className="relative overflow-hidden inline-flex items-center justify-center rounded-md bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 active:translate-y-[1px] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] border border-emerald-900 transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? "กำลังบันทึก..." : "💾 บันทึกค่าสเตตัส"}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 bg-transparent">
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-9 gap-3">
                <StatInput label="CP" name="cp" value={stats.cp} onChange={handleStatChange} />
                <StatInput label="Max HP" name="hp" value={stats.hp} onChange={handleStatChange} />
                <StatInput label="Max SP" name="sp" value={stats.sp} onChange={handleStatChange} />
                <StatInput label="P.ATK" name="p_atk" value={stats.p_atk} onChange={handleStatChange} />
                <StatInput label="M.ATK" name="m_atk" value={stats.m_atk} onChange={handleStatChange} />
                <StatInput label="P.DEF" name="p_def" value={stats.p_def} onChange={handleStatChange} />
                <StatInput label="M.DEF" name="m_def" value={stats.m_def} onChange={handleStatChange} />
                <StatInput label="Ignore P.DEF" name="ignore_pdef" value={stats.ignore_pdef} onChange={handleStatChange} />
                <StatInput label="Ignore M.DEF" name="ignore_mdef" value={stats.ignore_mdef} onChange={handleStatChange} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-3 mt-3">
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
          </div>
        </form>
      </div>

      {/* Modal จองคิว */}
      {reservationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-2xl border border-slate-200 dark:border-slate-800 glass-panel">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80 px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📦</span> จัดการคิวประมูลของฉัน
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  ลงทะเบียนคิวประมูลใหม่ หรือ ตรวจสอบสถานะการจองไอเทมทั้งหมดในวันนี้
                </p>
              </div>
              <button 
                type="button" 
                onClick={closeReservationModal} 
                className="cursor-pointer px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                ปิดหน้าต่าง
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto">
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

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ฝั่งซ้าย: ฟอร์มจองคิวใหม่ */}
                <div className="lg:col-span-5 space-y-4">
                  <MemberForm
                    reservationQtys={reservationQtys}
                    setReservationQtys={setReservationQtys}
                    handleMemberRegister={handleMemberRegister}
                    isSaving={isReservationSubmitting || isPending || isAiLoading}
                  />

                  {showGoToAuctionLink && (
                    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-4 bg-slate-50 dark:bg-slate-950/40 flex flex-col gap-2.5">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">🎉 บันทึกข้อมูลคิวเรียบร้อยแล้ว</div>
                      <Link href="/auction" className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition-colors">
                        ไปหน้าจัดการประมูล &rarr;
                      </Link>
                    </div>
                  )}
                </div>

                {/* ฝั่งขวา: รายการจองคิวปัจจุบัน */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <span>📋</span> รายการคิวจองปัจจุบัน
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      ทั้งหมด {reservations.length} รายการ
                    </span>
                  </div>

                  {isReservationLoading ? (
                    <div className="text-center py-16 text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3 bg-slate-50/50 dark:bg-slate-800/10 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                      <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                      กำลังโหลดข้อมูลคิว...
                    </div>
                  ) : reservations.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-50/20 dark:bg-slate-900/10">
                      <span className="text-3xl block mb-2 opacity-30">📦</span>
                      ยังไม่มีรายการจองคิวในขณะนี้
                    </div>
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
                          const itemType = firstRes.item_name;
                          const itemCfg = ITEM_CONFIG[itemType as keyof typeof ITEM_CONFIG];
                          const itemLabel = itemCfg?.label || itemType;
                          const itemIcon = itemCfg?.icon;
                          
                          const totalRequested = sessionReservations.reduce((sum, r) => sum + (r.requested_qty || 0), 0);
                          const totalReceived = sessionReservations.reduce((sum, r) => sum + (r.received_qty || 0), 0);
                          const formattedTime = firstRes.queue_timestamp 
                            ? new Date(firstRes.queue_timestamp).toLocaleString('th-TH', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-';
                          
                          const percent = totalRequested > 0 ? Math.min(100, (totalReceived / totalRequested) * 100) : 0;
                          
                          return (
                            <div key={sessionKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700/50 dark:bg-slate-800/30 shadow-sm glass-panel relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700 group">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                {/* ส่วนหัวไอเทมพร้อมรูปภาพ */}
                                <div className="flex items-center gap-3">
                                  {itemIcon ? (
                                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center p-1 border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm">
                                      <img src={itemIcon} alt={itemLabel} className="w-10 h-10 object-contain" />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xl shrink-0">
                                      📦
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm font-black text-slate-800 dark:text-white tracking-tight">
                                      {itemLabel}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                        firstRes.status === 'partial' 
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' 
                                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                                      }`}>
                                        {firstRes.status === 'partial' ? 'ได้รับแล้วบางส่วน' : 'รอจัดสรร'}
                                      </span>
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                        🕒 {formattedTime}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* ข้อมูลจำนวนด้านขวา */}
                                <div className="flex flex-col items-end shrink-0">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    จัดสรรแล้ว
                                  </div>
                                  <div className="text-base font-black text-slate-800 dark:text-white">
                                    {totalReceived} <span className="text-xs font-semibold text-slate-400">/ {totalRequested} ชิ้น</span>
                                  </div>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="mt-4">
                                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500 dark:bg-indigo-600 rounded-full transition-all duration-500" 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <div className="flex justify-between items-center mt-1.5">
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">รวมจำนวนจอง ({sessionReservations.length} คิวย่อย)</span>
                                  <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400">{Math.round(percent)}%</span>
                                </div>
                              </div>

                              {/* Cancel action */}
                              <div className="mt-4 pt-4 border-t border-slate-200/40 dark:border-slate-800/40 flex justify-end">
                                <button 
                                  type="button" 
                                  onClick={async () => {
                                    if (!confirm("ยืนยันการยกเลิกการจองคิวไอเทมนี้ทั้งหมด?")) return;
                                    
                                    setReservationActionLoading(true);
                                    try {
                                      for (const res of sessionReservations) {
                                        await deleteAuctionQueueReservation(String(res.id));
                                      }
                                      setMessage({ type: "success", text: "ยกเลิกคิวไอเทมนี้สำเร็จ" });
                                      await fetchReservations();
                                    } catch (err) {
                                      setMessage({ type: "error", text: "ไม่สามารถยกเลิกคิวได้ทั้งหมด" });
                                    } finally {
                                      setReservationActionLoading(false);
                                    }
                                  }} 
                                  disabled={reservationActionLoading} 
                                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-bold text-red-600 bg-white hover:bg-red-50 dark:border-red-950/30 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/20 transition-all disabled:opacity-50"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  ยกเลิกคิวจองทั้งหมด
                                </button>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
