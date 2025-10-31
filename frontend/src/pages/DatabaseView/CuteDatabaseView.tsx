import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { GET_MEMORIES, PIN_MEMORY, UNPIN_MEMORY, DELETE_MEMORY, CREATE_MEMORY_DIRECT } from '../../graphql/memory'
import { GET_ISLANDS, Island } from '../../graphql/category'
import { Memory, MemoryCategory } from '../../types/memory'
import SimpleMemoryEditor from '../../components/SimpleMemoryEditor'
import MemoryEditor from '../../components/MemoryEditor'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import { useDebounce } from '../../hooks/useDebounce'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import { CategoryManagementModalV2 } from '../../components/CategoryManagementModalV2'
import { QueueFloatingButton } from '../../components/QueueFloatingButton'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type SortField = 'createdAt' | 'title' | 'custom'

// 岛屿名称到 Category 的映射（基于常见的岛屿命名）
function getIslandCategory(islandName: string): MemoryCategory | null {
  const name = islandName.toLowerCase()
  if (name.includes('学习') || name.includes('學習')) return 'LEARNING'
  if (name.includes('灵感') || name.includes('靈感') || name.includes('创意') || name.includes('創意')) return 'INSPIRATION'
  if (name.includes('工作') || name.includes('职业') || name.includes('職業')) return 'WORK'
  if (name.includes('社交') || name.includes('人际') || name.includes('人際') || name.includes('关系') || name.includes('關係')) return 'SOCIAL'
  if (name.includes('生活') || name.includes('日常')) return 'LIFE'
  if (name.includes('目标') || name.includes('目標') || name.includes('规划') || name.includes('規劃')) return 'GOALS'
  if (name.includes('资源') || name.includes('資源') || name.includes('收藏')) return 'RESOURCES'
  return null
}

export default function CuteDatabaseView() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | null>(null)
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null) // 新增：选中的岛屿 ID
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [customOrder, setCustomOrder] = useState<string[]>([]) // 儲存自定義排序
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newMemoryId, setNewMemoryId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const { confirmState, confirm } = useConfirm()

  // 批量選擇模式
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<Set<string>>(new Set())

  // 響應式：小螢幕預設收起側邊欄，中螢幕以上預設打開
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
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
  })

  // 獲取所有島嶼
  const { data: islandsData, loading: islandsLoading, error: islandsError } = useQuery(GET_ISLANDS)

  const [pinMemory] = useMutation(PIN_MEMORY, { refetchQueries: ['GetMemories'] })
  const [unpinMemory] = useMutation(UNPIN_MEMORY, { refetchQueries: ['GetMemories'] })
  const [deleteMemory] = useMutation(DELETE_MEMORY)
  const [createMemoryDirect] = useMutation(CREATE_MEMORY_DIRECT)

  // 創建新記憶（立即在資料庫創建）
  const handleCreateNewMemory = useCallback(async () => {
    try {
      // 不傳遞 category，讓後端使用默認值 LIFE
      const result = await createMemoryDirect({
        variables: {
          input: {
            content: '',  // 空白內容
            // category 會由後端設為默認值 LIFE
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
  }, [createMemoryDirect, toast])

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
  }, [searchQuery, handleCreateNewMemory])

  // 處理記憶查詢錯誤
  useEffect(() => {
    if (error) {
      console.error('Failed to load memories:', error)
      toast.error('載入記憶失敗，請檢查網路連線 😢')
    }
  }, [error, toast])

  // 處理島嶼查詢錯誤
  useEffect(() => {
    if (islandsError) {
      console.error('Failed to load islands:', islandsError)
    }
  }, [islandsError])

  // 獲取島嶼列表（使用 useMemo 避免每次渲染都改變）
  const islands: Island[] = useMemo(() => {
    return islandsData?.islands || []
  }, [islandsData?.islands])

  const filteredMemories = useMemo(() => {
    let filtered = memoriesData?.memories || []

    // 島嶼過濾（優先於傳統分類）
    if (selectedIslandId) {
      // 使用 islandId 精確過濾記憶
      filtered = filtered.filter((m: Memory) => {
        // 優先使用 islandId 匹配
        if (m.islandId) {
          return m.islandId === selectedIslandId
        }

        // 舊邏輯：使用 category 匹配（向後兼容沒有 islandId 的舊記憶）
        const selectedIsland = islands.find(i => i.id === selectedIslandId)
        if (selectedIsland) {
          const category = getIslandCategory(selectedIsland.nameChinese)
          if (category) {
            return m.category === category
          }
        }

        return false
      })
    }
    // 大類別（傳統分類）過濾
    else if (selectedCategory) {
      filtered = filtered.filter((m: Memory) => m.category === selectedCategory)
    }

    // 搜尋過濾
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      if (sortField === 'custom' && customOrder.length > 0) {
        const indexA = customOrder.indexOf(a.id)
        const indexB = customOrder.indexOf(b.id)
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB
        }
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
      }

      if (sortField === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else if (sortField === 'title') {
        return (a.title || '').localeCompare(b.title || '', 'zh-TW')
      }
      return 0
    })

    return filtered
  }, [memoriesData?.memories, selectedCategory, selectedIslandId, islands, debouncedSearch, sortField, customOrder])

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

  // 批量操作：切換選擇
  const toggleSelectMemory = (memoryId: string) => {
    setSelectedMemoryIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(memoryId)) {
        newSet.delete(memoryId)
      } else {
        newSet.add(memoryId)
      }
      return newSet
    })
  }

  // 批量操作：全選
  const handleSelectAll = () => {
    setSelectedMemoryIds(new Set(allMemories.map((m: Memory) => m.id)))
  }

  // 批量操作：取消全選
  const handleDeselectAll = () => {
    setSelectedMemoryIds(new Set())
  }

  // 批量操作：刪除選中的記憶
  const handleBulkDelete = async () => {
    if (selectedMemoryIds.size === 0) {
      toast.error('請先選擇要刪除的記憶')
      return
    }

    const confirmed = await confirm({
      title: '批量刪除記憶',
      message: `確定要刪除 ${selectedMemoryIds.size} 條記憶嗎？此操作無法復原。`,
      confirmText: '確定刪除',
      cancelText: '取消',
      type: 'danger',
    })

    if (!confirmed) return

    try {
      // 並發刪除所有選中的記憶
      await Promise.all(
        Array.from(selectedMemoryIds).map(id =>
          deleteMemory({ variables: { id } })
        )
      )

      toast.success(`成功刪除 ${selectedMemoryIds.size} 條記憶 🗑️`)
      setSelectedMemoryIds(new Set())
      setBulkSelectMode(false)
      refetch()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('批量刪除失敗，請稍後再試 😢')
    }
  }

  // 直接使用 filteredMemories，因為已經包含釘選狀態並排序了
  const allMemories = filteredMemories

  return (
    <div className="h-screen flex relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #16213e 0%, #1a1a2e 100%)',
    }}>
      {/* 手機端遮罩層 - 提升 z-index 優先級 */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
          style={{ backdropFilter: 'blur(6px)' }}
        />
      )}

      {/* 左側邊欄 - 動森風格夜晚模式，手機端改為覆蓋式 */}
      <div
        className="border-r flex flex-col transition-all duration-300 ease-in-out md:relative absolute inset-y-0 left-0 z-50"
        style={{
          width: sidebarOpen ? '280px' : '0',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)',
          backdropFilter: 'blur(16px) saturate(150%)',
          WebkitBackdropFilter: 'blur(16px) saturate(150%)',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          boxShadow: sidebarOpen ? '4px 0 24px rgba(251, 191, 36, 0.2), 0 0 60px rgba(251, 191, 36, 0.1)' : 'none',
          overflow: 'hidden',
        }}
      >
        {/* 標題 */}
        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(251, 191, 36, 0.2)' }}>
          <div>
            <h1 className="text-lg font-black" style={{
              color: '#fef3c7',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}>
              💝 知識寶庫
            </h1>
            <p className="text-xs mt-1 font-semibold" style={{ color: '#94a3b8' }}>
              {filteredMemories.length} 條記憶
            </p>
          </div>
          {/* 收起按鈕 */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl transition-all hover:scale-110"
            style={{
              color: '#cbd5e1',
              background: 'rgba(30, 41, 59, 0.6)',
            }}
            title="收起側邊欄"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(251, 191, 36, 0.3)'
              e.currentTarget.style.color = '#fef3c7'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)'
              e.currentTarget.style.color = '#cbd5e1'
            }}
          >
            <span className="text-sm">◀</span>
          </button>
        </div>

        {/* 設定分類按鈕 */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(251, 191, 36, 0.2)' }}>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
              color: '#1a1a2e',
              boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)',
            }}
          >
            <span>🎨</span>
            <span>設定分類</span>
          </button>
        </div>

        {/* 分類篩選 - 島嶼列表 */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1.5">
            {/* 全部按鈕 */}
            <button
              onClick={() => {
                setSelectedCategory(null)
                setSelectedIslandId(null)
              }}
              className="w-full text-left px-3 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02]"
              style={!selectedCategory && !selectedIslandId ? {
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 146, 60, 0.3) 100%)',
                color: '#fef3c7',
                border: '2px solid rgba(251, 191, 36, 0.4)',
              } : {
                background: 'rgba(30, 41, 59, 0.6)',
                color: '#cbd5e1',
                border: '2px solid rgba(251, 191, 36, 0.15)',
              }}
            >
              <div className="flex items-center justify-between">
                <span>🌟 全部記憶</span>
                <span className="text-xs opacity-90 font-bold">
                  {memoriesData?.memories?.length || 0}
                </span>
              </div>
            </button>

            {/* 島嶼列表 */}
            {islandsLoading ? (
              <div className="text-center py-4 text-xs" style={{ color: '#94a3b8' }}>載入中...</div>
            ) : islands.length === 0 ? (
              <div className="text-center py-4 text-xs" style={{ color: '#94a3b8' }}>
                尚未建立島嶼分類
                <br />
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="mt-2 text-xs hover:underline"
                  style={{ color: '#fbbf24' }}
                >
                  點擊設定分類
                </button>
              </div>
            ) : (
              islands.map((island) => {
                // 計算該島嶼的記憶數量（使用 islandId 精確匹配）
                const count = (memoriesData?.memories || []).filter((m: Memory) => {
                  // 優先使用 islandId 匹配
                  if (m.islandId) {
                    return m.islandId === island.id
                  }
                  // 向後兼容：使用 category 匹配舊記憶
                  const category = getIslandCategory(island.nameChinese)
                  return category ? m.category === category : false
                }).length
                const isSelected = selectedIslandId === island.id

                return (
                  <button
                    key={island.id}
                    onClick={() => {
                      setSelectedIslandId(island.id)
                      setSelectedCategory(null)
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02]"
                    style={isSelected ? {
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 146, 60, 0.3) 100%)',
                      color: '#fef3c7',
                      borderTop: '2px solid rgba(251, 191, 36, 0.4)',
                      borderRight: '2px solid rgba(251, 191, 36, 0.4)',
                      borderBottom: '2px solid rgba(251, 191, 36, 0.4)',
                      borderLeft: `4px solid ${island.color}`,
                    } : {
                      background: 'rgba(30, 41, 59, 0.6)',
                      color: '#fef3c7',
                      borderTop: '2px solid rgba(251, 191, 36, 0.15)',
                      borderRight: '2px solid rgba(251, 191, 36, 0.15)',
                      borderBottom: '2px solid rgba(251, 191, 36, 0.15)',
                      borderLeft: `4px solid ${island.color}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{island.emoji} {island.nameChinese}</span>
                      <span className="text-xs opacity-90 font-bold">{count}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 頂部工具列 - 單行緊湊布局 */}
        <div className="sticky top-0 z-40 border-b px-2 sm:px-4 md:px-6 py-2 sm:py-2.5" style={{
          borderColor: 'rgba(251, 191, 36, 0.3)',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 4px 20px rgba(251, 191, 36, 0.2)',
        }}>
          <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3">
            {/* 展開側邊欄按鈕 */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl transition-all flex-shrink-0 hover:scale-110 active:scale-95"
                style={{
                  color: '#cbd5e1',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '2px solid rgba(251, 191, 36, 0.3)',
                }}
                title="展開側邊欄"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(251, 191, 36, 0.3)'
                  e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.6)'
                  e.currentTarget.style.color = '#fef3c7'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)'
                  e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)'
                  e.currentTarget.style.color = '#cbd5e1'
                }}
              >
                <span className="text-sm">☰</span>
              </button>
            )}

            {/* 搜尋框 */}
            <div className="flex-1 relative min-w-0">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋..."
                className="w-full pl-8 sm:pl-10 pr-8 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
                style={{
                  border: '2px solid rgba(251, 191, 36, 0.25)',
                  background: 'rgba(30, 41, 59, 0.7)',
                  color: '#fef3c7',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(251, 191, 36, 0.6)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.15)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(251, 191, 36, 0.25)'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-sm sm:text-base">
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all hover:scale-110 active:scale-95"
                  style={{
                    color: '#94a3b8',
                    background: 'rgba(30, 41, 59, 0.8)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fef3c7'
                    e.currentTarget.style.background = 'rgba(251, 191, 36, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#94a3b8'
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)'
                  }}
                >
                  <span className="text-xs">✕</span>
                </button>
              )}
            </div>

            {/* 排序選擇 */}
            <select
              value={sortField}
              onChange={(e) => {
                const newSort = e.target.value as SortField
                setSortField(newSort)
                // 切換到自定義排序時，初始化順序
                if (newSort === 'custom' && customOrder.length === 0) {
                  setCustomOrder(filteredMemories.map((m: Memory) => m.id))
                }
              }}
              className="hidden md:block px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold focus:outline-none transition-all cursor-pointer flex-shrink-0"
              style={{
                border: '2px solid rgba(251, 191, 36, 0.3)',
                background: 'rgba(30, 41, 59, 0.7)',
                color: '#cbd5e1',
              }}
            >
              <option value="createdAt">⏰ 最新</option>
              <option value="title">🔤 標題</option>
              <option value="custom">✋ 自訂</option>
            </select>

            {/* 新增按鈕 */}
            <button
              onClick={handleCreateNewMemory}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm flex items-center gap-1 sm:gap-2 flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
                color: '#1a1a2e',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)',
              }}
            >
              <span className="text-sm sm:text-base">✨</span>
              <span className="hidden sm:inline">新增</span>
            </button>

            {/* 返回按鈕 */}
            <button
              onClick={() => navigate('/')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm flex items-center gap-1 sm:gap-2 flex-shrink-0"
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                color: '#cbd5e1',
                border: '2px solid rgba(251, 191, 36, 0.3)',
              }}
              title="返回島嶼總覽"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)'
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)'
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)'
              }}
            >
              <span className="text-sm sm:text-base">🏝️</span>
              <span className="hidden lg:inline">返回</span>
            </button>
          </div>
        </div>

        {/* 內容區域 - 響應式內距，添加滾動支持 */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-32 h-32 mb-6 rounded-3xl flex items-center justify-center" style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '3px solid rgba(251, 191, 36, 0.3)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
            }}>
              <span className="text-6xl">😢</span>
            </div>
            <h3 className="text-2xl font-black mb-3" style={{ color: '#fef3c7', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
              載入失敗
            </h3>
            <p className="text-sm mb-8 font-semibold" style={{ color: '#94a3b8' }}>
              {error.message.includes('Network') || error.message.includes('fetch')
                ? '無法連線到伺服器，請檢查網路連線'
                : '發生了一些問題，請稍後再試'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
                  color: '#1a1a2e',
                  boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
                }}
              >
                🔄 重新載入
              </button>
              <button
                onClick={() => refetch()}
                className="px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105"
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '2px solid rgba(251, 191, 36, 0.3)',
                  color: '#cbd5e1',
                }}
              >
                🔁 重試
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 160px)' }}>
            <div className="text-8xl mb-6 animate-bounce">💝</div>
            <p className="text-2xl font-black" style={{ color: '#fef3c7', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>載入記憶中...</p>
          </div>
        ) : allMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 'calc(100vh - 160px)' }}>
            <div className="w-40 h-40 mb-8 rounded-3xl flex items-center justify-center animate-bounce" style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '3px solid rgba(251, 191, 36, 0.3)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
            }}>
              <span className="text-8xl">💝</span>
            </div>
            <h3 className="text-3xl font-black mb-4" style={{ color: '#fef3c7', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
              {searchQuery ? '找不到相關記憶' : '開始記錄你的美好回憶吧！'}
            </h3>
            <p className="text-base mb-10 font-semibold" style={{ color: '#94a3b8' }}>
              {searchQuery
                ? '試試其他關鍵字，或清除搜尋看看全部記憶'
                : '按 ⌘N 或點擊上方的「新增」按鈕開始'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateNewMemory}
                className="px-10 py-5 rounded-2xl font-black transition-all hover:scale-105 text-xl"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
                  color: '#1a1a2e',
                  boxShadow: '0 6px 20px rgba(251, 191, 36, 0.4)',
                }}
              >
                ✨ 新增第一條記憶
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 批量選擇浮動按鈕/工具面板 */}
            {!bulkSelectMode ? (
              /* 浮動批量選擇按鈕 */
              <button
                onClick={() => setBulkSelectMode(true)}
                className="fixed bottom-6 right-6 z-20 px-4 py-3 rounded-xl font-medium transition-all hover:scale-110 active:scale-95 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.9) 0%, rgba(245, 158, 11, 0.9) 100%)',
                  color: '#ffffff',
                  border: '2px solid rgba(251, 191, 36, 0.5)',
                  boxShadow: '0 8px 24px rgba(251, 191, 36, 0.4)',
                }}
              >
                ☑️ 批量選擇
              </button>
            ) : (
              /* 批量模式浮動工具面板 */
              <div
                className="fixed bottom-6 right-6 z-20 px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg"
                style={{
                  background: 'rgba(30, 41, 59, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(251, 191, 36, 0.4)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                }}
              >
                <button
                  onClick={() => {
                    setBulkSelectMode(false)
                    setSelectedMemoryIds(new Set())
                  }}
                  className="px-2.5 py-1.5 rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'rgba(100, 116, 139, 0.3)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                  }}
                >
                  ✕
                </button>
                <span className="font-bold text-base" style={{ color: '#fbbf24' }}>
                  {selectedMemoryIds.size}/{allMemories.length}
                </span>
                <button
                  onClick={selectedMemoryIds.size === allMemories.length ? handleDeselectAll : handleSelectAll}
                  className="px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'rgba(251, 191, 36, 0.25)',
                    color: '#fbbf24',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                  }}
                >
                  {selectedMemoryIds.size === allMemories.length ? '☐ 取消' : '☑️ 全選'}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedMemoryIds.size === 0}
                  className="px-3 py-1.5 rounded-lg font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: selectedMemoryIds.size > 0
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)'
                      : 'rgba(100, 116, 139, 0.3)',
                    color: selectedMemoryIds.size > 0 ? '#fff' : '#64748b',
                    border: selectedMemoryIds.size > 0
                      ? '1px solid rgba(239, 68, 68, 0.6)'
                      : '1px solid rgba(100, 116, 139, 0.3)',
                  }}
                >
                  🗑️ 刪除 ({selectedMemoryIds.size})
                </button>
              </div>
            )}

            <SimpleGalleryView
              memories={allMemories}
              onTogglePin={handleTogglePin}
              onSelectMemory={setSelectedMemory}
              onDelete={handleDelete}
              isDraggable={sortField === 'custom'}
              onReorder={(newOrder) => setCustomOrder(newOrder)}
              bulkSelectMode={bulkSelectMode}
              selectedMemoryIds={selectedMemoryIds}
              onToggleSelect={toggleSelectMemory}
              islands={islands}
            />
          </>
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
          islands={islands}
        />
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <CategoryManagementModalV2
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

      {/* 隊列狀態按鈕 - 右下角 */}
      <QueueFloatingButton />
    </div>
  )
}

// ============ 簡化畫廊視圖 ============
interface SimpleGalleryViewProps {
  memories: Memory[]
  onTogglePin: (memory: Memory, e?: React.MouseEvent) => void
  onSelectMemory: (memory: Memory) => void
  onDelete: (memory: Memory, e: React.MouseEvent) => void
  isDraggable?: boolean
  onReorder?: (newOrder: string[]) => void
  bulkSelectMode?: boolean
  selectedMemoryIds?: Set<string>
  onToggleSelect?: (memoryId: string) => void
  islands?: Island[]
}

function SimpleGalleryView({
  memories,
  onTogglePin,
  onSelectMemory,
  onDelete,
  isDraggable = false,
  onReorder,
  bulkSelectMode = false,
  selectedMemoryIds = new Set(),
  onToggleSelect,
  islands = []
}: SimpleGalleryViewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 移動距離才觸發拖動
      },
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = memories.findIndex((m) => m.id === active.id)
      const newIndex = memories.findIndex((m) => m.id === over.id)

      const newOrder = arrayMove(memories, oldIndex, newIndex).map(m => m.id)
      onReorder?.(newOrder)
    }
  }

  if (!isDraggable) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 pb-4">
        {memories.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            onTogglePin={onTogglePin}
            onSelectMemory={onSelectMemory}
            onDelete={onDelete}
            formatDate={formatDate}
            bulkSelectMode={bulkSelectMode}
            isSelected={selectedMemoryIds.has(memory.id)}
            onToggleSelect={onToggleSelect}
            islands={islands}
          />
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={memories.map(m => m.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 pb-4">
          {memories.map((memory) => (
            <DraggableMemoryCard
              key={memory.id}
              memory={memory}
              onTogglePin={onTogglePin}
              onSelectMemory={onSelectMemory}
              onDelete={onDelete}
              formatDate={formatDate}
              bulkSelectMode={bulkSelectMode}
              isSelected={selectedMemoryIds.has(memory.id)}
              onToggleSelect={onToggleSelect}
              islands={islands}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

// 可拖動的記憶卡片
interface DraggableMemoryCardProps {
  memory: Memory
  onTogglePin: (memory: Memory, e?: React.MouseEvent) => void
  onSelectMemory: (memory: Memory) => void
  onDelete: (memory: Memory, e: React.MouseEvent) => void
  formatDate: (dateString: string) => { date: string; time: string }
  bulkSelectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (memoryId: string) => void
  islands?: Island[]
}

function DraggableMemoryCard({
  memory,
  onTogglePin,
  onSelectMemory,
  onDelete,
  formatDate,
  bulkSelectMode = false,
  isSelected = false,
  onToggleSelect,
  islands = []
}: DraggableMemoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: memory.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  const { date, time } = formatDate(memory.createdAt)

  // 根據記憶的島嶼 ID 查找對應島嶼顏色
  const island = memory.islandId ? islands.find(i => i.id === memory.islandId) : null
  const islandColor = island?.color || '#fbbf24' // 預設金色

  // 將十六進制顏色轉為 rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div
        onClick={() => {
          if (!isDragging) {
            if (bulkSelectMode && onToggleSelect) {
              onToggleSelect(memory.id)
            } else {
              onSelectMemory(memory)
            }
          }
        }}
        className="group relative rounded-2xl p-3 sm:p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col"
        style={{
          background: isSelected
            ? `linear-gradient(135deg, ${hexToRgba(islandColor, 0.25)} 0%, ${hexToRgba(islandColor, 0.2)} 100%)`
            : 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
          backdropFilter: 'blur(12px) saturate(150%)',
          WebkitBackdropFilter: 'blur(12px) saturate(150%)',
          border: isSelected ? `2px solid ${hexToRgba(islandColor, 0.8)}` : `2px solid ${hexToRgba(islandColor, 0.4)}`,
          boxShadow: isSelected ? `0 8px 24px ${hexToRgba(islandColor, 0.4)}` : '0 4px 12px rgba(0, 0, 0, 0.3)',
          minHeight: '180px',
        }}
        onMouseEnter={(e) => {
          if (!isDragging && !isSelected) {
            e.currentTarget.style.boxShadow = `0 8px 24px ${hexToRgba(islandColor, 0.3)}`
            e.currentTarget.style.borderColor = hexToRgba(islandColor, 0.6)
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
            e.currentTarget.style.borderColor = hexToRgba(islandColor, 0.4)
          }
        }}
      >
        {/* 複選框（批量選擇模式） */}
        {bulkSelectMode && (
          <div className="absolute top-2 left-2 z-20" onClick={(e) => {
            e.stopPropagation()
            onToggleSelect?.(memory.id)
          }}>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-all ${
              isSelected ? 'scale-110' : 'hover:scale-110'
            }`} style={{
              background: isSelected
                ? 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)'
                : 'rgba(30, 41, 59, 0.95)',
              border: isSelected
                ? '2px solid rgba(251, 191, 36, 0.8)'
                : '2px solid rgba(251, 191, 36, 0.4)',
            }}>
              {isSelected && <span className="text-sm">✓</span>}
            </div>
          </div>
        )}

        {/* 拖動提示 */}
        {!bulkSelectMode && (
          <div className="absolute top-2 left-2 z-10">
            <div className="px-2 py-1 rounded-lg text-xs font-bold" style={{
              background: 'rgba(251, 191, 36, 0.3)',
              color: '#fef3c7',
              border: '1px solid rgba(251, 191, 36, 0.5)',
            }}>
              ✋ 拖動
            </div>
          </div>
        )}

        {/* 釘選按鈕 */}
        {memory.isPinned && !bulkSelectMode && (
          <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin(memory, e)
              }}
              className="p-1.5 rounded-lg transition-all text-sm hover:scale-110 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
                color: '#1a1a2e',
                boxShadow: '0 2px 6px rgba(251, 191, 36, 0.4)',
              }}
              title="取消釘選"
            >
              📌
            </button>
          </div>
        )}

        {/* 標題區 */}
        <div className="mb-2 mt-8">
          <h3 className="text-base sm:text-lg font-black line-clamp-2 leading-tight" style={{
            color: '#fef3c7',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
          }}>
            {memory.title || memory.summary || '無標題記憶'}
          </h3>
        </div>

        {/* 內容預覽區 */}
        <div className="flex-1 mb-2">
          {(memory.detailedSummary || memory.rawContent) ? (
            <div>
              <div className="text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>
                {memory.detailedSummary ? '💡 AI 深度分析' : '📝 內容預覽'}
              </div>
              <p className="text-xs line-clamp-2 font-medium leading-relaxed whitespace-pre-wrap" style={{
                color: '#e2e8f0',
                lineHeight: '1.5',
              }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(memory as any).detailedSummary || memory.rawContent}
              </p>
            </div>
          ) : (
            <div className="text-xs italic" style={{ color: '#64748b' }}>
              無內容預覽
            </div>
          )}
        </div>

        {/* 島嶼標籤 */}
        {island && (
          <div className="mb-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(islandColor, 0.35)} 0%, ${hexToRgba(islandColor, 0.25)} 100%)`,
                color: islandColor,
                border: `1.5px solid ${hexToRgba(islandColor, 0.6)}`,
                boxShadow: `0 2px 8px ${hexToRgba(islandColor, 0.25)}`,
              }}
            >
              <span>🏝️</span>
              <span>{island.name}</span>
            </div>
          </div>
        )}

        {/* 標籤區 */}
        {memory.tags.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {memory.tags.slice(0, 3).map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs font-bold rounded-md truncate max-w-[70px]"
                  style={{
                    background: 'rgba(251, 191, 36, 0.2)',
                    color: '#fbbf24',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                  }}
                  title={tag}
                >
                  #{tag}
                </span>
              ))}
              {memory.tags.length > 3 && (
                <span className="text-xs font-bold px-1 py-0.5" style={{ color: '#94a3b8' }}>
                  +{memory.tags.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 日期與時間區 */}
        <div className="pt-2 border-t" style={{ borderColor: 'rgba(251, 191, 36, 0.25)' }}>
          <div className="flex items-center justify-between text-xs font-semibold" style={{
            color: '#94a3b8',
          }}>
            <div className="flex items-center gap-1">
              <span className="text-sm">📅</span>
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm">🕐</span>
              <span>{time}</span>
            </div>
          </div>
        </div>

        {/* 刪除按鈕（批量模式下隱藏） */}
        {!bulkSelectMode && (
          <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(memory, e)
              }}
              className="p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 text-sm"
              style={{
                background: 'rgba(30, 41, 59, 0.95)',
                border: '2px solid rgba(251, 146, 60, 0.4)',
              }}
              title="刪除"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(251, 146, 60, 0.4)'
                e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.7)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)'
                e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.4)'
              }}
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// 普通記憶卡片（不可拖動）
interface MemoryCardProps {
  memory: Memory
  onTogglePin: (memory: Memory, e?: React.MouseEvent) => void
  onSelectMemory: (memory: Memory) => void
  onDelete: (memory: Memory, e: React.MouseEvent) => void
  formatDate: (dateString: string) => { date: string; time: string }
  bulkSelectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (memoryId: string) => void
  islands?: Island[]
}

function MemoryCard({
  memory,
  onTogglePin,
  onSelectMemory,
  onDelete,
  formatDate,
  bulkSelectMode = false,
  isSelected = false,
  onToggleSelect,
  islands = []
}: MemoryCardProps) {
  const { date, time } = formatDate(memory.createdAt)

  // 根據記憶的島嶼 ID 查找對應島嶼顏色
  const island = memory.islandId ? islands.find(i => i.id === memory.islandId) : null
  const islandColor = island?.color || '#fbbf24' // 預設金色

  // 將十六進制顏色轉為 rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // 批量選擇模式下，點擊卡片應該切換選擇狀態，而非打開記憶
  const handleClick = () => {
    if (bulkSelectMode && onToggleSelect) {
      onToggleSelect(memory.id)
    } else {
      onSelectMemory(memory)
    }
  }

  return (
    <div
      onClick={handleClick}
      className="group relative rounded-2xl p-3 sm:p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col"
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${hexToRgba(islandColor, 0.25)} 0%, ${hexToRgba(islandColor, 0.2)} 100%)`
          : 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
        backdropFilter: 'blur(12px) saturate(150%)',
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
        border: isSelected
          ? `2px solid ${hexToRgba(islandColor, 0.8)}`
          : `2px solid ${hexToRgba(islandColor, 0.4)}`,
        boxShadow: isSelected
          ? `0 8px 24px ${hexToRgba(islandColor, 0.4)}`
          : '0 4px 12px rgba(0, 0, 0, 0.3)',
        minHeight: '180px',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow = `0 8px 24px ${hexToRgba(islandColor, 0.3)}`
          e.currentTarget.style.borderColor = hexToRgba(islandColor, 0.6)
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
          e.currentTarget.style.borderColor = hexToRgba(islandColor, 0.4)
        }
      }}
    >
      {/* 複選框（批量選擇模式） */}
      {bulkSelectMode && (
        <div
          className="absolute top-2 left-2 z-20"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect?.(memory.id)
          }}
        >
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-all ${
              isSelected ? 'scale-110' : 'hover:scale-110'
            }`}
            style={{
              background: isSelected
                ? 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)'
                : 'rgba(30, 41, 59, 0.95)',
              border: isSelected
                ? '2px solid rgba(251, 191, 36, 0.8)'
                : '2px solid rgba(251, 191, 36, 0.4)',
            }}
          >
            {isSelected && <span className="text-sm">✓</span>}
          </div>
        </div>
      )}

      {/* 釘選按鈕 */}
      {memory.isPinned && !bulkSelectMode && (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10">
          <button
            onClick={(e) => onTogglePin(memory, e)}
            className="p-1.5 rounded-lg transition-all text-sm hover:scale-110 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
              color: '#1a1a2e',
              boxShadow: '0 2px 6px rgba(251, 191, 36, 0.4)',
            }}
            title="取消釘選"
          >
            📌
          </button>
        </div>
      )}

      {/* 標題區 */}
      <div className="mb-2">
        <h3 className="text-base sm:text-lg font-black line-clamp-2 leading-tight" style={{
          color: '#fef3c7',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
        }}>
          {memory.title || memory.summary || '無標題記憶'}
        </h3>
      </div>


      {/* 內容預覽區 */}
      <div className="flex-1 mb-2">
        {(memory.detailedSummary || memory.rawContent) ? (
          <div>
            <div className="text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>
              {memory.detailedSummary ? '💡 AI 深度分析' : '📝 內容預覽'}
            </div>
            <p className="text-xs line-clamp-2 font-medium leading-relaxed whitespace-pre-wrap" style={{
              color: '#e2e8f0',
              lineHeight: '1.5',
            }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(memory as any).detailedSummary || memory.rawContent}
            </p>
          </div>
        ) : (
          <div className="text-xs italic" style={{ color: '#64748b' }}>
            無內容預覽
          </div>
        )}
      </div>

      {/* 島嶼標籤 */}
      {island && (
        <div className="mb-2">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(islandColor, 0.35)} 0%, ${hexToRgba(islandColor, 0.25)} 100%)`,
              color: islandColor,
              border: `1.5px solid ${hexToRgba(islandColor, 0.6)}`,
              boxShadow: `0 2px 8px ${hexToRgba(islandColor, 0.25)}`,
            }}
          >
            <span>🏝️</span>
            <span>{island.name}</span>
          </div>
        </div>
      )}

      {/* 標籤區 */}
      {memory.tags.length > 0 && (
        <div className="mb-2">
          <div className="flex flex-wrap gap-1">
            {memory.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs font-bold rounded-md truncate max-w-[70px]"
                style={{
                  background: 'rgba(251, 191, 36, 0.2)',
                  color: '#fbbf24',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                }}
                title={tag}
              >
                #{tag}
              </span>
            ))}
            {memory.tags.length > 3 && (
              <span className="text-xs font-bold px-1 py-0.5" style={{ color: '#94a3b8' }}>
                +{memory.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 日期與時間區 */}
      <div className="pt-2 border-t" style={{ borderColor: 'rgba(251, 191, 36, 0.25)' }}>
        <div className="flex items-center justify-between text-xs font-semibold" style={{
          color: '#94a3b8',
        }}>
          <div className="flex items-center gap-1">
            <span className="text-sm">📅</span>
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm">🕐</span>
            <span>{time}</span>
          </div>
        </div>
      </div>

      {/* 刪除按鈕（批量模式下隱藏） */}
      {!bulkSelectMode && (
        <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => onDelete(memory, e)}
            className="p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 text-sm"
            style={{
              background: 'rgba(30, 41, 59, 0.95)',
              border: '2px solid rgba(251, 146, 60, 0.4)',
            }}
            title="刪除"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(251, 146, 60, 0.4)'
              e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.7)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)'
              e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.4)'
            }}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  )
}

