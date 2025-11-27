import { GraphQLError } from 'graphql'
import { Context } from '../context'
import { logger } from '../utils/logger'

export const settingsResolvers = {
  Query: {
    /**
     * 獲取當前用戶的設置
     */
    userSettings: async (
      _: any,
      __: any,
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      let settings = await prisma.userSettings.findUnique({
        where: { userId }
      })

      // 如果不存在，創建默認設置
      if (!settings) {
        settings = await prisma.userSettings.create({
          data: {
            userId,
            theme: 'light',
            language: 'zh-TW',
            defaultView: 'island',
            emailNotifications: true,
            dataRetentionDays: 365,
            hasCompletedOnboarding: false,
            onboardingStep: 0
          }
        })
      }

      return settings
    }
  },

  Mutation: {
    /**
     * 更新用戶設置
     */
    updateUserSettings: async (
      _: any,
      { theme, language, defaultView }: { theme?: string; language?: string; defaultView?: string },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      // 準備更新數據
      const updateData: any = {}
      if (theme !== undefined) updateData.theme = theme
      if (language !== undefined) updateData.language = language
      if (defaultView !== undefined) updateData.defaultView = defaultView

      // 檢查用戶設置是否存在
      let settings = await prisma.userSettings.findUnique({
        where: { userId }
      })

      if (!settings) {
        // 如果不存在，創建新設置
        settings = await prisma.userSettings.create({
          data: {
            userId,
            theme: theme || 'light',
            language: language || 'zh-TW',
            defaultView: defaultView || 'island',
            emailNotifications: true,
            dataRetentionDays: 365,
            hasCompletedOnboarding: false,
            onboardingStep: 0
          }
        })
      } else {
        // 更新現有設置
        settings = await prisma.userSettings.update({
          where: { userId },
          data: updateData
        })
      }

      logger.info(`[Settings] 用戶 ${userId} 更新設置`)
      return settings
    },

    /**
     * 更新新手教學進度
     */
    updateOnboardingProgress: async (
      _: any,
      { step }: { step: number },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      // 驗證步驟範圍（0-7，共8個步驟）
      if (step < 0 || step > 7) {
        throw new GraphQLError('Invalid onboarding step. Must be between 0 and 7.')
      }

      // 檢查用戶設置是否存在
      let settings = await prisma.userSettings.findUnique({
        where: { userId }
      })

      if (!settings) {
        // 創建新設置
        settings = await prisma.userSettings.create({
          data: {
            userId,
            theme: 'light',
            language: 'zh-TW',
            defaultView: 'island',
            emailNotifications: true,
            dataRetentionDays: 365,
            hasCompletedOnboarding: false,
            onboardingStep: step,
            onboardingProgress: {
              currentStep: step,
              completedSteps: [step],
              lastUpdated: new Date().toISOString()
            }
          }
        })
      } else {
        // 更新教學進度
        const currentProgress = settings.onboardingProgress as any || {
          completedSteps: []
        }

        const completedSteps = Array.isArray(currentProgress.completedSteps)
          ? [...new Set([...currentProgress.completedSteps, step])]
          : [step]

        settings = await prisma.userSettings.update({
          where: { userId },
          data: {
            onboardingStep: step,
            onboardingProgress: {
              currentStep: step,
              completedSteps,
              lastUpdated: new Date().toISOString()
            }
          }
        })
      }

      logger.info(`[Onboarding] 用戶 ${userId} 更新教學進度到步驟 ${step}`)
      return settings
    },

    /**
     * 完成新手教學
     */
    completeOnboarding: async (
      _: any,
      __: any,
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      let settings = await prisma.userSettings.findUnique({
        where: { userId }
      })

      if (!settings) {
        // 創建新設置並標記為已完成
        settings = await prisma.userSettings.create({
          data: {
            userId,
            theme: 'light',
            language: 'zh-TW',
            defaultView: 'island',
            emailNotifications: true,
            dataRetentionDays: 365,
            hasCompletedOnboarding: true,
            onboardingStep: 7,
            onboardingProgress: {
              completed: true,
              completedAt: new Date().toISOString(),
              completedSteps: [0, 1, 2, 3, 4, 5, 6, 7]
            }
          }
        })
      } else {
        settings = await prisma.userSettings.update({
          where: { userId },
          data: {
            hasCompletedOnboarding: true,
            onboardingStep: 7,
            onboardingProgress: {
              ...(settings.onboardingProgress as any || {}),
              completed: true,
              completedAt: new Date().toISOString()
            }
          }
        })
      }

      logger.info(`[Onboarding] 用戶 ${userId} 完成新手教學`)
      return settings
    },

    /**
     * 跳過新手教學
     */
    skipOnboarding: async (
      _: any,
      __: any,
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      let settings = await prisma.userSettings.findUnique({
        where: { userId }
      })

      if (!settings) {
        settings = await prisma.userSettings.create({
          data: {
            userId,
            theme: 'light',
            language: 'zh-TW',
            defaultView: 'island',
            emailNotifications: true,
            dataRetentionDays: 365,
            hasCompletedOnboarding: true,
            onboardingStep: 7,
            onboardingProgress: {
              skipped: true,
              skippedAt: new Date().toISOString()
            }
          }
        })
      } else {
        settings = await prisma.userSettings.update({
          where: { userId },
          data: {
            hasCompletedOnboarding: true,
            onboardingStep: 7,
            onboardingProgress: {
              ...(settings.onboardingProgress as any || {}),
              skipped: true,
              skippedAt: new Date().toISOString()
            }
          }
        })
      }

      logger.info(`[Onboarding] 用戶 ${userId} 跳過新手教學`)
      return settings
    },

    /**
     * 重置新手教學（用於測試或重新體驗）
     */
    resetOnboarding: async (
      _: any,
      __: any,
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      let settings = await prisma.userSettings.findUnique({
        where: { userId }
      })

      if (!settings) {
        settings = await prisma.userSettings.create({
          data: {
            userId,
            theme: 'light',
            language: 'zh-TW',
            defaultView: 'island',
            emailNotifications: true,
            dataRetentionDays: 365,
            hasCompletedOnboarding: false,
            onboardingStep: 0,
            onboardingProgress: {
              reset: true,
              resetAt: new Date().toISOString()
            }
          }
        })
      } else {
        settings = await prisma.userSettings.update({
          where: { userId },
          data: {
            hasCompletedOnboarding: false,
            onboardingStep: 0,
            onboardingProgress: {
              reset: true,
              resetAt: new Date().toISOString(),
              completedSteps: []
            }
          }
        })
      }

      logger.info(`[Onboarding] 用戶 ${userId} 重置新手教學`)
      return settings
    }
  }
}
