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

  // 1. If authenticated, prevent access to login/register routes and redirect to home
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. If authenticated, check profile and guild registration states
  // REFACTORED: Changed path bypass from '/admin' to '/guild-admin' to match folder structure
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

      // Fetch profile to verify guild association
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