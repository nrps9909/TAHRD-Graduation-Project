// 統一學習路徑 - 整合所有教學內容
import { claudeCodeScenes, claudeCodeLevels } from './claudeCodeScenes'

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

// 根據關卡取得技能列表
function getSkillsForLevel(level: number): string[] {
  const skillsMap: Record<number, string[]> = {
    1: ['AI 溝通基礎', '自然語言描述', '認識程式結構'],
    2: ['函式設計', '參數描述', '最佳實踐'],
    3: ['Code Smell 識別', '重構技巧', '程式碼文件'],
    4: ['錯誤分析', 'Bug 報告', '除錯思維'],
    5: ['專案規劃', '迭代開發', '功能整合'],
    6: ['需求分析', '架構設計', '獨立開發'],
  }
  return skillsMap[level] || []
}

// Claude Code Adventure 學習路徑
export const claudeCodeLearningPath: LearningPath = {
  id: 'claude-code-adventure',
  title: 'Claude Code Adventure',
  description: '透過遊戲化的方式學習 Vibe Coding，掌握用自然語言寫程式的超能力！',
  targetAudience: '想要學習 AI 程式設計的初學者和進階者',
  totalTime: 180, // 3 小時
  stages: claudeCodeLevels.map((level, index) => ({
    id: `cc-stage-${level.level}`,
    title: `Level ${level.level}：${level.title}`,
    description: level.description,
    icon: level.icon,
    estimatedTime: level.level === 6 ? 40 : 25, // Boss 關卡時間較長
    difficulty:
      level.level <= 2
        ? 'beginner'
        : level.level <= 4
          ? 'intermediate'
          : 'advanced',
    prerequisites: index > 0 ? [`cc-stage-${level.level - 1}`] : [],
    scenes: level.scenes,
    skills: getSkillsForLevel(level.level),
    rewards: {
      points: level.level * 200,
      badges: [level.badge],
    },
  })),
}

// 取得 Claude Code Adventure 的視覺化資料
export const getClaudeCodeVisualization = (completedScenes: string[]) => {
  return claudeCodeLearningPath.stages.map((stage, index) => {
    const completedScenesInStage = stage.scenes.filter(sceneId =>
      completedScenes.includes(sceneId)
    ).length

    const isCompleted = completedScenesInStage === stage.scenes.length
    const isAvailable =
      index === 0 ||
      claudeCodeLearningPath.stages[index - 1].scenes.every(sceneId =>
        completedScenes.includes(sceneId)
      )
    const isCurrent = isAvailable && !isCompleted

    return {
      ...stage,
      progress: Math.round(
        (completedScenesInStage / stage.scenes.length) * 100
      ),
      isCompleted,
      isAvailable,
      isCurrent,
      isBoss: index === claudeCodeLearningPath.stages.length - 1,
    }
  })
}

// 取得所有場景
export const getAllScenes = () => {
  return { ...claudeCodeScenes }
}
