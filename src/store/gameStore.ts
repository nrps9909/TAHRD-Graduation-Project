import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface GameProgress {
  currentScene: string;
  completedScenes: string[];
  totalScore: number;
  achievements: Achievement[];
  codeSnippets: string[];
  terminalHistory: string[];
}

interface GameState {
  isPlaying: boolean;
  currentScene: string;
  completedScenes: string[];
  totalScore: number;
  achievements: Achievement[];
  codeSnippets: string[];
  terminalHistory: string[];
  playerName: string;

  startGame: (playerName: string) => void;
  completeScene: (sceneId: string, score: number) => void;
  unlockAchievement: (achievementId: string) => void;
  addCodeSnippet: (snippet: string) => void;
  addTerminalCommand: (command: string) => void;
  navigateToScene: (sceneId: string) => void;
  resetGame: () => void;
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
];

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      isPlaying: false,
      currentScene: 'intro',
      completedScenes: [],
      totalScore: 0,
      achievements: initialAchievements,
      codeSnippets: [],
      terminalHistory: [],
      playerName: '',

      startGame: (playerName) =>
        set({
          isPlaying: true,
          playerName,
          currentScene: 'tutorial-1',
          completedScenes: [],
          totalScore: 0,
          terminalHistory: [`Welcome, ${playerName}! Let's begin your Claude Code adventure.`],
        }),

      completeScene: (sceneId, score) =>
        set((state) => ({
          completedScenes: [...state.completedScenes, sceneId],
          totalScore: state.totalScore + score,
        })),

      unlockAchievement: (achievementId) =>
        set((state) => ({
          achievements: state.achievements.map((achievement) =>
            achievement.id === achievementId
              ? { ...achievement, unlocked: true, unlockedAt: new Date() }
              : achievement
          ),
        })),

      addCodeSnippet: (snippet) =>
        set((state) => ({
          codeSnippets: [...state.codeSnippets, snippet],
        })),

      addTerminalCommand: (command) =>
        set((state) => ({
          terminalHistory: [...state.terminalHistory, command],
        })),

      navigateToScene: (sceneId) =>
        set({ currentScene: sceneId }),

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
        }),
    }),
    {
      name: 'claude-code-adventure',
    }
  )
);