import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_MEMORIES, GET_PINNED_MEMORIES } from '../../graphql/memory'
import { Memory, MemoryCategory } from '../../types/memory'

type ViewMode = 'grid' | 'list' | 'timeline'

export default function DatabaseView() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: memoriesData, loading } = useQuery(GET_MEMORIES, {
    variables: {
      filter: selectedCategory ? { category: selectedCategory } : {},
      limit: 50,
    },
  })

  const { data: pinnedData } = useQuery(GET_PINNED_MEMORIES)

  const categories: { value: MemoryCategory; label: string; emoji: string }[] = [
    { value: 'LEARNING', label: '學習筆記', emoji: '📚' },
    { value: 'INSPIRATION', label: '靈感創意', emoji: '💡' },
    { value: 'WORK', label: '工作事務', emoji: '💼' },
    { value: 'SOCIAL', label: '人際關係', emoji: '👥' },
    { value: 'LIFE', label: '生活記錄', emoji: '🌱' },
    { value: 'GOALS', label: '目標規劃', emoji: '🎯' },
    { value: 'RESOURCES', label: '資源收藏', emoji: '📦' },
  ]

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">
              📚 Knowledge Database
            </h1>
            <nav className="flex gap-4">
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                島嶼視圖
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium">
                資料庫視圖
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded ${viewMode === 'grid' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
              >
                🔲 Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded ${viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
              >
                📋 List
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-2 rounded ${viewMode === 'timeline' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
              >
                📅 Timeline
              </button>
            </div>

            <input
              type="text"
              placeholder="搜尋記憶..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${!selectedCategory ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${selectedCategory === cat.value ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pinned Memories */}
        {pinnedData?.pinnedMemories && pinnedData.pinnedMemories.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">📌 釘選記憶</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pinnedData.pinnedMemories.map((memory: Memory) => (
                <MemoryCard key={memory.id} memory={memory} isPinned />
              ))}
            </div>
          </div>
        )}

        {/* Memories Grid/List */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            {selectedCategory ? categories.find(c => c.value === selectedCategory)?.label : '所有記憶'}
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">🌸</div>
              <p className="text-gray-600">載入記憶中...</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {memoriesData?.memories?.map((memory: Memory) => (
                <MemoryCard key={memory.id} memory={memory} viewMode={viewMode} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MemoryCard({ memory, isPinned, viewMode = 'grid' }: { memory: Memory; isPinned?: boolean; viewMode?: ViewMode }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer border border-gray-200 ${viewMode === 'list' ? 'flex items-center gap-4' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{memory.emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-800">{memory.title}</h3>
            {memory.assistant && (
              <p className="text-xs text-gray-500">
                {memory.assistant.emoji} {memory.assistant.nameChinese}
              </p>
            )}
          </div>
        </div>
        {isPinned && <span className="text-yellow-500">📌</span>}
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {memory.summary || memory.rawContent}
      </p>

      <div className="flex flex-wrap gap-1 mb-2">
        {memory.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{new Date(memory.createdAt).toLocaleDateString('zh-TW')}</span>
        <span>重要度: {memory.aiImportance}/10</span>
      </div>
    </div>
  )
}
