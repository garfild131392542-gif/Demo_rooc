/**
 * ==========================================
 * 📢 ไฟล์ตั้งค่าการประกาศ (Announcement Config)
 * ==========================================
 * แก้ไขข้อมูลด้านล่างนี้เพื่ออัปเดตเนื้อหาใน Announcement Modal
 *
 * 👉 การแสดงผล Modal:
 *    - จะแสดง 1 ครั้ง/วัน ต่อผู้ใช้
 *    - เปลี่ยน `id` ทุกครั้งที่มีการอัปเดตประกาศใหม่
 *      เพื่อบังคับให้ Modal เด้งขึ้นมาอีกครั้ง แม้ผู้ใช้เคยปิดไปแล้ว
 */

export type AnnouncementItem = {
  /** ไอคอน emoji */
  icon: string
  /** หัวข้อย่อย */
  label: string
  /** รายละเอียด */
  detail: string
  /** สีประเภท: 'blue' | 'green' | 'yellow' | 'red' | 'purple' */
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  /**
   * (ไม่บังคับ) ลิงก์ YouTube สำหรับแสดง thumbnail preview
   * รองรับรูปแบบ:
   *   - https://youtu.be/VIDEO_ID
   *   - https://www.youtube.com/watch?v=VIDEO_ID
   */
  youtubeUrl?: string
}

export type Announcement = {
  /**
   * ID ที่ไม่ซ้ำกัน — เปลี่ยนทุกครั้งที่อัปเดตประกาศใหม่
   * แนะนำใช้วันที่ เช่น "2026-06-25" หรือ "v2.1.0"
   */
  id: string

  /** หัวข้อหลักของประกาศ */
  title: string

  /** คำอธิบายสั้นๆ ใต้หัวข้อ (ไม่บังคับ) */
  subtitle?: string

  /** รายการสิ่งที่อัปเดต */
  items: AnnouncementItem[]

  /** ข้อความท้าย modal (ไม่บังคับ) */
  footer?: string
}

// ============================================================
// ✏️ แก้ไขตรงนี้เพื่ออัปเดตประกาศ
// ============================================================
export const CURRENT_ANNOUNCEMENT: Announcement = {
  id: '2026-06-24-v2',      // ← เปลี่ยนทุกครั้งที่มีประกาศใหม่
  title: '📢 อัปเดตระบบล่าสุด',
  subtitle: 'มีการปรับปรุงและเพิ่มฟีเจอร์ใหม่ กรุณาอ่านรายละเอียดด้านล่าง',
  items: [
    {
      icon: '🤖',
      label: 'เชื่อมต่อบอท Discord ได้แล้ว!',
      detail: 'สามารถเชิญบอทเข้าเซิร์ฟเวอร์ Discord และตั้งค่า Channel ID ได้จากหน้า "ตั้งค่าบอท" ใน Guild Settings — ดูวิดีโอสอนตั้งค่าด้านล่างได้เลย',
      color: 'blue',
      youtubeUrl: 'https://youtu.be/Lo3N6FFQD0M?si=fV3CLspigDaLTUxa',
    },
    {
      icon: '💰',
      label: 'ปรับราคาแพ็กเกจ',
      detail: 'ราคาใหม่ 259 บาท / 30 วัน ใช้ฟีเจอร์ทุกอย่างได้เต็มรูปแบบ',
      color: 'green',
    },
    {
      icon: '🔒',
      label: 'แก้ไขระบบ Session',
      detail: 'ปรับปรุงการจัดการ Token ให้เสถียรขึ้น ลดการเกิด Error ขณะใช้งาน',
      color: 'yellow',
    },
  ],
  footer: 'ขอบคุณที่ใช้งานระบบครับ 🙏',
}
