'use client'

import { toJpeg } from 'html-to-image'

// Check if browser is Safari (iOS or macOS)
export function isSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')
}

// Check if user is on a mobile device
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
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
  width?: number
  height?: number
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

  // Temporarily resize element in the DOM to let the browser compute layout styles for the requested size
  const originalWidth = element.style.width
  const originalHeight = element.style.height
  const originalMinWidth = element.style.minWidth
  const originalMinHeight = element.style.minHeight
  const originalMaxWidth = element.style.maxWidth
  const originalMaxHeight = element.style.maxHeight
  const originalFlex = element.style.flex

  // If width is specified, temporarily set it before measuring computed height
  if (options.width) {
    element.style.setProperty('width', `${options.width}px`, 'important')
    element.style.setProperty('min-width', `${options.width}px`, 'important')
    element.style.setProperty('max-width', `${options.width}px`, 'important')
    element.style.setProperty('flex', 'none', 'important')
  }

  // Auto-calculate height if not provided but width is present (retains desktop layout on mobile viewports)
  const computedHeight = options.height ?? (options.width ? element.offsetHeight : undefined)

  if (computedHeight) {
    element.style.setProperty('height', `${computedHeight}px`, 'important')
    element.style.setProperty('min-height', `${computedHeight}px`, 'important')
    element.style.setProperty('max-height', `${computedHeight}px`, 'important')
  }

  const renderOptions = {
    quality,
    backgroundColor,
    pixelRatio,
    ...(options.width && computedHeight ? {
      width: options.width,
      height: computedHeight,
      style: {
        width: `${options.width}px`,
        height: `${computedHeight}px`,
        transform: 'none',
        position: 'absolute',
        top: '0',
        left: '0',
      } as any
    } : {})
  }

  let dataUrl = ''
  try {
    // 1. Warm-up passes for Safari (fixes blank images/delayed rendering)
    if (isSafari()) {
      try {
        // First pass to trigger rendering pipeline
        await toJpeg(element, renderOptions)
        await new Promise((resolve) => setTimeout(resolve, 150))
        // Second pass to ensure icons/images are loaded and painted
        await toJpeg(element, renderOptions)
        await new Promise((resolve) => setTimeout(resolve, 150))
      } catch (e) {
        console.warn('Safari pre-rendering warmups failed:', e)
      }
    }

    // 2. Final render pass
    dataUrl = await toJpeg(element, renderOptions)
  } finally {
    // Restore original styles
    element.style.width = originalWidth
    element.style.height = originalHeight
    element.style.minWidth = originalMinWidth
    element.style.minHeight = originalMinHeight
    element.style.maxWidth = originalMaxWidth
    element.style.maxHeight = originalMaxHeight
    element.style.flex = originalFlex
  }

  if (!dataUrl || dataUrl.length < 1000) {
    throw new Error('ภาพที่เรนเดอร์ไม่สมบูรณ์หรือว่างเปล่า')
  }

  const blob = dataURLtoBlob(dataUrl)

  // 3. Web Share API: Try native sharing if supported (only on mobile devices like iOS/Android)
  if (
    isMobile() &&
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
