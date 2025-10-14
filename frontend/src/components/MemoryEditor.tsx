import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { UPDATE_MEMORY, DELETE_MEMORY, PIN_MEMORY, UNPIN_MEMORY } from '../graphql/memory'
import type { Memory } from '../graphql/memory'
import { GET_SUBCATEGORIES, Subcategory } from '../graphql/category'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import SaveStatusIndicator from './Editor/SaveStatusIndicator'
import TagManager from './Editor/TagManager'
import CategorySelector from './Editor/CategorySelector'
import ViewModeToggle, { type ViewMode } from './Editor/ViewModeToggle'

interface MemoryEditorProps {
  memory: Memory
  onClose: () => void
  onUpdate: () => void
}

export default function MemoryEditor({ memory, onClose, onUpdate }: MemoryEditorProps) {
  const [title, setTitle] = useState(memory.title || '')
  const [content, setContent] = useState(memory.rawContent || memory.summary || '')
  const [subcategoryId, setSubcategoryId] = useState<string | null>(memory.subcategoryId || null)
  const [tags, setTags] = useState<string[]>(memory.tags)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [attachments, setAttachments] = useState<Array<{url: string, name: string, type: string}>>([])
  const [viewMode, setViewMode] = useState<ViewMode>('edit')

  // 載入自訂分類
  const { data: subcategoriesData } = useQuery(GET_SUBCATEGORIES)
  const subcategories: Subcategory[] = subcategoriesData?.subcategories || []

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // 用 ref 追蹤最新的編輯器狀態，避免閉包問題
  const latestStateRef = useRef({ title, content, subcategoryId, tags, attachments })

  // 追蹤是否有進行中的保存請求
  const savingInProgressRef = useRef(false)

  // 追蹤是否有待處理的保存請求（用於防止並發）
  const pendingSaveRef = useRef(false)

  // 同步滾動
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (viewMode === 'split' && previewRef.current) {
      const textarea = e.currentTarget
      const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight)
      const preview = previewRef.current
      preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight)
    }
  }

  const [updateMemory] = useMutation(UPDATE_MEMORY)
  const [deleteMemory] = useMutation(DELETE_MEMORY)
  const [pinMemory] = useMutation(PIN_MEMORY)
  const [unpinMemory] = useMutation(UNPIN_MEMORY)

  // 初始化完成後設置 isLoading 為 false
  useEffect(() => {
    // 模擬數據載入完成
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // 更新最新狀態的 ref
  useEffect(() => {
    latestStateRef.current = { title, content, subcategoryId, tags, attachments }
  }, [title, content, subcategoryId, tags, attachments])

  // 追蹤未保存的變更
  useEffect(() => {
    const hasChanges = (
      title !== (memory.title || '') ||
      content !== (memory.rawContent || memory.summary || '') ||
      JSON.stringify(tags) !== JSON.stringify(memory.tags) ||
      subcategoryId !== (memory.subcategoryId || null)
    )
    setHasUnsavedChanges(hasChanges)
  }, [title, content, tags, subcategoryId, memory])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // 組件卸載時自動保存
  useEffect(() => {
    return () => {
      // 如果有未保存的變更，嘗試保存
      if (latestStateRef.current && !savingInProgressRef.current) {
        console.log('🔄 組件卸載，嘗試保存最新狀態')
        // 這裡無法使用異步操作，但我們已經有 handleClose 處理了
      }
    }
  }, [])

  // 自動儲存 - 使用 ref 避免閉包問題和狀態競爭
  const autoSave = useCallback(async (retryCount = 0): Promise<boolean> => {
    // 如果正在保存，標記為有待處理的保存，然後返回
    if (savingInProgressRef.current) {
      pendingSaveRef.current = true
      console.log('⏳ 保存進行中，稍後重試')
      return false
    }

    // 從 ref 讀取最新狀態，避免閉包陷阱
    const currentState = latestStateRef.current

    console.log('🔄 自動儲存觸發 (MemoryEditor)', { memoryId: memory.id, retryCount })

    savingInProgressRef.current = true
    setIsSaving(true)
    setSaveError(null)

    try {
      await updateMemory({
        variables: {
          id: memory.id,
          input: {
            title: currentState.title,
            rawContent: currentState.content,
            tags: currentState.tags,
            subcategoryId: currentState.subcategoryId,
            fileUrls: currentState.attachments.map(a => a.url),
            fileNames: currentState.attachments.map(a => a.name),
            fileTypes: currentState.attachments.map(a => a.type),
          },
        },
      })
      console.log('✅ 自動儲存成功 (MemoryEditor)')
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      setIsSaving(false)
      savingInProgressRef.current = false

      // 如果在保存過程中有新的更改，立即觸發新的保存
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        console.log('🔄 執行待處理的保存')
        setTimeout(() => autoSave(), 100)
      }

      return true
    } catch (error) {
      console.error('❌ 自動儲存失敗 (MemoryEditor)', error)
      savingInProgressRef.current = false

      // 最多重試 2 次
      if (retryCount < 2) {
        console.log(`🔄 重試保存 (${retryCount + 1}/2)`)
        await new Promise(resolve => setTimeout(resolve, 1000)) // 等待 1 秒後重試
        return autoSave(retryCount + 1)
      }

      setSaveError('儲存失敗，請檢查網路連線')
      setIsSaving(false)
      return false
    }
  }, [memory.id, updateMemory])  // 只依賴 memory.id 和 updateMemory

  // Debounced 自動儲存
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSave()
    }, 800)  // 800ms 後儲存，平衡響應速度和請求頻率

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
    // 注意：不要把 autoSave 放在依賴中，避免無限循環
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, tags, subcategoryId, attachments])

  // 安全關閉 - 確保保存後再關閉
  const handleClose = async () => {
    // 清除 pending 的 timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // 如果正在保存，等待完成（避免數據丟失）
    if (savingInProgressRef.current) {
      console.log('⏳ 等待保存完成...')
      // 最多等待 5 秒
      const maxWaitTime = 5000
      const startTime = Date.now()

      while (savingInProgressRef.current && Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (savingInProgressRef.current) {
        console.warn('⚠️ 保存超時，但仍關閉編輯器')
      }
    }

    // 如果有未保存的變更，先保存
    if (hasUnsavedChanges) {
      console.log('💾 關閉前保存變更...')
      try {
        await autoSave()
        // 等待保存完成
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error('Failed to save before closing:', error)
        const shouldClose = window.confirm('保存失敗，確定要關閉嗎？未保存的變更將會丟失。')
        if (!shouldClose) {
          return
        }
      }
    }

    // 關閉編輯器
    onClose()
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

  const handleDelete = async () => {
    if (!confirm('確定要刪除這條記憶嗎？此操作無法復原。')) return
    try {
      await deleteMemory({ variables: { id: memory.id } })
      onUpdate()
    } catch (error) {
      console.error('Delete error:', error)
    }
  }


  // 處理貼上事件
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const url = URL.createObjectURL(file)
          const imageMarkdown = `\n![${file.name}](${url})\n`

          const textarea = e.target as HTMLTextAreaElement
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const newContent = content.substring(0, start) + imageMarkdown + content.substring(end)
          setContent(newContent)

          setAttachments(prev => [...prev, {
            url,
            name: file.name,
            type: file.type
          }])
        }
      }
    }
  }

  // 處理拖放
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)

    files.forEach(file => {
      const url = URL.createObjectURL(file)
      const isImage = file.type.startsWith('image/')
      const markdown = isImage
        ? `\n![${file.name}](${url})\n`
        : `\n📎 [${file.name}](${url})\n`

      setContent(prev => prev + markdown)
      setAttachments(prev => [...prev, {
        url,
        name: file.name,
        type: file.type
      }])
    })
  }

  // 處理檔案選擇
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    let insertText = ''

    files.forEach(file => {
      const url = URL.createObjectURL(file)
      const isImage = file.type.startsWith('image/')
      const markdown = isImage
        ? `\n![${file.name}](${url})\n`
        : `\n📎 [${file.name}](${url})\n`

      insertText += markdown

      setAttachments(prev => [...prev, {
        url,
        name: file.name,
        type: file.type
      }])
    })

    const newContent = content.substring(0, cursorPos) + insertText + content.substring(cursorPos)
    setContent(newContent)

    e.target.value = ''

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPos + insertText.length, cursorPos + insertText.length)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
    }
    // Cmd/Ctrl + S 手動觸發儲存
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      autoSave()
    }
  }

  // 顯示加載狀態
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#1E1E1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-gray-400 rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1E1E1E] flex flex-col" onKeyDown={handleKeyDown}>
      {/* 頂部工具列 - HackMD 夜間模式 */}
      <div className="sticky top-0 z-10 bg-[#252525] border-b border-gray-800">
        <div className="px-2 md:px-4 py-2 flex items-center justify-between gap-2">
          {/* 左側 */}
          <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
            <button
              onClick={handleClose}
              className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white flex-shrink-0"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="h-4 md:h-6 w-px bg-gray-600 flex-shrink-0"></div>

            {/* 檔案名稱 */}
            <div className="flex items-center gap-1 md:gap-2 text-gray-300 min-w-0 flex-1">
              <svg className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs md:text-sm font-medium truncate">{title || '未命名文件'}</span>
            </div>

            {/* 保存狀態指示器 */}
            <div className="flex-shrink-0">
              <SaveStatusIndicator
                isSaving={isSaving}
                saveError={saveError}
                hasUnsavedChanges={hasUnsavedChanges}
                lastSaved={lastSaved}
                onRetry={() => autoSave()}
              />
            </div>
          </div>

          {/* 右側工具 */}
          <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
            {/* 檢視模式切換 */}
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            <div className="w-px h-4 md:h-5 bg-gray-600 mx-0.5 md:mx-1"></div>

            <button
              onClick={handlePin}
              className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded transition-all ${
                memory.isPinned
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              title={memory.isPinned ? '取消釘選' : '釘選'}
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill={memory.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded text-gray-300 hover:bg-gray-700 hover:text-white transition-all hidden sm:flex"
              title="插入附件"
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.txt,.xlsx,.pptx"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={handleDelete}
              className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded text-gray-300 hover:bg-red-600 hover:text-white transition-all"
              title="刪除"
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 主要內容區 */}
      <div className="flex-1 overflow-hidden bg-[#1E1E1E]">
        <div className="h-full flex flex-col">

          {/* 內容編輯區 - 根據模式顯示 */}
          <div className="relative flex-1 h-full overflow-hidden">
            {viewMode === 'edit' && (
              <div className="h-full bg-[#1E1E1E]">
                <div className="max-w-4xl mx-auto h-full p-4 md:p-8">
                  {/* 標題 */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="# 標題"
                    className="w-full text-xl md:text-3xl font-bold bg-transparent focus:outline-none placeholder-gray-600 text-gray-100 mb-3 md:mb-4 border-none"
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                    }}
                  />

                  {/* 分類選擇器 */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 mb-2 block">分類</label>
                    <CategorySelector
                      subcategories={subcategories}
                      selectedSubcategoryId={subcategoryId}
                      onSelectSubcategory={setSubcategoryId}
                    />
                  </div>

                  {/* 標籤 */}
                  <div className="mb-6">
                    <TagManager
                      tags={tags}
                      onTagsChange={setTags}
                      maxTags={5}
                    />
                  </div>

                  {/* 編輯器 */}
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="w-full h-[calc(100%-140px)] text-base resize-none focus:outline-none leading-relaxed text-gray-200 bg-transparent border-none placeholder-gray-600"
                    placeholder="開始寫下你的想法..."
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                      lineHeight: '1.8'
                    }}
                  />
                </div>
              </div>
            )}

            {viewMode === 'preview' && (
              <div className="h-full bg-[#1E1E1E] overflow-y-auto">
                <div className="max-w-4xl mx-auto p-4 md:p-8">
                  {/* 標題 */}
                  <h1 className="text-xl md:text-3xl font-bold text-gray-100 mb-3 md:mb-4">{title || '未命名文件'}</h1>

                  {/* 標籤 */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded-md text-xs font-medium bg-gray-800 text-gray-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* AI 深度分析結果 */}
                  {(memory.detailedSummary || memory.actionableAdvice) && (
                    <div className="mb-8 rounded-lg bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 overflow-hidden">
                      <div className="px-4 py-3 bg-purple-900/30 border-b border-purple-500/30">
                        <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          AI 深度分析
                        </h3>
                      </div>
                      <div className="p-4 space-y-4">
                        {memory.detailedSummary && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">詳細摘要</h4>
                            <p className="text-sm text-gray-300 leading-relaxed">{memory.detailedSummary}</p>
                          </div>
                        )}
                        {memory.actionableAdvice && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              行動建議
                            </h4>
                            <p className="text-sm text-gray-300 leading-relaxed">{memory.actionableAdvice}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Markdown 預覽 */}
                  <div className="prose prose-lg prose-invert max-w-none markdown-preview-dark">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    >
                      {content || '*尚無內容*'}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'split' && (
              <div className="flex flex-col md:flex-row h-full">
                {/* 左側編輯器 */}
                <div className="flex-1 bg-[#1E1E1E] overflow-y-auto border-b md:border-b-0 md:border-r border-gray-800">
                  <div className="max-w-3xl mx-auto p-4 md:p-8">
                    {/* 標題 */}
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="# 標題"
                      className="w-full text-xl md:text-3xl font-bold bg-transparent focus:outline-none placeholder-gray-600 text-gray-100 mb-3 md:mb-4 border-none"
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                      }}
                    />

                    {/* 分類選擇器 */}
                    <div className="mb-4">
                      <label className="text-xs text-gray-400 mb-2 block">分類</label>
                      <CategorySelector
                        subcategories={subcategories}
                        selectedSubcategoryId={subcategoryId}
                        onSelectSubcategory={setSubcategoryId}
                      />
                    </div>

                    {/* 標籤 */}
                    <div className="mb-6">
                      <TagManager
                        tags={tags}
                        onTagsChange={setTags}
                        maxTags={5}
                      />
                    </div>

                    {/* 編輯器 */}
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onScroll={handleScroll}
                      onPaste={handlePaste}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="w-full min-h-[600px] text-base resize-none focus:outline-none leading-relaxed text-gray-200 bg-transparent border-none placeholder-gray-600"
                      placeholder="開始寫下你的想法..."
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                        lineHeight: '1.8'
                      }}
                    />
                  </div>
                </div>

                {/* 右側預覽 */}
                <div className="flex-1 bg-[#1E1E1E] overflow-y-auto">
                  <div ref={previewRef} className="max-w-3xl mx-auto p-4 md:p-8">
                    {/* 標題 */}
                    <h1 className="text-xl md:text-3xl font-bold text-gray-100 mb-3 md:mb-4">{title || '未命名文件'}</h1>

                    {/* 標籤 */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 rounded-md text-xs font-medium bg-gray-800 text-gray-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* AI 深度分析結果 */}
                    {(memory.detailedSummary || memory.actionableAdvice) && (
                      <div className="mb-8 rounded-lg bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 overflow-hidden">
                        <div className="px-4 py-3 bg-purple-900/30 border-b border-purple-500/30">
                          <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI 深度分析
                          </h3>
                        </div>
                        <div className="p-4 space-y-4">
                          {memory.detailedSummary && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">詳細摘要</h4>
                              <p className="text-sm text-gray-300 leading-relaxed">{memory.detailedSummary}</p>
                            </div>
                          )}
                          {memory.actionableAdvice && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                行動建議
                              </h4>
                              <p className="text-sm text-gray-300 leading-relaxed">{memory.actionableAdvice}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Markdown 預覽 */}
                    <div className="prose prose-lg prose-invert max-w-none markdown-preview-dark">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                      >
                        {content || '*尚無內容*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
