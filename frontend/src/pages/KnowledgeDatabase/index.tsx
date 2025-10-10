import React, { useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_MEMORIES, GET_PINNED_MEMORIES } from '../../graphql/memory'
import { GET_ASSISTANTS } from '../../graphql/knowledge'
import { GET_SUBCATEGORIES, Subcategory } from '../../graphql/category'
import MemoryCard from './MemoryCard'
import MemoryDetailModal from './MemoryDetailModal'
import CreateMemoryModal from './CreateMemoryModal'
import AdvancedFilter, { FilterOptions } from '../../components/AdvancedFilter'
import type { Memory } from '../../graphql/memory'

type SortOption = 'recent' | 'alphabetical'
type ViewMode = 'grid' | 'list'

export default function KnowledgeDatabase() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>({})

  // 搜尋防抖處理
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch assistants for category filter
  const { data: assistantsData } = useQuery(GET_ASSISTANTS)

  // Fetch subcategories
  const { data: subcategoriesData } = useQuery(GET_SUBCATEGORIES)

  // Fetch pinned memories
  const { data: pinnedData } = useQuery(GET_PINNED_MEMORIES)

  // Fetch all memories
  const { data: memoriesData, loading, refetch } = useQuery(GET_MEMORIES, {
    variables: {
      filter: {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: debouncedSearchQuery || undefined,
        isArchived: showArchived,
      },
      limit: 100,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  })

  const memories: Memory[] = memoriesData?.memories || []
  const pinnedMemories: Memory[] = pinnedData?.pinnedMemories || []
  const assistants = assistantsData?.assistants || []
  const subcategories: Subcategory[] = subcategoriesData?.subcategories || []

  // 統計每個 subcategory 的記憶數量
  const subcategoryMemoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    memories.forEach((memory: Memory) => {
      if (memory.subcategoryId) {
        counts[memory.subcategoryId] = (counts[memory.subcategoryId] || 0) + 1
      }
    })
    pinnedMemories.forEach((memory: Memory) => {
      if (memory.subcategoryId) {
        counts[memory.subcategoryId] = (counts[memory.subcategoryId] || 0) + 1
      }
    })
    return counts
  }, [memories, pinnedMemories])

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

  // Sort and filter memories
  const sortedMemories = React.useMemo(() => {
    const pinnedIds = new Set(pinnedMemories.map(m => m.id))

    return memories
      .filter(memory => !pinnedIds.has(memory.id))
      .filter(memory => {
        // Subcategory 篩選
        if (selectedSubcategoryId) {
          if (memory.subcategoryId !== selectedSubcategoryId) return false
        }

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
  }, [memories, pinnedMemories, sortBy, selectedSubcategoryId, advancedFilters])

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #16213e 0%, #1a1a2e 100%)',
      }}
    >
      {/* Header - 動森風格夜晚模式 */}
      <div
        className="border-b sticky top-0 z-10 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(251, 191, 36, 0.15)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          {/* 標題區域 */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex items-baseline gap-3 px-4 py-2 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 146, 60, 0.2) 100%)',
                border: '2px solid rgba(251, 191, 36, 0.4)',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
              <h1 className="text-3xl font-black" style={{ color: '#fef3c7', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                🌙 知識寶庫
              </h1>
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(251, 191, 36, 0.3)',
                  color: '#fef3c7',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                }}
              >
                ✨ {pinnedMemories.length + sortedMemories.length}
              </span>
            </div>
          </div>

          {/* 分類和工具列 */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 分類按鈕 */}
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <button
                onClick={() => {
                  setSelectedCategory('all')
                  setSelectedSubcategoryId(null)
                  refetch()
                }}
                className="px-4 py-2 rounded-2xl font-bold text-sm transition-all hover:scale-105"
                style={selectedCategory === 'all' && !selectedSubcategoryId ? {
                  background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
                  color: '#1a1a2e',
                  boxShadow: '0 8px 20px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                } : {
                  background: 'rgba(30, 41, 59, 0.6)',
                  color: '#cbd5e1',
                  border: '2px solid rgba(251, 191, 36, 0.2)',
                }}
              >
                🌟 全部
              </button>
              {assistants.filter((a: any) => a.type !== 'CHIEF').map((assistant: any) => (
                <button
                  key={assistant.id}
                  onClick={() => {
                    setSelectedCategory(assistant.type)
                    setSelectedSubcategoryId(null)
                    refetch()
                  }}
                  className="px-4 py-2 rounded-2xl font-bold text-sm transition-all hover:scale-105"
                  style={selectedCategory === assistant.type && !selectedSubcategoryId ? {
                    background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
                    color: '#1a1a2e',
                    boxShadow: '0 8px 20px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                  } : {
                    background: 'rgba(30, 41, 59, 0.6)',
                    color: '#cbd5e1',
                    border: '2px solid rgba(251, 191, 36, 0.2)',
                  }}
                >
                  {assistant.emoji} {assistant.nameChinese}
                </button>
              ))}

              {/* Subcategory 按鈕 - 如果有自訂分類 */}
              {subcategories.length > 0 && (
                <>
                  <div style={{ width: '2px', height: '24px', background: 'rgba(251, 191, 36, 0.3)', margin: '0 8px' }} />
                  {subcategories.map((subcat) => (
                    <button
                      key={subcat.id}
                      onClick={() => {
                        setSelectedCategory('all')
                        setSelectedSubcategoryId(selectedSubcategoryId === subcat.id ? null : subcat.id)
                        refetch()
                      }}
                      className="px-4 py-2 rounded-2xl font-bold text-sm transition-all hover:scale-105 relative"
                      style={selectedSubcategoryId === subcat.id ? {
                        background: `linear-gradient(135deg, ${subcat.color} 0%, ${subcat.color}dd 100%)`,
                        color: '#ffffff',
                        boxShadow: `0 8px 20px ${subcat.color}66, inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
                      } : {
                        background: 'rgba(30, 41, 59, 0.6)',
                        color: '#cbd5e1',
                        border: `2px solid ${subcat.color}33`,
                      }}
                    >
                      {subcat.emoji} {subcat.nameChinese}
                      {(subcategoryMemoryCounts[subcat.id] || 0) > 0 && (
                        <span className="ml-2 opacity-90 text-xs">
                          {subcategoryMemoryCounts[subcat.id]}
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* 工具列 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* 搜尋欄 */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋記憶..."
                  className="w-64 px-4 py-2 pl-10 rounded-2xl focus:outline-none text-sm transition-all font-medium"
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '2px solid rgba(251, 191, 36, 0.2)',
                    color: '#fef3c7',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(251, 191, 36, 0.6)'
                    e.target.style.boxShadow = '0 0 0 4px rgba(251, 191, 36, 0.15)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(251, 191, 36, 0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <span className="absolute left-3 top-2.5 text-lg">🔍</span>
              </div>

              {/* 排序 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 rounded-2xl focus:outline-none text-sm transition-all cursor-pointer font-bold"
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '2px solid rgba(251, 191, 36, 0.2)',
                  color: '#cbd5e1',
                }}
              >
                <option value="recent">⏰ 最新</option>
                <option value="alphabetical">🔤 A-Z</option>
              </select>

              {/* 視圖切換 */}
              <div
                className="flex gap-1 p-1 rounded-2xl"
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '2px solid rgba(251, 191, 36, 0.2)',
                }}
              >
                <button
                  onClick={() => setViewMode('grid')}
                  className="p-2 rounded-xl transition-all"
                  style={viewMode === 'grid' ? {
                    background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
                    color: '#1a1a2e',
                  } : {
                    color: '#94a3b8',
                  }}
                  title="網格視圖"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="p-2 rounded-xl transition-all"
                  style={viewMode === 'list' ? {
                    background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
                    color: '#1a1a2e',
                  } : {
                    color: '#94a3b8',
                  }}
                  title="列表視圖"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* 封存切換 */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="px-4 py-2 rounded-2xl font-bold text-sm transition-all hover:scale-105"
                style={showArchived ? {
                  background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
                  color: '#1a1a2e',
                  boxShadow: '0 8px 20px rgba(251, 191, 36, 0.4)',
                } : {
                  background: 'rgba(30, 41, 59, 0.6)',
                  color: '#cbd5e1',
                  border: '2px solid rgba(251, 191, 36, 0.2)',
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
            <h2
              className="text-lg font-black mb-4 flex items-center gap-2 px-4 py-2 rounded-2xl inline-flex"
              style={{
                color: '#fef3c7',
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 146, 60, 0.2) 100%)',
                border: '2px solid rgba(251, 191, 36, 0.3)',
              }}
            >
              📌 釘選記憶
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
            <div
              className="inline-block animate-spin rounded-full h-16 w-16 border-4"
              style={{
                borderColor: 'rgba(251, 191, 36, 0.3)',
                borderTopColor: '#fbbf24',
              }}
            ></div>
            <p className="mt-4 font-bold text-lg" style={{ color: '#cbd5e1' }}>載入中...</p>
          </div>
        ) : sortedMemories.length === 0 ? (
          <div
            className="text-center py-20 rounded-3xl"
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '2px solid rgba(251, 191, 36, 0.2)',
            }}
          >
            <div className="text-7xl mb-4">🌸</div>
            <p className="text-xl font-black mb-2" style={{ color: '#fef3c7' }}>還沒有記憶呢</p>
            <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>開始記錄你的想法吧！</p>
          </div>
        ) : (
          <>
            {pinnedMemories.length > 0 && !showArchived && (
              <h2
                className="text-lg font-black mb-4 flex items-center gap-2 px-4 py-2 rounded-2xl inline-flex"
                style={{
                  color: '#fef3c7',
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 146, 60, 0.2) 100%)',
                  border: '2px solid rgba(251, 191, 36, 0.3)',
                }}
              >
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

      {/* Floating Action Button - 動森風格 */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full flex items-center justify-center z-20 transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
          boxShadow: '0 8px 32px rgba(251, 191, 36, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.3)',
          border: '3px solid rgba(255, 255, 255, 0.2)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(251, 191, 36, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(251, 191, 36, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.3)'
        }}
        title="新增記憶"
      >
        <span className="text-3xl">✨</span>
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
