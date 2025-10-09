import { useMutation } from '@apollo/client'
import { PIN_MEMORY, UNPIN_MEMORY, ARCHIVE_MEMORY, DELETE_MEMORY } from '../../graphql/memory'
import type { Memory } from '../../graphql/memory'
import { useState, useEffect, useRef } from 'react'

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
        className="relative group backdrop-blur-sm border rounded-xl p-4 shadow-lg transition-all cursor-pointer hover:scale-[1.01] animate-slide-up"
        style={{
          background: 'rgba(26, 26, 36, 0.9)',
          borderColor: '#2a2a38'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#7c5cff'
          e.currentTarget.style.boxShadow = '0 20px 50px rgba(124, 92, 255, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#2a2a38'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="flex items-start gap-4">
          {/* Emoji/Icon - 固定寬度 */}
          <div className="text-4xl flex-shrink-0 w-14 text-center">
            {memory.emoji || memory.assistant?.emoji}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-lg truncate" style={{ color: '#e8e8f0' }}>
                {memory.title || memory.summary || '無標題記憶'}
              </h3>
              <button
                onClick={handlePin}
                className="flex-shrink-0 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                style={{ color: memory.isPinned ? '#ff6eb4' : '#78788a' }}
              >
                📌
              </button>
            </div>

            <p className="text-sm line-clamp-2 mb-3" style={{ color: '#a8a8b8' }}>
              {memory.summary || memory.rawContent}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {/* Assistant */}
                {memory.assistant && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border" style={{
                    background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(255, 110, 180, 0.2))',
                    color: '#e8e8f0',
                    borderColor: '#2a2a38'
                  }}>
                    {memory.assistant.emoji} {memory.assistant.nameChinese}
                  </span>
                )}

                {/* Tags */}
                {memory.tags.slice(0, 3).map((tag: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-lg border" style={{
                    background: '#2d2d3a',
                    color: '#a8a8b8',
                    borderColor: '#2a2a38'
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Date - 固定寬度 */}
              <span className="text-xs flex-shrink-0 w-24 text-right" style={{ color: '#78788a' }}>
                {formatDate(memory.createdAt)}
              </span>
            </div>
          </div>

          {/* Actions Menu - 固定寬度 */}
          <div className="relative flex-shrink-0 w-8" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-2 opacity-0 group-hover:opacity-100 transition-all"
              style={{ color: '#78788a' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#e8e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#78788a'}
            >
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 rounded-xl shadow-2xl border py-2 z-10 min-w-[120px]" style={{
                background: '#2d2d3a',
                borderColor: '#35354a'
              }}>
                <button
                  onClick={handleArchive}
                  className="w-full text-left px-4 py-2 text-sm transition-colors"
                  style={{ color: '#e8e8f0' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#35354a'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  📦 封存
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-sm transition-colors"
                  style={{ color: '#ff5c5c' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#35354a'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  🗑️刪除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div
      onClick={onClick}
      className="relative group backdrop-blur-sm border rounded-xl p-5 shadow-lg transition-all cursor-pointer hover:scale-105 animate-scale-in"
      style={{
        background: 'rgba(26, 26, 36, 0.9)',
        borderColor: '#2a2a38',
        animationDelay: `${Math.random() * 0.3}s`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#7c5cff'
        e.currentTarget.style.boxShadow = '0 20px 50px rgba(124, 92, 255, 0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a38'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Pin Button */}
      <button
        onClick={handlePin}
        className="absolute top-3 right-3 p-1 rounded-lg transition-all z-10 opacity-0 group-hover:opacity-100"
        style={{ color: memory.isPinned ? '#ff6eb4' : '#78788a' }}
      >
        📌
      </button>

      {/* Emoji/Icon */}
      <div className="text-5xl mb-3 text-center">
        {memory.emoji || memory.assistant?.emoji}
      </div>

      {/* Title */}
      <h3 className="font-bold text-center mb-2 line-clamp-2 min-h-[3rem]" style={{ color: '#e8e8f0' }}>
        {memory.title || memory.summary || '無標題記憶'}
      </h3>

      {/* Content Preview */}
      <p className="text-sm text-center line-clamp-3 mb-4" style={{ color: '#a8a8b8' }}>
        {memory.summary || memory.rawContent}
      </p>

      {/* Assistant Badge */}
      {memory.assistant && (
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border" style={{
            background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(255, 110, 180, 0.2))',
            color: '#e8e8f0',
            borderColor: '#2a2a38'
          }}>
            {memory.assistant.emoji} {memory.assistant.nameChinese}
          </span>
        </div>
      )}

      {/* Tags */}
      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-3">
          {memory.tags.slice(0, 3).map((tag: string, i: number) => (
            <span key={i} className="text-xs px-2 py-1 rounded-lg border" style={{
              background: '#2d2d3a',
              color: '#a8a8b8',
              borderColor: '#2a2a38'
            }}>
              #{tag}
            </span>
          ))}
          {memory.tags.length > 3 && (
            <span className="text-xs px-2 py-1 rounded-lg border" style={{
              background: '#2d2d3a',
              color: '#78788a',
              borderColor: '#2a2a38'
            }}>
              +{memory.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs pt-3 border-t" style={{
        color: '#78788a',
        borderColor: '#35354a'
      }}>
        <span>{formatDate(memory.createdAt)}</span>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={handleArchive}
            className="p-1 transition-colors"
            style={{ color: '#78788a' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#e8e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#78788a'}
            title="封存"
          >
            📦
          </button>
          <button
            onClick={handleDelete}
            className="p-1 transition-colors"
            style={{ color: '#78788a' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ff5c5c'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#78788a'}
            title="刪除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}
