import React from 'react'
import { ExternalLink } from 'lucide-react'

interface WebPreviewProps {
  files?: Array<{
    filename: string
    created: boolean
  }>
  message?: string
}

const WebPreview: React.FC<WebPreviewProps> = ({ files }) => {
  const API_BASE =
    (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

  // Always show preview if any files were created
  const hasFiles = files && files.length > 0 && files.some(f => f.created)

  const hasHtmlFile = files?.some(
    f =>
      f.created && (f.filename.endsWith('.html') || f.filename.endsWith('.htm'))
  )

  const hasReactProject = files?.some(
    f =>
      f.created &&
      (f.filename.includes('App.tsx') ||
        f.filename.includes('App.jsx') ||
        f.filename.includes('index.tsx') ||
        f.filename.includes('main.tsx'))
  )

  const mainHtmlFile = files?.find(
    f =>
      f.created && (f.filename === 'index.html' || f.filename.endsWith('.html'))
  )?.filename

  // Find the best file to preview
  const getPreviewFile = () => {
    if (mainHtmlFile) return mainHtmlFile

    // Look for any HTML file
    const anyHtmlFile = files?.find(
      f =>
        f.created &&
        (f.filename.endsWith('.html') || f.filename.endsWith('.htm'))
    )?.filename
    if (anyHtmlFile) return anyHtmlFile

    // For React projects, we'll need a different approach
    return null
  }

  const previewFile = getPreviewFile()

  const handlePreview = () => {
    if (previewFile) {
      // Always open in new tab for best experience
      window.open(`${API_BASE}/workspace/${previewFile}`, '_blank')
    } else if (hasReactProject || hasFiles) {
      // For React projects or when no HTML file exists, show workspace
      window.open(`${API_BASE}/workspace/`, '_blank')
    }
  }

  if (!hasFiles) return null

  return (
    <>
      {/* Preview Button - Always available */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          onClick={handlePreview}
          className="px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl flex items-center gap-2 transition-all duration-200 shadow-lg animate-pulse-slow transform hover:scale-105"
        >
          <ExternalLink size={20} />
          <span className="font-bold text-lg">
            {previewFile ? '🚀 新分頁預覽' : '📁 查看檔案'}
          </span>
        </button>

        {/* Convert to HTML button for React projects */}
        {hasReactProject && !hasHtmlFile && (
          <button
            onClick={() => {
              const chatInput = document.querySelector(
                'input[placeholder*="訊息"]'
              ) as HTMLInputElement
              if (chatInput) {
                chatInput.value =
                  '請把這個專案重新創建為可以直接在瀏覽器預覽的純 HTML 版本'
                chatInput.focus()
                // Trigger input event
                const event = new Event('input', { bubbles: true })
                chatInput.dispatchEvent(event)
              }
            }}
            className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl flex items-center gap-2 transition-all duration-200 shadow-lg transform hover:scale-105"
          >
            <span className="font-semibold">🔄 轉換為可預覽版本</span>
          </button>
        )}
      </div>
    </>
  )
}

export default WebPreview
