import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Folder,
  Download,
  Plus,
  Trash2,
  X,
  Code,
  Globe,
  ChevronRight,
  ChevronDown,
  Monitor,
} from 'lucide-react'
import CodeEditor from './CodeEditor'
import { usePageStatePersistence } from '@/hooks/usePageStatePersistence'
import { useGameStore } from '@/store/gameStore'
import '@/components/WorkspaceViewer.css'

interface WorkspaceFile {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: WorkspaceFile[]
}

interface OpenTab {
  filename: string
  content: string
  isDirty: boolean
}

type ViewMode = 'code' | 'preview' | 'split'

interface WorkspaceViewerProps {
  embedded?: boolean
}

const WorkspaceViewer: React.FC<WorkspaceViewerProps> = ({
  embedded = false,
}) => {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(embedded)
  const [isMobile, setIsMobile] = useState(false)
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')

  // 獲取玩家名稱以實現用戶隔離
  const { playerName } = useGameStore()

  // 用戶特定的持久化狀態
  const stateKey = playerName
    ? `workspaceViewer-${playerName}`
    : 'workspaceViewer-guest'
  const [workspaceState, setWorkspaceState] = usePageStatePersistence(
    stateKey,
    {
      openTabs: [] as OpenTab[],
      activeTab: null as string | null,
      viewMode: 'code' as ViewMode,
      sidebarWidth: 300,
      showSidebar: true,
      expandedFolders: [] as string[],
    }
  )

  // 當玩家切換時，清空當前用戶的 openTabs（因為檔案屬於不同用戶）
  useEffect(() => {
    setWorkspaceState(prev => ({
      ...prev,
      openTabs: [],
      activeTab: null,
    }))
  }, [playerName, setWorkspaceState])

  // Auto-save and auto-refresh are always enabled
  const autoSave = true
  const autoRefresh = true

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const previewRefreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Convert array to Set for expandedFolders (for easier manipulation)
  const expandedFolders = new Set(workspaceState.expandedFolders)
  const setExpandedFolders = (folders: Set<string>) => {
    setWorkspaceState(prev => ({
      ...prev,
      expandedFolders: Array.from(folders),
    }))
  }
  const resizeRef = useRef<HTMLDivElement>(null)

  const API_BASE =
    (import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env
      ?.VITE_API_BASE || 'http://localhost:3001'

  const loadFiles = async () => {
    setLoading(true)
    try {
      const userId = playerName || 'guest'
      const response = await fetch(
        `${API_BASE}/api/files?userId=${encodeURIComponent(userId)}`
      )
      const data = await response.json()
      if (data.success) {
        // Convert flat file list to tree structure
        const fileTree = buildFileTree(data.files)
        setFiles(fileTree)

        // 如果沒有檔案，清空所有 openTabs
        if (!data.files || data.files.length === 0) {
          setWorkspaceState(prev => ({
            ...prev,
            openTabs: [],
            activeTab: null,
          }))
        } else {
          // 移除不存在的檔案的 tabs
          const existingFiles = new Set(data.files)
          setWorkspaceState(prev => ({
            ...prev,
            openTabs: prev.openTabs.filter(tab =>
              existingFiles.has(tab.filename)
            ),
            activeTab:
              prev.activeTab && existingFiles.has(prev.activeTab)
                ? prev.activeTab
                : null,
          }))
        }
      }
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildFileTree = (fileList: string[]): WorkspaceFile[] => {
    const tree: WorkspaceFile[] = []
    const folders: { [key: string]: WorkspaceFile } = {}

    fileList.forEach(filePath => {
      const parts = filePath.split('/')
      let currentPath = ''

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1
        currentPath = currentPath ? `${currentPath}/${part}` : part

        if (isLast) {
          // It's a file
          const parentPath = parts.slice(0, -1).join('/')
          const parent = parentPath ? folders[parentPath] : null
          const file: WorkspaceFile = {
            name: part,
            type: 'file',
            path: currentPath,
          }

          if (parent) {
            if (!parent.children) parent.children = []
            parent.children.push(file)
          } else {
            tree.push(file)
          }
        } else {
          // It's a folder
          if (!folders[currentPath]) {
            const folder: WorkspaceFile = {
              name: part,
              type: 'folder',
              path: currentPath,
              children: [],
            }
            folders[currentPath] = folder

            const parentPath = parts.slice(0, index).join('/')
            const parent = parentPath ? folders[parentPath] : null

            if (parent) {
              if (!parent.children) parent.children = []
              parent.children.push(folder)
            } else {
              tree.push(folder)
            }
          }
        }
      })
    })

    return tree
  }

  const openFile = async (filepath: string) => {
    // Check if file is already open
    const existingTab = workspaceState.openTabs.find(
      tab => tab.filename === filepath
    )
    if (existingTab) {
      setWorkspaceState(prev => ({ ...prev, activeTab: filepath }))
      return
    }

    try {
      const userId = playerName || 'guest'
      const response = await fetch(
        `${API_BASE}/api/file/read/${encodeURIComponent(filepath)}?userId=${encodeURIComponent(userId)}`
      )
      const data = await response.json()
      if (data.success) {
        const newTab: OpenTab = {
          filename: filepath,
          content: data.content,
          isDirty: false,
        }
        setWorkspaceState(prev => ({
          ...prev,
          openTabs: [...prev.openTabs, newTab],
          activeTab: filepath,
        }))
      }
    } catch (error) {
      console.error('Failed to read file:', error)
    }
  }

  const saveFile = async (filepath: string, content: string) => {
    try {
      const userId = playerName || 'guest'
      const response = await fetch(`${API_BASE}/api/file/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: filepath, content, userId }),
      })

      if (response.ok) {
        setWorkspaceState(prev => ({
          ...prev,
          openTabs: prev.openTabs.map(tab =>
            tab.filename === filepath ? { ...tab, isDirty: false } : tab
          ),
        }))
        console.log('File saved successfully')
      }
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }

  const createFile = async (filename: string) => {
    try {
      const userId = playerName || 'guest'
      const response = await fetch(`${API_BASE}/api/file/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content: '', userId }),
      })

      if (response.ok) {
        await loadFiles()
        await openFile(filename)
        setIsCreatingFile(false)
        setNewFileName('')
      }
    } catch (error) {
      console.error('Failed to create file:', error)
    }
  }

  const deleteFile = async (filepath: string) => {
    if (!confirm(`確定要刪除 ${filepath} 嗎？`)) return

    try {
      const userId = playerName || 'guest'
      const response = await fetch(`${API_BASE}/api/file/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: filepath, userId }),
      })

      if (response.ok) {
        // Close tab if open
        const newOpenTabs = workspaceState.openTabs.filter(
          tab => tab.filename !== filepath
        )
        const newActiveTab =
          workspaceState.activeTab === filepath
            ? newOpenTabs.length > 0
              ? newOpenTabs[0].filename
              : null
            : workspaceState.activeTab

        setWorkspaceState(prev => ({
          ...prev,
          openTabs: newOpenTabs,
          activeTab: newActiveTab,
        }))
        await loadFiles()
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  const deleteFolder = async (folderPath: string) => {
    if (
      !confirm(
        `確定要刪除資料夾 ${folderPath} 及其所有內容嗎？⚠️ 此操作無法復原！`
      )
    )
      return

    try {
      const userId = playerName || 'guest'
      const response = await fetch(`${API_BASE}/api/folder/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath, userId }),
      })

      if (response.ok) {
        // Close tabs for any files in this folder
        const newOpenTabs = workspaceState.openTabs.filter(
          tab => !tab.filename.startsWith(folderPath + '/')
        )
        const newActiveTab =
          workspaceState.activeTab &&
          workspaceState.activeTab.startsWith(folderPath + '/')
            ? newOpenTabs.length > 0
              ? newOpenTabs[0].filename
              : null
            : workspaceState.activeTab

        setWorkspaceState(prev => ({
          ...prev,
          openTabs: newOpenTabs,
          activeTab: newActiveTab,
          expandedFolders: prev.expandedFolders.filter(
            f => !f.startsWith(folderPath)
          ),
        }))
        await loadFiles()
      }
    } catch (error) {
      console.error('Failed to delete folder:', error)
    }
  }

  const closeTab = (filepath: string) => {
    const tab = workspaceState.openTabs.find(t => t.filename === filepath)
    if (tab?.isDirty) {
      if (!confirm(`${filepath} 有未保存的更改，確定要關閉嗎？`)) return
    }

    const newOpenTabs = workspaceState.openTabs.filter(
      tab => tab.filename !== filepath
    )
    const newActiveTab =
      workspaceState.activeTab === filepath
        ? newOpenTabs.length > 0
          ? newOpenTabs[0].filename
          : null
        : workspaceState.activeTab

    setWorkspaceState(prev => ({
      ...prev,
      openTabs: newOpenTabs,
      activeTab: newActiveTab,
    }))
  }

  // Debounced auto-save function
  const debouncedAutoSave = useCallback((filepath: string, content: string) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveFile(filepath, content)
    }, 800) // Auto-save after 800ms of inactivity
  }, [])

  // Debounced preview refresh function
  const debouncedPreviewRefresh = useCallback(() => {
    if (previewRefreshTimerRef.current) {
      clearTimeout(previewRefreshTimerRef.current)
    }

    previewRefreshTimerRef.current = setTimeout(() => {
      if (iframeRef.current) {
        const iframe = iframeRef.current
        const currentSrc = iframe.src
        // Force refresh by adding timestamp
        iframe.src = currentSrc.includes('?')
          ? currentSrc.replace(/(\?.*|$)/, `?t=${Date.now()}`)
          : `${currentSrc}?t=${Date.now()}`
      }
    }, 400) // Refresh preview after 400ms of inactivity
  }, [])

  const updateFileContent = (filepath: string, content: string) => {
    // Update state immediately for responsive UI
    setWorkspaceState(prev => ({
      ...prev,
      openTabs: prev.openTabs.map(tab =>
        tab.filename === filepath
          ? { ...tab, content, isDirty: false } // Always false since auto-save is enabled
          : tab
      ),
    }))

    // Trigger auto-save
    debouncedAutoSave(filepath, content)

    // Trigger preview refresh for HTML files or CSS/JS files (which affect HTML)
    if (
      filepath.endsWith('.html') ||
      filepath.endsWith('.css') ||
      filepath.endsWith('.js')
    ) {
      debouncedPreviewRefresh()
    }
  }

  const toggleFolder = (folderPath: string) => {
    const newSet = new Set(expandedFolders)
    if (newSet.has(folderPath)) {
      newSet.delete(folderPath)
    } else {
      newSet.add(folderPath)
    }
    setExpandedFolders(newSet)
  }

  useEffect(() => {
    if (isOpen) {
      loadFiles()
      // Auto-refresh every 10 seconds
      const interval = setInterval(loadFiles, 10000)
      return () => clearInterval(interval)
    }
  }, [isOpen]) // loadFiles is stable and doesn't need to be in deps

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      if (previewRefreshTimerRef.current) {
        clearTimeout(previewRefreshTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setWorkspaceState(prev => ({
          ...prev,
          viewMode: 'code', // Default to code view on mobile
          showSidebar: false, // Hide sidebar on mobile by default
        }))
      } else {
        setWorkspaceState(prev => ({
          ...prev,
          showSidebar: true,
        }))
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 's' &&
        workspaceState.activeTab
      ) {
        e.preventDefault()
        const tab = workspaceState.openTabs.find(
          t => t.filename === workspaceState.activeTab
        )
        if (tab?.isDirty) {
          saveFile(workspaceState.activeTab, tab.content)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [workspaceState.activeTab, workspaceState.openTabs]) // saveFile is stable and doesn't need to be in deps

  const renderFileTree = (
    items: WorkspaceFile[],
    depth = 0
  ): React.ReactNode => {
    return items.map(item => (
      <div key={item.path}>
        <div
          className={`group flex items-center px-3 py-2 rounded-lg cursor-pointer text-sm transition-all duration-200 mx-2 ${
            workspaceState.activeTab === item.path
              ? 'bg-gradient-to-r from-pink-200 to-purple-200 text-purple-700 shadow-md'
              : 'text-pink-600 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item.path)
            } else {
              openFile(item.path)
            }
          }}
        >
          {item.type === 'folder' ? (
            <>
              {expandedFolders.has(item.path) ? (
                <ChevronDown size={14} className="mr-2 text-purple-500" />
              ) : (
                <ChevronRight size={14} className="mr-2 text-purple-500" />
              )}
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center mr-2 ${
                  expandedFolders.has(item.path)
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-400'
                    : 'bg-gradient-to-br from-cat-pink to-cat-beige'
                }`}
              >
                <span className="text-xs text-white">
                  {expandedFolders.has(item.path) ? '📂' : '📁'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="w-4 mr-2" />
              <div className="w-6 h-6 bg-gradient-to-br from-cat-yellow to-cat-beige rounded-lg flex items-center justify-center mr-2">
                <span className="text-xs text-white">
                  {item.name.endsWith('.html')
                    ? '🌐'
                    : item.name.endsWith('.css')
                      ? '🎨'
                      : item.name.endsWith('.js') || item.name.endsWith('.ts')
                        ? '⚙️'
                        : item.name.endsWith('.json')
                          ? '📊'
                          : '📄'}
                </span>
              </div>
            </>
          )}
          <span className="truncate flex-1 font-medium">{item.name}</span>
          <button
            onClick={e => {
              e.stopPropagation()
              if (item.type === 'folder') {
                deleteFolder(item.path)
              } else {
                deleteFile(item.path)
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-1 bg-gradient-to-r from-red-400 to-pink-400 hover:from-red-500 hover:to-pink-500 text-white rounded-full transition-all duration-200 ml-2 shadow-md"
            title={item.type === 'folder' ? '🗑️ 刪除資料夾' : '🗑️ 刪除檔案'}
          >
            <Trash2 size={10} />
          </button>
        </div>
        {item.type === 'folder' &&
          expandedFolders.has(item.path) &&
          item.children && (
            <div>{renderFileTree(item.children, depth + 1)}</div>
          )}
      </div>
    ))
  }

  if (!isOpen && !embedded) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="floating-button fixed bottom-4 left-4 bg-gradient-to-br from-cat-pink via-cat-purple to-cat-beige hover:from-cat-pink-dark hover:via-cat-purple-dark hover:to-cat-beige text-white p-5 rounded-full shadow-2xl transition-all duration-300 z-50 transform hover:scale-110 border-4 border-white/30"
        title="✨ 超可愛程式編輯器 💖"
        style={{
          backgroundSize: '200% 200%',
        }}
      >
        <div className="flex items-center justify-center">
          <Monitor size={32} className="drop-shadow-lg" />
          <span className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-xs px-2 py-1 rounded-full font-bold shadow-lg">
            NEW
          </span>
        </div>
      </button>
    )
  }

  const currentTab = workspaceState.openTabs.find(
    tab => tab.filename === workspaceState.activeTab
  )

  return (
    <div
      className={`workspace-viewer bg-gradient-to-br from-cat-cream/30 to-cat-pink/20 flex flex-col overflow-hidden h-full ${
        embedded
          ? 'border-0 rounded-none'
          : `fixed border-4 border-pink-300 rounded-3xl shadow-2xl z-50 ${isMobile ? 'inset-2' : 'inset-4'}`
      }`}
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23fce7f3" fill-opacity="0.1" fill-rule="evenodd"%3E%3Ccircle cx="3" cy="3" r="3"/%3E%3Ccircle cx="13" cy="13" r="3"/%3E%3C/g%3E%3C/svg%3E")',
        backdropFilter: embedded ? 'none' : 'blur(10px)',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b-4 border-pink-300 flex justify-between items-center bg-gradient-to-r from-pink-200 to-purple-200 rounded-t-3xl">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={() =>
                setWorkspaceState(prev => ({
                  ...prev,
                  showSidebar: !prev.showSidebar,
                }))
              }
              className="bg-pink-400 hover:bg-pink-500 text-white rounded-full p-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
              title="📁 切換檔案面板"
            >
              <Folder size={16} />
            </button>
          )}
          <h3
            className={`font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2 ${
              isMobile ? 'text-base' : 'text-xl'
            }`}
          >
            <div className="p-2 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full text-white shadow-lg">
              <Monitor size={isMobile ? 14 : 18} />
            </div>
            {isMobile ? '✨ 可愛編輯器' : '✨ 超可愛程式編輯器 💖'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Buttons */}
          {!isMobile && (
            <div className="flex bg-white/50 backdrop-blur-sm rounded-full p-1 shadow-inner border border-pink-200">
              <button
                onClick={() =>
                  setWorkspaceState(prev => ({ ...prev, viewMode: 'code' }))
                }
                className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-all duration-200 font-medium ${
                  workspaceState.viewMode === 'code'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg transform scale-105'
                    : 'text-pink-600 hover:bg-pink-100'
                }`}
              >
                <Code size={16} />
                📝 程式碼
              </button>
              <button
                onClick={() =>
                  setWorkspaceState(prev => ({ ...prev, viewMode: 'preview' }))
                }
                className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-all duration-200 font-medium ${
                  workspaceState.viewMode === 'preview'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg transform scale-105'
                    : 'text-pink-600 hover:bg-pink-100'
                }`}
              >
                <Globe size={16} />
                🌍 預覽
              </button>
              <button
                onClick={() =>
                  setWorkspaceState(prev => ({ ...prev, viewMode: 'split' }))
                }
                className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-all duration-200 font-medium ${
                  workspaceState.viewMode === 'split'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg transform scale-105'
                    : 'text-pink-600 hover:bg-pink-100'
                }`}
              >
                <Monitor size={16} />
                🖥️ 分割
              </button>
            </div>
          )}

          {/* Mobile View Mode Toggle */}
          {isMobile && currentTab && currentTab.filename.endsWith('.html') && (
            <button
              onClick={() =>
                setWorkspaceState(prev => ({
                  ...prev,
                  viewMode: prev.viewMode === 'code' ? 'preview' : 'code',
                }))
              }
              className="px-3 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-sm flex items-center gap-2 text-white hover:from-pink-600 hover:to-purple-600 transition-all duration-200 shadow-lg font-medium"
            >
              {workspaceState.viewMode === 'code' ? (
                <>
                  <Globe size={14} />
                  🌍 預覽
                </>
              ) : (
                <>
                  <Code size={14} />
                  📝 程式碼
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {workspaceState.showSidebar && (
          <div
            className={`bg-gradient-to-b from-pink-100 to-purple-100 border-r-4 border-pink-300 flex flex-col backdrop-blur-sm ${
              isMobile ? 'absolute inset-y-0 left-0 z-10 w-64 shadow-2xl' : ''
            }`}
            style={
              !isMobile ? { width: `${workspaceState.sidebarWidth}px` } : {}
            }
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b-2 border-pink-200 flex justify-between items-center bg-gradient-to-r from-pink-200/50 to-purple-200/50">
              <span className="text-base font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs">
                  📁
                </div>
                可愛檔案總管
              </span>
              <button
                onClick={() => setIsCreatingFile(true)}
                className="bg-gradient-to-r from-cat-yellow to-cat-beige hover:from-cat-yellow hover:to-cat-beige text-white rounded-full p-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                title="➕ 新增檔案"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* New File Input */}
            {isCreatingFile && (
              <div className="p-3 border-b-2 border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50">
                <input
                  type="text"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newFileName.trim()) {
                      createFile(newFileName.trim())
                    } else if (e.key === 'Escape') {
                      setIsCreatingFile(false)
                      setNewFileName('')
                    }
                  }}
                  placeholder="✨ 輸入檔案名稱..."
                  className="w-full px-3 py-2 bg-white text-pink-700 text-sm rounded-full border-2 border-pink-300 focus:border-purple-400 focus:outline-none shadow-inner placeholder-pink-400"
                  autoFocus
                />
                <div className="flex gap-2 mt-3 justify-center">
                  <button
                    onClick={() =>
                      newFileName.trim() && createFile(newFileName.trim())
                    }
                    className="px-4 py-2 bg-gradient-to-r from-cat-yellow to-cat-beige hover:from-cat-yellow hover:to-cat-beige text-white text-sm rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    ✨ 建立
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingFile(false)
                      setNewFileName('')
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white text-sm rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    ✖️ 取消
                  </button>
                </div>
              </div>
            )}

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto">
              {files.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl">🎨</span>
                  </div>
                  <p className="text-pink-600 font-semibold text-base mb-2">
                    還沒有作品喔！
                  </p>
                  <p className="text-purple-500 text-sm bg-gradient-to-r from-pink-100 to-purple-100 px-4 py-2 rounded-full">
                    快去和 Gemini 聊天創作吧 ✨
                  </p>
                </div>
              ) : (
                <div className="py-2">{renderFileTree(files)}</div>
              )}
            </div>
          </div>
        )}

        {/* Resize Handle - Desktop only */}
        {!isMobile && workspaceState.showSidebar && (
          <div
            ref={resizeRef}
            className="w-1 bg-cat-pink/60 hover:bg-cat-pink cursor-col-resize"
            onMouseDown={e => {
              const startX = e.clientX
              const startWidth = workspaceState.sidebarWidth

              const handleMouseMove = (e: MouseEvent) => {
                const newWidth = Math.max(
                  200,
                  Math.min(600, startWidth + e.clientX - startX)
                )
                setWorkspaceState(prev => ({ ...prev, sidebarWidth: newWidth }))
              }

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }

              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          {workspaceState.openTabs.length > 0 && (
            <div className="flex border-b-2 border-pink-200 bg-gradient-to-r from-pink-100 to-purple-100 overflow-x-auto scrollbar-thin scrollbar-thumb-pink-300">
              {workspaceState.openTabs.map(tab => (
                <div
                  key={tab.filename}
                  className={`flex items-center cursor-pointer min-w-0 group rounded-t-lg mx-1 transition-all duration-200 ${
                    isMobile ? 'px-3 py-2 max-w-32' : 'px-4 py-3 max-w-48'
                  } ${
                    workspaceState.activeTab === tab.filename
                      ? 'bg-white text-purple-700 shadow-md transform -translate-y-1'
                      : 'text-pink-600 hover:bg-white/50'
                  }`}
                  onClick={() => {
                    setWorkspaceState(prev => ({
                      ...prev,
                      activeTab: tab.filename,
                    }))
                    if (isMobile)
                      setWorkspaceState(prev => ({
                        ...prev,
                        showSidebar: false,
                      }))
                  }}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center mr-2 flex-shrink-0 ${
                      tab.filename.endsWith('.html')
                        ? 'bg-gradient-to-br from-orange-400 to-red-400'
                        : tab.filename.endsWith('.css')
                          ? 'bg-gradient-to-br from-cat-pink to-cat-beige'
                          : tab.filename.endsWith('.js') ||
                              tab.filename.endsWith('.ts')
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-400'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                    }`}
                  >
                    <span className="text-xs text-white">
                      {tab.filename.endsWith('.html')
                        ? '🌐'
                        : tab.filename.endsWith('.css')
                          ? '🎨'
                          : tab.filename.endsWith('.js') ||
                              tab.filename.endsWith('.ts')
                            ? '⚙️'
                            : '📄'}
                    </span>
                  </div>
                  <span
                    className={`truncate font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}
                  >
                    {tab.filename.split('/').pop()}
                    {tab.isDirty && ' ✨'}
                  </span>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      closeTab(tab.filename)
                    }}
                    className={`ml-2 bg-red-400 hover:bg-red-500 text-white rounded-full p-1 flex-shrink-0 transition-all duration-200 ${
                      isMobile
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <X size={isMobile ? 8 : 10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Editor/Preview Area */}
          <div
            className={`flex-1 flex overflow-hidden ${isMobile && workspaceState.showSidebar ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {/* Mobile Overlay */}
            {isMobile && workspaceState.showSidebar && (
              <div
                className="absolute inset-0 bg-black bg-opacity-50 z-5"
                onClick={() =>
                  setWorkspaceState(prev => ({ ...prev, showSidebar: false }))
                }
              />
            )}

            {/* Code Editor */}
            {(workspaceState.viewMode === 'code' ||
              (!isMobile && workspaceState.viewMode === 'split')) && (
              <div
                className={`${!isMobile && workspaceState.viewMode === 'split' ? 'w-1/2 border-r-2 border-purple-300' : 'w-full'} flex flex-col bg-gradient-to-b from-purple-50 to-pink-50`}
              >
                {currentTab ? (
                  <div className="h-full flex flex-col">
                    {/* Cute save/download bar */}
                    <div className="px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 border-b border-purple-200 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-purple-600 font-medium">
                          📝 {currentTab.filename}
                        </span>
                        <span className="text-xs bg-green-300 text-green-800 px-2 py-1 rounded-full font-bold">
                          ✨ 即時保存
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`${API_BASE}/workspace/${currentTab.filename}`}
                          download={currentTab.filename}
                          className="text-xs bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white flex items-center gap-1 px-3 py-1.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          <Download size={12} />
                          ⬇️ 下載
                        </a>
                      </div>
                    </div>
                    {/* Editor */}
                    <div className="flex-1">
                      <CodeEditor
                        value={currentTab.content}
                        onChange={content =>
                          updateFileContent(currentTab.filename, content)
                        }
                        filename={currentTab.filename}
                        className="h-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                    <div className="text-center p-8 bg-white/80 rounded-3xl shadow-xl">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce">
                        <Code size={40} className="text-white" />
                      </div>
                      <p className="text-lg font-bold text-purple-600 mb-2">
                        還沒有開啟檔案喔！
                      </p>
                      <p className="text-sm text-pink-600">
                        👈 點選左邊的檔案開始編輯
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview Panel */}
            {(workspaceState.viewMode === 'preview' ||
              (!isMobile && workspaceState.viewMode === 'split')) && (
              <div
                className={`${!isMobile && workspaceState.viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col bg-white`}
              >
                {currentTab && currentTab.filename.endsWith('.html') ? (
                  <div className="flex-1 flex flex-col">
                    {/* Preview header with auto-refresh indicator */}
                    <div className="px-4 py-2 bg-gradient-to-r from-cat-cream to-cat-yellow/30 border-b border-cat-pink/30 flex justify-between items-center">
                      <span className="text-sm text-cat-purple font-medium flex items-center gap-2">
                        🌍 預覽: {currentTab.filename}
                      </span>
                      <span className="text-xs bg-cat-pink text-white px-2 py-1 rounded-full font-bold">
                        🔄✨ 即時更新
                      </span>
                    </div>
                    <iframe
                      ref={iframeRef}
                      src={`${API_BASE}/workspace/${currentTab.filename}?t=${Date.now()}`}
                      className="flex-1 border-0"
                      title="預覽"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-cat-purple/60 bg-cat-cream/20">
                    <div className="text-center">
                      <Globe size={48} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">選擇 HTML 檔案進行預覽</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkspaceViewer
