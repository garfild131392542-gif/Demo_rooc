import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/api/auth/callback']
  const isInviteRoute = pathname.startsWith('/g/')
  const isBillingRoute = pathname.startsWith('/billing')
  const isPublicRoute = isInviteRoute || publicRoutes.some(route => pathname.startsWith(route)) || isBillingRoute
  
  const supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Get the user securely
  const { data: { user } } = await supabase.auth.getUser()

  // 1. ถ้าล็อกอินแล้ว (มี user) แต่พยายามเข้าหน้า login/register ให้เตะไปหน้า Dashboard หรือ Home
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url)) // แนะนำให้เด้งไป Dashboard ครับ
  }

  // 2. ถ้าล็อกอินแล้ว (มี user) ให้เช็คสถานะกิลด์/โปรไฟล์
  if (user && !pathname.startsWith('/admin')) {
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

      // ดึงโปรไฟล์เพื่อเช็ค guild_id
      const { data: profile, error: profileError } = await (supabaseAdmin as any)
        .from('profiles')
        .select('guild_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Profile lookup error in middleware:', profileError)
        return supabaseResponse
      }

      const hasGuild = (profile as any)?.guild_id

      // ถ้าอยู่หน้า /onboarding แต่มีกิลด์+โปรไฟล์แล้ว ให้ข้ามไป /dashboard เลย
      if (pathname === '/onboarding' && hasGuild) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // 🛑 ป้องกันลูปนรก: ถ้ายังไม่มีโปรไฟล์/กิลด์ บังคับไป /onboarding 
      // (แต่ต้องอนุญาตให้เข้าหน้า /profile-setup ได้ด้วย เพื่อให้ฟอร์มทำงานต่อได้)
      if (!hasGuild && !pathname.startsWith('/onboarding') && !pathname.startsWith('/profile-setup') && !isPublicRoute) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      // 3. เช็ควันหมดอายุ Trial (ทำต่อเมื่อมีกิลด์แล้ว)
      if (hasGuild && !isPublicRoute && !pathname.startsWith('/onboarding')) {
        try {
          const { data: guild } = await (supabaseAdmin as any)
            .from('guilds')
            .select('trial_ends_at')
            .eq('id', (profile as any)?.guild_id)
            .maybeSingle()

          if (guild?.trial_ends_at) {
            const trialEndsAt = new Date(guild.trial_ends_at)
            const now = new Date()

            if (now > trialEndsAt) {
              return NextResponse.redirect(new URL('/billing', request.url))
            }
          }
        } catch (trialError) {
          console.error('Trial check error:', trialError)
        }
      }
    } catch (err) {
      console.error('Middleware error:', err)
    }
  }

  // 4. ถ้ายังไม่ได้ล็อกอิน และจะเข้าหน้า Private ให้เตะไปหน้า login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}