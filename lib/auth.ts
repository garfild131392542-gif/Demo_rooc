import crypto from 'crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'rooc_session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function base64url(input: Buffer) {
  return input.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(stored: string, password: string) {
  if (!stored) return false
  const parts = stored.split(':')
  if (parts.length !== 2) return false
  const [salt, key] = parts
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'))
  } catch (e) {
    return false
  }
}

export function signSession(payload: Record<string, any>) {
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = base64url(Buffer.from(JSON.stringify(payload)))
  const signature = base64url(crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${body}`).digest())
  return `${header}.${body}.${signature}`
}

export function verifySession(token: string) {
  try {
    const [header, body, signature] = token.split('.')
    if (!header || !body || !signature) return null
    const expected = base64url(crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${body}`).digest())
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
    return payload
  } catch (e) {
    return null
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set({ name: COOKIE_NAME, value: '', path: '/', maxAge: 0 })
}

export async function getSessionPayloadFromCookie() {
  const cookieStore = await cookies()
  const c = cookieStore.get(COOKIE_NAME)
  if (!c) return null
  return verifySession(c.value)
}

export { COOKIE_NAME }
