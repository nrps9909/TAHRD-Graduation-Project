import React, { useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_MEMORIES, GET_PINNED_MEMORIES } from '../../graphql/memory'
import { GET_ASSISTANTS } from '../../graphql/knowledge'
import MemoryCard from './MemoryCard'
import MemoryDetailModal from './MemoryDetailModal'
import CreateMemoryModal from './CreateMemoryModal'
import type { Memory } from '../../graphql/memory'

type SortOption = 'recent' | 'importance' | 'alphabetical'
type ViewMode = 'grid' | 'list'

export default function KnowledgeDatabase() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('') // 延遲搜尋
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false) // 進階篩選折疊狀態

  // 搜尋防抖處理
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500) // 500ms 延遲

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch assistants for category filter
  const { data: assistantsData } = useQuery(GET_ASSISTANTS)

  // Fetch pinned memories
  const { data: pinnedData } = useQuery(GET_PINNED_MEMORIES)

  // Fetch all memories (使用延遲後的搜尋查詢)
  const { data: memoriesData, loading, refetch } = useQuery(GET_MEMORIES, {
    variables: {
      filter: {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: debouncedSearchQuery || undefined, // 使用延遲搜尋
        isArchived: showArchived,
      },
      limit: 100,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network', // 確保資料正確更新
    notifyOnNetworkStatusChange: true, // 網路狀態改變時通知
  })

  // 直接從 query 結果取得資料，避免引用問題
  const memories: Memory[] = memoriesData?.memories || []
  const pinnedMemories: Memory[] = pinnedData?.pinnedMemories || []
  const assistants = assistantsData?.assistants || []

  // Sort memories - 使用 useMemo 避免重複排序和引用問題
  // 同時排除已釘選的記憶，避免重複顯示
  const sortedMemories = React.useMemo(() => {
    // 建立釘選記憶的 ID Set 用於快速查找
    const pinnedIds = new Set(pinnedMemories.map(m => m.id))

    // 過濾掉已釘選的記憶，然後排序
    return memories
      .filter(memory => !pinnedIds.has(memory.id)) // 排除已釘選的
      .sort((a, b) => {
        switch (sortBy) {
          case 'importance':
            return b.aiImportance - a.aiImportance
          case 'alphabetical':
            return (a.title || a.summary || '').localeCompare(b.title || b.summary || '')
          case 'recent':
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
      })
  }, [memories, pinnedMemories, sortBy]) // 依賴 memories、pinnedMemories 和 sortBy

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">
                💝 知識寶庫
              </h1>
              <p className="text-sm text-gray-500">
                {pinnedMemories.length + sortedMemories.length} 條記憶
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-pink-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-pink-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋記憶..."
              className="w-full px-4 py-2.5 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-gray-700 placeholder-gray-400 text-sm"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setSelectedCategory('all')
                  refetch()
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1.5">🌈</span>
                全部
              </button>
              {assistants.filter((a: any) => a.type !== 'CHIEF').map((assistant: any) => (
                <button
                  key={assistant.id}
                  onClick={() => {
                    setSelectedCategory(assistant.type)
                    refetch()
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    selectedCategory === assistant.type
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1.5">{assistant.emoji}</span>
                  {assistant.nameChinese}
                </button>
              ))}
            </div>

            {/* Advanced Filters Toggle */}
            <div className="space-y-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 text-gray-600 text-sm transition-colors flex items-center gap-1.5"
              >
                <span>🔧</span>
                <span>進階篩選</span>
                <span className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {/* Advanced Filters Content */}
              {showAdvancedFilters && (
                <div className="flex gap-2 flex-wrap items-center animate-slide-down">
                  {/* Sort Options */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-gray-700 text-sm hover:border-gray-300 transition-colors cursor-pointer"
                  >
                    <option value="recent">⏰ 最新</option>
                    <option value="importance">⭐ 重要</option>
                    <option value="alphabetical">🔤 A-Z</option>
                  </select>

                  {/* Show Archived Toggle */}
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                      showArchived
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-1">📦</span>
                    {showArchived ? '隱藏封存' : '顯示封存'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Pinned Memories */}
        {pinnedMemories.length > 0 && !showArchived && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              📌 釘選
            </h2>
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {pinnedMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  viewMode={viewMode}
                  onClick={() => setSelectedMemory(memory)}
                  onUpdate={() => refetch()}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Memories */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-baby-pink border-t-transparent"></div>
            <p className="text-gray-500 mt-4">載入中...</p>
          </div>
        ) : sortedMemories.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🌸</div>
            <p className="text-gray-500 text-lg">還沒有記憶呢</p>
            <p className="text-gray-400 text-sm mt-2">開始記錄你的想法吧！</p>
          </div>
        ) : (
          <>
            {pinnedMemories.length > 0 && !showArchived && (
              <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                📚 所有記憶
              </h2>
            )}
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {sortedMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  viewMode={viewMode}
                  onClick={() => setSelectedMemory(memory)}
                  onUpdate={() => refetch()}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-20"
        title="新增知識"
      >
        <span className="text-2xl">✨</span>
      </button>

      {/* Create Memory Modal */}
      {showCreateModal && (
        <CreateMemoryModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch()
            setShowCreateModal(false)
          }}
        />
      )}

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <MemoryDetailModal
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onUpdate={() => {
            refetch()
            setSelectedMemory(null)
          }}
        />
      )}
    </div>
  )
}
