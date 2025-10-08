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

export default function ModernDatabaseView() {
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
      toast.error('載入記憶失敗，請檢查網絡連接')
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Cmd/Ctrl + N: New memory
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setShowCreateModal(true)
      }
      // Escape: Clear search or close modals
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
    { value: 'LEARNING', label: '學習', emoji: '📚', color: '#6366f1' },
    { value: 'INSPIRATION', label: '靈感', emoji: '💡', color: '#f59e0b' },
    { value: 'WORK', label: '工作', emoji: '💼', color: '#3b82f6' },
    { value: 'SOCIAL', label: '社交', emoji: '👥', color: '#10b981' },
    { value: 'LIFE', label: '生活', emoji: '🌱', color: '#ec4899' },
    { value: 'GOALS', label: '目標', emoji: '🎯', color: '#ef4444' },
    { value: 'RESOURCES', label: '資源', emoji: '📦', color: '#8b5cf6' },
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
      filtered = filtered.filter((m: Memory) =>
        m.title?.toLowerCase().includes(query) ||
        m.summary?.toLowerCase().includes(query) ||
        m.rawContent.toLowerCase().includes(query) ||
        m.tags.some(tag => tag.toLowerCase().includes(query))
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
        toast.success('已取消釘選')
      } else {
        await pinMemory({ variables: { id: memory.id } })
        toast.success('記憶已釘選！')
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error)
      toast.error('釘選操作失敗，請稍後再試')
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
      toast.success('記憶已刪除')
      refetch()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('刪除失敗，請稍後再試')
    }
  }

  const handleQuickArchive = async (memory: Memory, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await archiveMemory({ variables: { id: memory.id } })
      toast.success('記憶已封存')
      refetch()
    } catch (error) {
      console.error('Archive error:', error)
      toast.error('封存失敗，請稍後再試')
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
      toast.success('標題已更新')
      refetch()
    } catch (error) {
      console.error('Update error:', error)
      toast.error('更新失敗，請稍後再試')
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
      toast.success(`已成功刪除 ${selectedIds.size} 條記憶`)
      setSelectedIds(new Set())
      refetch()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('批量刪除失敗，請稍後再試')
    }
  }

  const handleBulkArchive = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          archiveMemory({ variables: { id } })
        )
      )
      toast.success(`已成功封存 ${selectedIds.size} 條記憶`)
      setSelectedIds(new Set())
      refetch()
    } catch (error) {
      console.error('Bulk archive error:', error)
      toast.error('批量封存失敗，請稍後再試')
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top Navigation - Notion Style */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Title & Search */}
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => window.location.href = '/'}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="返回首頁"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>

              <h1 className="text-lg font-semibold text-gray-800">知識寶庫</h1>

              <div className="flex-1 max-w-md">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋記憶... (⌘K)"
                    className="w-full pl-10 pr-4 py-1.5 text-sm bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:border-gray-300 focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="表格視圖"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('gallery')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'gallery' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="畫廊視圖"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="列表視圖"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* New Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>新增</span>
                <span className="text-xs opacity-75">⌘N</span>
              </button>
            </div>
          </div>

          {/* Filters - Notion Style Pills */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>全部</span>
              <span className="text-xs opacity-75">{memoriesData?.memories?.length || 0}</span>
            </button>
            {categories.map((cat) => {
              const count = memoriesData?.memories?.filter((m: any) => m.category === cat.value).length || 0
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === cat.value
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={selectedCategory === cat.value ? {
                    backgroundColor: cat.color,
                  } : {}}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                  <span className="text-xs opacity-75">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Advanced Filter */}
        <div className="mb-4">
          <AdvancedFilter
            allTags={allTags}
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            onReset={() => setAdvancedFilters({})}
            style="modern"
          />
        </div>
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              載入失敗
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              {error.message.includes('Network') || error.message.includes('fetch')
                ? '無法連接到服務器，請檢查網絡連接'
                : '發生了一些問題，請稍後再試'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重新載入頁面
              </button>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重試
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500">載入中...</p>
            </div>
          </div>
        ) : allMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? '沒有找到相關記憶' : '開始記錄你的想法'}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              {searchQuery
                ? '試試其他關鍵字，或清除搜尋條件查看所有記憶'
                : '使用 ⌘N 快速新增記憶，或點擊上方的「新增」按鈕'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新增第一條記憶
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <>
            <ModernTableView
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
              style="modern"
            />
          </>
        ) : viewMode === 'gallery' ? (
          <>
            <GalleryView
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
              style="modern"
            />
          </>
        ) : (
          <>
            <ListView
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
              style="modern"
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
          style="modern"
        />
      )}

      {/* Memory Preview Card */}
      {hoveredMemory && viewMode === 'table' && (
        <MemoryPreviewCard
          memory={hoveredMemory}
          position={hoverPosition}
          style="modern"
        />
      )}
    </div>
  )
}

// ============ Modern Table View ============
interface ModernTableViewProps {
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

function ModernTableView({
  memories,
  categories,
  sortField,
  sortOrder,
  onSort,
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
}: ModernTableViewProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return (
        <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    return sortOrder === 'asc' ? (
      <svg className="w-3 h-3 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="px-4 py-2 text-left w-10">
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
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: '#3b82f6' }}
              />
            </th>
            <th className="px-4 py-2 text-left w-8"></th>
            <th className="px-4 py-2 text-left w-10"></th>
            <th
              className="px-4 py-2 text-left cursor-pointer select-none group"
              onClick={() => onSort('title')}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <span>標題</span>
                <SortIcon field="title" />
              </div>
            </th>
            <th className="px-4 py-2 text-left w-32">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                分類
              </div>
            </th>
            <th className="px-4 py-2 text-left w-48">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                標籤
              </div>
            </th>
            <th
              className="px-4 py-2 text-left w-24 cursor-pointer select-none group"
              onClick={() => onSort('aiImportance')}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <span>重要度</span>
                <SortIcon field="aiImportance" />
              </div>
            </th>
            <th
              className="px-4 py-2 text-left w-32 cursor-pointer select-none group"
              onClick={() => onSort('createdAt')}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <span>日期</span>
                <SortIcon field="createdAt" />
              </div>
            </th>
            <th className="px-4 py-2 text-right w-24"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
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
                className={`group cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'
                }`}
              >
                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(memory.id)}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: '#3b82f6' }}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => onTogglePin(memory, e)}
                    className={`p-1 rounded transition-all ${
                      memory.isPinned
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-600'
                    }`}
                    title={memory.isPinned ? '取消釘選' : '釘選'}
                  >
                    <svg className="w-4 h-4" fill={memory.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
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
                      className="w-full px-2 py-1 -mx-2 -my-1 text-sm font-medium text-gray-900 bg-white border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="group/title flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {memory.title || memory.summary || '無標題'}
                      </span>
                      <button
                        onClick={(e) => startEditing(memory, e)}
                        className="p-1 rounded opacity-0 group-hover/title:opacity-100 hover:bg-gray-200 transition-all"
                      >
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {memory.summary && (
                    <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                      {memory.summary}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {categoryInfo && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-white"
                      style={{ backgroundColor: categoryInfo.color }}
                    >
                      <span>{categoryInfo.emoji}</span>
                      <span>{categoryInfo.label}</span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {memory.tags.length > 2 && (
                      <span className="px-2 py-0.5 text-xs text-gray-400">
                        +{memory.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${memory.aiImportance * 10}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-6">
                      {memory.aiImportance}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">
                    {new Date(memory.createdAt).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className={`flex items-center justify-end gap-1 transition-opacity ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}>
                    <button
                      onClick={(e) => onArchive(memory, e)}
                      className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                      title="封存"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => onDelete(memory, e)}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="刪除"
                    >
                      <svg className="w-4 h-4 text-gray-500 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============ Gallery View ============
interface GalleryViewProps {
  memories: Memory[]
  onTogglePin: (memory: Memory, e?: React.MouseEvent) => void
  onSelectMemory: (memory: Memory) => void
}

function GalleryView({ memories, onTogglePin, onSelectMemory }: GalleryViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {memories.map((memory) => (
        <div
          key={memory.id}
          onClick={() => onSelectMemory(memory)}
          className="group relative bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all"
        >
          {/* Pin Button */}
          <button
            onClick={(e) => onTogglePin(memory, e)}
            className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all ${
              memory.isPinned
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill={memory.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          {/* Emoji */}
          <div className="text-5xl mb-3 text-center">
            {memory.emoji}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-900 text-center mb-2 line-clamp-2 min-h-[2.5rem]">
            {memory.title || memory.summary || '無標題記憶'}
          </h3>

          {/* Content Preview */}
          <p className="text-xs text-gray-500 text-center line-clamp-2 mb-4">
            {memory.summary || memory.rawContent}
          </p>

          {/* Tags */}
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mb-3">
              {memory.tags.slice(0, 3).map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
            <span>
              {new Date(memory.createdAt).toLocaleDateString('zh-TW', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {memory.aiImportance}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============ List View ============
interface ListViewProps {
  memories: Memory[]
  onTogglePin: (memory: Memory, e?: React.MouseEvent) => void
  onSelectMemory: (memory: Memory) => void
}

function ListView({ memories, onTogglePin, onSelectMemory }: ListViewProps) {
  return (
    <div className="space-y-2">
      {memories.map((memory) => (
        <div
          key={memory.id}
          onClick={() => onSelectMemory(memory)}
          className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all"
        >
          {/* Pin Button */}
          <button
            onClick={(e) => onTogglePin(memory, e)}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
              memory.isPinned
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill={memory.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          {/* Emoji */}
          <div className="flex-shrink-0 text-3xl">
            {memory.emoji}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {memory.title || memory.summary || '無標題記憶'}
            </h3>
            <p className="text-xs text-gray-500 line-clamp-1">
              {memory.summary || memory.rawContent}
            </p>
          </div>

          {/* Tags */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {memory.tags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
            {memory.tags.length > 2 && (
              <span className="text-xs text-gray-400">
                +{memory.tags.length - 2}
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex-shrink-0 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {memory.aiImportance}
            </span>
            <span>
              {new Date(memory.createdAt).toLocaleDateString('zh-TW', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* Arrow */}
          <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      ))}
    </div>
  )
}
