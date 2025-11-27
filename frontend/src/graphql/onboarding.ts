import { gql } from '@apollo/client'

/**
 * 查詢用戶設置（包含新手教學狀態）
 */
export const GET_USER_SETTINGS = gql`
  query GetUserSettings {
    userSettings {
      id
      theme
      language
      defaultView
      hasCompletedOnboarding
      onboardingStep
      onboardingProgress
      updatedAt
    }
  }
`

/**
 * 更新新手教學進度
 */
export const UPDATE_ONBOARDING_PROGRESS = gql`
  mutation UpdateOnboardingProgress($step: Int!) {
    updateOnboardingProgress(step: $step) {
      id
      hasCompletedOnboarding
      onboardingStep
      onboardingProgress
      updatedAt
    }
  }
`

/**
 * 完成新手教學
 */
export const COMPLETE_ONBOARDING = gql`
  mutation CompleteOnboarding {
    completeOnboarding {
      id
      hasCompletedOnboarding
      onboardingStep
      onboardingProgress
      updatedAt
    }
  }
`

/**
 * 跳過新手教學
 */
export const SKIP_ONBOARDING = gql`
  mutation SkipOnboarding {
    skipOnboarding {
      id
      hasCompletedOnboarding
      onboardingStep
      onboardingProgress
      updatedAt
    }
  }
`

/**
 * 重置新手教學（用於測試或重新體驗）
 */
export const RESET_ONBOARDING = gql`
  mutation ResetOnboarding {
    resetOnboarding {
      id
      hasCompletedOnboarding
      onboardingStep
      onboardingProgress
      updatedAt
    }
  }
`
