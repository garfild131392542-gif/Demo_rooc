import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/api/auth/callback']
  const isInviteRoute = pathname.startsWith('/g/')
  const isPublicRoute = isInviteRoute || publicRoutes.some(route => pathname.startsWith(route))
  
  // Try to get the session
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

  // Get the session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Logic:
  // 1. If user is authenticated and tries to access /login or /register, redirect to /
  if (session && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. If user is authenticated but has NO guild yet, redirect to /onboarding
  if (session && !pathname.startsWith('/onboarding')) {
    try {
      const adminKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      const supabaseAdmin = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        adminKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options),
              )
            },
          },
        },
      )

      const { data: profile } = await (supabaseAdmin as any)
        .from('profiles')
        .select('guild_id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!(profile as any)?.guild_id) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    } catch {
      // If guild_id check fails for any reason, avoid blocking the request.
    }
  }

  // 2. If user is NOT authenticated and tries to access protected routes, redirect to /register
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/register', request.url))
  }

  // 3. Refresh the session cookie on every request (as per Supabase SSR best practices)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
