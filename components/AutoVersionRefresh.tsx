'use client'

import { useEffect } from 'react'

export default function AutoVersionRefresh() {
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const message =
        'message' in event
          ? event.message
          : (event as PromiseRejectionEvent).reason?.message || ''

      const isChunkFailed =
        /Loading chunk [\d]+ failed|ChunkLoadError|Failed to fetch dynamically imported module/i.test(
          message
        )

      if (isChunkFailed) {
        const lastReload = sessionStorage.getItem('last_chunk_reload_ts')
        const now = Date.now()

        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem('last_chunk_reload_ts', now.toString())
          window.location.reload()
        }
      }
    }

    window.addEventListener('error', handleChunkError)
    window.addEventListener('unhandledrejection', handleChunkError)

    return () => {
      window.removeEventListener('error', handleChunkError)
      window.removeEventListener('unhandledrejection', handleChunkError)
    }
  }, [])

  return null
}

