import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { CREATE_MEMORY_DIRECT, UPDATE_MEMORY, GET_MEMORY } from '../graphql/memory'
import { GET_SUBCATEGORIES, Subcategory } from '../graphql/category'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

interface SimpleMemoryEditorProps {
  memoryId?: string  // 如果有 ID，表示編輯現有記憶
  onClose: () => void
  onSuccess: () => void
}

type ViewMode = 'edit' | 'preview' | 'split'

export default function SimpleMemoryEditor({ memoryId, onClose, onSuccess }: SimpleMemoryEditorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
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

  // 載入自訂分類
  const { data: subcategoriesData } = useQuery(GET_SUBCATEGORIES)
  const subcategories: Subcategory[] = subcategoriesData?.subcategories || []

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 用 ref 追蹤最新的編輯器狀態，避免閉包問題
  const latestStateRef = useRef({ title, content, subcategoryId, tags })

  // 追蹤是否有進行中的保存請求
  const savingInProgressRef = useRef(false)

  // 追蹤是否有待處理的保存請求（用於防止並發）
  const pendingSaveRef = useRef(false)

  const [createMemoryDirect] = useMutation(CREATE_MEMORY_DIRECT)
  const [updateMemory] = useMutation(UPDATE_MEMORY)

  // 載入記憶資料到 state
  useEffect(() => {
    if (memoryData?.memory && !memoryLoading) {
      const memory = memoryData.memory
      console.log('📖 載入記憶資料', memory)
      setTitle(memory.title || '')
      setContent(memory.rawContent || '')
      setSubcategoryId(memory.subcategoryId || null)
      setTags(memory.tags || [])
    }
  }, [memoryData, memoryLoading])

  // 更新最新狀態的 ref
  useEffect(() => {
    latestStateRef.current = { title, content, subcategoryId, tags }
  }, [title, content, subcategoryId, tags])

  // 鎖定背景滾動
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

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
            subcategoryId: currentState.subcategoryId,
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
  }, [title, content, subcategoryId, tags, memoryId])

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

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  // 失去焦點時也添加標籤
  const handleTagBlur = () => {
    handleAddTag()
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  // 安全關閉編輯器 - 確保保存完成
  const handleClose = useCallback(async () => {
    // 如果正在保存，等待完成
    if (isSaving) {
      console.log('⏳ 等待保存完成...')
      // 簡單等待，實際上 isSaving 狀態會在保存完成後更新
      await new Promise(resolve => setTimeout(resolve, 100))
      return handleClose() // 遞歸調用，直到保存完成
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
        <div className="px-4 py-2 flex items-center justify-between">
          {/* 左側 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
              title="關閉（會自動保存）"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="h-6 w-px bg-gray-600"></div>

            {/* 檔案名稱 */}
            <div className="flex items-center gap-2 text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium">{title || '未命名文件'}</span>
            </div>

            {/* 保存狀態指示器 */}
            {memoryId && (
              <div className="flex items-center gap-2 text-xs ml-4">
                {isSaving ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-yellow-400 font-medium">儲存中...</span>
                  </>
                ) : saveError ? (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-400 font-medium">{saveError}</span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-400 font-medium">未保存</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-400 font-medium">
                      已保存 {new Date(lastSaved).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-400 font-medium">自動儲存</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 右側工具 */}
          <div className="flex items-center gap-1">
            {/* 檢視模式切換 - HackMD 風格 */}
            <div className="flex items-center bg-gray-700 rounded p-0.5">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'edit'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
                title="編輯模式"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                編輯
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'split'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
                title="同時"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v14a2 2 0 002 2h4m10-1V5a2 2 0 00-2-2h-4m5 0v18" />
                </svg>
                同時
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'preview'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
                title="檢視模式"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                檢視
              </button>
            </div>
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
                <div className="max-w-4xl mx-auto h-full p-8">
                  {/* 標題 */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="# 標題"
                    className="w-full text-3xl font-bold bg-transparent focus:outline-none placeholder-gray-600 text-gray-100 mb-4 border-none"
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                    }}
                  />

                  {/* 分類選擇器 */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 mb-2 block">分類</label>
                    {subcategories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {subcategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSubcategoryId(subcategoryId === cat.id ? null : cat.id)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                            style={{
                              background: subcategoryId === cat.id ? cat.color : '#2a2a2a',
                              color: subcategoryId === cat.id ? '#ffffff' : '#999',
                              border: `1.5px solid ${subcategoryId === cat.id ? cat.color : '#3d3d3d'}`,
                            }}
                          >
                            <span className="mr-1">{cat.emoji}</span>
                            {cat.nameChinese}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 py-2">
                        尚無自訂分類，請前往設定頁面建立分類
                      </div>
                    )}
                  </div>

                  {/* 標籤 */}
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors group"
                      >
                        #{tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                      onBlur={handleTagBlur}
                      placeholder="+ 新增標籤"
                      className="px-2 py-1 text-xs bg-transparent border border-dashed border-gray-700 rounded-md hover:border-gray-600 focus:border-gray-500 focus:outline-none transition-colors text-gray-400"
                      style={{ width: '100px' }}
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
                <div className="max-w-4xl mx-auto p-8">
                  {/* 標題 */}
                  <h1 className="text-3xl font-bold text-gray-100 mb-4">{title || '未命名文件'}</h1>

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
              <div className="flex h-full">
                {/* 左側編輯器 */}
                <div className="flex-1 bg-[#1E1E1E] overflow-y-auto border-r border-gray-800">
                  <div className="max-w-3xl mx-auto p-8">
                    {/* 標題 */}
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="# 標題"
                      className="w-full text-3xl font-bold bg-transparent focus:outline-none placeholder-gray-600 text-gray-100 mb-4 border-none"
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                      }}
                    />

                    {/* 分類選擇器 */}
                    <div className="mb-4">
                      <label className="text-xs text-gray-400 mb-2 block">分類</label>
                      {subcategories.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {subcategories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setSubcategoryId(subcategoryId === cat.id ? null : cat.id)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                              style={{
                                background: subcategoryId === cat.id ? cat.color : '#2a2a2a',
                                color: subcategoryId === cat.id ? '#ffffff' : '#999',
                                border: `1.5px solid ${subcategoryId === cat.id ? cat.color : '#3d3d3d'}`,
                              }}
                            >
                              <span className="mr-1">{cat.emoji}</span>
                              {cat.nameChinese}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 py-2">
                          尚無自訂分類，請前往設定頁面建立分類
                        </div>
                      )}
                    </div>

                    {/* 標籤 */}
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors group"
                        >
                          #{tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                        onBlur={handleTagBlur}
                        placeholder="+ 新增標籤"
                        className="px-2 py-1 text-xs bg-transparent border border-dashed border-gray-700 rounded-md hover:border-gray-600 focus:border-gray-500 focus:outline-none transition-colors text-gray-400"
                        style={{ width: '100px' }}
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
                  <div ref={previewRef} className="max-w-3xl mx-auto p-8">
                    {/* 標題 */}
                    <h1 className="text-3xl font-bold text-gray-100 mb-4">{title || '未命名文件'}</h1>

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
