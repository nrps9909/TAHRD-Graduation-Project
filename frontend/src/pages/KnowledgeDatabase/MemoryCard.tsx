import { useMutation } from '@apollo/client'
import { PIN_MEMORY, UNPIN_MEMORY, ARCHIVE_MEMORY, DELETE_MEMORY } from '../../graphql/memory'
import type { Memory, MemoryCategory } from '../../graphql/memory'
import { useState, useEffect, useRef } from 'react'

// 分類資訊對應
const CATEGORY_INFO: Record<MemoryCategory, { name: string; emoji: string; color: string }> = {
  LEARNING: { name: '學習筆記', emoji: '📚', color: '#4A90E2' },
  INSPIRATION: { name: '靈感創意', emoji: '💡', color: '#F5A623' },
  WORK: { name: '工作事務', emoji: '💼', color: '#7B68EE' },
  SOCIAL: { name: '人際關係', emoji: '👥', color: '#FF6B9D' },
  LIFE: { name: '生活記錄', emoji: '🌱', color: '#50C878' },
  GOALS: { name: '目標規劃', emoji: '🎯', color: '#FF6347' },
  RESOURCES: { name: '資源收藏', emoji: '📦', color: '#9370DB' },
}

interface MemoryCardProps {
  memory: Memory
  viewMode: 'grid' | 'list'
  onClick: () => void
  onUpdate: () => void
}

export default function MemoryCard({ memory, viewMode, onClick, onUpdate }: MemoryCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pinMemory] = useMutation(PIN_MEMORY)
  const [unpinMemory] = useMutation(UNPIN_MEMORY)
  const [archiveMemory] = useMutation(ARCHIVE_MEMORY)
  const [deleteMemory] = useMutation(DELETE_MEMORY)

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (memory.isPinned) {
        await unpinMemory({ variables: { id: memory.id } })
      } else {
        await pinMemory({ variables: { id: memory.id } })
      }
      onUpdate()
    } catch (error) {
      console.error('Pin/unpin error:', error)
    }
  }

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await archiveMemory({ variables: { id: memory.id } })
      onUpdate()
      setShowMenu(false)
    } catch (error) {
      console.error('Archive error:', error)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('確定要刪除這條記憶嗎？')) return

    try {
      await deleteMemory({ variables: { id: memory.id } })
      onUpdate()
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '剛剛'
    if (diffMins < 60) return `${diffMins} 分鐘前`
    if (diffHours < 24) return `${diffHours} 小時前`
    if (diffDays < 7) return `${diffDays} 天前`
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className="relative group border rounded-3xl p-5 shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
          backdropFilter: 'blur(12px) saturate(150%)',
          WebkitBackdropFilter: 'blur(12px) saturate(150%)',
          borderColor: 'rgba(251, 191, 36, 0.2)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)'
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(251, 191, 36, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.2)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="flex items-start gap-4">
          {/* Emoji/Icon */}
          <div
            className="text-5xl flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 146, 60, 0.2) 100%)',
              border: '2px solid rgba(251, 191, 36, 0.3)',
            }}
          >
            {memory.emoji || memory.assistant?.emoji}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-black text-xl" style={{ color: '#fef3c7', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                {memory.title || memory.summary || '無標題記憶'}
              </h3>
              <button
                onClick={handlePin}
                className="flex-shrink-0 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                style={{
                  background: memory.isPinned ? 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)' : 'rgba(30, 41, 59, 0.6)',
                  color: memory.isPinned ? '#1a1a2e' : '#cbd5e1',
                }}
              >
                📌
              </button>
            </div>

            <p className="text-sm line-clamp-2 mb-4 font-medium" style={{ color: '#cbd5e1' }}>
              {memory.summary || memory.rawContent}
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Category - 主分類 */}
              {memory.category && CATEGORY_INFO[memory.category] && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold"
                  style={{
                    background: `${CATEGORY_INFO[memory.category].color}20`,
                    color: CATEGORY_INFO[memory.category].color,
                    border: `1.5px solid ${CATEGORY_INFO[memory.category].color}40`,
                  }}
                >
                  {CATEGORY_INFO[memory.category].emoji} {CATEGORY_INFO[memory.category].name}
                </span>
              )}

              {/* Subcategory - 自訂分類 */}
              {memory.subcategory && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold"
                  style={{
                    background: `${memory.subcategory.color}30`,
                    color: '#fef3c7',
                    border: `1.5px solid ${memory.subcategory.color}`,
                  }}
                >
                  {memory.subcategory.emoji} {memory.subcategory.nameChinese}
                </span>
              )}

              {/* Assistant */}
              {memory.assistant && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 146, 60, 0.3) 100%)',
                    color: '#fef3c7',
                    border: '1.5px solid rgba(251, 191, 36, 0.4)',
                  }}
                >
                  {memory.assistant.emoji} {memory.assistant.nameChinese}
                </span>
              )}

              {/* Tags */}
              {memory.tags.slice(0, 3).map((tag: string, i: number) => (
                <span
                  key={i}
                  className="text-xs px-3 py-1.5 rounded-xl font-bold"
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    color: '#94a3b8',
                    border: '1.5px solid rgba(251, 191, 36, 0.15)',
                  }}
                >
                  #{tag}
                </span>
              ))}

              {/* Date */}
              <span className="text-xs font-semibold ml-auto" style={{ color: '#94a3b8' }}>
                🕐 {formatDate(memory.createdAt)}
              </span>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-2 opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:scale-110"
              style={{
                color: '#cbd5e1',
                background: 'rgba(30, 41, 59, 0.6)',
              }}
            >
              ⋮
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-12 rounded-2xl shadow-2xl py-2 z-10 min-w-[140px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%)',
                  backdropFilter: 'blur(12px)',
                  border: '2px solid rgba(251, 191, 36, 0.3)',
                }}
              >
                <button
                  onClick={handleArchive}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold transition-all"
                  style={{ color: '#fef3c7' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  📦 封存
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold transition-all"
                  style={{ color: '#fb923c' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(251, 146, 60, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  🗑️ 刪除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Grid view - 動森風格卡片
  return (
    <div
      onClick={onClick}
      className="relative group border rounded-3xl p-6 shadow-lg transition-all cursor-pointer hover:scale-105"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
        backdropFilter: 'blur(12px) saturate(150%)',
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
        borderColor: 'rgba(251, 191, 36, 0.2)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(251, 191, 36, 0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.2)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Pin Button */}
      <button
        onClick={handlePin}
        className="absolute top-4 right-4 p-2 rounded-xl transition-all z-10 opacity-0 group-hover:opacity-100 hover:scale-110"
        style={{
          background: memory.isPinned ? 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)' : 'rgba(30, 41, 59, 0.8)',
          color: memory.isPinned ? '#1a1a2e' : '#cbd5e1',
          boxShadow: memory.isPinned ? '0 4px 12px rgba(251, 191, 36, 0.4)' : 'none',
        }}
      >
        📌
      </button>

      {/* Emoji/Icon */}
      <div
        className="text-6xl mb-4 flex items-center justify-center h-20 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 146, 60, 0.2) 100%)',
          border: '2px solid rgba(251, 191, 36, 0.3)',
        }}
      >
        {memory.emoji || memory.assistant?.emoji}
      </div>

      {/* Title */}
      <h3
        className="font-black text-center mb-3 line-clamp-2 min-h-[3.5rem] text-lg"
        style={{
          color: '#fef3c7',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        }}
      >
        {memory.title || memory.summary || '無標題記憶'}
      </h3>

      {/* Content Preview */}
      <p className="text-sm text-center line-clamp-3 mb-4 font-medium" style={{ color: '#cbd5e1' }}>
        {memory.summary || memory.rawContent}
      </p>

      {/* Category & Subcategory Badges */}
      <div className="flex flex-wrap gap-2 justify-center mb-3">
        {/* Category - 主分類 */}
        {memory.category && CATEGORY_INFO[memory.category] && (
          <span
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold"
            style={{
              background: `${CATEGORY_INFO[memory.category].color}20`,
              color: CATEGORY_INFO[memory.category].color,
              border: `1.5px solid ${CATEGORY_INFO[memory.category].color}40`,
            }}
          >
            {CATEGORY_INFO[memory.category].emoji} {CATEGORY_INFO[memory.category].name}
          </span>
        )}

        {/* Subcategory - 自訂分類 */}
        {memory.subcategory && (
          <span
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold"
            style={{
              background: `${memory.subcategory.color}30`,
              color: '#fef3c7',
              border: `1.5px solid ${memory.subcategory.color}`,
            }}
          >
            {memory.subcategory.emoji} {memory.subcategory.nameChinese}
          </span>
        )}

        {/* Assistant Badge */}
        {memory.assistant && (
          <span
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 146, 60, 0.3) 100%)',
              color: '#fef3c7',
              border: '1.5px solid rgba(251, 191, 36, 0.4)',
            }}
          >
            {memory.assistant.emoji} {memory.assistant.nameChinese}
          </span>
        )}
      </div>

      {/* Tags */}
      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {memory.tags.slice(0, 3).map((tag: string, i: number) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-xl font-bold"
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                color: '#94a3b8',
                border: '1.5px solid rgba(251, 191, 36, 0.15)',
              }}
            >
              #{tag}
            </span>
          ))}
          {memory.tags.length > 3 && (
            <span
              className="text-xs px-2.5 py-1 rounded-xl font-bold"
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                color: '#94a3b8',
                border: '1.5px solid rgba(251, 191, 36, 0.15)',
              }}
            >
              +{memory.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between text-xs pt-4 border-t font-semibold"
        style={{
          color: '#94a3b8',
          borderColor: 'rgba(251, 191, 36, 0.2)',
        }}
      >
        <span>🕐 {formatDate(memory.createdAt)}</span>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={handleArchive}
            className="p-1.5 transition-all rounded-lg hover:scale-110"
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              color: '#cbd5e1',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(251, 191, 36, 0.3)'
              e.currentTarget.style.color = '#fef3c7'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)'
              e.currentTarget.style.color = '#cbd5e1'
            }}
            title="封存"
          >
            📦
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 transition-all rounded-lg hover:scale-110"
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              color: '#cbd5e1',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(251, 146, 60, 0.3)'
              e.currentTarget.style.color = '#fb923c'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)'
              e.currentTarget.style.color = '#cbd5e1'
            }}
            title="刪除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}
