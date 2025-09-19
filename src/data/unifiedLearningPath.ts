// 統一學習路徑 - 整合所有教學內容
import { scenes } from './scenes'
import { vibeCodingScenes } from './vibe-coding-scenes'
import { gitScenes } from './gitScenes'
import { cursorScenes } from './cursorScenes'

export interface LearningStage {
  id: string
  title: string
  description: string
  icon: string
  estimatedTime: number // 分鐘
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  prerequisites?: string[]
  scenes: string[] // scene IDs
  skills: string[]
  rewards: {
    points: number
    badges: string[]
  }
}

export interface LearningPath {
  id: string
  title: string
  description: string
  targetAudience: string
  totalTime: number
  stages: LearningStage[]
}

// 統一學習路徑
export const unifiedLearningPath: LearningPath = {
  id: 'ai-coding-mastery',
  title: '🚀 AI 程式設計大師之路',
  description: '從零開始，3小時掌握用AI寫程式的超能力！',
  targetAudience: '完全新手、轉職者、想提升效率的開發者',
  totalTime: 180, // 3小時
  stages: [
    {
      id: 'stage-1-foundation',
      title: '🌟 第一階段：AI協作基礎',
      description: '建立正確的AI程式設計思維',
      icon: '🧠',
      estimatedTime: 30,
      difficulty: 'beginner',
      scenes: [
        'intro', // from vibe-coding-scenes
        'tutorial-1', // from scenes
        'tutorial-2',
      ],
      skills: ['AI溝通技巧', '提示詞工程', '需求描述能力'],
      rewards: {
        points: 300,
        badges: ['AI新手', '溝通達人'],
      },
    },
    {
      id: 'stage-2-tools',
      title: '🛠️ 第二階段：工具掌握',
      description: '學會使用現代AI程式設計工具',
      icon: '⚡',
      estimatedTime: 45,
      difficulty: 'beginner',
      prerequisites: ['stage-1-foundation'],
      scenes: [
        'cursor-basics', // from cursorScenes
        'cursor-ai-features',
        'claude-code-intro',
      ],
      skills: ['Cursor編輯器使用', 'Claude Code操作', 'AI輔助編程'],
      rewards: {
        points: 500,
        badges: ['工具大師', 'Cursor達人'],
      },
    },
    {
      id: 'stage-3-version-control',
      title: '📦 第三階段：版本控制',
      description: '掌握Git，管理你的程式專案',
      icon: '🔄',
      estimatedTime: 40,
      difficulty: 'intermediate',
      prerequisites: ['stage-2-tools'],
      scenes: [
        'git-intro', // from gitScenes
        'git-basic-commands',
        'git-workflow',
      ],
      skills: ['Git基礎操作', '版本管理', '協作開發'],
      rewards: {
        points: 400,
        badges: ['Git專家', '版本控制大師'],
      },
    },
    {
      id: 'stage-4-practical-projects',
      title: '🎯 第四階段：實戰專案',
      description: '動手做出真正有用的程式',
      icon: '🚀',
      estimatedTime: 45,
      difficulty: 'intermediate',
      prerequisites: ['stage-3-version-control'],
      scenes: ['project-website', 'project-calculator', 'project-game'],
      skills: ['網頁開發', '互動程式設計', '用戶介面設計'],
      rewards: {
        points: 700,
        badges: ['專案大師', '全端開發者'],
      },
    },
    {
      id: 'stage-5-mastery',
      title: '👑 第五階段：進階技巧',
      description: '成為AI程式設計專家',
      icon: '🏆',
      estimatedTime: 20,
      difficulty: 'advanced',
      prerequisites: ['stage-4-practical-projects'],
      scenes: ['advanced-prompting', 'code-optimization', 'final-challenge'],
      skills: ['進階提示技巧', '程式優化', '獨立解決問題'],
      rewards: {
        points: 1000,
        badges: ['AI程式大師', '終極挑戰者'],
      },
    },
  ],
}

// 學習路徑工具函數
export class LearningPathManager {
  static getCurrentStage(completedScenes: string[]): LearningStage | null {
    for (const stage of unifiedLearningPath.stages) {
      // 檢查是否有未完成的場景
      const hasIncompleteScenes = stage.scenes.some(
        sceneId => !completedScenes.includes(sceneId)
      )

      if (hasIncompleteScenes) {
        return stage
      }
    }
    return null // 所有階段都完成了
  }

  static getNextRecommendedScene(completedScenes: string[]): string | null {
    const currentStage = this.getCurrentStage(completedScenes)
    if (!currentStage) return null

    // 找到第一個未完成的場景
    return (
      currentStage.scenes.find(sceneId => !completedScenes.includes(sceneId)) ||
      null
    )
  }

  static getProgressStats(completedScenes: string[]) {
    const totalScenes = unifiedLearningPath.stages.reduce(
      (total, stage) => total + stage.scenes.length,
      0
    )

    const completedCount = unifiedLearningPath.stages.reduce((count, stage) => {
      const stageCompleted = stage.scenes.filter(sceneId =>
        completedScenes.includes(sceneId)
      ).length
      return count + stageCompleted
    }, 0)

    const progressPercentage = Math.round((completedCount / totalScenes) * 100)

    const currentStage = this.getCurrentStage(completedScenes)
    const completedStages = unifiedLearningPath.stages.filter(stage =>
      stage.scenes.every(sceneId => completedScenes.includes(sceneId))
    ).length

    return {
      totalScenes,
      completedCount,
      progressPercentage,
      currentStage: currentStage?.id || null,
      completedStages,
      totalStages: unifiedLearningPath.stages.length,
    }
  }

  static getAvailableStages(completedScenes: string[]): LearningStage[] {
    return unifiedLearningPath.stages.filter(stage => {
      // 如果沒有先決條件，或者先決條件都已完成
      if (!stage.prerequisites) return true

      return stage.prerequisites.every(prereqId => {
        const prereqStage = unifiedLearningPath.stages.find(
          s => s.id === prereqId
        )

        if (!prereqStage) return false

        // 檢查先決條件階段是否完成
        return prereqStage.scenes.every(sceneId =>
          completedScenes.includes(sceneId)
        )
      })
    })
  }

  static getAllScenes() {
    return {
      ...scenes,
      ...vibeCodingScenes,
      ...gitScenes,
      ...cursorScenes,
    }
  }
}

// 學習路徑可視化數據
export const getLearningPathVisualization = (completedScenes: string[]) => {
  return unifiedLearningPath.stages.map((stage, index) => {
    const completedScenesInStage = stage.scenes.filter(sceneId =>
      completedScenes.includes(sceneId)
    ).length

    const isCompleted = completedScenesInStage === stage.scenes.length
    const isAvailable = LearningPathManager.getAvailableStages(
      completedScenes
    ).some(s => s.id === stage.id)
    const isCurrent =
      LearningPathManager.getCurrentStage(completedScenes)?.id === stage.id

    return {
      ...stage,
      progress: Math.round(
        (completedScenesInStage / stage.scenes.length) * 100
      ),
      isCompleted,
      isAvailable,
      isCurrent,
      position: {
        x: (index % 3) * 200 + 100,
        y: Math.floor(index / 3) * 150 + 100,
      },
    }
  })
}
