import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

/**
 * Create a Supabase client for use in the browser
 * Manages authentication state through localStorage
 * Respects RLS policies based on user's authentication state
 * 
 * Usage in Client Components:
 * ```
 * 'use client'
 * const supabase = createClient()
 * const { data, error } = await supabase.from('profiles').select('*')
 * ```
 */
export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}