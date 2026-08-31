"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { FormInput } from "@/components/FormInput";
import { FormTextarea } from "@/components/FormTextarea";
import { ProgressBar } from "@/components/ProgressBar";
import {
  completeOnboardingAction,
  validateGuildUrlAction,
} from "../actions/onboarding";

interface GuildUrlStatus {
  checking: boolean;
  available: boolean | null;
  error?: string;
}

export function OnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [guildUrlStatus, setGuildUrlStatus] = useState<GuildUrlStatus>({
    checking: false,
    available: null,
  });

  const [formData, setFormData] = useState({
    guildName: "",
    guildUrl: "",
    guildDescription: "",
    discordLink: "",
    facebookLink: "",
    contactEmail: "",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const validateGuildUrl = useCallback(async (url: string) => {
    if (!url || url.length < 3) {
      setGuildUrlStatus({ checking: false, available: null });
      return;
    }

    setGuildUrlStatus({ checking: true, available: null });

    const result = await validateGuildUrlAction(url);
    setGuildUrlStatus({
      checking: false,
      available: result.available,
      error: result.error,
    });
  }, []);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleGuildUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setFormData((prev) => ({ ...prev, guildUrl: value }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      validateGuildUrl(value);
    }, 500);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.guildName.trim()) {
        setError("กรุณากรอกชื่อกิลด์");
        return;
      }
      if (!formData.guildUrl.trim()) {
        setError("กรุณาตั้งค่าความปลอดภัยลิงก์กิลด์ (URL)");
        return;
      }
      if (!guildUrlStatus.available) {
        setError("ลิงก์กิลด์ (URL) นี้ถูกใช้งานไปแล้ว");
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.contactEmail.trim()) {
        setError("กรุณากรอกอีเมลติดต่อจริง");
        return;
      }
      if (!formData.contactEmail.includes("@")) {
        setError("รูปแบบอีเมลไม่ถูกต้อง");
        return;
      }
    }

    setCurrentStep(currentStep + 1);
    setError(null);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    if (currentStep !== 3) return;

    setIsLoading(true);
    setError(null);

    const result = await completeOnboardingAction({
      guildName: formData.guildName,
      guildUrl: formData.guildUrl,
      guildDescription: formData.guildDescription,
      discordLink: formData.discordLink || undefined,
      contactEmail: formData.contactEmail.trim(),
    });

    if (!result.success) {
      setError(result.error || "เกิดข้อผิดพลาดในการสร้างระบบกิลด์");
      setIsLoading(false);
      return;
    }

    setInviteLink(result.inviteLink || `${appUrl}/g/${formData.guildUrl}`);
  };

  const handleCopyInviteLink = async () => {
    if (inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleGoToRegister = () => {
    router.refresh();
    router.push("/");
  };

  return (
    <div className="w-full flex items-center justify-center transition-colors duration-300">
      <div className="w-full max-w-2xl rounded-4xl border border-white/40 dark:border-white/10 bg-white/75 dark:bg-slate-900/70 backdrop-blur-2xl shadow-2xl shadow-blue-500/10 ring-1 ring-white/50 dark:ring-white/10 p-6 sm:p-10 relative overflow-hidden transition-all duration-300">
        {/* Top Glass Shimmer Glow */}
        <div className="pointer-events-none absolute -top-px left-1/4 right-1/4 h-px bg-linear-to-r from-transparent via-blue-400/60 to-transparent" />
        <div className="pointer-events-none absolute -top-24 -right-24 w-48 h-48 bg-blue-500/15 rounded-full blur-2xl" />

        {/* Progress Section */}
        <div className="mb-6 border-b border-slate-200/60 dark:border-white/10 pb-6">
          <ProgressBar currentStep={currentStep} totalSteps={3} />
        </div>
        
        {error && (
          <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 mb-6 animate-in fade-in duration-200 text-center font-bold text-xs sm:text-sm text-rose-700 dark:text-rose-300 backdrop-blur-md">
            {error}
          </div>
        )}
        
        {/* STEP 1: Guild Info */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300 relative">
            <div className="mb-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>🏰</span> ลงทะเบียนข้อมูลกิลด์
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                กรุณาระบุชื่อและตั้งค่าลิงก์ URL สำหรับหน้าต่างกิลด์ของคุณ
              </p>
            </div>

            <FormInput
              label="ชื่อกิลด์"
              name="guildName"
              placeholder="เช่น ROOC_Dominance"
              value={formData.guildName}
              onChange={handleInputChange}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="guildUrl"
                className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300"
              >
                ลิงก์กิลด์ (Guild URL) <span className="text-rose-500">*</span>
              </label>
              <div className="flex rounded-2xl shadow-inner border border-slate-200/80 dark:border-slate-700/80 overflow-hidden focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:border-blue-500 transition-all bg-white/70 dark:bg-slate-800/70 backdrop-blur-md">
                <span className="inline-flex items-center bg-slate-100/70 dark:bg-slate-900/60 px-4 text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 select-none border-r border-slate-200/80 dark:border-slate-700/80">
                  {appUrl.replace(/https?:\/\//, "")}/g/
                </span>
                <input
                  id="guildUrl"
                  name="guildUrl"
                  type="text"
                  placeholder="my-guild-name"
                  value={formData.guildUrl}
                  onChange={handleGuildUrlChange}
                  required
                  className="w-full bg-transparent px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-sm font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs mt-1 min-h-[18px]">
                {guildUrlStatus.checking && (
                  <span className="text-slate-500 flex items-center gap-1">
                    🔄 กำลังตรวจสอบลิงก์...
                  </span>
                )}
                {!guildUrlStatus.checking &&
                  guildUrlStatus.available === true && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      ✅ ลิงก์นี้สามารถใช้งานได้
                    </span>
                  )}
                {!guildUrlStatus.checking &&
                  guildUrlStatus.available === false && (
                    <span className="text-rose-500 dark:text-rose-400 font-bold flex items-center gap-1">
                      ❌ ลิงก์นี้ถูกผู้อื่นใช้งานไปแล้ว
                    </span>
                  )}
              </div>
            </div>

            <FormTextarea
              label="รายละเอียดกิลด์"
              name="guildDescription"
              placeholder="แนะนำกิลด์ สโลแกน หรือข้อมูลสำคัญสำหรับสมาชิก..."
              value={formData.guildDescription}
              onChange={handleInputChange}
              rows={4}
            />

            {/* ปุ่มกด Step 1 */}
            <div className="pt-3 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push("/profile-setup")}
                className="flex-1 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md text-slate-700 dark:text-slate-200 font-bold py-3.5 px-6 rounded-2xl transition-all cursor-pointer text-sm sm:text-base text-center"
              >
                ⬅ ย้อนกลับ
              </button>
              
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  !guildUrlStatus.available || !formData.guildName.trim()
                }
                className="flex-[2] bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black py-3.5 px-6 rounded-2xl transition-all shadow-xl shadow-blue-500/25 disabled:cursor-not-allowed cursor-pointer text-sm sm:text-base active:scale-[0.98]"
              >
                ขั้นตอนถัดไป ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Contact Info */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="mb-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>📧</span> ข้อมูลการติดต่อ
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                ระบุอีเมลสำหรับจัดการระบบ และลิงก์โซเชียลมีเดีย (ถ้ามี)
              </p>
            </div>

            <div className="bg-emerald-500/10 dark:bg-emerald-950/30 p-5 sm:p-6 rounded-3xl border border-emerald-500/20 backdrop-blur-md shadow-inner space-y-2">
              <FormInput
                label="อีเมลติดต่อจริง"
                name="contactEmail"
                type="email"
                placeholder="เช่น your_email@gmail.com"
                value={formData.contactEmail}
                onChange={handleInputChange}
                required
              />
              <div className="flex gap-2 pt-1 items-start text-emerald-800 dark:text-emerald-300">
                <span className="text-base mt-0.5">💡</span>
                <p className="text-xs font-medium leading-relaxed">
                  จำเป็นสำหรับการจัดการระบบ, ข้อมูลการต่ออายุแพลตฟอร์ม
                  หรือกู้คืนระบบกรณีฉุกเฉิน (ข้อมูลนี้จะไม่ถูกเปิดเผยต่อสาธารณะ)
                </p>
              </div>
            </div>

            <FormInput
              label="ลิงก์ Discord ของกิลด์ (ถ้ามี)"
              name="discordLink"
              type="url"
              placeholder="https://discord.gg/your-guild"
              value={formData.discordLink}
              onChange={handleInputChange}
            />

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md text-slate-700 dark:text-slate-200 font-bold py-3.5 px-6 rounded-2xl transition-all cursor-pointer text-sm sm:text-base text-center"
              >
                ⬅ ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-[2] bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3.5 px-6 rounded-2xl transition-all shadow-xl shadow-blue-500/25 cursor-pointer text-sm sm:text-base active:scale-[0.98]"
              >
                ขั้นตอนถัดไป ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmation / Success Screen */}
        {currentStep === 3 && (
          <div className="flex flex-col gap-5 items-center py-2 animate-in zoom-in-95 duration-300 relative">
            {!inviteLink ? (
              <>
                <div className="text-center space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
                    <span>✨</span> ตรวจสอบข้อมูลระบบกิลด์
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    กรุณาตรวจสอบข้อมูลด้านล่างให้ถูกต้องก่อนยืนยันการจัดตั้งระบบกิลด์ของคุณ
                  </p>
                </div>

                <div className="w-full bg-white/60 dark:bg-slate-800/40 p-5 sm:p-6 rounded-3xl border border-slate-200/60 dark:border-white/5 space-y-3.5 text-xs sm:text-sm backdrop-blur-md shadow-inner">
                  <div className="flex justify-between items-start border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                    <span className="text-slate-500 dark:text-slate-400 font-bold">ชื่อกิลด์:</span>
                    <span className="text-slate-900 dark:text-white font-black text-right">{formData.guildName}</span>
                  </div>

                  <div className="flex justify-between items-start border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                    <span className="text-slate-500 dark:text-slate-400 font-bold">ลิงก์กิลด์ (URL):</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono font-black text-right">/g/{formData.guildUrl}</span>
                  </div>

                  <div className="flex justify-between items-start border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                    <span className="text-slate-500 dark:text-slate-400 font-bold">อีเมลติดต่อ:</span>
                    <span className="text-slate-900 dark:text-white font-medium text-right">{formData.contactEmail}</span>
                  </div>

                  {formData.discordLink && (
                    <div className="flex justify-between items-start border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                      <span className="text-slate-500 dark:text-slate-400 font-bold">ลิงก์ Discord:</span>
                      <span className="text-slate-900 dark:text-white font-medium truncate max-w-[220px] text-right font-mono text-xs">{formData.discordLink}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-slate-500 dark:text-slate-400 font-bold">รายละเอียดกิลด์:</span>
                    <p className="text-slate-700 dark:text-slate-300 text-xs bg-white/70 dark:bg-slate-900/70 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800 break-words max-h-24 overflow-y-auto leading-relaxed">
                      {formData.guildDescription || "- ไม่ได้ระบุข้อมูลรายละเอียด -"}
                    </p>
                  </div>
                </div>

                <div className="flex w-full gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isLoading}
                    className="flex-1 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md text-slate-700 dark:text-slate-200 font-bold py-3.5 px-5 rounded-2xl transition-all disabled:opacity-50 cursor-pointer text-sm sm:text-base"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex-[2] bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black py-3.5 px-5 rounded-2xl transition-all shadow-xl shadow-blue-500/25 disabled:cursor-not-allowed cursor-pointer text-sm sm:text-base active:scale-[0.98]"
                  >
                    {isLoading ? "กำลังตั้งค่าระบบกิลด์..." : "ยืนยันสร้างกิลด์เลย ➔"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-linear-to-tr from-emerald-500 to-teal-500 text-white text-3xl shadow-lg shadow-emerald-500/30 mb-2 ring-4 ring-emerald-500/10 animate-bounce">
                    🎉
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    จัดตั้งกิลด์สำเร็จแล้ว!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    คัดลอกลิงก์คำเชิญด้านล่าง และส่งต่อให้สมาชิกเพื่อเข้าร่วมกิลด์ของคุณ
                  </p>
                </div>

                <div className="w-full bg-white/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/10 rounded-3xl p-5 sm:p-6 mt-2 shadow-inner backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <code className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-mono font-black break-all bg-white/80 dark:bg-slate-900/80 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 w-full sm:w-auto">
                      {inviteLink}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className={`shrink-0 w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer ${
                        copied
                          ? "bg-emerald-600 text-white shadow-emerald-600/30"
                          : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 shadow-slate-900/20"
                      }`}
                    >
                      {copied ? "✓ คัดลอกแล้ว" : "คัดลอกลิงก์"}
                    </button>
                  </div>
                </div>

                <div className="w-full pt-4">
                  <button
                    type="button"
                    onClick={handleGoToRegister}
                    className="w-full bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-xl shadow-blue-500/25 cursor-pointer text-sm sm:text-base active:scale-[0.98]"
                  >
                    เข้าสู่หน้าต่างกิลด์ของคุณ ➔
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}