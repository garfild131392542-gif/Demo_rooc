import { getSession } from '@/app/actions/auth'
import NavbarClient from './NavbarClient'

export default async function Navbar() {
  const session = await getSession()
  if (!session) return null

  // โยนข้อมูล session ไปให้ Navbar ฝั่ง Client จัดการต่อ
  return <NavbarClient session={session} />
}