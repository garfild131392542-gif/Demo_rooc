import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('auth_session')?.value
  const { pathname } = request.nextUrl

  // Check if session exists
  let session = null
  if (sessionCookie) {
    try {
      const jsonStr = Buffer.from(sessionCookie, 'base64').toString('utf-8')
      session = JSON.parse(jsonStr)
    } catch (e) {
      session = null
    }
  }

  // 1. Redirect to /login if no auth cookie exists (except /login itself)
  if (!session && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Redirect away from /login if already logged in
  if (session && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 3. Redirect to / if a user with role 'member' tries to access /admin/*
  if (session && pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
