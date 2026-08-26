import Link from 'next/link'
import { Shield, Lock, Eye, Cookie, Server, Database, UserCheck, Mail, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว (Privacy Policy) | ROOC Guild Management',
  description: 'นโยบายการคุ้มครองข้อมูลส่วนบุคคลและการใช้คุกกี้สำหรับระบบจัดการกิลด์ ROOC',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          >
            <ArrowLeft size={16} />
            <span>กลับสู่หน้าหลัก</span>
          </Link>
        </div>

        {/* Header Title */}
        <header className="mb-10 text-center sm:text-left border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 text-xs font-bold mb-4">
            <Shield size={14} />
            <span>นโยบายการคุ้มครองข้อมูลส่วนบุคคล & คุกกี้ (PDPA Compliance)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
            นโยบายความเป็นส่วนตัว (Privacy Policy)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            มีผลบังคับใช้ตั้งแต่วันที่: 26 สิงหาคม 2569 | ปรับปรุงล่าสุดเพื่อความโปร่งใสและสอดคล้องกับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </p>
        </header>

        {/* Content Sections */}
        <div className="space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed text-sm">

          {/* Section 1 */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100 font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <Eye size={18} />
              </span>
              <h2>1. บทนำและวัตถุประสงค์ (Introduction & Scope)</h2>
            </div>
            <p>
              ยินดีต้อนรับสู่ระบบบริหารจัดการกิลด์ <strong>ROOC Management System</strong> ("ระบบ", "เว็บไซต์", "เรา") 
              เราให้ความสำคัญอย่างยิ่งต่อการคุ้มครองข้อมูลส่วนบุคคลและความเป็นส่วนตัวของสมาชิกกิลด์และผู้ใช้งานทุกคน ("ผู้ใช้งาน", "ท่าน") 
              นโยบายฉบับนี้จัดทำขึ้นเพื่อชี้แจงประเภทของข้อมูลที่เรารวบรวม วัตถุประสงค์ในการนำข้อมูลไปใช้ มาตรการรักษาความปลอดภัย 
              ตลอดจนสิทธิของท่านตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100 font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                <Database size={18} />
              </span>
              <h2>2. ข้อมูลส่วนบุคคลที่เราจัดเก็บ (Information We Collect)</h2>
            </div>
            <p>เราจะจัดเก็บข้อมูลเท่าที่จำเป็นสำหรับการใช้งานฟังก์ชันต่างๆ ของระบบกิลด์เท่านั้น ได้แก่:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong>ข้อมูลบัญชีผู้ใช้งาน (Account Information):</strong> ชื่อผู้ใช้งาน (Username), ที่อยู่อีเมลหรือ Virtual Email สำหรับการเข้าสู่ระบบ, รหัสผ่าน (ซึ่งจะถูกเข้ารหัส Hashing อย่างปลอดภัย)
              </li>
              <li>
                <strong>ข้อมูลตัวละครและเกม (Game Character Data):</strong> หมายเลขประจำตัวในเกม (UID Game), ชื่อตัวละคร (Display Name), สายอาชีพ, ค่าสเตตัสในเกม (เช่น HP, ATK, DEF, ค่าพลังต่อสู้), รูปภาพตัวละคร (Character Showcase), และสังกัดกิลด์
              </li>
              <li>
                <strong>ข้อมูลกิจกรรมและระบบกิลด์ (Guild Activities):</strong> บันทึกการจัดปาร์ตี้กิลด์วอร์, ข้อมูลการจองคิวประมูลไอเทม, ยอดโควตาการรับไอเทมในรอบ และประวัติการโอนสิทธิ์
              </li>
              <li>
                <strong>ข้อมูลการชำระเงินค่าบริการกิลด์ (Billing & Payments):</strong> สำหรับหัวหน้ากิลด์ที่ต่ออายุระบบ เราจะจัดเก็บรูปภาพสลิปการโอนเงิน, รหัสอ้างอิงธุรกรรมธนาคาร (Transaction Reference), และชื่อผู้โอนเงิน เพื่อตรวจสอบความถูกต้องของการชำระเงิน
              </li>
              <li>
                <strong>ข้อมูลทางเทคนิค (Technical Logs):</strong> ที่อยู่ไอพี (IP Address) แบบย่อส่วนและบันทึกเวลาชั่วคราว สำหรับการป้องกันการโจมตีระบบ (Rate Limiting / Anti-Brute Force)
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100 font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <UserCheck size={18} />
              </span>
              <h2>3. วัตถุประสงค์ในการประมวลผลข้อมูล (Purpose of Data Use)</h2>
            </div>
            <p>เรานำข้อมูลของท่านไปใช้เพื่อวัตถุประสงค์ที่ชอบด้วยกฎหมาย ดังต่อไปนี้:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-750">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs mb-1">🎮 การบริหารจัดการกิลด์</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">จัดปาร์ตี้กิลด์วอร์ แสดงทำเนียบสมาชิก และเช็คสถานะการลากิจ</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-750">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs mb-1">⚖️ การจัดสรรคิวประมูลที่เป็นธรรม</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">คำนวณคิวประมูลไอเทมรายวัน และติดตามโควตารอบแบบโปร่งใส</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-750">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs mb-1">🔒 ความปลอดภัยและการยืนยันตัวตน</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">ตรวจสอบสิทธิ์การเข้าถึงระหว่างสมาชิกและผู้ดูแลระบบกิลด์</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-750">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs mb-1">🤖 ระบบผู้ช่วยประจำกิลด์ (AI)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">ให้บริการตอบคำถามและคู่มือการใช้งานผ่าน NPC Poring Assistant</p>
              </div>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2">
              🛡️ คำมั่นสัญญา: เราไม่มีนโยบายจำหน่าย แลกเปลี่ยน หรือส่งต่อข้อมูลส่วนบุคคลของท่านไปยังบุคคลภายนอกเพื่อการโฆษณาหรือการตลาดเชิงพาณิชย์โดยเด็ดขาด
            </p>
          </section>

          {/* Section 4 */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100 font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <Cookie size={18} />
              </span>
              <h2>4. นโยบายการใช้คุกกี้ (Cookie Policy)</h2>
            </div>
            <p>
              เว็บไซต์ของเราใช้เฉพาะ <strong>"คุกกี้ที่มีความจำเป็นอย่างยิ่ง" (Strictly Necessary Cookies)</strong> ซึ่งจำเป็นต่อการให้บริการและการทำงานของเว็บไซต์:
            </p>
            <div className="space-y-2.5 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-750">
                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">Authentication Session Cookies</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ใช้สำหรับการรักษาเซสชันการเข้าสู่ระบบอย่างปลอดภัย เพื่อให้ท่านไม่ต้องกรอกรหัสผ่านซ้ำในทุกหน้าที่เข้าชม
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-750">
                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">Theme Preference Storage</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  จดจำการตั้งค่าหน้าจอแบบสว่าง (Light Mode) หรือมืด (Dark Mode) ตามความพึงพอใจของท่าน
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              * เว็บไซต์นี้<strong>ไม่มีการใช้คุกกี้เพื่อการติดตามข้ามเว็บไซต์ (Cross-site Tracking) หรือคุกกี้เครือข่ายโฆษณา</strong>ใดๆ ทั้งสิ้น
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100 font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                <Server size={18} />
              </span>
              <h2>5. ผู้ให้บริการภายนอกที่ร่วมประมวลผลข้อมูล (Third-Party Services)</h2>
            </div>
            <p>เพื่อประสิทธิภาพในการให้บริการ เรามีการเชื่อมต่อกับผู้ให้บริการโครงสร้างพื้นฐานระดับมาตรฐานสากล:</p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-xs sm:text-sm">
              <li>
                <strong>Supabase (Cloud Database & Authentication):</strong> ใช้สำหรับจัดเก็บฐานข้อมูลและระบบการยืนยันตัวตนที่มีการเข้ารหัสความปลอดภัยสูง
              </li>
              <li>
                <strong>Google Generative AI (Gemini Flash):</strong> ใช้สำหรับการประมวลผลข้อความคำถามเพื่อตอบข้อสงสัยการใช้งานระบบผ่าน NPC Poring Assistant
              </li>
              <li>
                <strong>SlipOK (API ตรวจสอบสลิปธนาคาร):</strong> ใช้สำหรับการตรวจสอบความถูกต้องของสลิปโอนเงิน PromptPay ในการต่ออายุแพ็กเกจกิลด์
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100 font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
                <Lock size={18} />
              </span>
              <h2>6. การรักษาความปลอดภัยของข้อมูล (Data Security)</h2>
            </div>
            <p>
              เราใช้มาตรการทางเทคนิคและการบริหารจัดการที่รัดกุมเพื่อปกป้องข้อมูลส่วนบุคคลของท่านจากการเข้าถึงโดยไม่ได้รับอนุญาต การสูญหาย หรือการดัดแปลงแก้ไข:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm">
              <li>การเข้ารหัสการสื่อสารข้อมูลทั้งหมดด้วยมาตรฐาน <strong>HTTPS (SSL/TLS 256-bit)</strong></li>
              <li>การจัดเก็บรหัสผ่านด้วยกระบวนการเข้ารหัสทางเดียว (Secure Cryptographic Hash)</li>
              <li>ระบบแบ่งแยกสิทธิ์ตามบทบาท (Role-Based Access Control) กั้นข้อมูลระหว่างกิลด์อย่างเด็ดขาด</li>
              <li>การจำกัดความถี่ในการเข้าถึง (Rate Limiting) เพื่อป้องกันการโจมตีแบบ Brute Force</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100 font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400">
                <Shield size={18} />
              </span>
              <h2>7. สิทธิของท่านตามกฎหมาย PDPA (Your Legal Rights)</h2>
            </div>
            <p>ในฐานะเจ้าของข้อมูลส่วนบุคคล ท่านมีสิทธิในการดำเนินการดังต่อไปนี้:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm">
              <li><strong>สิทธิในการเข้าถึง:</strong> ตรวจสอบข้อมูลส่วนตัวและข้อมูลตัวละครของตนเองผ่านหน้า Profile</li>
              <li><strong>สิทธิในการแก้ไข:</strong> อัปเดตข้อมูลสเตตัส ชื่อตัวละคร หรือรูปภาพให้เป็นปัจจุบันได้ตลอดเวลา</li>
              <li><strong>สิทธิในการขอลบข้อมูล:</strong> ขอให้ลบบัญชีผู้ใช้ หรือออกจากกิลด์เมื่อสิ้นสุดความจำเป็น</li>
              <li><strong>สิทธิในการเพิกถอนความยินยอม:</strong> ยกเลิกการใช้งานหรือลากิจจากการเข้าร่วมกิจกรรมกิลด์</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100 font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
                <Mail size={18} />
              </span>
              <h2>8. การติดต่อผู้ดูแลระบบ (Contact Information)</h2>
            </div>
            <p>
              หากท่านมีข้อสงสัย ข้อเสนอแนะ หรือประสงค์จะใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคลของท่าน สามารถติดต่อหัวหน้ากิลด์ของท่าน 
              หรือติดต่อทีมผู้พัฒนาระบบ ROOC Management System ได้ผ่านช่องทางที่ระบุไว้ในหน้าระบบ หรือติดต่อผ่าน Discord ประจำกิลด์ของท่านครับ
            </p>
          </section>

        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center border-t border-slate-200 dark:border-slate-800 pt-8 pb-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} ROOC Management System. สงวนลิขสิทธิ์ทุกประการ.
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs font-bold text-blue-600 dark:text-blue-400">
            <Link href="/" className="hover:underline">หน้าหลัก</Link>
            <span>•</span>
            <Link href="/login" className="hover:underline">เข้าสู่ระบบ</Link>
            <span>•</span>
            <Link href="/privacy-policy" className="hover:underline">นโยบายความเป็นส่วนตัว</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
