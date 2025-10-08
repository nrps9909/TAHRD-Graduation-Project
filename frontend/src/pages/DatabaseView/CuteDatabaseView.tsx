import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { GET_MEMORIES, GET_PINNED_MEMORIES, PIN_MEMORY, UNPIN_MEMORY, UPDATE_MEMORY, DELETE_MEMORY, ARCHIVE_MEMORY } from '../../graphql/memory'
import { Memory, MemoryCategory } from '../../types/memory'
import CreateMemoryModal from '../KnowledgeDatabase/CreateMemoryModal'
import MemoryDetailModal from '../KnowledgeDatabase/MemoryDetailModal'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import { useDebounce } from '../../hooks/useDebounce'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import AdvancedFilter, { FilterOptions } from '../../components/AdvancedFilter'
import BulkActionsBar from '../../components/BulkActionsBar'
import Pagination from '../../components/Pagination'
import MemoryPreviewCard from '../../components/MemoryPreviewCard'

type ViewMode = 'table' | 'gallery' | 'list'
type SortField = 'createdAt' | 'aiImportance' | 'title'
type SortOrder = 'asc' | 'desc'

export default function CuteDatabaseView() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [hoveredMemory, setHoveredMemory] = useState<Memory | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
  const searchInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const { confirmState, confirm } = useConfirm()

  const { data: memoriesData, loading, error, refetch } = useQuery(GET_MEMORIES, {
    variables: {
      filter: selectedCategory ? { category: selectedCategory } : {},
      limit: 100,
    },
    onError: (error) => {
      console.error('Failed to load memories:', error)
      toast.error('載入記憶失敗，請檢查網絡連接 😢')
    },
  })

  const { data: pinnedData } = useQuery(GET_PINNED_MEMORIES, {
    onError: (error) => {
      console.error('Failed to load pinned memories:', error)
    },
  })
  const [pinMemory] = useMutation(PIN_MEMORY, { refetchQueries: ['GetMemories', 'GetPinnedMemories'] })
  const [unpinMemory] = useMutation(UNPIN_MEMORY, { refetchQueries: ['GetMemories', 'GetPinnedMemories'] })
  const [updateMemory] = useMutation(UPDATE_MEMORY)
  const [deleteMemory] = useMutation(DELETE_MEMORY)
  const [archiveMemory] = useMutation(ARCHIVE_MEMORY)

  // Keyboard shortcuts - 可愛提示音效
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setShowCreateModal(true)
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

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    memoriesData?.memories?.forEach((m: Memory) => {
      m.tags.forEach((tag: string) => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [memoriesData?.memories])

  const filteredMemories = useMemo(() => {
    let filtered = memoriesData?.memories || []

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      filtered = filtered.filter((m: any) =>
        m.title?.toLowerCase().includes(query) ||
        m.summary?.toLowerCase().includes(query) ||
        m.rawContent.toLowerCase().includes(query) ||
        m.tags.some((tag: string) => tag.toLowerCase().includes(query))
      )
    }

    // Date range filter
    if (advancedFilters.dateRange?.start || advancedFilters.dateRange?.end) {
      filtered = filtered.filter((m: Memory) => {
        const date = new Date(m.createdAt)
        const start = advancedFilters.dateRange?.start ? new Date(advancedFilters.dateRange.start) : null
        const end = advancedFilters.dateRange?.end ? new Date(advancedFilters.dateRange.end) : null

        if (start && date < start) return false
        if (end) {
          end.setHours(23, 59, 59, 999)
          if (date > end) return false
        }
        return true
      })
    }

    // Importance range filter
    if (advancedFilters.importanceRange) {
      filtered = filtered.filter((m: Memory) => {
        const { min = 0, max = 10 } = advancedFilters.importanceRange!
        return m.aiImportance >= min && m.aiImportance <= max
      })
    }

    // Tags filter
    if (advancedFilters.selectedTags && advancedFilters.selectedTags.length > 0) {
      filtered = filtered.filter((m: Memory) =>
        advancedFilters.selectedTags!.some((tag) => m.tags.includes(tag))
      )
    }

    // Sort
    filtered = [...filtered].sort((a: Memory, b: Memory) => {
      let comparison = 0
      if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortField === 'aiImportance') {
        comparison = a.aiImportance - b.aiImportance
      } else if (sortField === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '', 'zh-TW')
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [memoriesData?.memories, debouncedSearch, sortField, sortOrder, advancedFilters])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

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

  const handleQuickDelete = async (memory: Memory, e: React.MouseEvent) => {
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

  const handleQuickArchive = async (memory: Memory, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await archiveMemory({ variables: { id: memory.id } })
      toast.success('記憶已封存 📦')
      refetch()
    } catch (error) {
      console.error('Archive error:', error)
      toast.error('封存失敗，請稍後再試 😢')
    }
  }

  const startEditing = (memory: Memory, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingMemoryId(memory.id)
    setEditingTitle(memory.title || memory.summary || '')
  }

  const saveTitle = async (memoryId: string) => {
    try {
      await updateMemory({
        variables: {
          id: memoryId,
          input: { title: editingTitle },
        },
      })
      setEditingMemoryId(null)
      toast.success('標題已更新 ✨')
      refetch()
    } catch (error) {
      console.error('Update error:', error)
      toast.error('更新失敗，請稍後再試 😢')
    }
  }

  const allMemories = useMemo(() => {
    const pinned = pinnedData?.pinnedMemories || []
    const unpinned = filteredMemories.filter((m: Memory) => !m.isPinned)
    return [...pinned, ...unpinned]
  }, [pinnedData?.pinnedMemories, filteredMemories])

  // Pagination
  const totalPages = Math.ceil(allMemories.length / itemsPerPage)
  const paginatedMemories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return allMemories.slice(startIndex, endIndex)
  }, [allMemories, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, selectedCategory, advancedFilters])

  // Bulk actions
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedIds(new Set(allMemories.map((m) => m.id)))
  }

  const handleDeselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: '批量刪除記憶',
      message: `確定要刪除 ${selectedIds.size} 條記憶嗎？此操作無法復原。`,
      confirmText: '確定刪除',
      cancelText: '取消',
      type: 'danger',
    })

    if (!confirmed) return

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          deleteMemory({ variables: { id } })
        )
      )
      toast.success(`已成功刪除 ${selectedIds.size} 條記憶 🗑️`)
      setSelectedIds(new Set())
      refetch()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('批量刪除失敗，請稍後再試 😢')
    }
  }

  const handleBulkArchive = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          archiveMemory({ variables: { id } })
        )
      )
      toast.success(`已成功封存 ${selectedIds.size} 條記憶 📦`)
      setSelectedIds(new Set())
      refetch()
    } catch (error) {
      console.error('Bulk archive error:', error)
      toast.error('批量封存失敗，請稍後再試 😢')
    }
  }

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE5F0 50%, #FFFACD 100%)'
    }}>
      {/* 簡化可愛導航欄 */}
      <div className="sticky top-0 z-20 backdrop-blur-md border-b-2" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#FFE5F0',
        boxShadow: '0 2px 12px rgba(255, 179, 217, 0.1)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* 單行：返回 + 標題 + 搜尋 + 視圖切換 + 新增 */}
          <div className="flex items-center gap-3 mb-3">
            {/* 返回按鈕 */}
            <button
              onClick={() => window.location.href = '/'}
              className="p-2 rounded-xl transition-all hover:scale-110 flex-shrink-0"
              style={{
                background: 'white',
                border: '2px solid #FFE5F0',
              }}
              title="返回首頁"
            >
              🏝️
            </button>

            {/* 標題 */}
            <h1 className="text-lg sm:text-xl font-bold whitespace-nowrap" style={{
              background: 'linear-gradient(135deg, #FF8FB3, #FFB3D9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              🐱 知識寶庫
            </h1>

            {/* 搜尋框 */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 搜尋... (⌘K)"
                  className="w-full px-4 py-1.5 pr-10 rounded-xl font-medium focus:outline-none transition-all text-sm"
                  style={{
                    border: '2px solid #FFE5F0',
                    background: 'white',
                    color: '#666',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#FFB3D9'}
                  onBlur={(e) => e.target.style.borderColor = '#FFE5F0'}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-pink-50 transition-colors"
                    style={{ color: '#FF8FB3' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 視圖切換 */}
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl" style={{
              background: 'white',
              border: '2px solid #FFE5F0'
            }}>
              <button
                onClick={() => setViewMode('table')}
                className="px-3 py-1.5 rounded-lg font-medium transition-all text-sm"
                style={viewMode === 'table' ? {
                  background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                  color: 'white',
                } : {
                  color: '#999'
                }}
                title="表格"
              >
                📊
              </button>
              <button
                onClick={() => setViewMode('gallery')}
                className="px-3 py-1.5 rounded-lg font-medium transition-all text-sm"
                style={viewMode === 'gallery' ? {
                  background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                  color: 'white',
                } : {
                  color: '#999'
                }}
                title="畫廊"
              >
                🎴
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="px-3 py-1.5 rounded-lg font-medium transition-all text-sm"
                style={viewMode === 'list' ? {
                  background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                  color: 'white',
                } : {
                  color: '#999'
                }}
                title="列表"
              >
                📝
              </button>
            </div>

            {/* 新增按鈕 */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-1.5 rounded-xl font-bold text-white transition-all hover:scale-105 flex-shrink-0 text-sm"
              style={{
                background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                border: '2px solid rgba(255, 255, 255, 0.5)'
              }}
            >
              <span className="hidden sm:inline">✨ 新增</span>
              <span className="sm:hidden">✨</span>
            </button>
          </div>

          {/* 分類標籤（簡化版） */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all text-sm"
              style={!selectedCategory ? {
                background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                color: 'white',
              } : {
                background: 'white',
                color: '#666',
                border: '1px solid #FFE5F0'
              }}
            >
              <span>全部</span>
              <span className="text-xs opacity-75">{memoriesData?.memories?.length || 0}</span>
            </button>
            {categories.map((cat) => {
              const count = memoriesData?.memories?.filter((m: any) => m.category === cat.value).length || 0
              const isSelected = selectedCategory === cat.value
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all text-sm"
                  style={isSelected ? {
                    background: `linear-gradient(135deg, ${cat.color}, ${cat.color}DD)`,
                    color: 'white',
                  } : {
                    background: 'white',
                    color: '#666',
                    border: '1px solid #FFE5F0'
                  }}
                >
                  <span>{cat.emoji}</span>
                  <span className="hidden sm:inline">{cat.label}</span>
                  <span className="text-xs opacity-75">{count}</span>
                </button>
              )
            })}

            {/* 排序（整合進分類列） */}
            <div className="ml-auto flex items-center gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-1 rounded-full font-medium focus:outline-none text-sm border"
                style={{
                  border: '1px solid #FFE5F0',
                  background: 'white',
                  color: '#666'
                }}
              >
                <option value="createdAt">⏰ 時間</option>
                <option value="aiImportance">⭐ 重要</option>
                <option value="title">🔤 標題</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 rounded-lg transition-all hover:bg-pink-50"
                style={{ color: '#FF8FB3' }}
                title={sortOrder === 'asc' ? '升序' : '降序'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Advanced Filter */}
        <div className="mb-4">
          <AdvancedFilter
            allTags={allTags}
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            onReset={() => setAdvancedFilters({})}
            style="cute"
          />
        </div>
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-32 h-32 mb-6 rounded-3xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #FFB3B3, #FF8F8F)',
              boxShadow: '0 8px 30px rgba(255, 143, 143, 0.3)'
            }}>
              <span className="text-6xl">😢</span>
            </div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: '#FF8FB3' }}>
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
                className="px-6 py-3 rounded-2xl font-bold text-white transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #B3D9FF, #8FC5FF)',
                  boxShadow: '0 4px 15px rgba(143, 197, 255, 0.4)'
                }}
              >
                🔄 重新載入頁面
              </button>
              <button
                onClick={() => refetch()}
                className="px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105"
                style={{
                  background: 'white',
                  border: '2px solid #FFE5F0',
                  color: '#FF8FB3',
                }}
              >
                🔁 重試
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4 animate-bounce">🐱</div>
            <p className="text-lg font-bold" style={{ color: '#FF8FB3' }}>載入記憶中...</p>
          </div>
        ) : allMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-32 h-32 mb-6 rounded-3xl flex items-center justify-center animate-bounce" style={{
              background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
              boxShadow: '0 8px 30px rgba(255, 179, 217, 0.3)'
            }}>
              <span className="text-6xl">🐱</span>
            </div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: '#FF8FB3' }}>
              {searchQuery ? '找不到相關記憶喵～' : '開始記錄你的美好回憶吧！'}
            </h3>
            <p className="text-sm mb-8" style={{ color: '#999' }}>
              {searchQuery
                ? '試試其他關鍵字，或清除搜尋看看全部記憶'
                : '按 ⌘N 快速新增，或點擊上方的「新增記憶」按鈕'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 rounded-2xl font-bold text-white transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                  boxShadow: '0 4px 15px rgba(255, 179, 217, 0.4)'
                }}
              >
                ✨ 新增第一條記憶
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <>
          <CuteTableView
            memories={paginatedMemories}
            categories={categories}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            onTogglePin={handleTogglePin}
            onSelectMemory={setSelectedMemory}
            onDelete={handleQuickDelete}
            onArchive={handleQuickArchive}
            editingMemoryId={editingMemoryId}
            editingTitle={editingTitle}
            setEditingTitle={setEditingTitle}
            startEditing={startEditing}
            saveTitle={saveTitle}
            setEditingMemoryId={setEditingMemoryId}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onMemoryHover={setHoveredMemory}
            onHoverPositionChange={setHoverPosition}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={allMemories.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            style="cute"
          />
          </>
        ) : viewMode === 'gallery' ? (
          <>
          <CuteGalleryView
            memories={paginatedMemories}
            onTogglePin={handleTogglePin}
            onSelectMemory={setSelectedMemory}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={allMemories.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            style="cute"
          />
          </>
        ) : (
          <>
          <CuteListView
            memories={paginatedMemories}
            onTogglePin={handleTogglePin}
            onSelectMemory={setSelectedMemory}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={allMemories.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            style="cute"
          />
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateMemoryModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch()
            setShowCreateModal(false)
          }}
        />
      )}

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

      {/* Bulk Actions Bar */}
      {viewMode === 'table' && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          totalCount={allMemories.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onBulkDelete={handleBulkDelete}
          onBulkArchive={handleBulkArchive}
          style="cute"
        />
      )}

      {/* Memory Preview Card */}
      {hoveredMemory && viewMode === 'table' && (
        <MemoryPreviewCard
          memory={hoveredMemory}
          position={hoverPosition}
          style="cute"
        />
      )}
    </div>
  )
}

// ============ 可愛表格視圖 ============
interface CuteTableViewProps {
  memories: Memory[]
  categories: { value: MemoryCategory; label: string; emoji: string; color: string }[]
  sortField: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  onTogglePin: (memory: Memory, e?: React.MouseEvent) => void
  onSelectMemory: (memory: Memory) => void
  onDelete: (memory: Memory, e: React.MouseEvent) => void
  onArchive: (memory: Memory, e: React.MouseEvent) => void
  editingMemoryId: string | null
  editingTitle: string
  setEditingTitle: (title: string) => void
  startEditing: (memory: Memory, e: React.MouseEvent) => void
  saveTitle: (memoryId: string) => void
  setEditingMemoryId: (id: string | null) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onMemoryHover: (memory: Memory | null) => void
  onHoverPositionChange: (position: { x: number; y: number }) => void
}

function CuteTableView({
  memories,
  categories,
  onTogglePin,
  onSelectMemory,
  onDelete,
  onArchive,
  editingMemoryId,
  editingTitle,
  setEditingTitle,
  startEditing,
  saveTitle,
  setEditingMemoryId,
  selectedIds,
  onToggleSelect,
  onMemoryHover,
  onHoverPositionChange,
}: CuteTableViewProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: 'white',
      border: '2px solid #FFE5F0',
      boxShadow: '0 4px 15px rgba(255, 179, 217, 0.1)'
    }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
        <thead>
          <tr style={{
            background: 'rgba(255, 245, 240, 0.5)',
            borderBottom: '2px solid #FFE5F0'
          }}>
            <th className="px-4 py-2 text-left w-10">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={memories.length > 0 && memories.every((m) => selectedIds.has(m.id))}
                  onChange={() => {
                    if (memories.every((m) => selectedIds.has(m.id))) {
                      memories.forEach((m) => onToggleSelect(m.id))
                    } else {
                      memories.forEach((m) => {
                        if (!selectedIds.has(m.id)) onToggleSelect(m.id)
                      })
                    }
                  }}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: '#FF8FB3' }}
                />
              </div>
            </th>
            <th className="px-4 py-2 text-left w-10"></th>
            <th className="px-4 py-2 text-left w-10"></th>
            <th className="px-4 py-2 text-left">
              <div className="text-xs font-bold" style={{ color: '#FF8FB3' }}>
                標題
              </div>
            </th>
            <th className="px-4 py-2 text-left w-28">
              <div className="text-xs font-bold" style={{ color: '#FF8FB3' }}>
                分類
              </div>
            </th>
            <th className="px-4 py-2 text-left w-40">
              <div className="text-xs font-bold" style={{ color: '#FF8FB3' }}>
                標籤
              </div>
            </th>
            <th className="px-4 py-2 text-left w-16">
              <div className="text-xs font-bold" style={{ color: '#FF8FB3' }}>
                ⭐
              </div>
            </th>
            <th className="px-4 py-2 text-left w-28">
              <div className="text-xs font-bold" style={{ color: '#FF8FB3' }}>
                日期
              </div>
            </th>
            <th className="px-4 py-2 text-right w-20"></th>
          </tr>
        </thead>
        <tbody>
          {memories.map((memory) => {
            const categoryInfo = categories.find(c => c.value === memory.category)
            const isHovered = hoveredRow === memory.id
            const isEditing = editingMemoryId === memory.id

            const isSelected = selectedIds.has(memory.id)

            return (
              <tr
                key={memory.id}
                onMouseEnter={(e) => {
                  setHoveredRow(memory.id)
                  // Delay showing preview to avoid flickering
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                  hoverTimeoutRef.current = setTimeout(() => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    onHoverPositionChange({
                      x: rect.right + 10,
                      y: Math.max(rect.top, 100),
                    })
                    onMemoryHover(memory)
                  }, 500)
                }}
                onMouseLeave={() => {
                  setHoveredRow(null)
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                  onMemoryHover(null)
                }}
                onClick={() => !isEditing && onSelectMemory(memory)}
                className="cursor-pointer transition-all border-b border-pink-50"
                style={{
                  background: isSelected
                    ? 'rgba(255, 179, 217, 0.1)'
                    : isHovered
                    ? 'rgba(255, 245, 240, 0.4)'
                    : 'white'
                }}
              >
                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(memory.id)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#FF8FB3' }}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => onTogglePin(memory, e)}
                    className="text-lg transition-all hover:scale-110"
                    title={memory.isPinned ? '取消釘選' : '釘選'}
                  >
                    {memory.isPinned ? '📌' : (isHovered ? '📍' : '')}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className="text-2xl">{memory.emoji}</span>
                </td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => saveTitle(memory.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveTitle(memory.id)
                        if (e.key === 'Escape') setEditingMemoryId(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-full px-3 py-1.5 text-sm font-bold rounded-lg focus:outline-none"
                      style={{
                        border: '2px solid #FFB3D9',
                        background: 'white',
                        color: '#FF8FB3',
                        boxShadow: '0 0 12px rgba(255, 179, 217, 0.2)'
                      }}
                    />
                  ) : (
                    <div className="group/title flex items-center gap-2">
                      <span className="text-sm font-bold select-text" style={{ color: '#FF8FB3' }}>
                        {memory.title || memory.summary || '無標題'}
                      </span>
                      {isHovered && (
                        <button
                          onClick={(e) => startEditing(memory, e)}
                          className="p-1 rounded-lg transition-all hover:bg-pink-50"
                          style={{ color: '#FF8FB3' }}
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  )}
                  {memory.summary && (
                    <p className="text-xs line-clamp-1 mt-0.5 select-text" style={{ color: '#999' }}>
                      {memory.summary}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {categoryInfo && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium text-white"
                      style={{
                        background: categoryInfo.color,
                      }}
                    >
                      <span>{categoryInfo.emoji}</span>
                      <span className="hidden sm:inline">{categoryInfo.label}</span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.slice(0, 2).map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs font-medium rounded-md"
                        style={{
                          background: '#FFFACD',
                          color: '#FF8FB3',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {memory.tags.length > 2 && (
                      <span className="text-xs px-1" style={{ color: '#999' }}>
                        +{memory.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-bold" style={{ color: '#FF8FB3' }}>
                    {memory.aiImportance}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs" style={{ color: '#999' }}>
                    {new Date(memory.createdAt).toLocaleDateString('zh-TW', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {isHovered && (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => onArchive(memory, e)}
                        className="p-1.5 rounded-lg transition-all hover:bg-yellow-50"
                        title="封存"
                      >
                        📦
                      </button>
                      <button
                        onClick={(e) => onDelete(memory, e)}
                        className="p-1.5 rounded-lg transition-all hover:bg-red-50"
                        title="刪除"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}

// ============ 可愛畫廊視圖 ============
interface CuteGalleryViewProps {
  memories: Memory[]
  onTogglePin: (memory: Memory, e?: React.MouseEvent) => void
  onSelectMemory: (memory: Memory) => void
}

function CuteGalleryView({ memories, onTogglePin, onSelectMemory }: CuteGalleryViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {memories.map((memory) => (
        <div
          key={memory.id}
          onClick={() => onSelectMemory(memory)}
          className="group relative rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02]"
          style={{
            background: 'white',
            border: '2px solid #FFE5F0',
            boxShadow: '0 2px 8px rgba(255, 179, 217, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 179, 217, 0.2)'
            e.currentTarget.style.borderColor = '#FFB3D9'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 179, 217, 0.1)'
            e.currentTarget.style.borderColor = '#FFE5F0'
          }}
        >
          {/* 釘選按鈕 */}
          <button
            onClick={(e) => onTogglePin(memory, e)}
            className="absolute top-3 right-3 p-1.5 rounded-lg transition-all text-lg"
            style={{
              background: memory.isPinned ? 'linear-gradient(135deg, #FFB3D9, #FF8FB3)' : 'white',
              border: '1px solid #FFE5F0',
              opacity: memory.isPinned ? 1 : 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              if (!memory.isPinned) e.currentTarget.style.opacity = '0'
            }}
          >
            {memory.isPinned ? '📌' : '📍'}
          </button>

          {/* Emoji */}
          <div className="text-5xl text-center mb-3">
            {memory.emoji}
          </div>

          {/* 標題 */}
          <h3 className="text-sm font-bold text-center mb-2 line-clamp-2 min-h-[2.5rem]" style={{ color: '#FF8FB3' }}>
            {memory.title || memory.summary || '無標題記憶'}
          </h3>

          {/* 內容預覽 */}
          <p className="text-xs text-center line-clamp-2 mb-3" style={{ color: '#999' }}>
            {memory.summary || memory.rawContent}
          </p>

          {/* 標籤 */}
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mb-3">
              {memory.tags.slice(0, 2).map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs font-medium rounded-md"
                  style={{
                    background: '#FFFACD',
                    color: '#FF8FB3',
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
          <div className="flex items-center justify-between text-xs pt-3 border-t" style={{
            borderColor: '#FFE5F0',
            color: '#999'
          }}>
            <span>
              {new Date(memory.createdAt).toLocaleDateString('zh-TW', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span>⭐ {memory.aiImportance}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============ 可愛列表視圖 ============
interface CuteListViewProps {
  memories: Memory[]
  onTogglePin: (memory: Memory, e?: React.MouseEvent) => void
  onSelectMemory: (memory: Memory) => void
}

function CuteListView({ memories, onTogglePin, onSelectMemory }: CuteListViewProps) {
  return (
    <div className="space-y-2">
      {memories.map((memory) => (
        <div
          key={memory.id}
          onClick={() => onSelectMemory(memory)}
          className="group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
          style={{
            background: 'white',
            border: '2px solid #FFE5F0',
            boxShadow: '0 2px 8px rgba(255, 179, 217, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 179, 217, 0.2)'
            e.currentTarget.style.borderColor = '#FFB3D9'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 179, 217, 0.1)'
            e.currentTarget.style.borderColor = '#FFE5F0'
          }}
        >
          {/* 釘選按鈕 */}
          <button
            onClick={(e) => onTogglePin(memory, e)}
            className="flex-shrink-0 p-1.5 rounded-lg transition-all text-lg"
            style={{
              background: memory.isPinned ? 'linear-gradient(135deg, #FFB3D9, #FF8FB3)' : 'white',
              border: '1px solid #FFE5F0',
              opacity: memory.isPinned ? 1 : 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              if (!memory.isPinned) e.currentTarget.style.opacity = '0'
            }}
          >
            {memory.isPinned ? '📌' : '📍'}
          </button>

          {/* Emoji */}
          <div className="flex-shrink-0 text-3xl">
            {memory.emoji}
          </div>

          {/* 內容 */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold mb-0.5" style={{ color: '#FF8FB3' }}>
              {memory.title || memory.summary || '無標題記憶'}
            </h3>
            <p className="text-xs line-clamp-1" style={{ color: '#999' }}>
              {memory.summary || memory.rawContent}
            </p>
          </div>

          {/* 標籤 */}
          <div className="flex-shrink-0 hidden sm:flex items-center gap-1.5">
            {memory.tags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs font-medium rounded-md"
                style={{
                  background: '#FFFACD',
                  color: '#FF8FB3',
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

          {/* Meta */}
          <div className="flex-shrink-0 flex items-center gap-3 text-xs" style={{ color: '#999' }}>
            <span>⭐ {memory.aiImportance}</span>
            <span className="hidden sm:inline">
              {new Date(memory.createdAt).toLocaleDateString('zh-TW', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* 箭頭 */}
          <div className="flex-shrink-0 text-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#FFB3D9' }}>
            →
          </div>
        </div>
      ))}
    </div>
  )
}
