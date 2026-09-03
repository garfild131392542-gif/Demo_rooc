import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Public routes
  const publicRoutes = ['/login', '/register', '/forgot-password', '/privacy-policy', '/api/auth/callback']
  const isInviteRoute = pathname.startsWith('/g/')
  const isBillingRoute = pathname.startsWith('/billing')
  const isPublicRoute = isInviteRoute || publicRoutes.some(route => pathname.startsWith(route)) || isBillingRoute

  // 2. In-memory cookie session check
  const hasAuthCookie = request.cookies.getAll().some(
    cookie => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
  )

  // 3. Redirect unauthenticated users to /login
  if (!hasAuthCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
}

