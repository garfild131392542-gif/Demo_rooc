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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-gray-950/20 transition-colors duration-300">
      <div className="w-full max-w-2xl bg-white p-8 md:p-12 rounded-3xl border border-slate-100 shadow-xl dark:bg-gray-900 dark:border-gray-800 transition-all duration-300">
        
        {/* Progress Section */}
        <div className="mb-2 border-b border-slate-100 pb-8 dark:border-gray-800">
          <ProgressBar currentStep={currentStep} totalSteps={3} />
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4 mb-8 animate-in fade-in duration-200 text-center font-medium">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        
        {/* STEP 1: Guild Info */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-300 relative">
            <div className="mb-2">
              <h1 className="text-2xl font-extrabold text-gray-950 dark:text-white tracking-tight">
                ลงทะเบียนข้อมูลกิลด์
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                กรุณาระบุชื่อและตั้งค่าลิงก์ URL สำหรับหน้าต่างกิลด์ของคุณ
              </p>
            </div>

            <FormInput
              label="ชื่อกิลด์"
              name="guildName"
              value={formData.guildName}
              onChange={handleInputChange}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="guildUrl"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                ลิงก์กิลด์ (Guild URL) <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-xl shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all">
                <span className="inline-flex items-center bg-slate-50 dark:bg-gray-700 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 select-none border-r border-gray-200 dark:border-gray-600">
                  {appUrl.replace(/https?:\/\//, "")}/g/
                </span>
                <input
                  id="guildUrl"
                  name="guildUrl"
                  type="text"
                  value={formData.guildUrl}
                  onChange={handleGuildUrlChange}
                  required
                  className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-sm font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs mt-1.5 min-h-[18px]">
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
                    <span className="text-red-500 dark:text-red-400 font-bold flex items-center gap-1">
                      ❌ ลิงก์นี้ถูกผู้อื่นใช้งานไปแล้ว
                    </span>
                  )}
              </div>
            </div>

            <FormTextarea
              label="รายละเอียดกิลด์"
              name="guildDescription"
              value={formData.guildDescription}
              onChange={handleInputChange}
              rows={5}
            />

            {/* 🌟 ปรับปรุงโซนปุ่มกดใน Step 1 ให้มีปุ่มย้อนกลับไปหน้าตั้งหลักหลัก */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push("/profile-setup")}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-white font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer text-base text-center"
              >
                ⬅ ย้อนกลับ
              </button>
              
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  !guildUrlStatus.available || !formData.guildName.trim()
                }
                className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-gray-700 disabled:text-slate-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md disabled:cursor-not-allowed cursor-pointer text-base"
              >
                ขั้นตอนถัดไป ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Contact Info */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="mb-2">
              <h1 className="text-2xl font-extrabold text-gray-950 dark:text-white tracking-tight">
                ข้อมูลการติดต่อ
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                ระบุอีเมลสำหรับจัดการระบบ และลิงก์โซเชียลมีเดีย (ถ้ามี)
              </p>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-inner">
              <FormInput
                label="อีเมลติดต่อจริง"
                name="contactEmail"
                type="email"
                placeholder="เช่น your_email@gmail.com"
                value={formData.contactEmail}
                onChange={handleInputChange}
                required
              />
              <div className="flex gap-2 mt-2.5 items-start text-emerald-800 dark:text-emerald-300">
                <span className="text-base mt-0.5">💡</span>
                <p className="text-xs font-medium leading-relaxed">
                  จำเป็นสำหรับการจัดการระบบ, ข้อมูลการต่ออายุแพลตฟอร์ม
                  หรือกู้คืนระบบกรณีฉุกเฉิน (ข้อมูลนี้จะไม่ถูกเปิดเผยต่อสาธารณะ)
                </p>
              </div>
            </div>

            <FormInput
              label="ลิงก์ Discord ของกิลด์"
              name="discordLink"
              type="url"
              placeholder="https://discord.gg/your-guild"
              value={formData.discordLink}
              onChange={handleInputChange}
            />

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleBack}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-white font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer text-base"
              >
                ⬅ ย้อนกลับ
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md cursor-pointer text-base"
              >
                ขั้นตอนถัดไป ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Success Screen */}
        {currentStep === 3 && (
          <div className="flex flex-col gap-6 items-center py-4 animate-in zoom-in-95 duration-300 relative">
            {!inviteLink ? (
              <>
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-extrabold text-gray-950 dark:text-white tracking-tight">
                    ตรวจสอบข้อมูลระบบกิลด์
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    กรุณาตรวจสอบข้อมูลด้านล่างให้ถูกต้องก่อนยืนยันการจัดตั้งระบบกิลด์ของคุณ
                  </p>
                </div>

                <div className="w-full max-w-md bg-slate-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-slate-100 dark:border-gray-800/80 space-y-3.5 text-sm">
                  <div className="flex justify-between items-start border-b border-slate-200/60 pb-2 dark:border-gray-700/60">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">ชื่อกิลด์:</span>
                    <span className="text-gray-950 dark:text-white font-bold text-right">{formData.guildName}</span>
                  </div>

                  <div className="flex justify-between items-start border-b border-slate-200/60 pb-2 dark:border-gray-700/60">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">ลิงก์กิลด์ (URL):</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono font-semibold text-right">/g/{formData.guildUrl}</span>
                  </div>

                  <div className="flex justify-between items-start border-b border-slate-200/60 pb-2 dark:border-gray-700/60">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">อีเมลติดต่อ:</span>
                    <span className="text-gray-950 dark:text-white font-medium text-right">{formData.contactEmail}</span>
                  </div>

                  {formData.discordLink && (
                    <div className="flex justify-between items-start border-b border-slate-200/60 pb-2 dark:border-gray-700/60">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">ลิงก์ Discord:</span>
                      <span className="text-gray-950 dark:text-white font-medium truncate max-w-[220px] text-right font-mono text-xs">{formData.discordLink}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">รายละเอียดกิลด์:</span>
                    <p className="text-gray-700 dark:text-gray-300 text-xs bg-white dark:bg-gray-900 p-3 rounded-xl border border-slate-200/50 dark:border-gray-800 break-words max-h-24 overflow-y-auto leading-relaxed">
                      {formData.guildDescription || "- ไม่ได้ระบุข้อมูลรายละเอียด -"}
                    </p>
                  </div>
                </div>

                <div className="flex w-full gap-4 pt-2 max-w-md">
                  <button
                    onClick={handleBack}
                    disabled={isLoading}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-white font-bold py-3 px-5 rounded-xl transition-all disabled:opacity-50 cursor-pointer text-sm"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-md disabled:cursor-not-allowed cursor-pointer text-sm"
                  >
                    {isLoading ? "กำลังตั้งค่าระบบกิลด์..." : "ยืนยันสร้างกิลด์เลย"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-extrabold text-gray-950 dark:text-white tracking-tight">
                    จัดตั้งกิลด์สำเร็จแล้ว!
                  </h2>
                  <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    คัดลอกลิงก์คำเชิญด้านล่าง และส่งต่อให้สมาชิกเพื่อเข้าร่วมกิลด์
                  </p>
                </div>

                <div className="w-full bg-slate-50 dark:bg-gray-800/60 border border-slate-200/60 dark:border-gray-700 rounded-2xl p-6 mt-2 shadow-inner max-w-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <code className="text-sm text-blue-700 dark:text-blue-400 font-mono font-bold break-all bg-white dark:bg-gray-900 px-3 py-1.5 rounded-md border dark:border-gray-700">
                      {inviteLink}
                    </code>
                    <button
                      onClick={handleCopyInviteLink}
                      className={`shrink-0 w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm cursor-pointer ${
                        copied
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                      }`}
                    >
                      {copied ? "✓ คัดลอกแล้ว" : "คัดลอกลิงก์"}
                    </button>
                  </div>
                </div>

                <div className="w-full pt-6 max-w-md">
                  <button
                    onClick={handleGoToRegister}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md cursor-pointer text-base"
                  >
                    เข้าสู่ระบบหน้าต่างกิลด์ของคุณ ➔
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