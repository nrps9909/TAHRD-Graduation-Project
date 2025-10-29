/**
 * Category Management Modal V2 - 重新設計版本
 *
 * 特色：
 * 1. 管理島嶼（大岛屿）
 * 2. AI 自動生成 Prompt
 * 3. 更直觀的用戶體驗
 */

import React, { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GET_ISLANDS,
  CREATE_ISLAND,
  UPDATE_ISLAND,
  DELETE_ISLAND,
  INITIALIZE_CATEGORIES,
  Island,
} from '../graphql/category'
import { EditModal } from './CategoryEditModal'

interface CategoryManagementModalV2Props {
  isOpen: boolean
  onClose: () => void
}

interface EditState {
  island?: Island
  isNew: boolean
}

export const CategoryManagementModalV2: React.FC<CategoryManagementModalV2Props> = ({
  isOpen,
  onClose,
}) => {
  const [editState, setEditState] = useState<EditState | null>(null)

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

  const islands: Island[] = data?.islands || []
  const isLastIsland = islands.length <= 1

  // 初始化分類系統
  const handleInitialize = async () => {
    if (confirm('確定要初始化預設的 5 個島嶼嗎？')) {
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

  // 開始編輯
  const startEdit = (item?: Island, isNew = false) => {
    setEditState({ island: item, isNew })
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

    const confirmMessage = `確定要刪除島嶼「${island.nameChinese}」嗎？\n\n相關的記憶會保留，但會失去分類標籤。`

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 md:p-4">
      <div className="bg-[#232323] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-[#2a2a2a] to-[#323232]">
          <div>
            <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-[#d8c47e] to-[#e0cc86] bg-clip-text text-transparent">
              ✨ 自訂分類系統
            </h2>
            <p className="text-xs md:text-sm text-gray-400 mt-1 flex items-center gap-1">
              <span className="inline-block">🤖</span>
              <span>自訂名稱，AI 自動生成最佳提示詞</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl md:text-2xl leading-none flex-shrink-0 hover:rotate-90 transition-all duration-300"
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
              {/* 使用說明和新增按鈕 */}
              <div className="mb-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700/50 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-300 text-sm mb-2">💡 極簡操作流程</h3>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>1. 輸入<span className="text-[#d8c47e]">島嶼名稱</span></li>
                      <li>2. 點擊「<span className="text-purple-400">一鍵自動生成</span>」→ AI 自動填充所有設定</li>
                      <li>3. （可選）自訂島嶼的描述和外觀</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => startEdit(undefined, true)}
                    className="px-4 py-2 bg-gradient-to-r from-[#d8c47e] to-[#e0cc86] text-[#191919] rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105 text-sm font-medium whitespace-nowrap"
                  >
                    ✨ 新增島嶼
                  </button>
                </div>
              </div>

              {/* 提示訊息 */}
              {isLastIsland && (
                <div className="mb-4 bg-amber-900/20 border border-amber-700/50 text-amber-300 rounded-lg p-3 text-xs md:text-sm flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>至少需要保留一個島嶼來管理您的知識</span>
                </div>
              )}

              {/* 島嶼列表 */}
              <div className="space-y-3">
                {islands.map((island) => (
                  <IslandCard
                    key={island.id}
                    island={island}
                    isLastIsland={isLastIsland}
                    onEdit={() => startEdit(island, false)}
                    onDelete={() => handleDeleteIsland(island)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-800 bg-[#2a2a2a] flex justify-between items-center">
          <div className="text-xs md:text-sm text-gray-400">
            {islands.length} 個島嶼
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
            onCreate={createIsland}
            onUpdate={updateIsland}
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
  isLastIsland: boolean
  onEdit: () => void
  onDelete: () => void
}

const IslandCard: React.FC<IslandCardProps> = ({
  island,
  isLastIsland,
  onEdit,
  onDelete,
}) => {

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
    </motion.div>
  )
}

// ============ Export ============

export { EditModal } from './CategoryEditModal'
