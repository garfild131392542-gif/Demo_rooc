import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import NextTopLoader from 'nextjs-toploader';
import { getSession } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";

// 1. Import ตัวน้อง Poring เข้ามา (เปลี่ยนพาธให้ตรงกับที่คุณเซฟไฟล์ไว้นะครับ)
import PoringAssistant from "@/components/PoringAssistant";
import UpdateTicker from "@/components/UpdateTicker";
import AnnouncementModal from "@/components/AnnouncementModal";
import QueryProvider from "@/components/QueryProvider";
import { getActiveAnnouncementForGuild } from "@/app/actions/admin-guilds";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบจัดการสมาชิกกิลด์",
  description: "ROOC Management System By แมวส้ม",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const sessionAny = session as any;
  let primaryColor = "#3b82f6"; // Default Blue

  let activeAnnouncement = null;
  if (sessionAny?.profile?.guild_id) {
    try {
      activeAnnouncement = await getActiveAnnouncementForGuild(sessionAny.profile.guild_id);
    } catch (e) {
      console.error("Failed to fetch active announcement:", e);
    }
  }

  // Default theme color is fixed to blue (#3b82f6) as dynamic guild styling is disabled.

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body 
        style={{ '--guild-primary': primaryColor } as any}
        className="min-h-full flex flex-col text-slate-900 dark:text-slate-100 overflow-x-hidden"
      >
        <NextTopLoader
          color={primaryColor}       // ปรับแต่งสีของแถบโหลดให้เข้ากับตีมเว็บ
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}            // ความหนาของเส้น
          crawl={true}
          showSpinner={false}   // ตั้งเป็น false เพื่อซ่อนไอคอนโหลดหมุนๆ ด้านขวาบน
          easing="ease"
          speed={200}
          shadow={`0 0 10px ${primaryColor},0 0 5px ${primaryColor}`}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <Navbar />
            {session && <UpdateTicker />}
            <main className="flex-1">
              {children}
            </main>

            {/* 2. วางน้อง Poring ไว้ตรงนี้ครับ น้องจะลอยตามไปทุกๆ หน้า */}
            <PoringAssistant />

            {/* 3. Announcement Modal — เด้งวันละ 1 ครั้ง แจ้งเตือนอัปเดต (คอมเมนต์ออกตามคำสั่ง มีการส่งค่าประกาศแบบไดนามิกจาก DB) */}
            {/* {activeAnnouncement && <AnnouncementModal announcement={activeAnnouncement} />} */}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}