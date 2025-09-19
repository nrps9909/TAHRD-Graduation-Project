import { useCallback, useEffect, useRef, useState, useMemo } from 'react'

/**
 * Debounce hook for optimizing input handlers
 */
export const useDebounce = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Throttle hook for limiting function calls
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100
): T => {
  const lastRun = useRef(Date.now())

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      }
    }) as T,
    [callback, delay]
  )
}

/**
 * Request Animation Frame hook for smooth animations
 */
export const useAnimationFrame = (callback: (deltaTime: number) => void) => {
  const requestRef = useRef<number | undefined>(undefined)
  const previousTimeRef = useRef<number | undefined>(undefined)

  const animate = useCallback(
    (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current
        callback(deltaTime)
      }
      previousTimeRef.current = time
      requestRef.current = requestAnimationFrame(animate)
    },
    [callback]
  )

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate)
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [animate])
}

/**
 * Intersection Observer hook for lazy loading
 */
export const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
) => {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
      if (entry.isIntersecting) {
        setHasIntersected(true)
      }
    }, options)

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [ref, options])

  return { isIntersecting, hasIntersected }
}

/**
 * Virtual scroll hook for large lists
 */
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 3
) => {
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = useMemo(
    () => Math.max(0, Math.floor(scrollTop / itemHeight) - overscan),
    [scrollTop, itemHeight, overscan]
  )

  const endIndex = useMemo(
    () =>
      Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      ),
    [scrollTop, containerHeight, itemHeight, overscan, items.length]
  )

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex + 1),
    [items, startIndex, endIndex]
  )

  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  const handleScroll = useThrottle((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, 50)

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    handleScroll,
  }
}

/**
 * Performance monitor hook
 */
export const usePerformanceMonitor = () => {
  const [fps, setFps] = useState(60)
  const [renderTime, setRenderTime] = useState(0)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())

  useAnimationFrame(() => {
    frameCount.current++
    const currentTime = performance.now()
    const delta = currentTime - lastTime.current

    if (delta >= 1000) {
      setFps(Math.round((frameCount.current * 1000) / delta))
      frameCount.current = 0
      lastTime.current = currentTime
    }
  })

  useEffect(() => {
    const measureRenderTime = () => {
      const startTime = performance.now()
      requestAnimationFrame(() => {
        setRenderTime(performance.now() - startTime)
      })
    }

    const interval = setInterval(measureRenderTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return { fps, renderTime }
}

/**
 * Prefetch hook for preloading resources
 */
export const usePrefetch = (urls: string[]) => {
  useEffect(() => {
    urls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      document.head.appendChild(link)
    })
  }, [urls])
}
