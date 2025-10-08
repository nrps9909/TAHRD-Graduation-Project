import { useState } from 'react'
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
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Fetch assistants for category filter
  const { data: assistantsData } = useQuery(GET_ASSISTANTS)

  // Fetch pinned memories
  const { data: pinnedData } = useQuery(GET_PINNED_MEMORIES)

  // Fetch all memories
  const { data: memoriesData, loading, refetch } = useQuery(GET_MEMORIES, {
    variables: {
      filter: {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchQuery || undefined,
        isArchived: showArchived,
      },
      limit: 100,
      offset: 0,
    },
  })

  const memories: Memory[] = memoriesData?.memories || []
  const pinnedMemories: Memory[] = pinnedData?.pinnedMemories || []
  const assistants = assistantsData?.assistants || []

  // Sort memories
  const sortedMemories = [...memories].sort((a, b) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-baby-cream via-baby-yellow/30 to-baby-pink/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b-4 border-baby-blush/30 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-7xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-yellow-400 bg-clip-text text-transparent mb-3 tracking-wide">
                💝 知識寶庫
              </h1>
              <p className="text-lg text-gray-600 font-medium">
                你的療癒記憶空間 · 共 {memories.length} 條記憶
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* New Memory Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-br from-baby-pink to-baby-blush hover:from-pink-400 hover:to-pink-500 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-cute flex items-center gap-2"
              >
                <span>✨</span>
                <span>新增</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-br from-baby-pink to-baby-blush text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-br from-baby-pink to-baby-blush text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              placeholder="搜尋你的記憶... 💭"
              className="w-full px-4 py-3 pl-12 bg-white/90 border-2 border-baby-blush/50 rounded-xl focus:outline-none focus:border-baby-pink focus:ring-2 focus:ring-baby-pink/20 text-gray-800 placeholder-gray-400"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            {/* Category Filter */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-8 py-4 rounded-2xl font-black text-xl transition-all duration-100 transform hover:scale-105 active:scale-95 ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-br from-baby-pink to-baby-blush text-white shadow-2xl'
                    : 'bg-white/90 text-gray-700 hover:bg-white hover:shadow-lg border-4 border-transparent hover:border-baby-pink/30'
                }`}
                style={{
                  boxShadow: selectedCategory === 'all'
                    ? '0 20px 40px rgba(255, 182, 193, 0.4), 0 0 30px rgba(255, 182, 193, 0.3)'
                    : undefined,
                  willChange: 'transform'
                }}
              >
                <span className="text-3xl mr-2">🌈</span>
                全部
              </button>
              {assistants.filter((a: any) => a.type !== 'CHIEF').map((assistant: any) => (
                <button
                  key={assistant.id}
                  onClick={() => setSelectedCategory(assistant.type)}
                  className={`px-8 py-4 rounded-2xl font-black text-xl transition-all duration-100 transform hover:scale-105 active:scale-95 ${
                    selectedCategory === assistant.type
                      ? 'bg-gradient-to-br from-baby-pink to-baby-blush text-white shadow-2xl'
                      : 'bg-white/90 text-gray-700 hover:bg-white hover:shadow-lg border-4 border-transparent hover:border-baby-pink/30'
                  }`}
                  style={{
                    boxShadow: selectedCategory === assistant.type
                      ? '0 20px 40px rgba(255, 182, 193, 0.4), 0 0 30px rgba(255, 182, 193, 0.3)'
                      : undefined,
                    willChange: 'transform'
                  }}
                >
                  <span className="text-3xl mr-2">{assistant.emoji}</span>
                  {assistant.nameChinese}
                </button>
              ))}
            </div>

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-6 py-4 bg-white/90 border-4 border-baby-blush/50 rounded-2xl focus:outline-none focus:border-baby-pink text-gray-700 font-bold text-lg hover:shadow-lg transition-all duration-100 cursor-pointer"
              style={{ willChange: 'box-shadow' }}
            >
              <option value="recent">⏰ 最新優先</option>
              <option value="importance">⭐ 重要優先</option>
              <option value="alphabetical">🔤 字母排序</option>
            </select>

            {/* Show Archived Toggle */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-6 py-4 rounded-2xl font-bold text-lg transition-all duration-100 transform hover:scale-105 active:scale-95 ${
                showArchived
                  ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-lg'
                  : 'bg-white/90 text-gray-600 hover:bg-white hover:shadow-lg border-4 border-transparent hover:border-gray-300'
              }`}
              style={{ willChange: 'transform' }}
            >
              <span className="text-2xl mr-2">📦</span>
              {showArchived ? '隱藏已封存' : '顯示已封存'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Pinned Memories */}
        {pinnedMemories.length > 0 && !showArchived && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              📌 釘選的記憶
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
              <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
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
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-baby-pink to-baby-blush hover:from-pink-400 hover:to-pink-500 text-white rounded-full shadow-cute-xl hover:shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center z-20 animate-bounce-gentle"
        title="新增知識"
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
