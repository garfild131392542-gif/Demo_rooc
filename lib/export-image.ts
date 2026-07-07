'use client'

import { toJpeg } from 'html-to-image'

// Check if browser is Safari (iOS or macOS)
export function isSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')
}

// Convert dataURL (base64) to Blob
export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

interface ExportOptions {
  quality?: number
  backgroundColor?: string
  pixelRatio?: number
}

/**
 * Captures an HTML element as JPEG and triggers download or native sharing.
 * Bypasses Safari's programmatic data URI download blocking and blank image bugs.
 */
export async function captureAndDownload(
  element: HTMLElement,
  filename: string,
  options: ExportOptions = {}
): Promise<void> {
  const quality = options.quality ?? 0.95
  const backgroundColor = options.backgroundColor ?? '#ffffff'
  const pixelRatio = options.pixelRatio ?? 2

  // 1. Warm-up passes for Safari (fixes blank images/delayed rendering)
  if (isSafari()) {
    try {
      // First pass to trigger rendering pipeline
      await toJpeg(element, { quality, backgroundColor, pixelRatio })
      await new Promise((resolve) => setTimeout(resolve, 150))
      // Second pass to ensure icons/images are loaded and painted
      await toJpeg(element, { quality, backgroundColor, pixelRatio })
      await new Promise((resolve) => setTimeout(resolve, 150))
    } catch (e) {
      console.warn('Safari pre-rendering warmups failed:', e)
    }
  }

  // 2. Final render pass
  const dataUrl = await toJpeg(element, {
    quality,
    backgroundColor,
    pixelRatio,
  })

  if (!dataUrl || dataUrl.length < 1000) {
    throw new Error('ภาพที่เรนเดอร์ไม่สมบูรณ์หรือว่างเปล่า')
  }

  const blob = dataURLtoBlob(dataUrl)

  // 3. Web Share API: Try native sharing if supported (great for iOS/Android Safari)
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare
  ) {
    const file = new File([blob], filename, { type: 'image/jpeg' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
        })
        return // Shared successfully
      } catch (shareError: any) {
        // If aborted by user, stop execution (don't fallback to standard download)
        if (shareError.name === 'AbortError') {
          return
        }
        console.error('Sharing failed, falling back to download:', shareError)
      }
    }
  }

  // 4. Fallback: Download via Blob URL (which is permitted in Safari)
  const blobUrl = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    
    // Safari-specific fallback to ensure it triggers or opens in a new tab if blocked
    if (isSafari()) {
      link.target = '_blank'
    }

    document.body.appendChild(link)
    link.click()

    // Clean up with a slight delay so browser can register the click
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    }, 300)
  } catch (downloadError) {
    console.error('Programmatic download failed, trying window.open:', downloadError)
    window.open(blobUrl, '_blank')
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  }
}
