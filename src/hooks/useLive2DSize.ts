import { useEffect, useState } from 'react'

type PageType = 'intro' | 'game' | 'tutorial'

interface Live2DSize {
  width: number
  height: number
  scale: number
}

/**
 * Hook to get responsive Live2D sizes based on page type and screen size
 * Properly handles high DPI displays and zoom levels
 * @param pageType The type of page where Live2D is displayed
 * @returns Responsive Live2D dimensions
 */
export const useLive2DSize = (pageType: PageType): Live2DSize => {
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  })

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
      })
    }

    window.addEventListener('resize', handleResize)
    // Also listen for zoom changes
    window
      .matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      .addEventListener('change', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Calculate responsive adjustments
  const getResponsiveSize = (): Live2DSize => {
    const { width: screenWidth, height: screenHeight, dpr } = screenSize

    // Calculate actual available space (considering UI elements)
    // For intro page, the cat should fit in roughly 1/3 of viewport width
    // For game page, it should be smaller

    let maxWidth: number
    let maxHeight: number
    let scaleFactor: number

    // Detect if user has high DPI with zoom (like 2K at 200%)
    const isHighDPIZoomed = dpr >= 1.5

    switch (pageType) {
      case 'intro':
        // On intro, cat is in left column (50% width on desktop, full on mobile)
        if (screenWidth < 1024) {
          // Mobile/tablet: cat takes up less vertical space
          maxWidth = Math.min(screenWidth * 0.6, 320)
          maxHeight = Math.min(screenHeight * 0.4, 320)
        } else {
          // Desktop: cat is in left column - 適中的尺寸
          maxWidth = Math.min(screenWidth * 0.3, 400)
          maxHeight = Math.min(screenHeight * 0.45, 400)
        }

        // For high DPI zoomed displays - 適度縮小
        if (isHighDPIZoomed) {
          // 200%縮放時，縮小到80%
          maxWidth *= 0.8
          maxHeight *= 0.8
        }

        // 適中的縮放比例
        scaleFactor = Math.min(maxWidth / 800, maxHeight / 800, 0.15)
        break

      case 'game':
        // Game page: smaller cat in teaching area
        if (screenWidth < 768) {
          maxWidth = Math.min(screenWidth * 0.5, 240)
          maxHeight = Math.min(screenHeight * 0.3, 240)
        } else {
          maxWidth = Math.min(screenWidth * 0.2, 280)
          maxHeight = Math.min(screenHeight * 0.35, 280)
        }

        if (isHighDPIZoomed) {
          // 200%縮放時，減少到70%
          maxWidth *= 0.7
          maxHeight *= 0.7
        }

        scaleFactor = Math.min(maxWidth / 800, maxHeight / 800, 0.12)
        break

      case 'tutorial':
        // Tutorial: medium size
        maxWidth = Math.min(screenWidth * 0.18, 220)
        maxHeight = Math.min(screenHeight * 0.3, 220)

        if (isHighDPIZoomed) {
          // 200%縮放時，減少到45%
          maxWidth *= 0.45
          maxHeight *= 0.45
        }

        scaleFactor = Math.min(maxWidth / 1000, maxHeight / 1000, 0.09)
        break

      default:
        maxWidth = 280
        maxHeight = 280
        scaleFactor = 0.12
    }

    return {
      width: Math.round(maxWidth),
      height: Math.round(maxHeight),
      scale: scaleFactor,
    }
  }

  return getResponsiveSize()
}

/**
 * Hook to get container styles for Live2D based on page context
 * @param pageType The type of page where Live2D is displayed
 * @returns CSS class names for the container
 */
export const useLive2DContainerClass = (pageType: PageType): string => {
  const baseClasses = 'flex items-center justify-center'

  switch (pageType) {
    case 'intro':
      return `${baseClasses} mb-4`
    case 'game':
      return `${baseClasses}`
    case 'tutorial':
      return `${baseClasses} my-2`
    default:
      return baseClasses
  }
}
