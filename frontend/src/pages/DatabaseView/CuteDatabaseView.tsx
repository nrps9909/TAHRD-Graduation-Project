import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
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
import { GET_ISLANDS, Island } from '../../graphql/category'
import { QueueFloatingButton } from '../../components/QueueFloatingButton'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type SortField = 'createdAt' | 'title' | 'custom'

export default function CuteDatabaseView() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | null>(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null)
  const [expandedIslands, setExpandedIslands] = useState<Set<string>>(new Set())
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
    onError: (error) => {
      console.error('Failed to load memories:', error)
      toast.error('載入記憶失敗，請檢查網路連線 😢')
    },
  })

  // 獲取島嶼和小類別資料
  const { data: islandsData, loading: islandsLoading } = useQuery(GET_ISLANDS, {
    onError: (error) => {
      console.error('Failed to load islands:', error)
    },
  })

  const [pinMemory] = useMutation(PIN_MEMORY, { refetchQueries: ['GetMemories'] })
  const [unpinMemory] = useMutation(UNPIN_MEMORY, { refetchQueries: ['GetMemories'] })
  const [deleteMemory] = useMutation(DELETE_MEMORY)
  const [createMemoryDirect] = useMutation(CREATE_MEMORY_DIRECT)

  const islands: Island[] = useMemo(() => islandsData?.islands || [], [islandsData?.islands])

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

    // 小類別過濾（優先級最高）
    if (selectedSubcategoryId) {
      filtered = filtered.filter((m: any) => m.subcategoryId === selectedSubcategoryId)
    }
    // 島嶼過濾（顯示該島嶼下所有小類別的記憶）
    else if (selectedIslandId) {
      const selectedIsland = islands.find(i => i.id === selectedIslandId)
      if (selectedIsland) {
        const subcategoryIds = (selectedIsland.subcategories || []).map(sub => sub.id)
        filtered = filtered.filter((m: any) =>
          subcategoryIds.includes(m.subcategoryId)
        )
      }
    }
    // 大類別（傳統分類）過濾
    else if (selectedCategory) {
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
  }, [memoriesData?.memories, selectedCategory, selectedSubcategoryId, selectedIslandId, debouncedSearch, sortField, customOrder, islands])

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
      // 不傳遞 category，讓後端使用默認值 LIFE
      // 用戶可以在編輯器中自由選擇自定義分類 (subcategoryId)
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

        {/* 分類篩選 - 島嶼層級視圖 */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1.5">
            {/* 全部按鈕 */}
            <button
              onClick={() => {
                setSelectedCategory(null)
                setSelectedSubcategoryId(null)
                setSelectedIslandId(null)
              }}
              className="w-full text-left px-3 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02]"
              style={!selectedCategory && !selectedSubcategoryId && !selectedIslandId ? {
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
              <div className="text-center py-4 text-xs text-gray-400">載入中...</div>
            ) : islands.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-400">
                尚未建立島嶼分類
                <br />
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="mt-2 text-xs text-[#fbbf24] hover:underline"
                >
                  點擊設定分類
                </button>
              </div>
            ) : (
              islands.map((island) => {
                const isExpanded = expandedIslands.has(island.id)
                const subcategories = island.subcategories || []
                const islandMemoryCount = (memoriesData?.memories || []).filter((m: any) =>
                  subcategories.some(sub => sub.id === m.subcategoryId)
                ).length

                return (
                  <div key={island.id} className="space-y-1">
                    {/* 島嶼標題 */}
                    <button
                      onClick={() => {
                        // 展開/收起島嶼
                        const newExpanded = new Set(expandedIslands)
                        if (isExpanded) {
                          newExpanded.delete(island.id)
                        } else {
                          newExpanded.add(island.id)
                        }
                        setExpandedIslands(newExpanded)

                        // 選擇島嶼並顯示該島嶼下所有記憶
                        setSelectedIslandId(island.id)
                        setSelectedSubcategoryId(null)
                        setSelectedCategory(null)
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02]"
                      style={selectedIslandId === island.id && !selectedSubcategoryId ? {
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
                        <div className="flex items-center gap-2">
                          <span className="transition-transform" style={{
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          }}>▶</span>
                          <span>{island.emoji} {island.nameChinese}</span>
                        </div>
                        <span className="text-xs opacity-90 font-bold">{islandMemoryCount}</span>
                      </div>
                    </button>

                    {/* 小類別列表（展開時顯示） */}
                    {isExpanded && (
                      <div className="ml-4 space-y-1">
                        {subcategories.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-400">
                            尚無小類別
                          </div>
                        ) : (
                          subcategories.map((subcategory) => {
                            const subMemoryCount = (memoriesData?.memories || []).filter(
                              (m: any) => m.subcategoryId === subcategory.id
                            ).length
                            const isSelected = selectedSubcategoryId === subcategory.id

                            return (
                              <button
                                key={subcategory.id}
                                onClick={() => {
                                  setSelectedSubcategoryId(subcategory.id)
                                  setSelectedIslandId(null)
                                  setSelectedCategory(null)
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                                style={isSelected ? {
                                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(251, 146, 60, 0.25) 100%)',
                                  color: '#fef3c7',
                                  border: '1.5px solid rgba(251, 191, 36, 0.4)',
                                } : {
                                  background: 'rgba(30, 41, 59, 0.4)',
                                  color: '#cbd5e1',
                                  border: '1.5px solid rgba(251, 191, 36, 0.1)',
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{subcategory.emoji} {subcategory.nameChinese}</span>
                                  <span className="text-xs opacity-75">{subMemoryCount}</span>
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* 傳統分類（向後兼容） */}
            {categories.some((cat) => {
              const count = (memoriesData?.memories || []).filter((m: any) => m.category === cat.value && !m.subcategoryId).length
              return count > 0
            }) && (
              <>
                <div className="pt-3 pb-2 px-3 text-xs font-bold text-gray-400 border-t mt-3" style={{
                  borderColor: 'rgba(251, 191, 36, 0.2)',
                }}>
                  📋 傳統分類
                </div>
                {categories.map((cat) => {
                  const count = (memoriesData?.memories || []).filter((m: any) => m.category === cat.value && !m.subcategoryId).length
                  if (count === 0) return null
                  const isSelected = selectedCategory === cat.value && !selectedSubcategoryId && !selectedIslandId
                  return (
                    <button
                      key={cat.value}
                      onClick={() => {
                        setSelectedCategory(cat.value)
                        setSelectedSubcategoryId(null)
                        setSelectedIslandId(null)
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02]"
                      style={isSelected ? {
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
                        <span>{cat.emoji} {cat.label}</span>
                        <span className="text-xs opacity-90 font-bold">{count}</span>
                      </div>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 頂部工具列 - 優化排版 */}
        <div className="sticky top-0 z-40 border-b px-4 md:px-6 py-3 md:py-4" style={{
          borderColor: 'rgba(251, 191, 36, 0.3)',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 4px 20px rgba(251, 191, 36, 0.2)',
        }}>
          <div className="max-w-7xl mx-auto">
            {/* 第一行：側邊欄按鈕 + 搜尋框 */}
            <div className="flex items-center gap-3 mb-3">
              {/* 展開側邊欄按鈕 */}
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2.5 rounded-xl transition-all flex-shrink-0 hover:scale-110 active:scale-95"
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
                  <span className="text-base">☰</span>
                </button>
              )}

              {/* 搜尋框 */}
              <div className="flex-1 relative max-w-2xl">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋知識..."
                  className="w-full pl-11 pr-10 py-2.5 rounded-2xl text-sm font-medium focus:outline-none transition-all"
                  style={{
                    border: '2px solid rgba(251, 191, 36, 0.25)',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: '#fef3c7',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(251, 191, 36, 0.6)'
                    e.target.style.boxShadow = '0 0 0 4px rgba(251, 191, 36, 0.15)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(251, 191, 36, 0.25)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">
                  🔍
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all hover:scale-110 active:scale-95"
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
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 第二行：功能按鈕 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* 排序選擇 */}
                <select
                  value={sortField}
                  onChange={(e) => {
                    const newSort = e.target.value as SortField
                    setSortField(newSort)
                    // 切換到自定義排序時，初始化順序
                    if (newSort === 'custom' && customOrder.length === 0) {
                      setCustomOrder(filteredMemories.map(m => m.id))
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-bold focus:outline-none transition-all cursor-pointer"
                  style={{
                    border: '2px solid rgba(251, 191, 36, 0.3)',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: '#cbd5e1',
                  }}
                >
                  <option value="createdAt">⏰ 最新優先</option>
                  <option value="title">🔤 標題排序</option>
                  <option value="custom">✋ 自訂排序（可拖動）</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {/* 新增按鈕 */}
                <button
                  onClick={handleCreateNewMemory}
                  className="px-5 py-2 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 text-sm flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
                    color: '#1a1a2e',
                    boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)',
                  }}
                >
                  <span>✨</span>
                  <span className="hidden sm:inline">新增知識</span>
                </button>

                {/* 返回按鈕 */}
                <button
                  onClick={() => navigate('/')}
                  className="px-5 py-2 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 text-sm flex items-center gap-2"
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
                  <span>🏝️</span>
                  <span className="hidden sm:inline">返回</span>
                </button>
              </div>
            </div>
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
          <SimpleGalleryView
            memories={allMemories}
            onTogglePin={handleTogglePin}
            onSelectMemory={setSelectedMemory}
            onDelete={handleDelete}
            isDraggable={sortField === 'custom'}
            onReorder={(newOrder) => setCustomOrder(newOrder)}
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
}

function SimpleGalleryView({ memories, onTogglePin, onSelectMemory, onDelete, isDraggable = false, onReorder }: SimpleGalleryViewProps) {
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
}

function DraggableMemoryCard({ memory, onTogglePin, onSelectMemory, onDelete, formatDate }: DraggableMemoryCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div
        onClick={(e) => {
          if (!isDragging) {
            onSelectMemory(memory)
          }
        }}
        className="group relative rounded-2xl p-3 sm:p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
          backdropFilter: 'blur(12px) saturate(150%)',
          WebkitBackdropFilter: 'blur(12px) saturate(150%)',
          border: '2px solid rgba(251, 191, 36, 0.2)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          minHeight: '180px',
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(251, 191, 36, 0.3)'
            e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
          e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.2)'
        }}
      >
        {/* 拖動提示 */}
        <div className="absolute top-2 left-2 z-10">
          <div className="px-2 py-1 rounded-lg text-xs font-bold" style={{
            background: 'rgba(251, 191, 36, 0.3)',
            color: '#fef3c7',
            border: '1px solid rgba(251, 191, 36, 0.5)',
          }}>
            ✋ 拖動
          </div>
        </div>

        {/* 釘選按鈕 */}
        {memory.isPinned && (
          <div className="absolute top-2 sm:top-3 right-2 sm:top-3 z-10">
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

        {/* 分類區 */}
        {(memory as any).subcategory && (
          <div className="mb-2">
            <span
              className="px-2.5 py-1 text-xs font-black rounded-lg inline-flex items-center gap-1 shadow-md"
              style={{
                background: `${(memory as any).subcategory.color}`,
                color: '#ffffff',
                border: `2px solid ${(memory as any).subcategory.color}`,
                boxShadow: `0 2px 6px ${(memory as any).subcategory.color}40`,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              }}
            >
              <span className="text-sm">{(memory as any).subcategory.emoji}</span>
              <span className="truncate max-w-[120px]">{(memory as any).subcategory.nameChinese}</span>
            </span>
          </div>
        )}

        {/* 內容預覽區 */}
        <div className="flex-1 mb-2">
          {((memory as any).detailedSummary || memory.rawContent) ? (
            <div>
              <div className="text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>
                {(memory as any).detailedSummary ? '💡 AI 深度分析' : '📝 內容預覽'}
              </div>
              <p className="text-xs line-clamp-2 font-medium leading-relaxed whitespace-pre-wrap" style={{
                color: '#e2e8f0',
                lineHeight: '1.5',
              }}>
                {(memory as any).detailedSummary || memory.rawContent}
              </p>
            </div>
          ) : (
            <div className="text-xs italic" style={{ color: '#64748b' }}>
              無內容預覽
            </div>
          )}
        </div>

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

        {/* 刪除按鈕 */}
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
}

function MemoryCard({ memory, onTogglePin, onSelectMemory, onDelete, formatDate }: MemoryCardProps) {
  const { date, time } = formatDate(memory.createdAt)

  return (
    <div
      onClick={() => onSelectMemory(memory)}
      className="group relative rounded-2xl p-3 sm:p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
        backdropFilter: 'blur(12px) saturate(150%)',
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
        border: '2px solid rgba(251, 191, 36, 0.2)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        minHeight: '180px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(251, 191, 36, 0.3)'
        e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
        e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.2)'
      }}
    >
      {/* 釘選按鈕 */}
      {memory.isPinned && (
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

      {/* 分類區 */}
      {(memory as any).subcategory && (
        <div className="mb-2">
          <span
            className="px-2.5 py-1 text-xs font-black rounded-lg inline-flex items-center gap-1 shadow-md"
            style={{
              background: `${(memory as any).subcategory.color}`,
              color: '#ffffff',
              border: `2px solid ${(memory as any).subcategory.color}`,
              boxShadow: `0 2px 6px ${(memory as any).subcategory.color}40`,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
          >
            <span className="text-sm">{(memory as any).subcategory.emoji}</span>
            <span className="truncate max-w-[120px]">{(memory as any).subcategory.nameChinese}</span>
          </span>
        </div>
      )}

      {/* 內容預覽區 */}
      <div className="flex-1 mb-2">
        {((memory as any).detailedSummary || memory.rawContent) ? (
          <div>
            <div className="text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>
              {(memory as any).detailedSummary ? '💡 AI 深度分析' : '📝 內容預覽'}
            </div>
            <p className="text-xs line-clamp-2 font-medium leading-relaxed whitespace-pre-wrap" style={{
              color: '#e2e8f0',
              lineHeight: '1.5',
            }}>
              {(memory as any).detailedSummary || memory.rawContent}
            </p>
          </div>
        ) : (
          <div className="text-xs italic" style={{ color: '#64748b' }}>
            無內容預覽
          </div>
        )}
      </div>

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

      {/* 刪除按鈕 */}
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
    </div>
  )
}

// 刪除舊的重複代碼
function OldMemoryCardCode_ToDelete() {
  return null
}

// 以下是舊代碼，等待刪除
/*
      {memories.map((memory) => {
        const { date, time } = formatDate(memory.createdAt)
        return (
          <div
            key={memory.id}
            onClick={() => onSelectMemory(memory)}
            className="group relative rounded-2xl p-3 sm:p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
              backdropFilter: 'blur(12px) saturate(150%)',
              WebkitBackdropFilter: 'blur(12px) saturate(150%)',
              border: '2px solid rgba(251, 191, 36, 0.2)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              minHeight: '180px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(251, 191, 36, 0.3)'
              e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
              e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.2)'
            }}
          >
            {/* 釘選按鈕 - 響應式 */}
            {memory.isPinned && (
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

            {/* 標題區 - 響應式 */}
            <div className="mb-2">
              <h3 className="text-base sm:text-lg font-black line-clamp-2 leading-tight" style={{
                color: '#fef3c7',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
              }}>
                {memory.title || memory.summary || '無標題記憶'}
              </h3>
            </div>

            {/* 分類區 - 響應式標籤 */}
            {(memory as any).subcategory && (
              <div className="mb-2">
                <span
                  className="px-2.5 py-1 text-xs font-black rounded-lg inline-flex items-center gap-1 shadow-md"
                  style={{
                    background: `${(memory as any).subcategory.color}`,
                    color: '#ffffff',
                    border: `2px solid ${(memory as any).subcategory.color}`,
                    boxShadow: `0 2px 6px ${(memory as any).subcategory.color}40`,
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <span className="text-sm">{(memory as any).subcategory.emoji}</span>
                  <span className="truncate max-w-[120px]">{(memory as any).subcategory.nameChinese}</span>
                </span>
              </div>
            )}

            {/* 內容預覽區 - 響應式，優先顯示 AI 深度分析 */}
            <div className="flex-1 mb-2">
              {((memory as any).detailedSummary || memory.rawContent) ? (
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>
                    {(memory as any).detailedSummary ? '💡 AI 深度分析' : '📝 內容預覽'}
                  </div>
                  <p className="text-xs line-clamp-2 font-medium leading-relaxed whitespace-pre-wrap" style={{
                    color: '#e2e8f0',
                    lineHeight: '1.5',
                  }}>
                    {(memory as any).detailedSummary || memory.rawContent}
                  </p>
                </div>
              ) : (
                <div className="text-xs italic" style={{ color: '#64748b' }}>
                  無內容預覽
                </div>
              )}
            </div>

            {/* 標籤區 - 響應式 */}
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

            {/* 日期與時間區 - 響應式 */}
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

            {/* 刪除按鈕（hover 顯示）- 響應式 */}
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
          </div>
        )
      })}
    </div>
  )
}

