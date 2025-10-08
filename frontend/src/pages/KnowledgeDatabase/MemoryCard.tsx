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

  const importanceColor = (importance: number) => {
    if (importance >= 8) return 'from-red-400 to-pink-400'
    if (importance >= 6) return 'from-yellow-400 to-orange-400'
    if (importance >= 4) return 'from-blue-400 to-cyan-400'
    return 'from-gray-400 to-gray-500'
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className="relative group bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-cute hover:shadow-cute-lg transition-all cursor-pointer hover:scale-[1.01] animate-slide-up"
      >
        <div className="flex items-start gap-4">
          {/* Emoji/Icon */}
          <div className="text-4xl flex-shrink-0">
            {memory.emoji || memory.assistant?.emoji}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-gray-800 text-lg truncate">
                {memory.title || memory.summary || '無標題記憶'}
              </h3>
              <button
                onClick={handlePin}
                className={`flex-shrink-0 p-1 rounded-lg transition-all ${
                  memory.isPinned
                    ? 'text-baby-pink'
                    : 'text-gray-400 opacity-0 group-hover:opacity-100'
                }`}
              >
                📌
              </button>
            </div>

            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
              {memory.summary || memory.rawContent}
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Assistant */}
              {memory.assistant && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gradient-to-br from-baby-pink/20 to-baby-yellow/20">
                  {memory.assistant.emoji} {memory.assistant.nameChinese}
                </span>
              )}

              {/* Importance */}
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gradient-to-br ${importanceColor(memory.aiImportance)} text-white`}>
                ⭐ {memory.aiImportance}/10
              </span>

              {/* Tags */}
              {memory.tags.slice(0, 3).map((tag: string, i: number) => (
                <span key={i} className="text-xs px-2 py-1 rounded-lg bg-baby-cream text-gray-600">
                  #{tag}
                </span>
              ))}

              {/* Date */}
              <span className="text-xs text-gray-400 ml-auto">
                {formatDate(memory.createdAt)}
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
              className="p-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg py-2 z-10 min-w-[120px]">
                <button onClick={handleArchive} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">
                  📦 封存
                </button>
                <button onClick={handleDelete} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600">
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
      className="relative group bg-white/90 backdrop-blur-sm rounded-xl p-5 shadow-cute hover:shadow-cute-lg transition-all cursor-pointer hover:scale-105 animate-scale-in"
      style={{ animationDelay: `${Math.random() * 0.3}s` }}
    >
      {/* Pin Button */}
      <button
        onClick={handlePin}
        className={`absolute top-3 right-3 p-1 rounded-lg transition-all z-10 ${
          memory.isPinned
            ? 'text-baby-pink'
            : 'text-gray-400 opacity-0 group-hover:opacity-100'
        }`}
      >
        📌
      </button>

      {/* Emoji/Icon */}
      <div className="text-5xl mb-3 text-center">
        {memory.emoji || memory.assistant?.emoji}
      </div>

      {/* Title */}
      <h3 className="font-bold text-gray-800 text-center mb-2 line-clamp-2 min-h-[3rem]">
        {memory.title || memory.summary || '無標題記憶'}
      </h3>

      {/* Content Preview */}
      <p className="text-gray-600 text-sm text-center line-clamp-3 mb-4">
        {memory.summary || memory.rawContent}
      </p>

      {/* Assistant Badge */}
      {memory.assistant && (
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-gradient-to-br from-baby-pink/20 to-baby-yellow/20">
            {memory.assistant.emoji} {memory.assistant.nameChinese}
          </span>
        </div>
      )}

      {/* Importance Badge - 只顯示重要的記憶 */}
      {memory.aiImportance >= 7 && (
        <div className="flex justify-center mb-3">
          <span className={`text-xs px-3 py-1 rounded-full text-white bg-gradient-to-r ${importanceColor(memory.aiImportance)}`}>
            ⭐ 重要
          </span>
        </div>
      )}

      {/* Tags */}
      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-3">
          {memory.tags.slice(0, 3).map((tag: string, i: number) => (
            <span key={i} className="text-xs px-2 py-1 rounded-lg bg-baby-cream text-gray-600">
              #{tag}
            </span>
          ))}
          {memory.tags.length > 3 && (
            <span className="text-xs px-2 py-1 rounded-lg bg-gray-200 text-gray-500">
              +{memory.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-200">
        <span>{formatDate(memory.createdAt)}</span>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={handleArchive}
            className="p-1 hover:text-gray-600"
            title="封存"
          >
            📦
          </button>
          <button
            onClick={handleDelete}
            className="p-1 hover:text-red-600"
            title="刪除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}
