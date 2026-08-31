import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // 1. เส้นทางสาธารณะที่เปิดให้ทุกคนเข้าได้โดยไม่ต้องล็อกอิน
    const publicRoutes = ['/login', '/register', '/forgot-password', '/privacy-policy', '/api/auth/callback']
    const isInviteRoute = pathname.startsWith('/g/')
    const isBillingRoute = pathname.startsWith('/billing')
    const isPublicRoute = isInviteRoute || publicRoutes.some(route => pathname.startsWith(route)) || isBillingRoute

    // 2. เช็ค Session Cookie ของ Supabase โดยตรง (In-Memory Check เร็วระดับ 0.01ms ปลอดภัย ไม่ต้องต่อเน็ตให้ค้าง)
    const hasAuthCookie = request.cookies.getAll().some(
      cookie => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
    )

    // 3. ถ้ายังไม่ล็อกอิน และพยายามเข้าหน้าส่วนตัว -> ดีดไปหน้า /login ทันที
    if (!hasAuthCookie && !isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // 4. ถ้าล็อกอินแล้ว แต่พยายามเข้าหน้า /login หรือ /register -> ดีดกลับไปหน้าแรก /
    if (hasAuthCookie && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
  } catch (err) {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
}