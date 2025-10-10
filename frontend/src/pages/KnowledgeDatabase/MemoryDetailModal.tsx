import React, { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { UPDATE_MEMORY, DELETE_MEMORY, ARCHIVE_MEMORY, PIN_MEMORY, UNPIN_MEMORY, GET_MEMORIES } from '../../graphql/memory'
import { GET_SUBCATEGORIES, Subcategory } from '../../graphql/category'
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
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(memory.subcategoryId || null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const tagInputRef = useRef<HTMLDivElement>(null)

  const [updateMemory] = useMutation(UPDATE_MEMORY)
  const [deleteMemory] = useMutation(DELETE_MEMORY)
  const [archiveMemory] = useMutation(ARCHIVE_MEMORY)
  const [pinMemory] = useMutation(PIN_MEMORY)
  const [unpinMemory] = useMutation(UNPIN_MEMORY)

  // 查詢所有記憶以獲取標籤建議
  const { data: memoriesData } = useQuery(GET_MEMORIES, {
    variables: { limit: 1000 }
  })

  // 查詢所有自訂分類
  const { data: subcategoriesData } = useQuery(GET_SUBCATEGORIES)
  const subcategories: Subcategory[] = subcategoriesData?.subcategories || []

  // 提取所有現有標籤和熱門標籤
  const { allExistingTags, popularTags } = React.useMemo(() => {
    const tagMap = new Map<string, number>()
    memoriesData?.memories?.forEach((m: Memory) => {
      m.tags.forEach((tag: string) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      })
    })

    const allTags = Array.from(tagMap.keys()).sort()
    const popular = Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag)

    return { allExistingTags: allTags, popularTags: popular }
  }, [memoriesData])

  // 標籤建議
  const suggestedTags = React.useMemo(() => {
    if (!newTag.trim() || !isEditing) return []
    return allExistingTags
      .filter(tag =>
        tag.toLowerCase().includes(newTag.toLowerCase()) &&
        !editedTags.includes(tag)
      )
      .slice(0, 5)
  }, [newTag, allExistingTags, editedTags, isEditing])

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // 點擊外部關閉 emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  // 點擊外部關閉自動補全
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagInputRef.current && !tagInputRef.current.contains(event.target as Node) && isEditing) {
        if (newTag.trim() && suggestedTags.length > 0) {
          setNewTag('')
        }
      }
    }

    if (isEditing && newTag.trim() && suggestedTags.length > 0) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditing, newTag, suggestedTags])

  const handleSave = async () => {
    try {
      await updateMemory({
        variables: {
          id: memory.id,
          input: {
            title: editedTitle,
            tags: editedTags,
            emoji: selectedEmoji,
            subcategoryId: selectedSubcategoryId, // 保存自訂分類
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
    const trimmedTag = newTag.trim()

    // 驗證標籤
    if (!trimmedTag) return
    if (editedTags.includes(trimmedTag)) {
      alert('此標籤已存在！')
      return
    }
    if (editedTags.length >= 5) {
      alert('最多只能添加 5 個標籤！')
      return
    }
    if (trimmedTag.length > 50) {
      alert('標籤長度不能超過 50 個字元！')
      return
    }

    setEditedTags([...editedTags, trimmedTag])
    setNewTag('')
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
              <div className="relative inline-block mb-3" ref={emojiPickerRef}>
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
                      setSelectedSubcategoryId(memory.subcategoryId || null)
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
          {/* Subcategory Selection - 自訂分類選擇器 */}
          {(subcategories.length > 0 || selectedSubcategoryId) && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-600 mb-3">🏷️ 自訂分類</h3>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {/* 無分類選項 */}
                  <button
                    onClick={() => setSelectedSubcategoryId(null)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                    style={{
                      background: selectedSubcategoryId === null ? '#f3f4f6' : 'white',
                      color: selectedSubcategoryId === null ? '#374151' : '#666',
                      border: `1.5px solid ${selectedSubcategoryId === null ? '#9ca3af' : '#e5e7eb'}`,
                    }}
                  >
                    無分類
                  </button>
                  {/* 分類選項 */}
                  {subcategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedSubcategoryId(selectedSubcategoryId === cat.id ? null : cat.id)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                      style={{
                        background: selectedSubcategoryId === cat.id ? cat.color : 'white',
                        color: selectedSubcategoryId === cat.id ? '#ffffff' : '#666',
                        border: `1.5px solid ${selectedSubcategoryId === cat.id ? cat.color : '#FFB6C1'}`,
                      }}
                    >
                      <span className="mr-1">{cat.emoji}</span>
                      {cat.nameChinese}
                    </button>
                  ))}
                </div>
              ) : selectedSubcategoryId && memory.subcategory ? (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    background: memory.subcategory.color,
                    color: '#ffffff',
                  }}
                >
                  <span>{memory.subcategory.emoji}</span>
                  <span>{memory.subcategory.nameChinese}</span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">無分類</p>
              )}
            </div>
          )}

          {/* Tags Section - 只有在有標籤時才顯示 */}
          {(editedTags.length > 0 || isEditing) && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-600 mb-3">🏷️ 標籤</h3>

              {/* 熱門標籤快捷按鈕 - 只在編輯模式顯示 */}
              {isEditing && popularTags.length > 0 && editedTags.length < 5 && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    🔥 熱門標籤
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {popularTags
                      .filter(tag => !editedTags.includes(tag))
                      .slice(0, 8)
                      .map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (editedTags.length >= 5) {
                              alert('最多只能添加 5 個標籤！')
                              return
                            }
                            setEditedTags([...editedTags, tag])
                          }}
                          className="px-3 py-1 text-xs rounded-full bg-gradient-to-br from-baby-pink/10 to-baby-yellow/10 text-gray-600 hover:from-baby-pink/20 hover:to-baby-yellow/20 transition-all hover:scale-105"
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* 已添加的標籤 */}
              <div className="flex flex-wrap gap-2 mb-3">
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
              </div>

              {/* 標籤輸入框 + 自動補全 - 只在編輯模式顯示 */}
              {isEditing && (
                <div className="relative" ref={tagInputRef}>
                  <div className="inline-flex items-center gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
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

                  {/* 自動補全下拉選單 */}
                  {newTag.trim() && suggestedTags.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 bg-white border-2 border-baby-blush/50 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto min-w-[200px]">
                      {suggestedTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (editedTags.length >= 5) {
                              alert('最多只能添加 5 個標籤！')
                              return
                            }
                            setEditedTags([...editedTags, tag])
                            setNewTag('')
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-baby-cream/50 text-sm transition-colors flex items-center gap-2"
                        >
                          <span className="text-baby-pink">🏷️</span>
                          <span>#{tag}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Content - 合併摘要和內容 */}
          <div className="mb-6 select-text">
            <h3 className="text-sm font-bold text-gray-600 mb-3">💭 內容</h3>
            <div className="prose prose-sm max-w-none select-text">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap select-text">
                {memory.summary || memory.rawContent}
              </p>
            </div>
          </div>

          {/* Key Points - 只有在有重點時才顯示 */}
          {memory.keyPoints && memory.keyPoints.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-600 mb-3">✨ 重點分析</h3>
              <ul className="space-y-2">
                {memory.keyPoints.map((point: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="text-pink-400 mt-0.5">•</span>
                    <span className="text-sm leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw Data - 原始對話記錄 */}
          {memory.rawData && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-600 mb-3">💬 原始對話記錄</h3>
              <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-100">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap select-text font-mono">
                  {memory.rawData}
                </p>
              </div>
            </div>
          )}

          {/* Files - 只有在有附件時才顯示 */}
          {(memory as any).fileUrls && (memory as any).fileUrls.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-600 mb-2">📎 附件</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(memory as any).fileUrls.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-white rounded-lg hover:shadow-sm transition-all text-sm"
                  >
                    <span className="text-lg">
                      {(memory as any).fileTypes?.[i]?.startsWith('image/') ? '🖼️' : '📄'}
                    </span>
                    <span className="text-gray-600 truncate">
                      {(memory as any).fileNames?.[i] || 'File'}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Links - 只有在有連結時才顯示 */}
          {(memory as any).links && (memory as any).links.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-600 mb-2">🔗 相關連結</h3>
              <div className="space-y-1">
                {(memory as any).links.map((link: string, i: number) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-white rounded-lg hover:shadow-sm transition-all text-sm"
                  >
                    <span className="text-lg">🔗</span>
                    <span className="text-blue-600 hover:underline truncate">
                      {(memory as any).linkTitles?.[i] || link}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis - 只有在有 AI 分析時才顯示 */}
          {(memory as any).aiAnalysis && (
            <div className="mb-4 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
              <h3 className="text-sm font-bold text-gray-600 mb-1">🤖 AI 分析</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{(memory as any).aiAnalysis}</p>
            </div>
          )}

          {/* Related Memories - 只有在有相關記憶時才顯示 */}
          {memory.relatedMemories && memory.relatedMemories.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-600 mb-2">🔗 相關記憶</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {memory.relatedMemories.map((related: any) => (
                  <div
                    key={related.id}
                    className="p-2 bg-white rounded-lg hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{related.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate text-sm">
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
