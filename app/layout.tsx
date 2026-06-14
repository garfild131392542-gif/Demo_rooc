import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import NextTopLoader from 'nextjs-toploader';

// 1. Import ตัวน้อง Poring เข้ามา (เปลี่ยนพาธให้ตรงกับที่คุณเซฟไฟล์ไว้นะครับ)
import PoringAssistant from "@/components/PoringAssistant"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบจัดการสมาชิกกิล",
  description: "ROOC Management System By แมวส้ม",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-x-hidden">
        <NextTopLoader
          color="#007BFF"       // ปรับแต่งสีของแถบโหลดให้เข้ากับตีมเว็บ
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}            // ความหนาของเส้น
          crawl={true}
          showSpinner={false}   // ตั้งเป็น false เพื่อซ่อนไอคอนโหลดหมุนๆ ด้านขวาบน
          easing="ease"
          speed={200}
          shadow="0 0 10px #007BFF,0 0 5px #007BFF"
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          
          {/* 2. วางน้อง Poring ไว้ตรงนี้ครับ น้องจะลอยตามไปทุกๆ หน้า */}
          <PoringAssistant />
          
        </ThemeProvider>
      </body>
    </html>
  );
}