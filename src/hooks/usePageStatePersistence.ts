import { useState, useEffect, useRef, useCallback } from 'react'

interface PageState {
  [key: string]: any
}

interface ScrollState {
  x: number
  y: number
}

const STORAGE_KEY = 'claude-code-adventure-page-state'
const SCROLL_STORAGE_KEY = 'claude-code-adventure-scroll-state'

export const usePageStatePersistence = <T extends PageState>(
  pageKey: string,
  defaultState: T
) => {
  const [state, setState] = useState<T>(() => {
    // Initialize state immediately from localStorage to avoid hydration issues
    try {
      const savedState = localStorage.getItem(STORAGE_KEY)
      if (savedState) {
        const allPageStates = JSON.parse(savedState)
        const pageState = allPageStates[pageKey]
        if (pageState) {
          return { ...defaultState, ...pageState }
        }
      }
    } catch (error) {
      console.warn('無法載入頁面狀態:', error)
    }
    return defaultState
  })

  const isInitialized = useRef(false)

  // Mark as initialized after first render
  useEffect(() => {
    isInitialized.current = true
  }, [])

  // Save state to localStorage whenever state changes (but not on initial render)
  useEffect(() => {
    if (!isInitialized.current) return

    try {
      const savedState = localStorage.getItem(STORAGE_KEY)
      const allPageStates = savedState ? JSON.parse(savedState) : {}
      allPageStates[pageKey] = state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allPageStates))
    } catch (error) {
      console.warn('無法保存頁面狀態:', error)
    }
  }, [state, pageKey])

  return [state, setState] as const
}

export const useScrollPersistence = (viewKey: string) => {
  const scrollElementRef = useRef<HTMLDivElement>(null)

  // Save scroll position
  const saveScrollPosition = useCallback(() => {
    if (!scrollElementRef.current) return

    const scrollState: ScrollState = {
      x: scrollElementRef.current.scrollLeft,
      y: scrollElementRef.current.scrollTop,
    }

    try {
      const savedScrollState = localStorage.getItem(SCROLL_STORAGE_KEY)
      const allScrollStates = savedScrollState
        ? JSON.parse(savedScrollState)
        : {}
      allScrollStates[viewKey] = scrollState
      localStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(allScrollStates))
    } catch (error) {
      console.warn('無法保存滾動位置:', error)
    }
  }, [viewKey])

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    if (!scrollElementRef.current) return

    try {
      const savedScrollState = localStorage.getItem(SCROLL_STORAGE_KEY)
      if (savedScrollState) {
        const allScrollStates = JSON.parse(savedScrollState)
        const scrollState = allScrollStates[viewKey]
        if (scrollState) {
          scrollElementRef.current.scrollTo(scrollState.x, scrollState.y)
        }
      }
    } catch (error) {
      console.warn('無法恢復滾動位置:', error)
    }
  }, [viewKey])

  // Set up scroll event listener
  useEffect(() => {
    const element = scrollElementRef.current
    if (!element) return

    // Restore scroll position when element is mounted
    const timer = setTimeout(restoreScrollPosition, 100)

    // Save scroll position on scroll
    const handleScroll = () => {
      saveScrollPosition()
    }

    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      clearTimeout(timer)
      element.removeEventListener('scroll', handleScroll)
      saveScrollPosition() // Save final position
    }
  }, [saveScrollPosition, restoreScrollPosition])

  // Save scroll position when component unmounts or view changes
  useEffect(() => {
    return () => {
      saveScrollPosition()
    }
  }, [saveScrollPosition])

  return {
    scrollElementRef,
    saveScrollPosition,
    restoreScrollPosition,
  }
}

// Hook for managing component visibility state
export const useViewStatePersistence = (defaultView: string) => {
  const [viewState, setViewState] = usePageStatePersistence('gameLayout', {
    currentView: defaultView,
    lastActiveTime: Date.now(),
  })

  const setCurrentView = useCallback(
    (view: string) => {
      setViewState(prev => ({
        ...prev,
        currentView: view,
        lastActiveTime: Date.now(),
      }))
    },
    [setViewState]
  )

  return {
    currentView: viewState.currentView,
    setCurrentView,
    lastActiveTime: viewState.lastActiveTime,
  }
}
