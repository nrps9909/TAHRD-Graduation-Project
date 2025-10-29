import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { UPDATE_MEMORY, GET_MEMORY } from '../graphql/memory'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import SaveStatusIndicator from './Editor/SaveStatusIndicator'
import TagManager from './Editor/TagManager'
import ViewModeToggle, { type ViewMode } from './Editor/ViewModeToggle'

interface SimpleMemoryEditorProps {
  memoryId?: string  // 如果有 ID，表示編輯現有記憶
  onClose: () => void
}

export default function SimpleMemoryEditor({ memoryId, onClose }: SimpleMemoryEditorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')

  // 載入記憶資料（如果有 memoryId）
  const { data: memoryData, loading: memoryLoading } = useQuery(GET_MEMORY, {
    variables: { id: memoryId },
    skip: !memoryId, // 如果沒有 memoryId 就跳過
  })

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 用 ref 追蹤最新的編輯器狀態，避免閉包問題
  const latestStateRef = useRef({ title, content, tags })

  // 追蹤是否有進行中的保存請求
  const savingInProgressRef = useRef(false)

  // 追蹤是否有待處理的保存請求（用於防止並發）
  const pendingSaveRef = useRef(false)

  const [updateMemory] = useMutation(UPDATE_MEMORY)

  // 載入記憶資料到 state
  useEffect(() => {
    if (memoryData?.memory && !memoryLoading) {
      const memory = memoryData.memory
      console.log('📖 載入記憶資料', memory)
      setTitle(memory.title || '')
      setContent(memory.rawContent || '')
      setTags(memory.tags || [])
    }
  }, [memoryData, memoryLoading])

  // 更新最新狀態的 ref
  useEffect(() => {
    latestStateRef.current = { title, content, tags }
  }, [title, content, tags])

  // 鎖定背景滾動
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // 組件卸載時自動保存
  useEffect(() => {
    return () => {
      // 如果有未保存的變更且有 memoryId，嘗試保存
      if (latestStateRef.current && memoryId && !savingInProgressRef.current) {
        // 使用 navigator.sendBeacon 進行異步保存，即使頁面關閉也能完成
        console.log('🔄 組件卸載，嘗試保存最新狀態')
        // 這裡無法使用異步操作，但我們已經有 beforeunload 處理了
      }
    }
  }, [memoryId])

  // 同步滾動
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (viewMode === 'split' && previewRef.current) {
      const textarea = e.currentTarget
      const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight)
      const preview = previewRef.current
      preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight)
    }
  }

  // 改進的自動儲存函數 - 使用 ref 避免閉包問題和狀態競爭
  const autoSave = useCallback(async (retryCount = 0): Promise<boolean> => {
    if (!memoryId) return false  // 只有在編輯模式才自動儲存

    // 如果正在保存，標記為有待處理的保存，然後返回
    if (savingInProgressRef.current) {
      pendingSaveRef.current = true
      console.log('⏳ 保存進行中，稍後重試')
      return false
    }

    // 從 ref 讀取最新狀態，避免閉包陷阱
    const currentState = latestStateRef.current

    console.log('🔄 自動儲存觸發', { memoryId, ...currentState, retryCount })

    savingInProgressRef.current = true
    setIsSaving(true)
    setSaveError(null)

    try {
      const result = await updateMemory({
        variables: {
          id: memoryId,
          input: {
            title: currentState.title || null,
            rawContent: currentState.content,
            tags: currentState.tags,
          },
        },
      })
      console.log('✅ 自動儲存成功', result)
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      setIsSaving(false)
      savingInProgressRef.current = false

      // 如果在保存過程中有新的更改，立即觸發新的保存
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        console.log('🔄 執行待處理的保存')
        // 使用 setTimeout 避免阻塞
        setTimeout(() => autoSave(), 100)
      }

      return true
    } catch (error) {
      console.error('❌ 自動儲存失敗', error)
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
  }, [memoryId, updateMemory])  // 只依賴 memoryId 和 updateMemory

  // 立即儲存（用於關鍵操作，如關閉編輯器）
  const saveImmediately = useCallback(async (): Promise<boolean> => {
    // 清除任何待處理的定時器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    // 立即執行保存
    return await autoSave()
  }, [autoSave])

  // 內容改變時，標記為未保存並延遲自動儲存
  useEffect(() => {
    if (!memoryId) return  // 沒有 ID 時跳過

    // 標記為有未保存的變更
    setHasUnsavedChanges(true)

    // 清除之前的計時器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // 設定新的計時器（800ms 後儲存，平衡響應速度和請求頻率）
    saveTimeoutRef.current = setTimeout(() => {
      autoSave()
    }, 800)

    // 清理函數
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
    // 注意：不要把 autoSave 放在依賴中，避免無限循環
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, tags, memoryId])

  // 瀏覽器關閉前警告（如果有未保存的變更）
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || isSaving) {
        e.preventDefault()
        e.returnValue = '你有未保存的變更，確定要離開嗎？'
        return '你有未保存的變更，確定要離開嗎？'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, isSaving])


  // 安全關閉編輯器 - 確保保存完成
  const handleClose = useCallback(async () => {
    // 如果正在保存，使用輪詢等待完成（避免遞歸）
    if (isSaving) {
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

    // 如果有未保存的變更，立即保存
    if (hasUnsavedChanges && memoryId) {
      console.log('💾 關閉前保存變更...')
      const saved = await saveImmediately()
      if (!saved) {
        // 保存失敗，詢問用戶是否仍要關閉
        const shouldClose = window.confirm('保存失敗，確定要關閉嗎？未保存的變更將會丟失。')
        if (!shouldClose) {
          return
        }
      }
    }

    // 關閉編輯器
    onClose()
  }, [isSaving, hasUnsavedChanges, memoryId, saveImmediately, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
    }
    // Cmd/Ctrl + S 手動觸發儲存
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      if (memoryId) {
        saveImmediately()
      }
    }
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
              title="關閉（會自動保存）"
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
            {memoryId && (
              <div className="flex-shrink-0">
                <SaveStatusIndicator
                  isSaving={isSaving}
                  saveError={saveError}
                  hasUnsavedChanges={hasUnsavedChanges}
                  lastSaved={lastSaved}
                  onRetry={() => saveImmediately()}
                />
              </div>
            )}
          </div>

          {/* 右側工具 */}
          <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
            {/* 檢視模式切換 - HackMD 風格 */}
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
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

                    {/* 標籤 */}
                    <div className="mb-6">
                      <TagManager
                        tags={tags}
                        onTagsChange={setTags}
                      />
                    </div>

                    {/* 編輯器 */}
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onScroll={handleScroll}
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
