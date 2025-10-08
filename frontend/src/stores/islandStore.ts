/**
 * 島嶼/資料庫狀態管理
 */

import { create } from 'zustand'
import { Island, SAMPLE_ISLANDS } from '../types/island'
import { RegionalFlowerData } from '../components/3D/RegionalFlowers'

interface IslandStore {
  // 所有島嶼
  islands: Island[]

  // 當前選中的島嶼（如果是 'overview' 則表示總覽視角）
  currentIslandId: string

  // 切換動畫狀態
  isTransitioning: boolean

  // 數據載入狀態
  isLoading: boolean

  // 獲取當前島嶼
  getCurrentIsland: () => Island | undefined

  // 切換島嶼
  switchIsland: (islandId: string) => void

  // 回到總覽視角
  resetToOverview: () => void

  // 添加新島嶼
  addIsland: (island: Omit<Island, 'id' | 'createdAt' | 'updatedAt'>) => void

  // 刪除島嶼
  removeIsland: (islandId: string) => void

  // 更新島嶼資訊
  updateIsland: (islandId: string, updates: Partial<Island>) => void

  // 從 GraphQL 數據載入島嶼
  loadIslands: (islands: Island[]) => void

  // 設置載入狀態
  setLoading: (loading: boolean) => void

  // 獲取島嶼的記憶花朵（示例資料，實際應該從資料庫獲取）
  getIslandFlowers: (islandId: string) => RegionalFlowerData[]
}

export const useIslandStore = create<IslandStore>((set, get) => ({
  islands: SAMPLE_ISLANDS,
  currentIslandId: 'overview', // 預設為總覽視角
  isTransitioning: false,
  isLoading: false,

  getCurrentIsland: () => {
    const { islands, currentIslandId } = get()
    return islands.find(island => island.id === currentIslandId)
  },

  switchIsland: (islandId: string) => {
    const { islands } = get()
    if (islands.find(island => island.id === islandId)) {
      set({ isTransitioning: true })

      // 動畫延遲
      setTimeout(() => {
        set({ currentIslandId: islandId, isTransitioning: false })
      }, 300)
    }
  },

  resetToOverview: () => {
    set({ isTransitioning: true })

    // 動畫延遲
    setTimeout(() => {
      set({ currentIslandId: 'overview', isTransitioning: false })
    }, 300)
  },

  addIsland: (islandData) => {
    const newIsland: Island = {
      ...islandData,
      id: `island-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    set(state => ({
      islands: [...state.islands, newIsland]
    }))
  },

  removeIsland: (islandId: string) => {
    set(state => {
      const newIslands = state.islands.filter(island => island.id !== islandId)
      // 如果刪除的是當前島嶼，切換到第一個
      const newCurrentId = state.currentIslandId === islandId && newIslands.length > 0
        ? newIslands[0].id
        : state.currentIslandId

      return {
        islands: newIslands,
        currentIslandId: newCurrentId
      }
    })
  },

  updateIsland: (islandId: string, updates: Partial<Island>) => {
    set(state => ({
      islands: state.islands.map(island =>
        island.id === islandId
          ? { ...island, ...updates, updatedAt: new Date() }
          : island
      )
    }))
  },

  loadIslands: (islands: Island[]) => {
    set({
      islands,
      currentIslandId: 'overview', // 載入後也預設為總覽視角
      isLoading: false
    })
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  getIslandFlowers: (islandId: string) => {
    // 根據不同島嶼返回不同的記憶花朵
    // 這裡是示例資料，實際應該從資料庫獲取
    const baseFlowers: RegionalFlowerData[] = [
      {
        id: `${islandId}-1`,
        title: '示例記憶 1',
        emoji: '⚛️',
        category: 'learning',
        importance: 8,
        position: [5, 3.2, 8],
        createdAt: new Date(),
        tags: ['示例']
      },
      {
        id: `${islandId}-2`,
        title: '示例記憶 2',
        emoji: '💡',
        category: 'inspiration',
        importance: 9,
        position: [-5, 3.4, 8],
        createdAt: new Date(),
        tags: ['創意']
      },
      {
        id: `${islandId}-3`,
        title: '示例記憶 3',
        emoji: '💼',
        category: 'work',
        importance: 9,
        position: [9, 2.8, 1],
        createdAt: new Date(),
        tags: ['工作']
      }
    ]

    return baseFlowers
  }
}))
