import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { GET_MEMORIES, GET_PINNED_MEMORIES, PIN_MEMORY, UNPIN_MEMORY } from '../../graphql/memory'
import { Memory, MemoryCategory } from '../../types/memory'
import CreateMemoryModal from '../KnowledgeDatabase/CreateMemoryModal'
import MemoryDetailModal from '../KnowledgeDatabase/MemoryDetailModal'

type ViewMode = 'table' | 'card'
type SortField = 'createdAt' | 'aiImportance' | 'title'
type SortOrder = 'asc' | 'desc'

export default function DatabaseView() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)

  const { data: memoriesData, loading, refetch } = useQuery(GET_MEMORIES, {
    variables: {
      filter: selectedCategory ? { category: selectedCategory } : {},
      limit: 100,
    },
  })

  const { data: pinnedData } = useQuery(GET_PINNED_MEMORIES)
  const [pinMemory] = useMutation(PIN_MEMORY, { refetchQueries: ['GetMemories', 'GetPinnedMemories'] })
  const [unpinMemory] = useMutation(UNPIN_MEMORY, { refetchQueries: ['GetMemories', 'GetPinnedMemories'] })

  const categories: { value: MemoryCategory; label: string; emoji: string; color: string }[] = [
    { value: 'LEARNING', label: '學習筆記', emoji: '📚', color: '#FFB3D9' },
    { value: 'INSPIRATION', label: '靈感創意', emoji: '💡', color: '#FFFACD' },
    { value: 'WORK', label: '工作事務', emoji: '💼', color: '#B3D9FF' },
    { value: 'SOCIAL', label: '人際關係', emoji: '👥', color: '#D9FFB3' },
    { value: 'LIFE', label: '生活記錄', emoji: '🌱', color: '#FFE5B3' },
    { value: 'GOALS', label: '目標規劃', emoji: '🎯', color: '#FFB3B3' },
    { value: 'RESOURCES', label: '資源收藏', emoji: '📦', color: '#E5B3FF' },
  ]

  // 篩選和排序記憶
  const filteredMemories = useMemo(() => {
    let filtered = memoriesData?.memories || []

    // 搜尋過濾
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((m: Memory) =>
        m.title.toLowerCase().includes(query) ||
        m.summary?.toLowerCase().includes(query) ||
        m.rawContent.toLowerCase().includes(query) ||
        m.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // 排序
    filtered = [...filtered].sort((a: Memory, b: Memory) => {
      let comparison = 0
      if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortField === 'aiImportance') {
        comparison = a.aiImportance - b.aiImportance
      } else if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title, 'zh-TW')
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [memoriesData?.memories, searchQuery, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const handleTogglePin = async (memory: Memory) => {
    try {
      if (memory.isPinned) {
        await unpinMemory({ variables: { id: memory.id } })
      } else {
        await pinMemory({ variables: { id: memory.id } })
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }

  return (
    <div className="w-full min-h-screen flex" style={{ background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE5F0 100%)' }}>
      {/* 左側邊欄 - 分類篩選器 */}
      <div className="w-64 bg-white border-r-4 border-pink-200 flex flex-col" style={{
        boxShadow: '4px 0 20px rgba(255, 179, 217, 0.1)'
      }}>
        <div className="p-6 border-b-2 border-pink-100">
          <h2 className="text-xl font-bold mb-2" style={{ color: '#FF8FB3' }}>
            🗂️ 分類
          </h2>
          <p className="text-xs" style={{ color: '#999' }}>
            快速篩選你的記憶
          </p>
        </div>

        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className="w-full text-left px-4 py-3 rounded-xl font-medium transition-all hover:scale-105"
            style={!selectedCategory ? {
              background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
              color: 'white',
              boxShadow: '0 4px 15px rgba(255, 179, 217, 0.4)'
            } : {
              background: '#F8F8F8',
              color: '#666'
            }}
          >
            <div className="flex items-center justify-between">
              <span>🐱 全部記憶</span>
              <span className="text-sm opacity-75">
                {memoriesData?.memories?.length || 0}
              </span>
            </div>
          </button>

          {categories.map((cat) => {
            const count = memoriesData?.memories?.filter((m: Memory) => m.category === cat.value).length || 0
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className="w-full text-left px-4 py-3 rounded-xl font-medium transition-all hover:scale-105"
                style={selectedCategory === cat.value ? {
                  background: `linear-gradient(135deg, ${cat.color}, ${cat.color}CC)`,
                  color: 'white',
                  boxShadow: `0 4px 15px ${cat.color}66`
                } : {
                  background: '#F8F8F8',
                  color: '#666'
                }}
              >
                <div className="flex items-center justify-between">
                  <span>{cat.emoji} {cat.label}</span>
                  <span className="text-sm opacity-75">{count}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* 視圖切換 */}
        <div className="p-4 border-t-2 border-pink-100">
          <div className="text-xs mb-2" style={{ color: '#999' }}>視圖模式</div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={viewMode === 'table' ? {
                background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                color: 'white',
                boxShadow: '0 2px 10px rgba(255, 179, 217, 0.3)'
              } : {
                background: '#F8F8F8',
                color: '#999'
              }}
            >
              📊 表格
            </button>
            <button
              onClick={() => setViewMode('card')}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={viewMode === 'card' ? {
                background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                color: 'white',
                boxShadow: '0 2px 10px rgba(255, 179, 217, 0.3)'
              } : {
                background: '#F8F8F8',
                color: '#999'
              }}
            >
              🎴 卡片
            </button>
          </div>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="flex-1 flex flex-col">
        {/* 頂部導航欄 */}
        <div className="bg-white border-b-4 border-pink-200" style={{ boxShadow: '0 4px 20px rgba(255, 179, 217, 0.2)' }}>
          <div className="px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold" style={{
                color: '#FF8FB3',
                textShadow: '2px 2px 0px rgba(255, 245, 225, 0.8)'
              }}>
                🐾 Knowledge Database
              </h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-2 rounded-2xl font-medium transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                    color: 'white',
                    border: '2px solid #FFB3D9',
                    boxShadow: '0 2px 10px rgba(255, 179, 217, 0.5)'
                  }}
                >
                  ✨ 新增記憶
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-2 rounded-2xl font-medium transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #FFF5E1, #FFFACD)',
                    color: '#FF8FB3',
                    border: '2px solid #FFE5F0',
                    boxShadow: '0 2px 10px rgba(255, 245, 225, 0.5)'
                  }}
                >
                  🏝️ 返回島嶼
                </button>
              </div>
            </div>

            {/* 搜尋框 */}
            <input
              type="text"
              placeholder="🔍 搜尋標題、內容、標籤..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-3 rounded-2xl font-medium focus:outline-none transition-all"
              style={{
                border: '3px solid #FFE5F0',
                background: 'white',
                color: '#666',
                fontSize: '16px',
                boxShadow: '0 2px 15px rgba(255, 179, 217, 0.1)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 179, 217, 0.3)'
                e.currentTarget.style.borderColor = '#FFB3D9'
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 15px rgba(255, 179, 217, 0.1)'
                e.currentTarget.style.borderColor = '#FFE5F0'
              }}
            />
          </div>
        </div>

        {/* 內容區域 */}
        <div className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="text-7xl mb-4 animate-bounce">🐱</div>
              <p className="text-xl font-medium" style={{ color: '#FF8FB3' }}>載入記憶中...</p>
            </div>
          ) : viewMode === 'table' ? (
            <TableView
              memories={filteredMemories}
              pinnedMemories={pinnedData?.pinnedMemories || []}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleSort}
              onTogglePin={handleTogglePin}
              onSelectMemory={setSelectedMemory}
              categories={categories}
            />
          ) : (
            <CardView
              memories={filteredMemories}
              pinnedMemories={pinnedData?.pinnedMemories || []}
              onTogglePin={handleTogglePin}
              onSelectMemory={setSelectedMemory}
            />
          )}
        </div>
      </div>

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

// ============ Table View ============
interface TableViewProps {
  memories: Memory[]
  pinnedMemories: Memory[]
  sortField: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  onTogglePin: (memory: Memory) => void
  onSelectMemory: (memory: Memory) => void
  categories: { value: MemoryCategory; label: string; emoji: string; color: string }[]
}

function TableView({ memories, pinnedMemories, sortField, sortOrder, onSort, onTogglePin, onSelectMemory, categories }: TableViewProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="opacity-30">⇅</span>
    return sortOrder === 'asc' ? <span>↑</span> : <span>↓</span>
  }

  const allMemories = [...pinnedMemories, ...memories.filter(m => !m.isPinned)]

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{
      border: '3px solid #FFE5F0',
      boxShadow: '0 8px 30px rgba(255, 179, 217, 0.15)'
    }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: 'linear-gradient(135deg, #FFF5E1, #FFE5F0)', borderBottom: '2px solid #FFE5F0' }}>
            <th className="px-4 py-3 text-left w-8"></th>
            <th className="px-4 py-3 text-left w-12"></th>
            <th
              className="px-4 py-3 text-left cursor-pointer hover:bg-pink-50 transition-colors"
              onClick={() => onSort('title')}
            >
              <div className="flex items-center gap-2 font-bold" style={{ color: '#FF8FB3' }}>
                標題 <SortIcon field="title" />
              </div>
            </th>
            <th className="px-4 py-3 text-left">
              <div className="font-bold" style={{ color: '#FF8FB3' }}>分類</div>
            </th>
            <th className="px-4 py-3 text-left">
              <div className="font-bold" style={{ color: '#FF8FB3' }}>標籤</div>
            </th>
            <th className="px-4 py-3 text-left">
              <div className="font-bold" style={{ color: '#FF8FB3' }}>NPC</div>
            </th>
            <th
              className="px-4 py-3 text-left cursor-pointer hover:bg-pink-50 transition-colors"
              onClick={() => onSort('aiImportance')}
            >
              <div className="flex items-center gap-2 font-bold" style={{ color: '#FF8FB3' }}>
                重要度 <SortIcon field="aiImportance" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-left cursor-pointer hover:bg-pink-50 transition-colors"
              onClick={() => onSort('createdAt')}
            >
              <div className="flex items-center gap-2 font-bold" style={{ color: '#FF8FB3' }}>
                日期 <SortIcon field="createdAt" />
              </div>
            </th>
            <th className="px-4 py-3 text-right w-24"></th>
          </tr>
        </thead>
        <tbody>
          {allMemories.map((memory) => {
            const categoryInfo = categories.find(c => c.value === memory.category)
            const isHovered = hoveredRow === memory.id
            return (
              <tr
                key={memory.id}
                onMouseEnter={() => setHoveredRow(memory.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onSelectMemory(memory)}
                className="border-b border-pink-100 transition-all cursor-pointer"
                style={{
                  background: isHovered ? 'linear-gradient(135deg, #FFFEF9, #FFF5F0)' : 'white'
                }}
              >
                <td className="px-4 py-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onTogglePin(memory)
                    }}
                    className="text-xl hover:scale-125 transition-transform"
                    title={memory.isPinned ? '取消釘選' : '釘選'}
                  >
                    {memory.isPinned ? '📌' : (isHovered ? '📍' : '')}
                  </button>
                </td>
                <td className="px-4 py-4">
                  <span className="text-2xl">{memory.emoji}</span>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <div className="font-bold mb-1" style={{ color: '#FF8FB3' }}>
                      {memory.title}
                    </div>
                    {memory.summary && (
                      <div className="text-sm line-clamp-1" style={{ color: '#999' }}>
                        {memory.summary}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium inline-block"
                    style={{
                      background: `${categoryInfo?.color}33`,
                      color: categoryInfo?.color || '#666',
                      border: `2px solid ${categoryInfo?.color}66`
                    }}
                  >
                    {categoryInfo?.emoji} {categoryInfo?.label}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs rounded-full font-medium"
                        style={{
                          background: 'linear-gradient(135deg, #FFFACD, #FFF5E1)',
                          color: '#FF8FB3',
                          border: '1px solid #FFE5F0'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {memory.tags.length > 2 && (
                      <span className="text-xs" style={{ color: '#999' }}>
                        +{memory.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {memory.assistant && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{memory.assistant.emoji}</span>
                      <span className="text-sm font-medium" style={{ color: '#666' }}>
                        {memory.assistant.nameChinese}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-16 h-2 rounded-full overflow-hidden"
                      style={{ background: '#FFE5F0' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${memory.aiImportance * 10}%`,
                          background: 'linear-gradient(90deg, #FFB3D9, #FF8FB3)'
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#FF8FB3' }}>
                      {memory.aiImportance}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm" style={{ color: '#999' }}>
                    {new Date(memory.createdAt).toLocaleDateString('zh-TW', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  {isHovered && (
                    <span className="text-sm font-medium" style={{ color: '#FF8FB3' }}>
                      點擊查看 →
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {allMemories.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-lg font-medium" style={{ color: '#999' }}>沒有找到記憶</p>
        </div>
      )}
    </div>
  )
}

// ============ Card View ============
interface CardViewProps {
  memories: Memory[]
  pinnedMemories: Memory[]
  onTogglePin: (memory: Memory) => void
  onSelectMemory: (memory: Memory) => void
}

function CardView({ memories, pinnedMemories, onTogglePin, onSelectMemory }: CardViewProps) {
  const allMemories = [...pinnedMemories, ...memories.filter(m => !m.isPinned)]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {allMemories.map((memory) => (
        <MemoryCard key={memory.id} memory={memory} onTogglePin={onTogglePin} onSelectMemory={onSelectMemory} />
      ))}
    </div>
  )
}

function MemoryCard({ memory, onTogglePin, onSelectMemory }: { memory: Memory; onTogglePin: (memory: Memory) => void; onSelectMemory: (memory: Memory) => void }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="bg-white rounded-2xl p-4 cursor-pointer transition-all hover:scale-105"
      style={{
        border: '3px solid #FFE5F0',
        boxShadow: isHovered ? '0 8px 30px rgba(255, 179, 217, 0.3)' : '0 4px 15px rgba(255, 179, 217, 0.15)',
        borderColor: isHovered ? '#FFB3D9' : '#FFE5F0',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFEF9 100%)'
      }}
      onClick={() => onSelectMemory(memory)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{memory.emoji}</span>
          <div>
            <h3 className="font-bold" style={{ color: '#FF8FB3' }}>{memory.title}</h3>
            {memory.assistant && (
              <p className="text-xs" style={{ color: '#FFB3D9' }}>
                {memory.assistant.emoji} {memory.assistant.nameChinese}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin(memory)
          }}
          className="text-xl hover:scale-125 transition-transform"
          title={memory.isPinned ? '取消釘選' : '釘選'}
        >
          {memory.isPinned ? '📌' : '📍'}
        </button>
      </div>

      <p className="text-sm mb-3 line-clamp-2" style={{ color: '#666' }}>
        {memory.summary || memory.rawContent}
      </p>

      <div className="flex flex-wrap gap-1 mb-2">
        {memory.tags?.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-xs rounded-full font-medium"
            style={{
              background: 'linear-gradient(135deg, #FFFACD, #FFF5E1)',
              color: '#FF8FB3',
              border: '1px solid #FFE5F0'
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs" style={{ color: '#FFB3D9' }}>
        <span>🗓️ {new Date(memory.createdAt).toLocaleDateString('zh-TW')}</span>
        <span>⭐ {memory.aiImportance}/10</span>
      </div>
    </div>
  )
}
