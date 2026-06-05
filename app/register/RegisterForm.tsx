"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormInput } from "@/components/FormInput";
import { registerAction } from "@/app/actions/register";
import {
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validatePasswordMatch,
} from "@/lib/validations";

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ แก้ไข: รวมและลบ State ที่ประกาศซ้ำออกเรียบร้อยครับ
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  // ✅ เติมตัวแปรเช็คความตรงกันแบบ Real-time ที่ขาดหายไปให้แล้วครับ
  const hasTypedBoth =
    formData.password.length > 0 && formData.confirmPassword.length > 0;
  const isPasswordMatch = formData.password === formData.confirmPassword;

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear field error when user starts typing
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
      case "phone":
        const phoneValidation = validatePhoneNumber(formData.phone);
        if (!phoneValidation.valid && formData.phone) {
          error = phoneValidation.error || "";
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
  formData.firstName.trim() &&
  formData.lastName.trim() &&
  validatePhoneNumber(formData.phone).valid &&
  formData.username.trim() &&            // 🌟 เช็คว่ากรอก Username หรือยัง
  !formData.username.includes("@") &&   // 🌟 เช็คว่าต้องไม่มีเครื่องหมาย @
  validatePassword(formData.password).valid &&
  validatePasswordMatch(formData.password, formData.confirmPassword).valid &&
  Object.keys(fieldErrors).length === 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

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

      // Redirect to profile setup
      router.push("/profile-setup");
    } catch (err) {
      console.error("Unexpected error during registration:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormInput
          label="ชื่อจริง"
          name="firstName"
          
          value={formData.firstName}
          onChange={handleInputChange}
          error={fieldErrors.firstName}
          required
        />
        <FormInput
          label="นามสกุล"
          name="lastName"
         
          value={formData.lastName}
          onChange={handleInputChange}
          error={fieldErrors.lastName}
          required
        />
      </div>

      <FormInput
        label="หมายเลขโทรศัพท์"
        name="phone"
        type="tel"
        
        value={formData.phone}
        onChange={handleInputChange}
        onBlur={() => handleBlur("phone")}
        error={fieldErrors.phone}
        required
      />

      <FormInput
        label="ชื่อผู้ใช้งาน (Username)"
        name="username"
        type="text" // 💡 เปลี่ยนเป็น text เพื่อใช้ล็อกอิน
        
        value={formData.username}
        onChange={handleInputChange}
        onBlur={() => handleBlur("username")}
        error={fieldErrors.username}
        required
      />

      {/* ช่องกรอกรหัสผ่านหลัก */}
      <div className="relative">
        <FormInput
          label="รหัสผ่าน"
          name="password"
          type={showPassword ? "text" : "password"}
          
          value={formData.password}
          onChange={handleInputChange}
          onBlur={() => handleBlur("password")}
          error={fieldErrors.password}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-9 text-sm font-medium text-slate-500 hover:text-slate-700 select-none cursor-pointer"
        >
          {showPassword ? "ซ่อน" : "แสดง"}
        </button>
      </div>

      {/* ช่องยืนยันรหัสผ่าน */}
      <div className="relative">
        <FormInput
          label="ยืนยันรหัสผ่าน"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          
          value={formData.confirmPassword}
          onChange={handleInputChange}
          onBlur={() => handleBlur("confirmPassword")}
          error={fieldErrors.confirmPassword}
          required
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute right-4 top-9 text-sm font-medium text-slate-500 hover:text-slate-700 select-none cursor-pointer"
        >
          {showConfirmPassword ? "ซ่อน" : "แสดง"}
        </button>

        {/* แสดงผลการตรวจสอบรหัสผ่านแบบ Real-time */}
        {hasTypedBoth && (
          <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {isPasswordMatch ? (
              <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
                <span></span> รหัสผ่านตรงกัน พร้อมใช้งาน
              </p>
            ) : (
              <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                <span>❌</span> รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        className="cursor-pointer w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors mt-2"
      >
        {isLoading ? "กำลังโหลด..." : "เริ่มต้นทดลองใช้งาน 14 วัน"}
      </button>
    </form>
  );
}
