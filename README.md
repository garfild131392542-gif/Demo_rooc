<div align="center">

# 🛡️ ROOC Guild Management System
### ระบบบริหารจัดการกำลังพล ผังจัดทัพ กระดานประมูล และกิจกรรมกิลด์
**ออกแบบและพัฒนาสำหรับกิลด์ในเกม Ragnarok Origin Classic (ROOC)**

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.4-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

<p align="center">
  <b>เว็บแอปพลิเคชันบริหารจัดการกิลด์แบบ All-in-One ครบวงจร</b><br>
  ช่วยให้หัวหน้ากิลด์และผู้ดูแลบริหารสมาชิก วางแผนจัดทัพแข่งขัน แจกจ่ายไอเทมประมูล และเช็คชื่อกิจกรรมได้อย่างมีประสิทธิภาพสูงสุด
</p>

</div>

---

## 🌟 จุดเด่นและฟีเจอร์หลัก (Key Features)

### 1. ⚔️ ระบบจัดทัพและวางแผนกลยุทธ์ (Tactical Board & Lineup)
* **รองรับ 3 กิจกรรมหลักแบบแยกผังอิสระ:**
  * 📂 **ทั่วไป (General P.1-16):** จัดทัพกิลด์วอร์ทั่วไป 16 ปาร์ตี้ (สูงสุด 80 คน)
  * 🏆 **Guild League (40v40):** ผังทัพลีก 8 ปาร์ตี้หลักสำหรับผู้เข้าแข่งขัน
  * 🏰 **Emperium Overrun (EO / Custom):** ผังทัพกิจกรรมพิเศษแบบกำหนดเอง
* **การแบ่งกลุ่มทีมอย่างชัดเจน:**
  * 🛡️ **ห้องหลัก (Main Team):** ปาร์ตี้ 1 ถึง 8
  * ⚔️ **ห้องรอง (Sub Team):** ปาร์ตี้ 9 ถึง 16
* **Drag & Drop Interactive:** ลากและวางสมาชิกสลับตำแหน่งได้อย่างอิสระ ลื่นไหล และบันทึกตำแหน่งแบบ Real-time
* **กระดานวางแผนรบ (Tactical Board):** วาดเส้นทางกลยุทธ์ลงบนแผนที่ปราสาท พร้อมระบบบันทึกเสียงบรรยายแผน (Voice Briefing)

---

### 2. 📊 ทำเนียบสมาชิกและวิเคราะห์กำลังพล (Leaderboard & Comparison)
* **ตารางจัดอันดับครบทุกมิติ (Leaderboard):**
  * คัดกรองและเรียงลำดับได้ตาม: `CP`, `PvP DMG (%)`, `PvP Reduc (%)`, `P.ATK`, `M.ATK`, `P.DEF`, `M.DEF`, `Max HP`, `Max SP`
  * แบ่งการแสดงผลเป็นตารางรายชื่อห้องหลักและห้องรองชัดเจน
* **⚔️ โหมดเปรียบเทียบตามสายอาชีพ (Comparison View):**
  * รวบรวมสมาชิกแยกเป็นการ์ดตาม 15 สายอาชีพ (Lord Knight, Paladin, Mastersmith, Bard, Gypsy, Sniper, ฯลฯ)
  * แสดงข้อมูลสเตตัสเปรียบเทียบในแต่ละสายอาชีพเพื่อให้เห็นจุดแข็ง-จุดอ่อนของทีมได้อย่างรวดเร็ว
* **🏆 แท่นเกียรติยศ (Hall of Fame):**
  * ยกย่องสมาชิกยอดเยี่ยมประจำกิลด์ (Gold, Silver, Bronze) พร้อมป้ายเกียรติยศ

---

### 3. 📸 ระบบส่งออกรูปภาพความละเอียดสูง (High-Resolution Image Export)
* **Export ผังทัพและผังสมาชิกเป็นภาพ JPEG:**
  * นำภาพไปแชร์ใน Discord, LINE หรือ Facebook Group ได้ทันที
* **รูปแบบภาพ 2 Section ชัดเจน:**
  * แยก Section ห้องหลัก (ปาร์ตี้ 1-8) และห้องรอง (ปาร์ตี้ 9-16)
  * แสดงการ์ดแยกตามสายอาชีพ 2 คอลัมน์ พร้อมตารางตัวละคร, เลขปาร์ตี้, CP, PvP DMG, PvP Reduc
* **Dual-Engine Export Technology:**
  * รองรับทั้ง `html-to-image` พร้อมตัวสำรองอัตโนมัติ `html2canvas` ป้องกันปัญหาภาพค้างหรือดาวน์โหลดไม่สำเร็จ

---

### 4. 📦 กระดานประมูลและคิวแจกจ่ายไอเทม (Guild Auction System)
* **ระบบจองคิวรับไอเทมประมูล:**
  * รองรับ Card Album, Puppet, White Feather, Red/Black Feather
* **ระบบจัดการรอบและคิวที่เป็นธรรม (Fairness Queue Progression):**
  * สมาชิกสามารถตรวจสอบ **"คิวประมูลของฉัน" (My Queues)** และ **"กระดานคิวของกิลด์" (Guild Board)**
  * แอดมินสามารถบันทึก แจกจ่ายไอเทม ปรับลำดับคิว และ Rollback ประวัติย้อนหลังได้อย่างปลอดภัย

---

### 5. 📅 ระบบเช็คชื่อกิจกรรมกิลด์ (Daily Attendance Management)
* **เช็คชื่อกิจกรรมประจำวัน:**
  * บันทึกสถานะการเข้าร่วมกิจกรรม (มา / สาย / ลา / ขาด)
* **สรุปสถิติรายบุคคลและรายกิลด์:**
  * ติดตามเปอร์เซ็นต์การเข้าร่วมกิจกรรมเพื่อใช้ประกอบการพิจารณาการลงแข่งขันและการจัดทัพ

---

### 6. 🤖 NPC Poring Assistant (AI ผู้ช่วยอัจฉริยะ)
* แชทบอท AI ประจำกิลด์ พัฒนาด้วย **Google Gemini API**
* ช่วยตอบคำถาม สอนการใช้งานระบบ แนะนำข้อจำกัดสเตตัส และช่วยเหลือสมาชิกกิลด์ตลอด 24 ชั่วโมง

---

## 🛠️ เทคโนโลยีที่ใช้ในการพัฒนา (Tech Stack)

| ส่วนประกอบ | เทคโนโลยีที่เลือกใช้ | รายละเอียด |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16.2.6 (App Router)** | รองรับ Turbopack, Server Components และ Server Actions |
| **Core Library** | **React 19.2.4** | สถาปัตยกรรม UI ยุคใหม่ เร็วและมีประสิทธิภาพสูง |
| **Language** | **TypeScript 5** | Type-safe 100% ตรวจสอบความถูกต้องตั้งแต่ตอนคอมไพล์ |
| **Styling** | **Tailwind CSS v4** | ดีไซน์ทันสมัยแบบ Glassmorphism พร้อมรองรับ Dark/Light Mode |
| **Backend & Database** | **Supabase (PostgreSQL)** | จัดเก็บข้อมูล, Authentication, Row Level Security (RLS) |
| **Realtime Sync** | **Supabase Realtime (WebSocket)** | อัปเดตผังปาร์ตี้และข้อมูลสเตตัสแบบเรียลไทม์โดยไม่ต้องรีเฟรช |
| **Data Fetching** | **TanStack Query (React Query v5)** | แคชข้อมูลฝั่ง Client-side เพื่อลดภาระการเรียกเซิร์ฟเวอร์ |
| **Interactive UX** | **@dnd-kit** | ระบบ Drag & Drop ที่รองรับทั้งเมาส์และหน้าจอสัมผัสบนมือถือ |
| **Image Generation** | **html-to-image + html2canvas** | เรนเดอร์ DOM ออกมาเป็นไฟล์รูปภาพ JPEG ความละเอียดสูง |
| **AI Assistant** | **Google Generative AI (Gemini)** | ระบบ AI ให้คำแนะนำสมาชิกและค้นหาข้อมูลภายในระบบ |
| **Hosting & Edge** | **Vercel (Fluid Compute)** | โฮสติ้งและ CDN ระดับสากล ปลอดภัยและตอบสนองรวดเร็ว |

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
Demo_rooc/
├── app/                           # Next.js App Router (หน้าเว็บและ API)
│   ├── (dashboard)/               # หน้าแดชบอร์ดหลัก
│   ├── actions/                   # Server Actions (auth, tactics, auction, attendance)
│   ├── admin-control/             # แผงควบคุมระบบสำหรับ System Admin
│   ├── api/                       # API Routes (AI chat, reset-leave cron)
│   ├── auction/                   # ระบบกระดานประมูลและคิวทรัพยากร
│   ├── members/                   # ทำเนียบสมาชิก, Leaderboard, และ Export
│   ├── profile/                   # หน้าโปรไฟล์ อัปเดตสเตตัส และประวัติคิว
│   └── tactics/                   # กระดานวางแผนจัดทัพ Drag & Drop
├── components/                    # คอมโพเนนต์ UI แบบแยกส่วน
│   ├── auction/                   # คอมโพเนนต์หน้ากระดานประมูล
│   ├── tactics/                   # แผนที่และบอร์ดจัดทัพ
│   ├── AttendanceManager.tsx      # ระบบเช็คชื่อกิจกรรม
│   ├── MemberExportModal.tsx      # โมดอลปรับแต่งและส่งออกรูปภาพผังทัพ
│   ├── Navbar.tsx                 # แถบเมนูด้านบนพร้อมตรวจเช็คสิทธิ์
│   └── PoringAssistant.tsx        # NPC AI แชทบอทผู้ช่วยประจำกิลด์
├── lib/                           # ฟังก์ชันช่วยเหลือและยูทิลิตี้
│   ├── export-image.ts            # โมดูลบันทึกรูปภาพความละเอียดสูง
│   ├── rate-limit.ts              # ระบบ Rate Limiting ป้องกัน DoS
│   └── supabase/                  # ไคลเอนต์เชื่อมต่อ Supabase (Client/Server)
├── public/                        # ไฟล์สเตติก (ไอคอนอาชีพ /icons/jobs, รูปภาพ, โลโก้)
├── types/                         # TypeScript Type Definitions
├── GEMINI.md                      # กฎควบคุมความปลอดภัยและโควตาทรัพยากร
└── next.config.ts                 # การตั้งค่า Next.js และ CDN Caching Headers
```

---

## 🚀 การติดตั้งและรันในเครื่อง (Local Development)

### 1. โคลนโปรเจกต์ (Clone Repository)
```bash
git clone https://github.com/garfild131392542-gif/Demo_rooc.git
cd Demo_rooc
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Environment Variables
สร้างไฟล์ `.env.local` ที่ Root ของโปรเจกต์ แล้วกรอกค่าคอนฟิกดังนี้:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini AI (Poring Assistant)
GEMINI_API_KEY_1=your_gemini_api_key_1
GEMINI_API_KEY_2=your_gemini_api_key_2

# Vercel Cron Secret (Optional for local)
CRON_SECRET=your_cron_secret_token
```

### 4. รันโหมด Development
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:3000` เพื่อเริ่มใช้งาน

### 5. ทดสอบการ Build สำหรับ Production
```bash
npm run build
```

---

## 🔒 นโยบายความปลอดภัยและการประหยัดทรัพยากร (Quota Protection)

ระบบได้รับการออกแบบให้ทำงานภายใต้ข้อจำกัดของ **Vercel Hobby Tier (ฟรี)** และ **Supabase Free Tier** อย่างคุ้มค่าสูงสุด:
1. **Immutable CDN Caching:** ไฟล์ภาพและไอคอนอาชีพทั้งหมด (`/icons/...`) ถูกแคชถาวรบน Edge CDN เพื่อไม่ให้สิ้นเปลือง Serverless CPU
2. **Event-Driven via WebSockets:** ใช้ Supabase Realtime รับส่งข้อมูลเฉพาะเมื่อมีการเปลี่ยนแปลงจริง แทนการยิง Polling ถี่ๆ
3. **Row Level Security (RLS):** ข้อมูลสมาชิกแต่ละกิลด์ถูกเข้ารหัสและแยกกั้นสิทธิ์อย่างเด็ดขาด ป้องกันการเข้าถึงข้อมูลข้ามกิลด์
4. **Automated Error Recovery:** มีระบบ `AutoVersionRefresh` ตรวจจับไฟล์อัปเดตเวอร์ชันใหม่บนมือถือและรีโหลดอย่างนุ่มนวล

---

<div align="center">
  <sub>Developed with ❤️ for Ragnarok Origin Classic (ROOC) Guilds.</sub>
</div>
