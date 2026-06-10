"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerAction } from "@/app/actions/register";
import { validatePassword, validatePasswordMatch } from "@/lib/validations";
import ReCAPTCHA from "react-google-recaptcha";

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  const hasTypedBoth = formData.password.length > 0 && formData.confirmPassword.length > 0;
  const isPasswordMatch = formData.password === formData.confirmPassword;

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setError(null);
  };

  const handleBlur = (field: string) => {
    let error = "";

    switch (field) {
      case "username":
        if (!formData.username.trim()) {
          error = "กรุณากรอกชื่อผู้ใช้งาน";
        } else if (formData.username.includes("@")) {
          error = "ชื่อผู้ใช้งานห้ามมีเครื่องหมาย @";
        }
        break;
      case "password":
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.valid && formData.password) {
          error = passwordValidation.error || "";
        }
        break;
      case "confirmPassword":
        const matchValidation = validatePasswordMatch(
          formData.password,
          formData.confirmPassword,
        );
        if (!matchValidation.valid && formData.confirmPassword) {
          error = matchValidation.error || "";
        }
        break;
    }

    if (error) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
    }
  };

  const isFormValid =
    formData.username.trim() &&
    !formData.username.includes("@") &&
    validatePassword(formData.password).valid &&
    validatePasswordMatch(formData.password, formData.confirmPassword).valid &&
    Object.keys(fieldErrors).length === 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!captchaToken) {
      setError("กรุณายืนยันว่าคุณไม่ใช่โปรแกรมอัตโนมัติ (CAPTCHA)");
      return;
    }

    if (!isFormValid) {
      setError("Please fix all errors before submitting");
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerAction(formData);

      if (!result.success) {
        setError(result.error || "Registration failed");
        setIsLoading(false);
        return;
      }

      router.push("/profile-setup");
    } catch (err) {
      console.error("Unexpected error during registration:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 backdrop-blur-md rounded-xl p-4 transition-all">
            <p className="text-sm font-medium text-red-200 text-center">{error}</p>
          </div>
        )}

        {/* 🌟 ช่องกรอก Username สไตล์ Liquid-Glass */}
        <div>
          <label htmlFor="username" className="block text-xs font-bold text-white uppercase tracking-wider mb-2 drop-shadow-sm">
            ชื่อผู้ใช้งาน
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            value={formData.username}
            onChange={handleInputChange}
            onBlur={() => handleBlur("username")}
            className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm"
            placeholder="ตั้งชื่อผู้ใช้งาน..."
            autoCapitalize="none"
            spellCheck={false}
          />
          {fieldErrors.username && <p className="mt-1.5 text-xs text-red-300 font-medium">{fieldErrors.username}</p>}
        </div>

        {/* 🌟 ช่องกรอก Password สไตล์ Liquid-Glass */}
        <div>
          <label htmlFor="password" className="block text-xs font-bold text-white uppercase tracking-wider mb-2 drop-shadow-sm">
            รหัสผ่าน
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={handleInputChange}
              onBlur={() => handleBlur("password")}
              className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white focus:outline-none p-1 text-xs font-bold transition-colors"
            >
              {showPassword ? "ซ่อน" : "แสดง"}
            </button>
          </div>
          {fieldErrors.password && <p className="mt-1.5 text-xs text-red-300 font-medium">{fieldErrors.password}</p>}
        </div>

        {/* 🌟 ช่องกรอก Confirm Password สไตล์ Liquid-Glass */}
        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-bold text-white uppercase tracking-wider mb-2 drop-shadow-sm">
            ยืนยันรหัสผ่าน
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={() => handleBlur("confirmPassword")}
              className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white focus:outline-none p-1 text-xs font-bold transition-colors"
            >
              {showConfirmPassword ? "ซ่อน" : "แสดง"}
            </button>
          </div>
          {fieldErrors.confirmPassword && <p className="mt-1.5 text-xs text-red-300 font-medium">{fieldErrors.confirmPassword}</p>}

          {/* ข้อความแจ้งเตือนรหัสผ่านตรงกัน */}
          {hasTypedBoth && (
            <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              {isPasswordMatch ? (
                <p className="text-xs font-semibold text-green-400 flex items-center gap-1 drop-shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  รหัสผ่านตรงกัน พร้อมใช้งาน
                </p>
              ) : (
                <p className="text-xs font-semibold text-red-300 flex items-center gap-1 drop-shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง
                </p>
              )}
            </div>
          )}
        </div>

        {/* 🌟 กล่อง reCAPTCHA แบบใส่กรอบกระจกเพื่อให้เข้ากับดีไซน์ */}
        <div className="flex justify-center mt-2">
          <div className="p-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-inner overflow-hidden hover:bg-black/50 transition-colors">
            <ReCAPTCHA
              sitekey="6LdoDxUtAAAAAFCw0hxJQuNZhbeNBMFWbbK6zI3V"
              onChange={(token) => setCaptchaToken(token)}
              theme="dark"
            />
          </div>
        </div>

        {/* 🌟 อัปเกรดปุ่มให้เข้ากับหน้า Login */}
        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="cursor-pointer group relative flex w-full justify-center rounded-xl bg-blue-600/80 px-4 py-3.5 text-sm font-bold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-70 transition-all shadow-lg backdrop-blur-sm mt-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              กำลังโหลด...
            </span>
          ) : (
            "สมัครสมาชิก"
          )}
        </button>
      </form>

      {/* 🌟 Modal Loading แบบกระจกเต็มจอ (สำหรับหน้า Register) */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex flex-col items-center bg-white/10 dark:bg-black/40 p-8 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-2xl">
            <svg className="h-14 w-14 animate-spin text-blue-500 mb-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="text-xl font-extrabold text-white tracking-widest drop-shadow-md">กำลังสมัครสมาชิก</h3>
            <p className="text-sm text-blue-200/80 mt-2">โปรดรอสักครู่ ระบบกำลังสร้างบัญชีของคุณ...</p>
          </div>
        </div>
      )}
    </>
  );
}