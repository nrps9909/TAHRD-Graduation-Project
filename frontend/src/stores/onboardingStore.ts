import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  isOnboardingActive: boolean
  currentStep: number
  hasCompletedOnboarding: boolean

  // 主畫面狀態追蹤（用於教學流程）
  isInMainView: boolean // 是否在主島嶼畫面（沒有打開對話框）
  waitingForReturn: boolean // 是否正在等待用戶返回主畫面

  // 用戶操作追蹤
  userActions: {
    tororoClicked: boolean
    knowledgeUploaded: boolean
    hijikiClicked: boolean
    hijikiQueried: boolean
    settingsClicked: boolean
    databaseClicked: boolean
    minimapClicked: boolean // 小地圖島嶼導航
  }

  // Actions
  startOnboarding: () => void
  setCurrentStep: (step: number) => void
  completeOnboarding: () => void
  skipOnboarding: () => void
  resetOnboarding: () => void

  // 主畫面狀態
  setIsInMainView: (isInMain: boolean) => void
  setWaitingForReturn: (waiting: boolean) => void

  // 操作追蹤
  recordAction: (action: 'tororoClicked' | 'knowledgeUploaded' | 'hijikiClicked' | 'hijikiQueried' | 'settingsClicked' | 'databaseClicked' | 'minimapClicked') => void
  resetActions: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      isOnboardingActive: false,
      currentStep: 0,
      hasCompletedOnboarding: false,

      // 主畫面狀態
      isInMainView: true,
      waitingForReturn: false,

      userActions: {
        tororoClicked: false,
        knowledgeUploaded: false,
        hijikiClicked: false,
        hijikiQueried: false,
        settingsClicked: false,
        databaseClicked: false,
        minimapClicked: false
      },

      startOnboarding: () => {
        set({
          isOnboardingActive: true,
          currentStep: 0,
          hasCompletedOnboarding: false,
          isInMainView: true,
          waitingForReturn: false,
          userActions: {
            tororoClicked: false,
            knowledgeUploaded: false,
            hijikiClicked: false,
            hijikiQueried: false,
            settingsClicked: false,
            databaseClicked: false,
            minimapClicked: false
          }
        })
      },

      setCurrentStep: (step: number) => {
        set({ currentStep: step })
      },

      completeOnboarding: () => {
        set({
          isOnboardingActive: false,
          hasCompletedOnboarding: true,
          currentStep: 7 // 最後一步（共 8 步：0-7）
        })
      },

      skipOnboarding: () => {
        set({
          isOnboardingActive: false,
          hasCompletedOnboarding: true
        })
      },

      resetOnboarding: () => {
        set({
          isOnboardingActive: true,
          currentStep: 0,
          hasCompletedOnboarding: false,
          isInMainView: true,
          waitingForReturn: false,
          userActions: {
            tororoClicked: false,
            knowledgeUploaded: false,
            hijikiClicked: false,
            hijikiQueried: false,
            settingsClicked: false,
            databaseClicked: false,
            minimapClicked: false
          }
        })
      },

      setIsInMainView: (isInMain: boolean) => {
        set({ isInMainView: isInMain })
      },

      setWaitingForReturn: (waiting: boolean) => {
        set({ waitingForReturn: waiting })
      },

      recordAction: (action) => {
        set((state) => ({
          userActions: {
            ...state.userActions,
            [action]: true
          }
        }))
      },

      resetActions: () => {
        set({
          userActions: {
            tororoClicked: false,
            knowledgeUploaded: false,
            hijikiClicked: false,
            hijikiQueried: false,
            settingsClicked: false,
            databaseClicked: false,
            minimapClicked: false
          }
        })
      }
    }),
    {
      name: 'onboarding-storage',
      partialize: (state) => ({
        isOnboardingActive: state.isOnboardingActive,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        currentStep: state.currentStep,
        userActions: state.userActions
      })
    }
  )
)
