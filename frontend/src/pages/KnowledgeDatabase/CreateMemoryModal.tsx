import React, { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { CREATE_MEMORY_DIRECT, UPDATE_MEMORY, GET_MEMORIES } from '../../graphql/memory'
import { UPLOAD_KNOWLEDGE, GET_ASSISTANTS } from '../../graphql/knowledge'
import type { UploadKnowledgeInput } from '../../graphql/knowledge'
import type { Memory } from '../../graphql/memory'

interface CreateMemoryModalProps {
  onClose: () => void
  onSuccess: () => void
}

type CreateMode = 'manual' | 'ai' // 手動指定 or AI 自動分配

export default function CreateMemoryModal({ onClose, onSuccess }: CreateMemoryModalProps) {
  const [mode, setMode] = useState<CreateMode>('ai')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedAssistant, setSelectedAssistant] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [objectUrls, setObjectUrls] = useState<string[]>([]) // 追蹤創建的 URL

  const fileInputRef = useRef<HTMLInputElement>(null)
  const tagInputRef = useRef<HTMLDivElement>(null)

  const { data: assistantsData } = useQuery(GET_ASSISTANTS)
  const { data: memoriesData } = useQuery(GET_MEMORIES, {
    variables: { limit: 1000 }
  })
  const [createMemoryDirect] = useMutation(CREATE_MEMORY_DIRECT)
  const [uploadKnowledge] = useMutation(UPLOAD_KNOWLEDGE)
  const [updateMemory] = useMutation(UPDATE_MEMORY)

  const assistants = assistantsData?.assistants?.filter((a: any) => a.type !== 'CHIEF') || []

  // 提取所有現有標籤和熱門標籤
  const { allExistingTags, popularTags } = React.useMemo(() => {
    const tagMap = new Map<string, number>()
    memoriesData?.memories?.forEach((memory: Memory) => {
      memory.tags.forEach((tag: string) => {
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
    if (!newTag.trim()) return []
    return allExistingTags
      .filter(tag =>
        tag.toLowerCase().includes(newTag.toLowerCase()) &&
        !tags.includes(tag)
      )
      .slice(0, 5)
  }, [newTag, allExistingTags, tags])

  // 清理 object URLs 避免記憶體洩漏
  useEffect(() => {
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [objectUrls])

  // 點擊外部關閉自動補全
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagInputRef.current && !tagInputRef.current.contains(event.target as Node)) {
        setNewTag('')
      }
    }

    if (newTag.trim() && suggestedTags.length > 0) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [newTag, suggestedTags])

  const handleAddTag = () => {
    const trimmedTag = newTag.trim()

    // 驗證標籤
    if (!trimmedTag) return
    if (tags.includes(trimmedTag)) {
      alert('此標籤已存在！')
      return
    }
    if (tags.length >= 10) {
      alert('最多只能添加 10 個標籤！')
      return
    }
    if (trimmedTag.length > 50) {
      alert('標籤長度不能超過 50 個字元！')
      return
    }

    setTags([...tags, trimmedTag])
    setNewTag('')
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      if (files.length + newFiles.length > 10) {
        alert('最多只能上傳 10 個檔案！')
        return
      }
      setFiles([...files, ...newFiles])
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('請輸入內容！')
      return
    }

    if (mode === 'manual' && !selectedAssistant) {
      alert('請選擇知識庫！')
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === 'ai') {
        // 使用 Chief Agent 自動分配
        const urls: string[] = []
        const fileInputs = await Promise.all(
          files.map(async (file) => {
            const url = URL.createObjectURL(file)
            urls.push(url) // 追蹤創建的 URL
            return {
              url,
              name: file.name,
              type: file.type,
              size: file.size,
            }
          })
        )
        setObjectUrls(urls) // 保存 URLs 以便稍後清理

        const input: UploadKnowledgeInput = {
          content: title ? `${title}\n\n${content}` : content,
          files: fileInputs,
          contentType: files.length > 0 ? 'MIXED' : 'TEXT',
        }

        const result = await uploadKnowledge({ variables: { input } })

        // 如果有標籤，為每個建立的記憶更新標籤
        if (tags.length > 0 && result.data?.uploadKnowledge?.memoriesCreated) {
          const memories = result.data.uploadKnowledge.memoriesCreated
          await Promise.all(
            memories.map((memory: Memory) =>
              updateMemory({
                variables: {
                  id: memory.id,
                  input: { tags }
                }
              })
            )
          )
        }
      } else {
        // 手動指定知識庫 - 使用 createMemoryDirect 支援標籤
        await createMemoryDirect({
          variables: {
            input: {
              title: title || undefined,
              content,
              tags: tags.length > 0 ? tags : undefined,
              category: assistants.find((a: any) => a.id === selectedAssistant)?.type,
            },
          },
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Create memory error:', error)
      alert('創建失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] mx-4 bg-gradient-to-br from-baby-cream via-white to-baby-yellow/30 rounded-3xl shadow-cute-xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b-4 border-baby-blush/30 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-yellow-400 bg-clip-text text-transparent">
                ✨ 新增知識
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                記錄你的想法和靈感
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
            >
              ✕
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setMode('ai')}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                mode === 'ai'
                  ? 'bg-gradient-to-br from-baby-pink to-baby-blush text-white shadow-cute'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              🤖 AI 智能分配
              <p className="text-xs opacity-80 mt-1">
                讓 Chief Agent 自動決定分類
              </p>
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                mode === 'manual'
                  ? 'bg-gradient-to-br from-baby-pink to-baby-blush text-white shadow-cute'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              ✋ 手動指定
              <p className="text-xs opacity-80 mt-1">
                自己選擇知識庫
              </p>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-280px)] px-8 py-6">
          {/* Manual Mode: Assistant Selection */}
          {mode === 'manual' && (
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-600 mb-3">
                📚 選擇知識庫 *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {assistants.map((assistant: any) => (
                  <button
                    key={assistant.id}
                    onClick={() => setSelectedAssistant(assistant.id)}
                    className={`p-4 rounded-xl transition-all ${
                      selectedAssistant === assistant.id
                        ? 'bg-gradient-to-br from-baby-pink to-baby-blush text-white shadow-cute'
                        : 'bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="text-3xl mb-2">{assistant.emoji}</div>
                    <div className="font-medium text-sm">
                      {assistant.nameChinese}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-600 mb-2">
              📝 標題（選填）
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="為這條記憶取個標題..."
              className="w-full px-4 py-3 bg-white border-2 border-baby-blush/50 rounded-xl focus:outline-none focus:border-baby-pink focus:ring-2 focus:ring-baby-pink/20"
            />
          </div>

          {/* Content */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-600 mb-2">
              💭 內容 *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="寫下你的想法、學習筆記、靈感或任何想記錄的事情..."
              rows={8}
              className="w-full px-4 py-3 bg-white border-2 border-baby-blush/50 rounded-xl focus:outline-none focus:border-baby-pink focus:ring-2 focus:ring-baby-pink/20 resize-none"
            />
            <p className="text-xs text-gray-400 mt-2">
              {content.length} 字
            </p>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-600 mb-3">
              🏷️ 標籤（選填）
            </label>

            {/* 熱門標籤快捷按鈕 */}
            {popularTags.length > 0 && tags.length < 10 && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  🔥 熱門標籤
                </label>
                <div className="flex flex-wrap gap-2">
                  {popularTags
                    .filter(tag => !tags.includes(tag))
                    .slice(0, 8)
                    .map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (tags.length >= 10) {
                            alert('最多只能添加 10 個標籤！')
                            return
                          }
                          setTags([...tags, tag])
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
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-br from-baby-pink/20 to-baby-yellow/20 text-gray-700"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            {/* 標籤輸入框 + 自動補全 */}
            <div className="relative" ref={tagInputRef}>
              <div className="flex gap-2">
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
                  placeholder="添加標籤..."
                  className="flex-1 px-4 py-2 bg-white border-2 border-baby-blush/50 rounded-xl focus:outline-none focus:border-baby-pink text-sm"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-gradient-to-br from-baby-pink to-baby-blush text-white rounded-xl hover:scale-105 transition-all"
                >
                  +
                </button>
              </div>

              {/* 自動補全下拉選單 */}
              {newTag.trim() && suggestedTags.length > 0 && (
                <div className="absolute top-full left-0 right-14 mt-1 bg-white border-2 border-baby-blush/50 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (tags.length >= 10) {
                          alert('最多只能添加 10 個標籤！')
                          return
                        }
                        setTags([...tags, tag])
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
          </div>

          {/* Files */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-600 mb-3">
              📎 附件（選填，最多 10 個）
            </label>

            {files.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 bg-white rounded-xl"
                  >
                    <span className="text-2xl">
                      {file.type.startsWith('image/') ? '🖼️' : '📄'}
                    </span>
                    <span className="text-sm text-gray-600 truncate flex-1">
                      {file.name}
                    </span>
                    <button
                      onClick={() => handleRemoveFile(i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= 10}
              className="w-full px-4 py-3 border-2 border-dashed border-baby-blush/50 rounded-xl hover:border-baby-pink hover:bg-baby-cream/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl mb-2 block">📁</span>
              <span className="text-sm text-gray-600">
                {files.length >= 10 ? '已達上傳上限' : '點擊上傳檔案'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* AI Mode Info */}
          {mode === 'ai' && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤖</span>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-700 mb-1">
                    AI 智能分配模式
                  </h4>
                  <p className="text-sm text-gray-600">
                    Chief Agent 會分析你的內容，自動判斷最適合的知識庫，並可能同時儲存到多個相關的知識庫中。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t-4 border-baby-blush/30 px-8 py-4">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim() || (mode === 'manual' && !selectedAssistant)}
              className="px-6 py-3 bg-gradient-to-br from-baby-pink to-baby-blush hover:from-pink-400 hover:to-pink-500 text-white rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? '處理中... ⏳' : mode === 'ai' ? '🤖 讓 AI 幫我分類' : '💾 立即儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
