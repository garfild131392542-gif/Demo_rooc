import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/privacy-policy', '/api/auth/callback']
  const isInviteRoute = pathname.startsWith('/g/')
  const isBillingRoute = pathname.startsWith('/billing')
  const isPublicRoute = isInviteRoute || publicRoutes.some(route => pathname.startsWith(route)) || isBillingRoute
  
  const supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[MIDDLEWARE WARNING] Supabase environment variables not ready')
    return supabaseResponse
  }

  let user = null
  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Get the user securely — handle expired/invalid refresh tokens gracefully
    const { data, error: authError } = await supabase.auth.getUser()
    user = data?.user || null

    // ถ้า Refresh Token หมดอายุหรือถูก revoke ให้ sign out และ redirect ไป login ทันที
    if (authError && (
      authError.message?.includes('refresh_token_not_found') ||
      authError.message?.includes('Invalid Refresh Token') ||
      (authError as any).code === 'refresh_token_not_found'
    )) {
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.startsWith('sb-')) {
          response.cookies.delete(cookie.name)
        }
      })
      return response
    }
  } catch (authErr) {
    console.error('[MIDDLEWARE AUTH ERROR]', authErr)
  }

  // 1. If authenticated, prevent access to login/register routes and redirect to home
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. If authenticated, check profile and guild registration states
  // REFACTORED: Combined profile + guild trial check into a single fast JOIN query
  if (user && !pathname.startsWith('/guild-admin')) {
    try {
      const adminKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      const supabaseAdmin = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        adminKey,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options),
              )
            },
          },
        },
      )

      // Single fast JOIN query instead of 2 separate sequential DB roundtrips
      const { data: profile, error: profileError } = await (supabaseAdmin as any)
        .from('profiles')
        .select('guild_id, guilds:guild_id(trial_ends_at)')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Profile lookup error in middleware:', profileError)
        return supabaseResponse
      }

      const hasGuild = (profile as any)?.guild_id

      // Redirect out of onboarding if guild membership already exists
      if (pathname === '/onboarding' && hasGuild) {
        return NextResponse.redirect(new URL('/', request.url))
      }

      // Enforce onboarding workflow if guild setup is incomplete
      if (!hasGuild && !pathname.startsWith('/onboarding') && !pathname.startsWith('/profile-setup') && !isPublicRoute) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      // 3. Verify SaaS trial validity period if active guild is present
      if (hasGuild && !isPublicRoute && !pathname.startsWith('/onboarding')) {
        const guildData = (profile as any)?.guilds
        const trialEndsAtStr = Array.isArray(guildData) ? guildData[0]?.trial_ends_at : guildData?.trial_ends_at

        if (trialEndsAtStr) {
          const trialEndsAt = new Date(trialEndsAtStr)
          const now = new Date()

          if (now > trialEndsAt) {
            // จำกัดการเข้าใช้งานเฉพาะในส่วนการประมูลเมื่อหมดอายุ
            const isAuctionRoute = pathname.startsWith('/auction') || pathname.startsWith('/profile/history')
            if (isAuctionRoute) {
              return NextResponse.redirect(new URL('/billing', request.url))
            }
          }
        }
      }
    } catch (err) {
      console.error('Middleware error:', err)
    }
  }

  // 4. If unauthenticated and attempting private route access, enforce authentication
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
}