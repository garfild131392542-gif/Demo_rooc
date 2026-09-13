/**
 * Utility to get the dynamic base URL of the application.
 * - On the client: returns window.location.origin (e.g. https://rooc-manage.xyz)
 * - On the server: checks NEXT_PUBLIC_APP_URL -> Vercel Production URL -> Vercel URL -> default fallback
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'https://rooc-manage.xyz'
}
