import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: Date
}

export interface GameProgress {
  currentScene: string
  completedScenes: string[]
  totalScore: number
  achievements: Achievement[]
  codeSnippets: string[]
  terminalHistory: string[]
}

// Claude Code Adventure 專屬狀態
export interface ClaudeCodeProgress {
  currentLevel: number
  levelProgress: Record<number, number> // level -> 完成百分比
  collectedCards: string[] // 收集的 Prompt Cards
  unlockedNPCs: string[] // 解鎖的 NPC
}

interface GameState {
  isPlaying: boolean
  currentScene: string
  completedScenes: string[]
  totalScore: number
  currentScore: number
  achievements: Achievement[]
  codeSnippets: string[]
  terminalHistory: string[]
  playerName: string
  selectedOS: 'windows' | 'mac' | null
  waitingForAI: boolean
  aiResponseReceived: boolean

  // Claude Code Adventure 狀態
  claudeCodeProgress: ClaudeCodeProgress

  startGame: (playerName: string) => void
  setOS: (os: 'windows' | 'mac') => void
  completeScene: (sceneId: string, score: number) => void
  unlockAchievement: (achievementId: string) => void
  addCodeSnippet: (snippet: string) => void
  addTerminalCommand: (command: string) => void
  navigateToScene: (sceneId: string) => void
  resetGame: () => void
  setWaitingForAI: (waiting: boolean) => void
  setAIResponseReceived: (received: boolean) => void

  // Claude Code Adventure 方法
  collectPromptCard: (cardId: string) => void
  unlockNPC: (npcId: string) => void
  updateClaudeCodeLevel: (level: number, progress: number) => void
}

const initialAchievements: Achievement[] = [
  {
    id: 'first-command',
    name: 'Hello World',
    description: 'Execute your first command',
    icon: '🎯',
    unlocked: false,
  },
  {
    id: 'file-master',
    name: 'File Master',
    description: 'Complete all file operation tutorials',
    icon: '📁',
    unlocked: false,
  },
  {
    id: 'search-ninja',
    name: 'Search Ninja',
    description: 'Master the search commands',
    icon: '🔍',
    unlocked: false,
  },
  {
    id: 'code-warrior',
    name: 'Code Warrior',
    description: 'Complete all coding challenges',
    icon: '⚔️',
    unlocked: false,
  },
  {
    id: 'speedrun',
    name: 'Speed Runner',
    description: 'Complete tutorial in under 10 minutes',
    icon: '⚡',
    unlocked: false,
  },
]

// 初始 Claude Code Progress
const initialClaudeCodeProgress: ClaudeCodeProgress = {
  currentLevel: 1,
  levelProgress: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  collectedCards: [],
  unlockedNPCs: [],
}

export const useGameStore = create<GameState>()(
  persist(
    set => ({
      isPlaying: false,
      currentScene: 'intro',
      completedScenes: [],
      totalScore: 0,
      currentScore: 0,
      achievements: initialAchievements,
      codeSnippets: [],
      terminalHistory: [],
      playerName: '',
      selectedOS: null,
      waitingForAI: false,
      aiResponseReceived: false,
      claudeCodeProgress: initialClaudeCodeProgress,

      startGame: playerName =>
        set({
          isPlaying: true,
          playerName,
          currentScene: 'tutorial-1',
          completedScenes: [],
          totalScore: 0,
          currentScore: 0,
          terminalHistory: [`歡迎, ${playerName}! 讓我們開始學習 Git！`],
        }),

      setOS: os => set({ selectedOS: os }),

      completeScene: (sceneId, score) =>
        set(state => ({
          completedScenes: [...state.completedScenes, sceneId],
          totalScore: state.totalScore + score,
          currentScore: score,
        })),

      unlockAchievement: achievementId =>
        set(state => ({
          achievements: state.achievements.map(achievement =>
            achievement.id === achievementId
              ? { ...achievement, unlocked: true, unlockedAt: new Date() }
              : achievement
          ),
        })),

      addCodeSnippet: snippet =>
        set(state => ({
          codeSnippets: [...state.codeSnippets, snippet],
        })),

      addTerminalCommand: command =>
        set(state => ({
          terminalHistory: [...state.terminalHistory, command],
        })),

      navigateToScene: sceneId => set({ currentScene: sceneId }),

      resetGame: () =>
        set({
          isPlaying: false,
          currentScene: 'intro',
          completedScenes: [],
          totalScore: 0,
          achievements: initialAchievements,
          codeSnippets: [],
          terminalHistory: [],
          playerName: '',
          waitingForAI: false,
          aiResponseReceived: false,
          claudeCodeProgress: initialClaudeCodeProgress,
        }),

      setWaitingForAI: waiting =>
        set({ waitingForAI: waiting, aiResponseReceived: false }),

      setAIResponseReceived: received => set({ aiResponseReceived: received }),

      // Claude Code Adventure 方法
      collectPromptCard: cardId =>
        set(state => ({
          claudeCodeProgress: {
            ...state.claudeCodeProgress,
            collectedCards: state.claudeCodeProgress.collectedCards.includes(
              cardId
            )
              ? state.claudeCodeProgress.collectedCards
              : [...state.claudeCodeProgress.collectedCards, cardId],
          },
        })),

      unlockNPC: npcId =>
        set(state => ({
          claudeCodeProgress: {
            ...state.claudeCodeProgress,
            unlockedNPCs: state.claudeCodeProgress.unlockedNPCs.includes(npcId)
              ? state.claudeCodeProgress.unlockedNPCs
              : [...state.claudeCodeProgress.unlockedNPCs, npcId],
          },
        })),

      updateClaudeCodeLevel: (level, progress) =>
        set(state => ({
          claudeCodeProgress: {
            ...state.claudeCodeProgress,
            currentLevel: Math.max(state.claudeCodeProgress.currentLevel, level),
            levelProgress: {
              ...state.claudeCodeProgress.levelProgress,
              [level]: Math.max(
                state.claudeCodeProgress.levelProgress[level] || 0,
                progress
              ),
            },
          },
        })),
    }),
    {
      name: 'claude-code-adventure',
    }
  )
)
