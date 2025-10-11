/**
 * Category Management Modal
 * 分類管理彈窗 - 管理島嶼和小類別
 */

import React, { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
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

interface CategoryManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'islands' | 'subcategories'

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('islands')
  const [editingIsland, setEditingIsland] = useState<Island | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null)
  const [showIslandForm, setShowIslandForm] = useState(false)
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false)

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
  const allSubcategories: Subcategory[] = islands.flatMap((i) => i.subcategories || [])

  // 初始化分類系統
  const handleInitialize = async () => {
    if (confirm('確定要初始化預設的 5 個島嶼和 7 個小類別嗎？')) {
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

  // 刪除島嶼
  const handleDeleteIsland = async (island: Island) => {
    if (island.subcategoryCount > 0) {
      alert('請先刪除該島嶼下的所有小類別')
      return
    }
    if (confirm(`確定要刪除島嶼「${island.nameChinese}」嗎？`)) {
      try {
        await deleteIsland({ variables: { id: island.id } })
        alert('刪除成功！')
      } catch (error) {
        console.error('刪除失敗:', error)
        alert('刪除失敗，請查看控制台')
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
      <div className="bg-[#232323] rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-800 flex items-center justify-between bg-[#2a2a2a]">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-[#d8c47e]">🎨 自訂分類系統</h2>
            <p className="text-xs md:text-sm text-gray-400 mt-1">管理你的島嶼和小類別</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl md:text-2xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-6 border-b border-gray-800 bg-[#2a2a2a]">
          <div className="flex gap-2 md:gap-4">
            <button
              onClick={() => setActiveTab('islands')}
              className={`py-2 md:py-3 px-3 md:px-4 font-medium border-b-2 transition-colors text-sm md:text-base ${
                activeTab === 'islands'
                  ? 'border-[#d8c47e] text-[#d8c47e]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className="hidden sm:inline">🏝️ 島嶼管理 ({islands.length})</span>
              <span className="sm:hidden">🏝️ ({islands.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('subcategories')}
              className={`py-2 md:py-3 px-3 md:px-4 font-medium border-b-2 transition-colors text-sm md:text-base ${
                activeTab === 'subcategories'
                  ? 'border-[#d8c47e] text-[#d8c47e]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className="hidden sm:inline">📚 小類別管理 ({allSubcategories.length})</span>
              <span className="sm:hidden">📚 ({allSubcategories.length})</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#1E1E1E]">
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
            <>
              {activeTab === 'islands' && (
                <IslandsTab
                  islands={islands}
                  onEdit={setEditingIsland}
                  onDelete={handleDeleteIsland}
                  onAdd={() => setShowIslandForm(true)}
                />
              )}
              {activeTab === 'subcategories' && (
                <SubcategoriesTab
                  subcategories={allSubcategories}
                  islands={islands}
                  onEdit={setEditingSubcategory}
                  onDelete={handleDeleteSubcategory}
                  onAdd={() => setShowSubcategoryForm(true)}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-800 bg-[#2a2a2a] flex justify-end gap-2 md:gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm md:text-base text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            關閉
          </button>
        </div>
      </div>

      {/* Forms */}
      {showIslandForm && (
        <IslandFormModal
          onClose={() => setShowIslandForm(false)}
          onCreate={createIsland}
          onRefetch={refetch}
        />
      )}
      {editingIsland && (
        <IslandFormModal
          island={editingIsland}
          onClose={() => setEditingIsland(null)}
          onUpdate={updateIsland}
          onRefetch={refetch}
        />
      )}
      {showSubcategoryForm && (
        <SubcategoryFormModal
          islands={islands}
          onClose={() => setShowSubcategoryForm(false)}
          onCreate={createSubcategory}
          onRefetch={refetch}
        />
      )}
      {editingSubcategory && (
        <SubcategoryFormModal
          subcategory={editingSubcategory}
          islands={islands}
          onClose={() => setEditingSubcategory(null)}
          onUpdate={updateSubcategory}
          onRefetch={refetch}
        />
      )}
    </div>
  )
}

// ============ Islands Tab ============

interface IslandsTabProps {
  islands: Island[]
  onEdit: (island: Island) => void
  onDelete: (island: Island) => void
  onAdd: () => void
}

const IslandsTab: React.FC<IslandsTabProps> = ({ islands, onEdit, onDelete, onAdd }) => {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex justify-between items-center gap-2">
        <h3 className="text-base md:text-lg font-semibold text-gray-200">島嶼列表</h3>
        <button
          onClick={onAdd}
          className="px-3 md:px-4 py-2 bg-[#d8c47e] text-white rounded-lg hover:bg-[#e0cc86] transition-colors text-xs md:text-sm whitespace-nowrap"
        >
          + 新增島嶼
        </button>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
        {islands.map((island) => (
          <div
            key={island.id}
            className="border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow"
            style={{ borderLeftColor: island.color, borderLeftWidth: '4px' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                <div className="text-2xl md:text-3xl flex-shrink-0">{island.emoji}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[#d8c47e] text-sm md:text-base">{island.nameChinese}</h4>
                  <p className="text-xs md:text-sm text-gray-400">{island.name}</p>
                  {island.description && (
                    <p className="text-xs md:text-sm text-gray-300 mt-1 line-clamp-2">{island.description}</p>
                  )}
                  <div className="flex gap-2 md:gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                    <span>📚 {island.subcategoryCount} 個小類別</span>
                    <span>💭 {island.memoryCount} 條記憶</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-1 md:gap-2 flex-shrink-0">
                <button
                  onClick={() => onEdit(island)}
                  className="text-[#6495ED] hover:text-[#87CEEB] text-xs md:text-sm whitespace-nowrap"
                >
                  編輯
                </button>
                <button
                  onClick={() => onDelete(island)}
                  className="text-[#E74C3C] hover:text-[#C0392B] text-xs md:text-sm whitespace-nowrap"
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ Subcategories Tab ============

interface SubcategoriesTabProps {
  subcategories: Subcategory[]
  islands: Island[]
  onEdit: (subcategory: Subcategory) => void
  onDelete: (subcategory: Subcategory) => void
  onAdd: () => void
}

const SubcategoriesTab: React.FC<SubcategoriesTabProps> = ({
  subcategories,
  islands,
  onEdit,
  onDelete,
  onAdd,
}) => {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex justify-between items-center gap-2">
        <h3 className="text-base md:text-lg font-semibold text-gray-200">小類別列表</h3>
        <button
          onClick={onAdd}
          className="px-3 md:px-4 py-2 bg-[#d8c47e] text-white rounded-lg hover:bg-[#e0cc86] transition-colors text-xs md:text-sm whitespace-nowrap"
        >
          + 新增小類別
        </button>
      </div>

      <div className="space-y-2 md:space-y-3">
        {subcategories.map((subcategory) => {
          const island = islands.find((i) => i.id === subcategory.islandId)
          return (
            <div
              key={subcategory.id}
              className="border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow"
              style={{ borderLeftColor: subcategory.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                  <div className="text-xl md:text-2xl flex-shrink-0">{subcategory.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-[#d8c47e] text-sm md:text-base">
                        {subcategory.nameChinese}
                      </h4>
                      {island && (
                        <span className="text-xs bg-gray-700 px-2 py-0.5 md:py-1 rounded whitespace-nowrap">
                          {island.emoji} {island.nameChinese}
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-gray-400">{subcategory.name}</p>
                    {subcategory.description && (
                      <p className="text-xs md:text-sm text-gray-300 mt-1 line-clamp-2">{subcategory.description}</p>
                    )}
                    <div className="flex gap-2 md:gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                      <span>💭 {subcategory.memoryCount} 條記憶</span>
                      <span>💬 {subcategory.chatCount} 次對話</span>
                      <span>🏷️ {subcategory.keywords.length} 個關鍵字</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-1 md:gap-2 flex-shrink-0">
                  <button
                    onClick={() => onEdit(subcategory)}
                    className="text-[#6495ED] hover:text-[#87CEEB] text-xs md:text-sm whitespace-nowrap"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => onDelete(subcategory)}
                    className="text-[#E74C3C] hover:text-[#C0392B] text-xs md:text-sm whitespace-nowrap"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============ Island Form Modal ============

interface IslandFormModalProps {
  island?: Island
  onClose: () => void
  onCreate?: (variables: { variables: { input: { name: string; nameChinese: string; emoji?: string; color?: string; description?: string } } }) => Promise<unknown>
  onUpdate?: (variables: { variables: { id: string; input: { name?: string; nameChinese?: string; emoji?: string; color?: string; description?: string } } }) => Promise<unknown>
  onRefetch: () => void
}

const IslandFormModal: React.FC<IslandFormModalProps> = ({
  island,
  onClose,
  onCreate,
  onUpdate,
  onRefetch,
}) => {
  const [formData, setFormData] = useState({
    name: island?.name || '',
    nameChinese: island?.nameChinese || '',
    emoji: island?.emoji || '🏝️',
    color: island?.color || '#FFB3D9',
    description: island?.description || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (island) {
        if (onUpdate) {
          await onUpdate({ variables: { id: island.id, input: formData } })
        }
      } else {
        if (onCreate) {
          await onCreate({ variables: { input: formData } })
        }
      }
      await onRefetch()
      onClose()
      alert(island ? '更新成功！' : '創建成功！')
    } catch (error) {
      console.error('操作失敗:', error)
      alert('操作失敗，請查看控制台')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-2 md:p-4">
      <div className="bg-[#2a2a2a] rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b">
          <h3 className="text-base md:text-lg font-semibold">
            {island ? '編輯島嶼' : '新增島嶼'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              中文名稱 *
            </label>
            <input
              type="text"
              value={formData.nameChinese}
              onChange={(e) =>
                setFormData({ ...formData, nameChinese: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              英文名稱 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Emoji</label>
              <input
                type="text"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent text-2xl text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">顏色</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent"
              rows={3}
            />
          </div>
          <div className="flex gap-2 md:gap-3 pt-3 md:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 md:px-4 py-2 border rounded-lg hover:bg-gray-700 transition-colors text-sm md:text-base"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-3 md:px-4 py-2 bg-[#d8c47e] text-white rounded-lg hover:bg-[#e0cc86] transition-colors text-sm md:text-base"
            >
              {island ? '更新' : '創建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ Subcategory Form Modal ============

interface SubcategoryFormModalProps {
  subcategory?: Subcategory
  islands: Island[]
  onClose: () => void
  onCreate?: (variables: { variables: { input: { islandId: string; name?: string; nameChinese: string; emoji?: string; color?: string; description?: string; systemPrompt: string; personality: string; chatStyle: string; keywords?: string[] } } }) => Promise<unknown>
  onUpdate?: (variables: { variables: { id: string; input: { islandId?: string; name?: string; nameChinese?: string; emoji?: string; color?: string; description?: string; systemPrompt?: string; personality?: string; chatStyle?: string; keywords?: string[] } } }) => Promise<unknown>
  onRefetch: () => void
}

const SubcategoryFormModal: React.FC<SubcategoryFormModalProps> = ({
  subcategory,
  islands,
  onClose,
  onCreate,
  onUpdate,
  onRefetch,
}) => {
  const [formData, setFormData] = useState({
    islandId: subcategory?.islandId || islands[0]?.id || '',
    name: subcategory?.name || '',
    nameChinese: subcategory?.nameChinese || '',
    emoji: subcategory?.emoji || '📚',
    color: subcategory?.color || '#FFB3D9',
    description: subcategory?.description || '',
    keywords: subcategory?.keywords.join(', ') || '',
    systemPrompt: subcategory?.systemPrompt || '',
    personality: subcategory?.personality || '',
    chatStyle: subcategory?.chatStyle || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const input = {
        ...formData,
        keywords: formData.keywords.split(',').map((k) => k.trim()).filter(Boolean),
      }
      if (subcategory) {
        if (onUpdate) {
          await onUpdate({ variables: { id: subcategory.id, input } })
        }
      } else {
        if (onCreate) {
          await onCreate({ variables: { input } })
        }
      }
      await onRefetch()
      onClose()
      alert(subcategory ? '更新成功！' : '創建成功！')
    } catch (error) {
      console.error('操作失敗:', error)
      alert('操作失敗，請查看控制台')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-2 md:p-4">
      <div className="bg-[#2a2a2a] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b sticky top-0 bg-[#2a2a2a]">
          <h3 className="text-base md:text-lg font-semibold">
            {subcategory ? '編輯小類別' : '新增小類別'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              所屬島嶼 *
            </label>
            <select
              value={formData.islandId}
              onChange={(e) => setFormData({ ...formData, islandId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent"
              required
            >
              {islands.map((island) => (
                <option key={island.id} value={island.id}>
                  {island.emoji} {island.nameChinese}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-200 mb-1">
                中文名稱 *
              </label>
              <input
                type="text"
                value={formData.nameChinese}
                onChange={(e) =>
                  setFormData({ ...formData, nameChinese: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent text-sm md:text-base"
                required
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-200 mb-1">
                英文名稱 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent text-sm md:text-base"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-200 mb-1">Emoji</label>
              <input
                type="text"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent text-xl md:text-2xl text-center"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-200 mb-1">顏色</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-200 mb-1">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent text-sm md:text-base"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-200 mb-1">
              關鍵字（逗號分隔）
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent text-sm md:text-base"
              placeholder="學習, 教育, 知識"
            />
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-200 mb-1">
              AI 系統提示詞 *
            </label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) =>
                setFormData({ ...formData, systemPrompt: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent font-mono text-xs md:text-sm"
              rows={4}
              required
              placeholder="你是專注於...的知識管理助手"
            />
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-200 mb-1">
              個性特質 *
            </label>
            <input
              type="text"
              value={formData.personality}
              onChange={(e) =>
                setFormData({ ...formData, personality: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent text-sm md:text-base"
              required
              placeholder="認真專注、邏輯清晰、善於總結"
            />
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-200 mb-1">
              對話風格 *
            </label>
            <input
              type="text"
              value={formData.chatStyle}
              onChange={(e) =>
                setFormData({ ...formData, chatStyle: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-700 bg-[#1E1E1E] text-gray-200 rounded-lg focus:ring-2 focus:ring-[#d8c47e] focus:border-transparent text-sm md:text-base"
              required
              placeholder="使用專業術語但保持易懂，常用列表和重點標記"
            />
          </div>
          <div className="flex gap-2 md:gap-3 pt-3 md:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 md:px-4 py-2 border rounded-lg hover:bg-gray-700 transition-colors text-sm md:text-base"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-3 md:px-4 py-2 bg-[#d8c47e] text-white rounded-lg hover:bg-[#e0cc86] transition-colors text-sm md:text-base"
            >
              {subcategory ? '更新' : '創建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
