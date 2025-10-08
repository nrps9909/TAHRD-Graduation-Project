import { useState, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { UPDATE_MEMORY, DELETE_MEMORY, ARCHIVE_MEMORY, PIN_MEMORY, UNPIN_MEMORY } from '../../graphql/memory'
import type { Memory } from '../../graphql/memory'

interface MemoryDetailModalProps {
  memory: Memory
  onClose: () => void
  onUpdate: () => void
}

const emojiOptions = ['😊', '💡', '📚', '💼', '🎯', '💭', '✨', '🌸', '🎨', '🚀', '💪', '🌈', '❤️', '🎉', '🌟', '📝']

export default function MemoryDetailModal({ memory, onClose, onUpdate }: MemoryDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(memory.title || memory.summary || '')
  const [editedTags, setEditedTags] = useState<string[]>(memory.tags)
  const [newTag, setNewTag] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState(memory.emoji || memory.assistant?.emoji || '📝')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const [updateMemory] = useMutation(UPDATE_MEMORY)
  const [deleteMemory] = useMutation(DELETE_MEMORY)
  const [archiveMemory] = useMutation(ARCHIVE_MEMORY)
  const [pinMemory] = useMutation(PIN_MEMORY)
  const [unpinMemory] = useMutation(UNPIN_MEMORY)

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleSave = async () => {
    try {
      await updateMemory({
        variables: {
          id: memory.id,
          input: {
            title: editedTitle,
            tags: editedTags,
          },
        },
      })
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Update error:', error)
      alert('更新失敗，請稍後再試')
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !editedTags.includes(newTag.trim())) {
      setEditedTags([...editedTags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setEditedTags(editedTags.filter(t => t !== tag))
  }

  const handlePin = async () => {
    try {
      if (memory.isPinned) {
        await unpinMemory({ variables: { id: memory.id } })
      } else {
        await pinMemory({ variables: { id: memory.id } })
      }
      onUpdate()
    } catch (error) {
      console.error('Pin error:', error)
    }
  }

  const handleArchive = async () => {
    if (!confirm('確定要封存這條記憶嗎？')) return
    try {
      await archiveMemory({ variables: { id: memory.id } })
      onUpdate()
    } catch (error) {
      console.error('Archive error:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('確定要永久刪除這條記憶嗎？此操作無法復原！')) return
    try {
      await deleteMemory({ variables: { id: memory.id } })
      onUpdate()
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-gradient-to-br from-baby-cream via-white to-baby-yellow/30 rounded-3xl shadow-cute-xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b-4 border-baby-blush/30 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Emoji Picker */}
              <div className="relative inline-block mb-3">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-6xl hover:scale-110 transition-transform cursor-pointer"
                >
                  {selectedEmoji}
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg p-3 grid grid-cols-8 gap-2 z-20">
                    {emojiOptions.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setSelectedEmoji(emoji)
                          setShowEmojiPicker(false)
                        }}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title */}
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full text-3xl font-bold bg-transparent border-b-2 border-baby-pink focus:outline-none mb-2"
                  placeholder="為這條記憶取個標題..."
                />
              ) : (
                <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-yellow-400 bg-clip-text text-transparent mb-2">
                  {memory.title || memory.summary || '無標題記憶'}
                </h2>
              )}

              {/* Meta Info */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {memory.assistant && (
                  <>
                    <span className="flex items-center gap-1">
                      {memory.assistant.emoji} {memory.assistant.nameChinese}
                    </span>
                    <span>•</span>
                  </>
                )}
                <span>{formatDate(memory.createdAt)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  ⭐ {memory.aiImportance}/10
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handlePin}
                className={`p-2 rounded-xl transition-all ${
                  memory.isPinned
                    ? 'bg-gradient-to-br from-baby-pink to-baby-blush text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title={memory.isPinned ? '取消釘選' : '釘選'}
              >
                📌
              </button>
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-xl hover:scale-105 transition-all"
                  >
                    💾 保存
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditedTitle(memory.title || memory.summary || '')
                      setEditedTags(memory.tags)
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all"
                  >
                    取消
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-gradient-to-br from-baby-pink to-baby-blush text-white rounded-xl hover:scale-105 transition-all"
                >
                  ✏️ 編輯
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] px-8 py-6">
          {/* Tags Section */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-600 mb-3">🏷️ 標籤</h3>
            <div className="flex flex-wrap gap-2">
              {editedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-br from-baby-pink/20 to-baby-yellow/20 text-gray-700"
                >
                  #{tag}
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
              {isEditing && (
                <div className="inline-flex items-center gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="新增標籤..."
                    className="px-3 py-1 border-2 border-baby-blush/50 rounded-full focus:outline-none focus:border-baby-pink text-sm"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-1 bg-gradient-to-br from-baby-pink to-baby-blush text-white rounded-full text-sm hover:scale-105 transition-all"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {memory.summary && memory.summary !== memory.rawContent && (
            <div className="mb-6 p-4 bg-gradient-to-br from-baby-pink/10 to-baby-yellow/10 rounded-xl select-text">
              <h3 className="text-sm font-bold text-gray-600 mb-2">📝 摘要</h3>
              <p className="text-gray-700 leading-relaxed select-text">{memory.summary}</p>
            </div>
          )}

          {/* Raw Content */}
          <div className="mb-6 select-text">
            <h3 className="text-sm font-bold text-gray-600 mb-3">💭 完整內容</h3>
            <div className="prose prose-sm max-w-none select-text">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap select-text">
                {memory.rawContent}
              </p>
            </div>
          </div>

          {/* Key Points */}
          {memory.keyPoints && memory.keyPoints.length > 0 && (
            <div className="mb-6 select-text">
              <h3 className="text-sm font-bold text-gray-600 mb-3">✨ 重點摘錄</h3>
              <ul className="space-y-2 select-text">
                {memory.keyPoints.map((point: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 select-text">
                    <span className="text-baby-pink mt-1">•</span>
                    <span className="text-gray-700 select-text">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Files */}
          {(memory as any).fileUrls && (memory as any).fileUrls.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-600 mb-3">📎 附件</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(memory as any).fileUrls.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-white rounded-xl hover:shadow-cute transition-all"
                  >
                    <span className="text-2xl">
                      {(memory as any).fileTypes?.[i]?.startsWith('image/') ? '🖼️' : '📄'}
                    </span>
                    <span className="text-sm text-gray-600 truncate">
                      {(memory as any).fileNames?.[i] || 'File'}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {(memory as any).links && (memory as any).links.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-600 mb-3">🔗 相關連結</h3>
              <div className="space-y-2">
                {(memory as any).links.map((link: string, i: number) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-white rounded-xl hover:shadow-cute transition-all"
                  >
                    <span className="text-2xl">🔗</span>
                    <span className="text-sm text-blue-600 hover:underline truncate">
                      {(memory as any).linkTitles?.[i] || link}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {(memory as any).aiAnalysis && (
            <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
              <h3 className="text-sm font-bold text-gray-600 mb-2">🤖 AI 分析</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{(memory as any).aiAnalysis}</p>
            </div>
          )}

          {/* Related Memories */}
          {memory.relatedMemories && memory.relatedMemories.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-600 mb-3">🔗 相關記憶</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {memory.relatedMemories.map((related: any) => (
                  <div
                    key={related.id}
                    className="p-3 bg-white rounded-xl hover:shadow-cute transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">{related.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {related.title || related.summary}
                        </p>
                        <p className="text-xs text-gray-500">
                          {related.assistant?.nameChinese}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t-4 border-baby-blush/30 px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={handleArchive}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all"
              >
                📦 封存
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-xl transition-all"
              >
                🗑️ 刪除
              </button>
            </div>
            <div className="text-sm text-gray-400">
              最後更新：{formatDate(memory.updatedAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
