import React, { useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_MEMORIES, GET_PINNED_MEMORIES } from '../../graphql/memory'
import { GET_ASSISTANTS } from '../../graphql/knowledge'
import MemoryCard from './MemoryCard'
import MemoryDetailModal from './MemoryDetailModal'
import CreateMemoryModal from './CreateMemoryModal'
import AdvancedFilter, { FilterOptions } from '../../components/AdvancedFilter'
import type { Memory } from '../../graphql/memory'

type SortOption = 'recent' | 'alphabetical'
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
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>({}) // 進階篩選狀態

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

  // 提取所有唯一標籤
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>()
    memories.forEach((memory: Memory) => {
      memory.tags.forEach((tag: string) => tagSet.add(tag))
    })
    pinnedMemories.forEach((memory: Memory) => {
      memory.tags.forEach((tag: string) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [memories, pinnedMemories])

  // Sort and filter memories - 使用 useMemo 避免重複排序和引用問題
  // 同時排除已釘選的記憶，避免重複顯示
  const sortedMemories = React.useMemo(() => {
    // 建立釘選記憶的 ID Set 用於快速查找
    const pinnedIds = new Set(pinnedMemories.map(m => m.id))

    // 過濾掉已釘選的記憶，然後應用進階篩選和排序
    return memories
      .filter(memory => !pinnedIds.has(memory.id)) // 排除已釘選的
      .filter(memory => {
        // 標籤篩選
        if (advancedFilters.selectedTags && advancedFilters.selectedTags.length > 0) {
          const hasMatchingTag = memory.tags.some(tag =>
            advancedFilters.selectedTags!.includes(tag)
          )
          if (!hasMatchingTag) return false
        }

        // 日期範圍篩選
        if (advancedFilters.dateRange?.start) {
          if (new Date(memory.createdAt) < new Date(advancedFilters.dateRange.start)) {
            return false
          }
        }
        if (advancedFilters.dateRange?.end) {
          // 設定為當天結束時間（23:59:59）
          const endDate = new Date(advancedFilters.dateRange.end)
          endDate.setHours(23, 59, 59, 999)
          if (new Date(memory.createdAt) > endDate) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'alphabetical':
            return (a.title || a.summary || '').localeCompare(b.title || b.summary || '')
          case 'recent':
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
      })
  }, [memories, pinnedMemories, sortBy, advancedFilters]) // 添加 advancedFilters 依賴

  return (
    <div className="min-h-screen" style={{ background: '#0f0f14' }}>
      {/* Header - 充分利用水平空間的布局 */}
      <div className="border-b sticky top-0 z-10 shadow-2xl backdrop-blur-lg" style={{ background: 'rgba(26, 26, 36, 0.95)', borderColor: '#35354a' }}>
        <div className="max-w-6xl mx-auto px-6 py-3">
          {/* 單行布局：所有控制項橫向排列，充分利用寬度 */}
          <div className="flex items-center gap-3 mb-3">
            {/* 左側：標題和統計 */}
            <div className="flex items-baseline gap-2 flex-shrink-0">
              <h1 className="text-2xl font-bold whitespace-nowrap" style={{ color: '#e8e8f0' }}>
                💝 知識寶庫
              </h1>
              <span className="text-xs font-medium px-2 py-1 rounded-full border" style={{ color: '#a8a8b8', background: '#2d2d3a', borderColor: '#2a2a38' }}>
                {pinnedMemories.length + sortedMemories.length}
              </span>
            </div>

            {/* 中間：分類篩選器 - 水平展開 */}
            <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
              <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#78788a' }}>|</span>
              <button
                onClick={() => {
                  setSelectedCategory('all')
                  refetch()
                }}
                className="px-4 py-1.5 rounded-full font-medium text-sm transition-all whitespace-nowrap hover:scale-105"
                style={selectedCategory === 'all' ? {
                  background: '#7c5cff',
                  color: '#e8e8f0',
                  boxShadow: '0 10px 25px rgba(124, 92, 255, 0.3)',
                  transform: 'scale(1.05)'
                } : {
                  background: '#2d2d3a',
                  color: '#a8a8b8',
                  border: '1px solid #2a2a38'
                }}
              >
                🌈 全部
              </button>
              {assistants.filter((a: any) => a.type !== 'CHIEF').map((assistant: any) => (
                <button
                  key={assistant.id}
                  onClick={() => {
                    setSelectedCategory(assistant.type)
                    refetch()
                  }}
                  className="px-4 py-1.5 rounded-full font-medium text-sm transition-all whitespace-nowrap hover:scale-105"
                  style={selectedCategory === assistant.type ? {
                    background: '#7c5cff',
                    color: '#e8e8f0',
                    boxShadow: '0 10px 25px rgba(124, 92, 255, 0.3)',
                    transform: 'scale(1.05)'
                  } : {
                    background: '#2d2d3a',
                    color: '#a8a8b8',
                    border: '1px solid #2a2a38'
                  }}
                >
                  {assistant.emoji} {assistant.nameChinese}
                </button>
              ))}
            </div>

            {/* 右側：搜尋和工具列 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* 搜尋欄 */}
              <div className="relative w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋記憶..."
                  className="w-full px-3 py-2 pl-9 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all"
                  style={{
                    background: '#2d2d3a',
                    borderColor: '#35354a',
                    color: '#e8e8f0'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7c5cff'
                    e.target.style.boxShadow = '0 0 0 3px rgba(124, 92, 255, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#35354a'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <svg className="w-4 h-4 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#78788a' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* 分隔線 */}
              <div className="h-6 w-px" style={{ background: '#35354a' }}></div>

              {/* 排序選擇器 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all cursor-pointer"
                style={{
                  background: '#2d2d3a',
                  borderColor: '#35354a',
                  color: '#e8e8f0'
                }}
              >
                <option value="recent">⏰ 最新</option>
                <option value="alphabetical">🔤 A-Z</option>
              </select>

              {/* 視圖切換 */}
              <div className="flex gap-1 rounded-lg p-1 border" style={{ background: '#2d2d3a', borderColor: '#2a2a38' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className="p-2 rounded transition-all"
                  style={viewMode === 'grid' ? {
                    background: '#7c5cff',
                    color: '#e8e8f0',
                    boxShadow: '0 10px 25px rgba(124, 92, 255, 0.3)'
                  } : {
                    color: '#78788a'
                  }}
                  title="網格視圖"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="p-2 rounded transition-all"
                  style={viewMode === 'list' ? {
                    background: '#7c5cff',
                    color: '#e8e8f0',
                    boxShadow: '0 10px 25px rgba(124, 92, 255, 0.3)'
                  } : {
                    color: '#78788a'
                  }}
                  title="列表視圖"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* 封存切換 */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap border"
                style={showArchived ? {
                  background: '#7c5cff',
                  color: '#e8e8f0',
                  boxShadow: '0 10px 25px rgba(124, 92, 255, 0.3)'
                } : {
                  background: '#2d2d3a',
                  color: '#a8a8b8',
                  borderColor: '#2a2a38'
                }}
                title={showArchived ? '隱藏封存' : '顯示封存'}
              >
                📦
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Advanced Filters */}
        {allTags.length > 0 && (
          <div className="mb-6">
            <AdvancedFilter
              allTags={allTags}
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
              onReset={() => setAdvancedFilters({})}
              style="cute"
            />
          </div>
        )}

        {/* Pinned Memories */}
        {pinnedMemories.length > 0 && !showArchived && (
          <div className="mb-6">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-1.5" style={{ color: '#e8e8f0' }}>
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
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: '#7c5cff', borderTopColor: 'transparent' }}></div>
            <p className="mt-4" style={{ color: '#a8a8b8' }}>載入中...</p>
          </div>
        ) : sortedMemories.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🌸</div>
            <p className="text-lg" style={{ color: '#a8a8b8' }}>還沒有記憶呢</p>
            <p className="text-sm mt-2" style={{ color: '#78788a' }}>開始記錄你的想法吧！</p>
          </div>
        ) : (
          <>
            {pinnedMemories.length > 0 && !showArchived && (
              <h2 className="text-base font-semibold mb-3 flex items-center gap-1.5" style={{ color: '#e8e8f0' }}>
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
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-20 transition-all duration-300 hover:scale-110"
        style={{
          background: '#7c5cff',
          color: '#e8e8f0',
          boxShadow: '0 20px 40px rgba(124, 92, 255, 0.4)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#ff6eb4'
          e.currentTarget.style.boxShadow = '0 20px 40px rgba(255, 110, 180, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#7c5cff'
          e.currentTarget.style.boxShadow = '0 20px 40px rgba(124, 92, 255, 0.4)'
        }}
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
