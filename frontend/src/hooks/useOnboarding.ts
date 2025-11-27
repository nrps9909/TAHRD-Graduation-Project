import { useEffect, useRef } from 'react'
import { useQuery } from '@apollo/client'
import { GET_USER_SETTINGS } from '../graphql/onboarding'
import { useOnboardingStore } from '../stores/onboardingStore'
import { useAuthStore } from '../stores/authStore'

/**
 * 新手教學 Hook
 * 自動檢測用戶是否需要新手教學，並管理教學狀態
 */
export const useOnboarding = () => {
  const { isAuthenticated } = useAuthStore()
  const {
    isOnboardingActive,
    currentStep,
    hasCompletedOnboarding,
    startOnboarding,
    setCurrentStep,
    completeOnboarding,
    skipOnboarding
  } = useOnboardingStore()

  // 使用 ref 追踪是否已經初始化，避免無限循環
  const hasInitialized = useRef(false)

  // 查詢用戶設置
  const { data, loading } = useQuery(GET_USER_SETTINGS, {
    skip: !isAuthenticated,
    fetchPolicy: 'network-only' // 總是從服務器獲取最新狀態
  })

  useEffect(() => {
    // 如果還在加載或未登入，跳過
    if (loading || !isAuthenticated || !data?.userSettings) {
      return
    }

    // 如果已經初始化過，跳過
    if (hasInitialized.current) {
      return
    }

    const settings = data.userSettings

    // 標記為已初始化
    hasInitialized.current = true

    // 優先檢查本地是否主動啟動了教學（例如：用戶點擊「重新開始教學」）
    if (isOnboardingActive && !hasCompletedOnboarding) {
      // 本地已經啟動教學，保持當前狀態
      // 同步步驟到最新的本地步驟
      return
    }

    // 如果後端顯示未完成新手教學，且本地也沒有完成
    if (!settings.hasCompletedOnboarding && !hasCompletedOnboarding) {
      // 啟動新手教學
      startOnboarding()

      // 同步後端的步驟
      if (settings.onboardingStep !== currentStep) {
        setCurrentStep(settings.onboardingStep)
      }
    }

    // 如果後端已完成，但本地未同步（且本地沒有主動啟動教學）
    if (settings.hasCompletedOnboarding && !hasCompletedOnboarding && !isOnboardingActive) {
      completeOnboarding()
    }
  }, [data, loading, isAuthenticated])

  // 當登出時重置初始化標記
  useEffect(() => {
    if (!isAuthenticated) {
      hasInitialized.current = false
    }
  }, [isAuthenticated])

  return {
    isOnboardingActive,
    currentStep,
    hasCompletedOnboarding,
    loading,
    completeOnboarding,
    skipOnboarding
  }
}
