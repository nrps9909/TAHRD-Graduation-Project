/**
 * Category Management Modal V2 - 重新設計版本
 *
 * 特色：
 * 1. 樹狀結構顯示島嶼和小類別
 * 2. AI 自動生成 Prompt
 * 3. 可視化編輯 Prompt
 * 4. 更直觀的用戶體驗
 */

import React, { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GET_ISLANDS,
  CREATE_ISLAND,
  UPDATE_ISLAND,
  DELETE_ISLAND,
  CREATE_SUBCATEGORY,
  UPDATE_SUBCATEGORY,
  DELETE_SUBCATEGORY,
  INITIALIZE_CATEGORIES,
  Island,
  Subcategory,
} from '../graphql/category'
import { EditModal } from './CategoryEditModal'

interface CategoryManagementModalV2Props {
  isOpen: boolean
  onClose: () => void
}

type EditMode = 'island' | 'subcategory'

interface EditState {
  mode: EditMode
  island?: Island
  subcategory?: Subcategory
  isNew: boolean
}

export const CategoryManagementModalV2: React.FC<CategoryManagementModalV2Props> = ({
  isOpen,
  onClose,
}) => {
  const [editState, setEditState] = useState<EditState | null>(null)
  const [expandedIslands, setExpandedIslands] = useState<Set<string>>(new Set())

  // GraphQL
  const { data, loading, refetch } = useQuery(GET_ISLANDS)
  const [initializeCategories] = useMutation(INITIALIZE_CATEGORIES)
  const [createIsland] = useMutation(CREATE_ISLAND, {
    refetchQueries: [{ query: GET_ISLANDS }],
  })
  const [updateIsland] = useMutation(UPDATE_ISLAND, {
    refetchQueries: [{ query: GET_ISLANDS }],
  })
  const [deleteIsland] = useMutation(DELETE_ISLAND, {
    refetchQueries: [{ query: GET_ISLANDS }],
  })
  const [createSubcategory] = useMutation(CREATE_SUBCATEGORY, {
    refetchQueries: [{ query: GET_ISLANDS }],
  })
  const [updateSubcategory] = useMutation(UPDATE_SUBCATEGORY, {
    refetchQueries: [{ query: GET_ISLANDS }],
  })
  const [deleteSubcategory] = useMutation(DELETE_SUBCATEGORY, {
    refetchQueries: [{ query: GET_ISLANDS }],
  })

  const islands: Island[] = data?.islands || []
  const isLastIsland = islands.length <= 1

  // 初始化分類系統
  const handleInitialize = async () => {
    if (confirm('確定要初始化預設的 5 個島嶼和小類別嗎？')) {
      try {
        await initializeCategories()
        await refetch()
        alert('初始化成功！')
      } catch (error) {
        console.error('初始化失敗:', error)
        alert('初始化失敗，請查看控制台')
      }
    }
  }

  // 切換島嶼展開/收合
  const toggleIsland = (islandId: string) => {
    const newExpanded = new Set(expandedIslands)
    if (newExpanded.has(islandId)) {
      newExpanded.delete(islandId)
    } else {
      newExpanded.add(islandId)
    }
    setExpandedIslands(newExpanded)
  }

  // 開始編輯
  const startEdit = (mode: EditMode, item?: Island | Subcategory, isNew = false, islandId?: string) => {
    if (mode === 'island') {
      setEditState({ mode, island: item as Island, isNew })
    } else if (mode === 'subcategory') {
      const subcategoryData = item as Subcategory
      // 如果是新增，需要設定 islandId
      if (isNew && islandId) {
        setEditState({ mode, subcategory: { ...subcategoryData, islandId } as Subcategory, isNew })
      } else {
        setEditState({ mode, subcategory: subcategoryData, isNew })
      }
    }
  }

  // 關閉編輯
  const closeEdit = () => {
    setEditState(null)
  }

  // 刪除島嶼
  const handleDeleteIsland = async (island: Island) => {
    if (isLastIsland) {
      alert('❌ 無法刪除最後一個島嶼\n\n請至少保留一個島嶼來管理您的知識。')
      return
    }

    let confirmMessage = `確定要刪除島嶼「${island.nameChinese}」嗎？`

    if (island.subcategoryCount > 0) {
      confirmMessage = `⚠️ 刪除島嶼「${island.nameChinese}」將會同時刪除其下的 ${island.subcategoryCount} 個小類別。\n\n相關的記憶會保留，但會失去分類標籤。\n\n確定要繼續嗎？`
    }

    if (confirm(confirmMessage)) {
      try {
        await deleteIsland({ variables: { id: island.id } })
        alert('刪除成功！')
      } catch (error) {
        console.error('刪除失敗:', error)
        const errorMessage =
          error instanceof Error
            ? error.message
            : (error as { graphQLErrors?: Array<{ message: string }> })?.graphQLErrors?.[0]?.message || '刪除失敗'
        alert(errorMessage)
      }
    }
  }

  // 刪除小類別
  const handleDeleteSubcategory = async (subcategory: Subcategory) => {
    if (subcategory.memoryCount > 0) {
      alert('請先刪除該小類別下的所有記憶')
      return
    }

    if (confirm(`確定要刪除小類別「${subcategory.nameChinese}」嗎？`)) {
      try {
        await deleteSubcategory({ variables: { id: subcategory.id } })
        alert('刪除成功！')
      } catch (error) {
        console.error('刪除失敗:', error)
        alert('刪除失敗，請查看控制台')
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 md:p-4">
      <div className="bg-[#232323] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-800 flex items-center justify-between bg-[#2a2a2a]">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-[#d8c47e]">🎨 智能分類系統</h2>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              AI 自動生成提示詞，讓分類更智能
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl md:text-2xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">載入中...</div>
            </div>
          ) : islands.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-gray-400">尚未建立任何分類</div>
              <button
                onClick={handleInitialize}
                className="px-6 py-3 bg-[#d8c47e] text-[#191919] rounded-lg hover:bg-[#e0cc86] transition-colors"
              >
                初始化預設分類
              </button>
            </div>
          ) : (
            <div className="p-4 md:p-6">
              {/* 新增島嶼按鈕 */}
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => startEdit('island', undefined, true)}
                  className="px-4 py-2 bg-[#d8c47e] text-[#191919] rounded-lg hover:bg-[#e0cc86] transition-colors text-sm font-medium"
                >
                  + 新增島嶼
                </button>
              </div>

              {/* 提示訊息 */}
              {isLastIsland && (
                <div className="mb-4 bg-amber-900/20 border border-amber-700/50 text-amber-300 rounded-lg p-3 text-xs md:text-sm">
                  💡 至少需要保留一個島嶼來管理您的知識
                </div>
              )}

              {/* 島嶼樹狀列表 */}
              <div className="space-y-3">
                {islands.map((island) => (
                  <IslandCard
                    key={island.id}
                    island={island}
                    isExpanded={expandedIslands.has(island.id)}
                    isLastIsland={isLastIsland}
                    onToggle={() => toggleIsland(island.id)}
                    onEdit={() => startEdit('island', island, false)}
                    onDelete={() => handleDeleteIsland(island)}
                    onAddSubcategory={() => startEdit('subcategory', undefined, true, island.id)}
                    onEditSubcategory={(sub) => startEdit('subcategory', sub, false)}
                    onDeleteSubcategory={handleDeleteSubcategory}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-800 bg-[#2a2a2a] flex justify-between items-center">
          <div className="text-xs md:text-sm text-gray-400">
            {islands.length} 個島嶼，
            {islands.reduce((sum, i) => sum + (i.subcategoryCount || 0), 0)} 個小類別
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm md:text-base text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            關閉
          </button>
        </div>
      </div>

      {/* 編輯彈窗 */}
      <AnimatePresence>
        {editState && (
          <EditModal
            editState={editState}
            islands={islands}
            onClose={closeEdit}
            onCreate={editState.mode === 'island' ? createIsland : createSubcategory}
            onUpdate={editState.mode === 'island' ? updateIsland : updateSubcategory}
            onRefetch={refetch}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============ Island Card Component ============

interface IslandCardProps {
  island: Island
  isExpanded: boolean
  isLastIsland: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddSubcategory: () => void
  onEditSubcategory: (sub: Subcategory) => void
  onDeleteSubcategory: (sub: Subcategory) => void
}

const IslandCard: React.FC<IslandCardProps> = ({
  island,
  isExpanded,
  isLastIsland,
  onToggle,
  onEdit,
  onDelete,
  onAddSubcategory,
  onEditSubcategory,
  onDeleteSubcategory,
}) => {
  const hasSubcategories = island.subcategories && island.subcategories.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-700 rounded-lg overflow-hidden"
      style={{ borderLeftColor: island.color, borderLeftWidth: '4px' }}
    >
      {/* Island Header */}
      <div className="bg-[#2a2a2a] p-3 md:p-4">
        <div className="flex items-center gap-3">
          {/* 展開/收合按鈕 */}
          <button
            onClick={onToggle}
            className="text-xl text-gray-400 hover:text-gray-200 transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {/* Emoji */}
          <div className="text-2xl">{island.emoji}</div>

          {/* 名稱和資訊 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h3 className="font-bold text-[#d8c47e] text-base md:text-lg">
                {island.nameChinese}
              </h3>
              {island.name && (
                <span className="text-xs text-gray-500">{island.name}</span>
              )}
            </div>
            {island.description && (
              <p className="text-xs md:text-sm text-gray-400 mt-1">{island.description}</p>
            )}
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span>📚 {island.subcategoryCount} 個小類別</span>
              <span>💭 {island.memoryCount} 條記憶</span>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              編輯
            </button>
            <button
              onClick={onDelete}
              disabled={isLastIsland}
              className={`px-3 py-1 text-xs transition-colors ${
                isLastIsland
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-red-400 hover:text-red-300'
              }`}
              title={isLastIsland ? '至少需要保留一個島嶼' : '刪除島嶼'}
            >
              刪除
            </button>
          </div>
        </div>
      </div>

      {/* Subcategories */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-[#1E1E1E] p-3 md:p-4 space-y-2">
              {/* 新增小類別按鈕 */}
              <button
                onClick={onAddSubcategory}
                className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-400 transition-colors text-sm"
              >
                + 新增小類別到「{island.nameChinese}」
              </button>

              {/* 小類別列表 */}
              {hasSubcategories && (
                <div className="space-y-2 mt-3">
                  {island.subcategories!.map((sub) => (
                    <SubcategoryCard
                      key={sub.id}
                      subcategory={sub}
                      onEdit={() => onEditSubcategory(sub)}
                      onDelete={() => onDeleteSubcategory(sub)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============ Subcategory Card Component ============

interface SubcategoryCardProps {
  subcategory: Subcategory
  onEdit: () => void
  onDelete: () => void
}

const SubcategoryCard: React.FC<SubcategoryCardProps> = ({
  subcategory,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className="bg-[#2a2a2a] rounded-lg p-3 border-l-2"
      style={{ borderLeftColor: subcategory.color }}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl flex-shrink-0">{subcategory.emoji}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h4 className="font-semibold text-gray-200 text-sm">
              {subcategory.nameChinese}
            </h4>
            {subcategory.name && (
              <span className="text-xs text-gray-500">{subcategory.name}</span>
            )}
          </div>

          {subcategory.description && (
            <p className="text-xs text-gray-400 mt-1">{subcategory.description}</p>
          )}

          {subcategory.keywords && subcategory.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {subcategory.keywords.slice(0, 5).map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs"
                >
                  {keyword}
                </span>
              ))}
              {subcategory.keywords.length > 5 && (
                <span className="px-2 py-0.5 text-gray-500 text-xs">
                  +{subcategory.keywords.length - 5}
                </span>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-2 text-xs text-gray-500">
            <span>💭 {subcategory.memoryCount} 條記憶</span>
            <span>💬 {subcategory.chatCount} 次對話</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="px-2 py-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            編輯
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            刪除
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ Export ============

export { EditModal } from './CategoryEditModal'
