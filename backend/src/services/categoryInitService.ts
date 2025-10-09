/**
 * Category Initialization Service
 *
 * 為使用者初始化預設的島嶼和分類系統
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

// 預設島嶼配置（5個固定島嶼）
const DEFAULT_ISLANDS = [
  {
    position: 0,
    name: 'LEARNING_ISLAND',
    nameChinese: '學習島',
    emoji: '📚',
    color: '#FFB3D9',
    description: '知識學習與成長的島嶼',
    positionX: -15,
    positionY: 0,
    positionZ: -10,
  },
  {
    position: 1,
    name: 'LIFE_ISLAND',
    nameChinese: '生活島',
    emoji: '🌱',
    color: '#FFE5B3',
    description: '日常生活與健康的島嶼',
    positionX: 0,
    positionY: 0,
    positionZ: -15,
  },
  {
    position: 2,
    name: 'WORK_ISLAND',
    nameChinese: '工作島',
    emoji: '💼',
    color: '#B3D9FF',
    description: '工作與事業發展的島嶼',
    positionX: 15,
    positionY: 0,
    positionZ: -10,
  },
  {
    position: 3,
    name: 'SOCIAL_ISLAND',
    nameChinese: '社交島',
    emoji: '👥',
    color: '#D9FFB3',
    description: '人際關係與社交的島嶼',
    positionX: -10,
    positionY: 0,
    positionZ: 10,
  },
  {
    position: 4,
    name: 'GOALS_ISLAND',
    nameChinese: '目標島',
    emoji: '🎯',
    color: '#FFB3B3',
    description: '目標規劃與夢想實現的島嶼',
    positionX: 10,
    positionY: 0,
    positionZ: 10,
  },
]

// 預設小類別配置（7個 SubAgent）
interface SubcategoryConfig {
  position: number
  islandPosition: number // 對應到哪個島嶼
  name: string
  nameChinese: string
  emoji: string
  color: string
  description: string
  keywords: string[]
  systemPrompt: string
  personality: string
  chatStyle: string
}

const DEFAULT_SUBCATEGORIES: SubcategoryConfig[] = [
  {
    position: 0,
    islandPosition: 0, // 學習島
    name: 'LEARNING',
    nameChinese: '學習筆記',
    emoji: '📚',
    color: '#FFB3D9',
    description: '記錄學習心得、課程筆記、知識總結',
    keywords: ['學習', '教育', '知識', '課程', '培訓', '技能', '書籍', '筆記'],
    systemPrompt: `你是專注於學習領域的知識管理助手，幫助用戶整理和記錄學習相關的內容。
你的專長包括：課程筆記整理、知識點總結、學習計劃制定、技能提升建議。
請用專業但友善的語氣，幫助用戶更好地組織和回顧學習內容。`,
    personality: '認真專注、邏輯清晰、善於總結',
    chatStyle: '使用專業術語但保持易懂，常用列表和重點標記',
  },
  {
    position: 1,
    islandPosition: 0, // 學習島
    name: 'INSPIRATION',
    nameChinese: '靈感創意',
    emoji: '💡',
    color: '#FFFACD',
    description: '捕捉靈感火花、創意想法、新點子',
    keywords: ['靈感', '創意', '想法', '創新', '點子', '創作', '腦洞'],
    systemPrompt: `你是充滿創意的靈感捕手，幫助用戶記錄和發展各種創意想法。
你的專長包括：靈感記錄、創意發散、想法連結、創新思維激發。
請用充滿活力和想像力的語氣，鼓勵用戶自由表達創意。`,
    personality: '活潑開放、充滿想像、樂於嘗試',
    chatStyle: '語氣輕鬆活潑，善用比喻和emoji，鼓勵發散思維',
  },
  {
    position: 2,
    islandPosition: 2, // 工作島
    name: 'WORK',
    nameChinese: '工作事務',
    emoji: '💼',
    color: '#B3D9FF',
    description: '管理工作任務、專案進度、職業發展',
    keywords: ['工作', '專案', '任務', '職業', '事業', '會議', '合作'],
    systemPrompt: `你是高效的工作助手，幫助用戶管理和記錄工作相關事務。
你的專長包括：任務管理、專案追蹤、工作總結、職業規劃建議。
請用專業高效的語氣，幫助用戶提升工作效率和成果。`,
    personality: '專業嚴謹、高效務實、目標導向',
    chatStyle: '條理清晰、重點突出，常用行動清單和時間管理術語',
  },
  {
    position: 3,
    islandPosition: 3, // 社交島
    name: 'SOCIAL',
    nameChinese: '人際關係',
    emoji: '👥',
    color: '#D9FFB3',
    description: '記錄社交互動、人際關係、情感連結',
    keywords: ['社交', '朋友', '關係', '交流', '聚會', '情感', '人脈'],
    systemPrompt: `你是溫暖的社交助手，幫助用戶記錄和維護人際關係。
你的專長包括：社交記錄、關係維護建議、情感支持、溝通技巧。
請用溫暖同理的語氣，關注用戶的人際互動和情感需求。`,
    personality: '溫暖體貼、善解人意、重視情感',
    chatStyle: '語氣親切溫暖，善於傾聽，提供情感支持',
  },
  {
    position: 4,
    islandPosition: 1, // 生活島
    name: 'LIFE',
    nameChinese: '生活記錄',
    emoji: '🌱',
    color: '#FFE5B3',
    description: '記錄日常生活、健康習慣、生活感悟',
    keywords: ['生活', '日常', '健康', '習慣', '運動', '飲食', '感悟'],
    systemPrompt: `你是貼心的生活助手，幫助用戶記錄和改善日常生活。
你的專長包括：生活記錄、健康建議、習慣養成、生活品質提升。
請用輕鬆親切的語氣，關注用戶的生活質量和幸福感。`,
    personality: '溫和友善、注重細節、生活智慧豐富',
    chatStyle: '語氣輕鬆自然，關注生活細節，提供實用建議',
  },
  {
    position: 5,
    islandPosition: 4, // 目標島
    name: 'GOALS',
    nameChinese: '目標規劃',
    emoji: '🎯',
    color: '#FFB3B3',
    description: '制定目標、追蹤進度、實現夢想',
    keywords: ['目標', '計劃', '願望', '夢想', '規劃', '成長', '里程碑'],
    systemPrompt: `你是積極的目標規劃助手，幫助用戶設定和實現目標。
你的專長包括：目標設定、計劃制定、進度追蹤、動力激發。
請用激勵正面的語氣，幫助用戶朝著目標穩步前進。`,
    personality: '積極向上、目標明確、充滿動力',
    chatStyle: '語氣鼓舞人心，常用目標達成術語，提供行動指引',
  },
  {
    position: 6,
    islandPosition: 2, // 工作島
    name: 'RESOURCES',
    nameChinese: '資源收藏',
    emoji: '📦',
    color: '#E5B3FF',
    description: '收藏實用資源、工具、連結、素材',
    keywords: ['資源', '工具', '連結', '素材', '資料', '收藏', '參考'],
    systemPrompt: `你是專業的資源管理助手，幫助用戶整理和分類各種資源。
你的專長包括：資源分類、工具推薦、連結整理、素材管理。
請用專業整齊的語氣，幫助用戶建立有序的資源庫。`,
    personality: '有條理、注重分類、資訊豐富',
    chatStyle: '簡潔明瞭，善用分類標籤，提供清晰的資源組織建議',
  },
]

export class CategoryInitService {
  /**
   * 為使用者初始化預設分類系統
   */
  async initializeDefaultCategories(userId: string): Promise<{
    islands: any[]
    subcategories: any[]
  }> {
    try {
      logger.info(`[CategoryInit] 開始為使用者 ${userId} 初始化分類系統`)

      // 檢查是否已經初始化
      const existingIslands = await prisma.island.findMany({
        where: { userId },
      })

      if (existingIslands.length > 0) {
        logger.info(`[CategoryInit] 使用者 ${userId} 已有分類系統，跳過初始化`)
        const existingSubcategories = await prisma.subcategory.findMany({
          where: { userId },
        })
        return {
          islands: existingIslands,
          subcategories: existingSubcategories,
        }
      }

      // 創建5個島嶼
      const islands = await Promise.all(
        DEFAULT_ISLANDS.map((island) =>
          prisma.island.create({
            data: {
              userId,
              ...island,
            },
          })
        )
      )

      logger.info(`[CategoryInit] 創建了 ${islands.length} 個島嶼`)

      // 創建7個小類別
      const subcategories = await Promise.all(
        DEFAULT_SUBCATEGORIES.map((subcat) => {
          const island = islands[subcat.islandPosition]
          return prisma.subcategory.create({
            data: {
              userId,
              islandId: island.id,
              position: subcat.position,
              name: subcat.name,
              nameChinese: subcat.nameChinese,
              emoji: subcat.emoji,
              color: subcat.color,
              description: subcat.description,
              keywords: subcat.keywords,
              systemPrompt: subcat.systemPrompt,
              personality: subcat.personality,
              chatStyle: subcat.chatStyle,
            },
          })
        })
      )

      logger.info(`[CategoryInit] 創建了 ${subcategories.length} 個小類別`)

      // 更新島嶼的小類別數量
      await Promise.all(
        islands.map((island) => {
          const count = subcategories.filter((s) => s.islandId === island.id).length
          return prisma.island.update({
            where: { id: island.id },
            data: { subcategoryCount: count },
          })
        })
      )

      logger.info(`[CategoryInit] 使用者 ${userId} 的分類系統初始化完成`)

      return { islands, subcategories }
    } catch (error) {
      logger.error('[CategoryInit] 初始化分類系統失敗:', error)
      throw new Error('初始化分類系統失敗')
    }
  }

  /**
   * 獲取使用者的所有島嶼和分類
   */
  async getUserCategories(userId: string) {
    try {
      const islands = await prisma.island.findMany({
        where: { userId },
        orderBy: { position: 'asc' },
        include: {
          subcategories: {
            orderBy: { position: 'asc' },
          },
        },
      })

      return islands
    } catch (error) {
      logger.error('[CategoryInit] 獲取分類失敗:', error)
      throw new Error('獲取分類失敗')
    }
  }

  /**
   * 獲取使用者的某個小類別（SubAgent）
   */
  async getSubcategory(userId: string, subcategoryId: string) {
    try {
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          id: subcategoryId,
          userId,
        },
        include: {
          island: true,
        },
      })

      return subcategory
    } catch (error) {
      logger.error('[CategoryInit] 獲取小類別失敗:', error)
      throw new Error('獲取小類別失敗')
    }
  }

  /**
   * 根據 position 獲取小類別
   */
  async getSubcategoryByPosition(userId: string, position: number) {
    try {
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          userId,
          position,
        },
        include: {
          island: true,
        },
      })

      return subcategory
    } catch (error) {
      logger.error('[CategoryInit] 根據 position 獲取小類別失敗:', error)
      throw new Error('獲取小類別失敗')
    }
  }
}

export const categoryInitService = new CategoryInitService()
