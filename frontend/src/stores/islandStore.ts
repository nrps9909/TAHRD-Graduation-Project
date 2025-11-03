/**
 * 島嶼/資料庫狀態管理
 *
 * 島嶼資料從 GraphQL API 載入，不再使用 hardcoded 資料
 */

import { create } from 'zustand'
import { Island } from '../types/island'
import { RegionalFlowerData } from '../components/3D/RegionalFlowers'

interface IslandStore {
  // 所有島嶼（從 GraphQL 載入）
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

  // 更新島嶼資訊（僅本地狀態，不會更新資料庫）
  updateIsland: (islandId: string, updates: Partial<Island>) => void

  // 從 GraphQL 數據載入島嶼（首次載入，會重置視角）
  loadIslands: (islands: Island[]) => void

  // 更新島嶼數據但保持當前視角（用於 refetch）
  updateIslands: (islands: Island[]) => void

  // 設置載入狀態
  setLoading: (loading: boolean) => void

  // 獲取島嶼的記憶花朵（示例資料，實際應該從資料庫獲取）
  getIslandFlowers: (islandId: string) => RegionalFlowerData[]
}

export const useIslandStore = create<IslandStore>((set, get) => ({
  islands: [], // 初始為空，等待從 GraphQL 載入
  currentIslandId: 'overview', // 預設為總覽視角
  isTransitioning: false,
  isLoading: true, // 初始為載入中狀態

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

  updateIsland: (islandId: string, updates: Partial<Island>) => {
    // 僅更新本地狀態，不會更新資料庫
    // 若要更新資料庫，請使用 GraphQL UPDATE_ISLAND mutation
    set(state => ({
      islands: state.islands.map(island =>
        island.id === islandId
          ? { ...island, ...updates }
          : island
      )
    }))
  },

  loadIslands: (islands: Island[]) => {
    set({
      islands,
      currentIslandId: 'overview', // 首次載入時預設為總覽視角
      isLoading: false
    })
  },

  // 更新島嶼數據但保持當前視角（用於 refetch 時）
  updateIslands: (islands: Island[]) => {
    set(state => ({
      islands,
      // 保持當前的 currentIslandId 和 isTransitioning 狀態
      isLoading: false
    }))
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
        importance: 8,
        position: [5, 3.2, 8],
        createdAt: new Date(),
        tags: ['示例'],
        island: {
          name: '學習島',
          color: '#4A90E2',
          secondaryColor: '#7AB8FF',
          shape: 'book'
        }
      },
      {
        id: `${islandId}-2`,
        title: '示例記憶 2',
        emoji: '💡',
        importance: 9,
        position: [-5, 3.4, 8],
        createdAt: new Date(),
        tags: ['創意'],
        island: {
          name: '靈感島',
          color: '#F5A623',
          secondaryColor: '#FFD166',
          shape: 'bulb'
        }
      },
      {
        id: `${islandId}-3`,
        title: '示例記憶 3',
        emoji: '💼',
        importance: 9,
        position: [9, 2.8, 1],
        createdAt: new Date(),
        tags: ['工作'],
        island: {
          name: '工作島',
          color: '#7B68EE',
          secondaryColor: '#A896FF',
          shape: 'gear'
        }
      }
    ]

    return baseFlowers
  }
}))
