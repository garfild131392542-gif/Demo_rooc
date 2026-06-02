import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

/**
 * Create a Supabase client for use in Server Components
 * Uses the anon key which respects RLS policies
 * Manages authentication state through cookies
 * 
 * Usage in Server Components:
 * ```
 * const supabase = await createClient()
 * const { data, error } = await supabase.from('profiles').select('*')
 * ```
 */
export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient<Database>(
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
                        // Cookie operations in Server Components may fail silently
                        // This is expected behavior and safe to ignore
                    }
                },
            },
        }
    )
}

/**
 * Create an admin Supabase client with service role privileges
 * Bypasses RLS policies for administrative operations
 * IMPORTANT: Only use for backend admin operations that require elevated privileges
 * 
 * Usage:
 * ```
 * const supabase = await createAdminClient()
 * const { data, error } = await supabase.from('profiles').select('*')
 * ```
 * 
 * Security Note:
 * - This client bypasses RLS policies entirely
 * - Only use within Server Actions or API routes with proper authorization checks
 * - Never expose to client-side code
 */
export async function createAdminClient() {
    const cookieStore = await cookies()

    // Prefer service role key for admin operations, fallback to anon key
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    return createServerClient<Database>(
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
                        // Cookie operations in Server Components may fail silently
                    }
                },
            },
        }
    )
}