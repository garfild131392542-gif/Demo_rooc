import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// สังเกตว่าเราต้องเพิ่ม async เข้าไปที่ฟังก์ชันนี้
export async function createClient() {
    // เพิ่ม await เพื่อรอให้ cookies ทำงานเสร็จ
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch (error) {
                        // โค้ดนี้ถูกเรียกใช้ใน Server Component จึงข้าม error ไปได้เลย
                    }
                },
            },
        }
    )
}

export async function createAdminClient() {
    const cookieStore = await cookies()

    // Using service role key if available to bypass RLS for admin operations
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        adminKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch (error) {
                    }
                },
            },
        }
    )
}