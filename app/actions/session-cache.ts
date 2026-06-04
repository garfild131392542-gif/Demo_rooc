'use server'

import { getSession as baseGetSession } from './auth'
import { cache } from 'react'

// ใช้ฟังก์ชัน cache ของ React เพื่อป้องกันการ Query Database ซ้ำซ้อน
export const getSessionCached = cache(async () => {
  return await baseGetSession()
})

// ฟังก์ชันทางลัดสำหรับดึงแค่ User ID แบบติด Cache
export const getCurrentUserId = cache(async () => {
  const session = await getSessionCached()
  return session?.user?.id ?? null
})

// ฟังก์ชันทางลัดสำหรับดึงแค่ Guild ID แบบติด Cache
export const getCurrentGuildId = cache(async () => {
  const session = await getSessionCached()
  return (session as any)?.profile?.guild_id ?? null
})