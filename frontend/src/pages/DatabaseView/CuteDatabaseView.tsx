import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { GET_MEMORIES, PIN_MEMORY, UNPIN_MEMORY, DELETE_MEMORY, CREATE_MEMORY_DIRECT } from '../../graphql/memory'
import { Memory, MemoryCategory } from '../../types/memory'
import SimpleMemoryEditor from '../../components/SimpleMemoryEditor'
import MemoryEditor from '../../components/MemoryEditor'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import { useDebounce } from '../../hooks/useDebounce'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import { CategoryManagementModal } from '../../components/CategoryManagementModal'

type ViewMode = 'gallery' | 'list'
type SortField = 'createdAt' | 'title'

export default function CuteDatabaseView() {
  const [viewMode, setViewMode] = useState<ViewMode>('gallery')
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newMemoryId, setNewMemoryId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const { confirmState, confirm } = useConfirm()

  // 響應式：小螢幕預設收起側邊欄
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 獲取所有記憶（不做分類過濾，在前端過濾）
  const { data: memoriesData, loading, error, refetch } = useQuery(GET_MEMORIES, {
    variables: {
      filter: {},  // 不過濾分類，獲取所有記憶
      limit: 1000,  // 增加限制以獲取更多記憶
    },
    onError: (error) => {
      console.error('Failed to load memories:', error)
      toast.error('載入記憶失敗，請檢查網絡連接 😢')
    },
  })
  const [pinMemory] = useMutation(PIN_MEMORY, { refetchQueries: ['GetMemories'] })
  const [unpinMemory] = useMutation(UNPIN_MEMORY, { refetchQueries: ['GetMemories'] })
  const [deleteMemory] = useMutation(DELETE_MEMORY)
  const [createMemoryDirect] = useMutation(CREATE_MEMORY_DIRECT)

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleCreateNewMemory()
      }
      if (e.key === 'Escape') {
        if (searchQuery) {
          setSearchQuery('')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery])

  const categories: { value: MemoryCategory; label: string; emoji: string; color: string }[] = [
    { value: 'LEARNING', label: '學習', emoji: '📚', color: '#FFB3D9' },
    { value: 'INSPIRATION', label: '靈感', emoji: '💡', color: '#FFFACD' },
    { value: 'WORK', label: '工作', emoji: '💼', color: '#B3D9FF' },
    { value: 'SOCIAL', label: '社交', emoji: '👥', color: '#D9FFB3' },
    { value: 'LIFE', label: '生活', emoji: '🌱', color: '#FFE5B3' },
    { value: 'GOALS', label: '目標', emoji: '🎯', color: '#FFB3B3' },
    { value: 'RESOURCES', label: '資源', emoji: '📦', color: '#E5B3FF' },
  ]

  const filteredMemories = useMemo(() => {
    let filtered = memoriesData?.memories || []

    // 分類過濾
    if (selectedCategory) {
      filtered = filtered.filter((m: Memory) => m.category === selectedCategory)
    }

    // 搜尋過濾
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      filtered = filtered.filter((m: any) =>
        m.title?.toLowerCase().includes(query) ||
        m.summary?.toLowerCase().includes(query) ||
        m.rawContent.toLowerCase().includes(query) ||
        m.tags.some((tag: string) => tag.toLowerCase().includes(query))
      )
    }

    // 排序
    filtered = [...filtered].sort((a: Memory, b: Memory) => {
      // 先按釘選排序
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1
      }

      // 再按選擇的排序方式
      if (sortField === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else if (sortField === 'title') {
        return (a.title || '').localeCompare(b.title || '', 'zh-TW')
      }
      return 0
    })

    return filtered
  }, [memoriesData?.memories, selectedCategory, debouncedSearch, sortField])

  const handleTogglePin = async (memory: Memory, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      if (memory.isPinned) {
        await unpinMemory({ variables: { id: memory.id } })
        toast.success('已取消釘選 📍')
      } else {
        await pinMemory({ variables: { id: memory.id } })
        toast.success('記憶已釘選！📌')
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error)
      toast.error('釘選操作失敗 😢')
    }
  }

  const handleDelete = async (memory: Memory, e: React.MouseEvent) => {
    e.stopPropagation()

    const confirmed = await confirm({
      title: '刪除記憶',
      message: `確定要刪除「${memory.title || memory.summary || '這條記憶'}」嗎？此操作無法復原。`,
      confirmText: '確定刪除',
      cancelText: '取消',
      type: 'danger',
    })

    if (!confirmed) return

    try {
      await deleteMemory({ variables: { id: memory.id } })
      toast.success('記憶已刪除 🗑️')
      refetch()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('刪除失敗，請稍後再試 😢')
    }
  }

  // 創建新記憶（立即在資料庫創建）
  const handleCreateNewMemory = async () => {
    try {
      const result = await createMemoryDirect({
        variables: {
          input: {
            content: '',  // 空白內容
          },
        },
      })

      const newId = result.data?.createMemoryDirect?.id
      if (newId) {
        setNewMemoryId(newId)
        setShowCreateModal(true)
        toast.success('已創建新記憶 ✨')
      }
    } catch (error) {
      console.error('Create memory error:', error)
      toast.error('創建失敗，請稍後再試 😢')
    }
  }

  // 直接使用 filteredMemories，因為已經包含釘選狀態並排序了
  const allMemories = filteredMemories

  return (
    <div className="min-h-screen flex relative" style={{
      background: '#191919'
    }}>
      {/* 左側邊欄 - HackMD 夜間模式 */}
      <div
        className="border-r flex flex-col transition-all duration-300 ease-in-out relative"
        style={{
          width: sidebarOpen ? '224px' : '0',
          background: '#232323',
          borderColor: '#3d3d3d',
          boxShadow: sidebarOpen ? '1px 0 8px rgba(0, 0, 0, 0.3)' : 'none',
          overflow: 'hidden',
        }}
      >
        {/* 標題 */}
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#3d3d3d' }}>
          <div>
            <h1 className="text-base font-bold" style={{
              color: '#d8c47e',
            }}>
              💝 知識寶庫
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#999' }}>
              {filteredMemories.length} 條記憶
            </p>
          </div>
          {/* 收起按鈕 - 放在標題右側 */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: '#999' }}
            title="收起側邊欄"
            onMouseEnter={(e) => e.currentTarget.style.background = '#3d3d3d'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span className="text-sm">◀</span>
          </button>
        </div>

        {/* 設定分類按鈕 */}
        <div className="px-3 py-2 border-b" style={{ borderColor: '#3d3d3d' }}>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            style={{
              background: '#d8c47e',
              color: '#191919',
            }}
          >
            <span>🎨</span>
            <span>設定分類</span>
          </button>
        </div>

        {/* 分類篩選 */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-0.5">
            <button
              onClick={() => setSelectedCategory(null)}
              className="w-full text-left px-2.5 py-2 rounded-md text-xs font-medium transition-all hover:scale-[1.01]"
              style={!selectedCategory ? {
                background: '#3d3d3d',
                color: '#d8c47e',
              } : {
                background: '#2a2a2a',
                color: '#999',
              }}
            >
              <div className="flex items-center justify-between">
                <span>全部</span>
                <span className="text-xs opacity-75">
                  {memoriesData?.memories?.length || 0}
                </span>
              </div>
            </button>
            {categories.map((cat) => {
              const count = (memoriesData?.memories || []).filter((m: any) => m.category === cat.value).length
              const isSelected = selectedCategory === cat.value
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className="w-full text-left px-2.5 py-2 rounded-md text-xs font-medium transition-all hover:scale-[1.01]"
                  style={isSelected ? {
                    background: '#3d3d3d',
                    color: '#d8c47e',
                  } : {
                    background: '#2a2a2a',
                    color: '#999',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{cat.emoji} {cat.label}</span>
                    <span className="text-xs opacity-75">{count}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="flex-1 overflow-auto">
        {/* 頂部工具列 - 搜尋和快速操作 */}
        <div className="sticky top-0 z-40 border-b px-4 py-3 backdrop-blur-sm" style={{
          borderColor: '#3d3d3d',
          background: '#232323',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
        }}>
          <div className="flex items-center gap-3 max-w-7xl mx-auto">
            {/* 展開側邊欄按鈕 - 側邊欄收起時顯示 */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg transition-all flex-shrink-0"
                style={{ color: '#999' }}
                title="展開側邊欄"
                onMouseEnter={(e) => e.currentTarget.style.background = '#3d3d3d'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span className="text-base">☰</span>
              </button>
            )}

            {/* 搜尋框 */}
            <div className="flex-1 relative max-w-md">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋記憶..."
                className="w-full pl-8 pr-8 py-2 rounded-lg text-sm focus:outline-none transition-all"
                style={{
                  border: '1px solid #3d3d3d',
                  background: '#2a2a2a',
                  color: '#d4d4d4',
                }}
                onFocus={(e) => e.target.style.borderColor = '#d8c47e'}
                onBlur={(e) => e.target.style.borderColor = '#3d3d3d'}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#999' }}>
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
                  style={{ color: '#999', fontSize: '10px' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#3d3d3d'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  ✕
                </button>
              )}
            </div>

            {/* 快速操作 */}
            <div className="flex items-center gap-2">
              {/* 視圖切換 */}
              <div className="hidden sm:flex gap-1 p-1 rounded-lg" style={{ background: '#2a2a2a' }}>
                <button
                  onClick={() => setViewMode('gallery')}
                  className="px-2 py-1 rounded text-xs font-medium transition-all"
                  style={viewMode === 'gallery' ? {
                    background: '#3d3d3d',
                    color: '#d8c47e',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                  } : {
                    color: '#999',
                  }}
                  title="畫廊視圖"
                >
                  🎴
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="px-2 py-1 rounded text-xs font-medium transition-all"
                  style={viewMode === 'list' ? {
                    background: '#3d3d3d',
                    color: '#d8c47e',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                  } : {
                    color: '#999',
                  }}
                  title="列表視圖"
                >
                  📝
                </button>
              </div>

              {/* 排序 */}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="hidden md:block px-2 py-1.5 rounded-lg text-xs focus:outline-none"
                style={{
                  border: '1px solid #3d3d3d',
                  background: '#2a2a2a',
                  color: '#d4d4d4'
                }}
              >
                <option value="createdAt">最新</option>
                <option value="title">標題</option>
              </select>

              {/* 新增按鈕 */}
              <button
                onClick={handleCreateNewMemory}
                className="px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-105 text-xs whitespace-nowrap"
                style={{
                  background: '#d8c47e',
                  color: '#191919',
                }}
              >
                ✨ <span className="hidden sm:inline">新增</span>
              </button>

              {/* 返回按鈕 */}
              <button
                onClick={() => window.location.href = '/'}
                className="hidden sm:block px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-105 text-xs"
                style={{
                  background: '#3d3d3d',
                  color: '#d4d4d4',
                }}
              >
                🏝️ 返回
              </button>
            </div>
          </div>
        </div>

        {/* 內容區域 */}
        <div className="p-4">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-32 h-32 mb-6 rounded-3xl flex items-center justify-center" style={{
              background: '#3d3d3d',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
            }}>
              <span className="text-6xl">😢</span>
            </div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: '#d8c47e' }}>
              載入失敗
            </h3>
            <p className="text-sm mb-8" style={{ color: '#999' }}>
              {error.message.includes('Network') || error.message.includes('fetch')
                ? '無法連接到服務器，請檢查網絡連接'
                : '發生了一些問題，請稍後再試'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105"
                style={{
                  background: '#d8c47e',
                  color: '#191919',
                  boxShadow: '0 4px 15px rgba(216, 196, 126, 0.3)'
                }}
              >
                🔄 重新載入
              </button>
              <button
                onClick={() => refetch()}
                className="px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105"
                style={{
                  background: '#3d3d3d',
                  border: '2px solid #555',
                  color: '#d4d4d4',
                }}
              >
                🔁 重試
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 160px)' }}>
            <div className="text-8xl mb-6 animate-bounce">💝</div>
            <p className="text-2xl font-bold" style={{ color: '#d8c47e' }}>載入記憶中...</p>
          </div>
        ) : allMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 'calc(100vh - 160px)' }}>
            <div className="w-40 h-40 mb-8 rounded-3xl flex items-center justify-center animate-bounce" style={{
              background: '#3d3d3d',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)'
            }}>
              <span className="text-8xl">💝</span>
            </div>
            <h3 className="text-3xl font-bold mb-4" style={{ color: '#d8c47e' }}>
              {searchQuery ? '找不到相關記憶' : '開始記錄你的美好回憶吧！'}
            </h3>
            <p className="text-base mb-10" style={{ color: '#999' }}>
              {searchQuery
                ? '試試其他關鍵字，或清除搜尋看看全部記憶'
                : '按 ⌘N 或點擊上方的「新增」按鈕開始'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateNewMemory}
                className="px-10 py-5 rounded-2xl font-bold transition-all hover:scale-105 text-xl"
                style={{
                  background: '#d8c47e',
                  color: '#191919',
                  boxShadow: '0 6px 20px rgba(216, 196, 126, 0.3)'
                }}
              >
                ✨ 新增第一條記憶
              </button>
            )}
          </div>
        ) : viewMode === 'gallery' ? (
          <SimpleGalleryView
            memories={allMemories}
            onTogglePin={handleTogglePin}
            onSelectMemory={setSelectedMemory}
            onDelete={handleDelete}
          />
        ) : (
          <SimpleListView
            memories={allMemories}
            onTogglePin={handleTogglePin}
            onSelectMemory={setSelectedMemory}
            onDelete={handleDelete}
          />
        )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && newMemoryId && (
        <SimpleMemoryEditor
          memoryId={newMemoryId}
          onClose={() => {
            setShowCreateModal(false)
            setNewMemoryId(null)
            refetch()
          }}
          onSuccess={() => {
            refetch()
          }}
        />
      )}

      {selectedMemory && (
        <MemoryEditor
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onUpdate={() => {
            refetch()
            setSelectedMemory(null)
          }}
        />
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <CategoryManagementModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
        />
      )}

      {/* Toast 通知 */}
      {toast.toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onClose={() => toast.removeToast(t.id)}
        />
      ))}

      {/* 確認對話框 */}
      {confirmState.isOpen && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          type={confirmState.type}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
        />
      )}
    </div>
  )
}

// ============ 簡化畫廊視圖 ============
interface SimpleGalleryViewProps {
  memories: Memory[]
  onTogglePin: (memory: Memory, e?: React.MouseEvent) => void
  onSelectMemory: (memory: Memory) => void
  onDelete: (memory: Memory, e: React.MouseEvent) => void
}

function SimpleGalleryView({ memories, onTogglePin, onSelectMemory, onDelete }: SimpleGalleryViewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {memories.map((memory) => (
        <div
          key={memory.id}
          onClick={() => onSelectMemory(memory)}
          className="group relative rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02]"
          style={{
            background: '#2a2a2a',
            border: '2px solid #3d3d3d',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)'
            e.currentTarget.style.borderColor = '#d8c47e'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'
            e.currentTarget.style.borderColor = '#3d3d3d'
          }}
        >
          {/* 釘選按鈕 */}
          {memory.isPinned && (
            <div className="absolute top-2 right-2">
              <button
                onClick={(e) => onTogglePin(memory, e)}
                className="p-1 rounded-lg transition-all text-sm"
                style={{
                  background: '#d8c47e',
                  color: '#191919',
                }}
                title="取消釘選"
              >
                📌
              </button>
            </div>
          )}

          {/* Emoji */}
          <div className="text-4xl text-center mb-3">
            {memory.emoji}
          </div>

          {/* 標題 */}
          <h3 className="text-sm font-bold text-center mb-2 line-clamp-2" style={{ color: '#d8c47e' }}>
            {memory.title || memory.summary || '無標題記憶'}
          </h3>

          {/* 內容預覽 */}
          {memory.summary && (
            <p className="text-xs text-center line-clamp-2 mb-2" style={{ color: '#999' }}>
              {memory.summary}
            </p>
          )}

          {/* 標籤 */}
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mb-2">
              {memory.tags.slice(0, 2).map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{
                    background: '#3d3d3d',
                    color: '#d4d4d4',
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
          )}

          {/* Footer */}
          <div className="flex items-center justify-center text-xs pt-2 border-t" style={{
            borderColor: '#3d3d3d',
            color: '#999'
          }}>
            <span>
              {new Date(memory.createdAt).toLocaleDateString('zh-TW', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* 刪除按鈕（hover 顯示） */}
          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => onDelete(memory, e)}
              className="p-1 rounded-lg transition-all hover:scale-110 text-sm"
              style={{
                background: '#3d3d3d',
                border: '1.5px solid #555',
              }}
              title="刪除"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============ 簡化列表視圖 ============
interface SimpleListViewProps {
  memories: Memory[]
  onTogglePin: (memory: Memory, e?: React.MouseEvent) => void
  onSelectMemory: (memory: Memory) => void
  onDelete: (memory: Memory, e: React.MouseEvent) => void
}

function SimpleListView({ memories, onTogglePin, onSelectMemory, onDelete }: SimpleListViewProps) {
  return (
    <div className="space-y-2">
      {memories.map((memory) => (
        <div
          key={memory.id}
          onClick={() => onSelectMemory(memory)}
          className="group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.001]"
          style={{
            background: '#2a2a2a',
            border: '2px solid #3d3d3d',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)'
            e.currentTarget.style.borderColor = '#d8c47e'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'
            e.currentTarget.style.borderColor = '#3d3d3d'
          }}
        >
          {/* 釘選 - 固定寬度 */}
          <div className="flex-shrink-0 w-8">
            {memory.isPinned && (
              <button
                onClick={(e) => onTogglePin(memory, e)}
                className="p-1.5 rounded-lg transition-all text-base"
                style={{
                  background: '#d8c47e',
                  color: '#191919',
                }}
                title="取消釘選"
              >
                📌
              </button>
            )}
          </div>

          {/* Emoji - 固定寬度 */}
          <div className="flex-shrink-0 text-3xl w-12 text-center">
            {memory.emoji}
          </div>

          {/* 內容 */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold mb-0.5 truncate" style={{ color: '#d8c47e' }}>
              {memory.title || memory.summary || '無標題記憶'}
            </h3>
            {memory.summary && (
              <p className="text-xs line-clamp-1" style={{ color: '#999' }}>
                {memory.summary}
              </p>
            )}
          </div>

          {/* 標籤 - 固定寬度區域 */}
          <div className="flex-shrink-0 hidden md:flex items-center gap-1 w-44">
            {memory.tags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs font-medium rounded-full truncate max-w-[80px]"
                style={{
                  background: '#3d3d3d',
                  color: '#d4d4d4',
                }}
                title={tag}
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

          {/* 日期 - 固定寬度 */}
          <div className="flex-shrink-0 hidden lg:block text-xs w-20 text-right" style={{ color: '#999' }}>
            {new Date(memory.createdAt).toLocaleDateString('zh-TW', {
              month: 'short',
              day: 'numeric',
            })}
          </div>

          {/* 操作 - 固定寬度 */}
          <div className="flex-shrink-0 flex items-center gap-1 w-16 justify-end">
            <button
              onClick={(e) => onDelete(memory, e)}
              className="p-1.5 rounded-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100 text-sm"
              style={{
                background: '#3d3d3d',
                border: '1.5px solid #555',
              }}
              title="刪除"
            >
              🗑️
            </button>
            <div className="text-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#d8c47e' }}>
              →
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
