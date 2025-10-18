import { useState } from 'react'
import FileUpload from './FileUpload'
import FilePreview from './FilePreview'
import LinkInput from './LinkInput'
import LinkPreview from './LinkPreview'
import { Z_INDEX_CLASSES } from '../../constants/zIndex'

interface UploadedFile {
  id: string
  file: File
  preview?: string
  type: 'image' | 'document' | 'other'
}

interface LinkData {
  id: string
  url: string
  title?: string
  preview?: string
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { files: UploadedFile[]; links: LinkData[] }) => void
}

export default function UploadModal({ isOpen, onClose, onConfirm }: UploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([])
  const [selectedLinks, setSelectedLinks] = useState<LinkData[]>([])
  const [activeTab, setActiveTab] = useState<'files' | 'links'>('files')

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm({ files: selectedFiles, links: selectedLinks })
    // 清空并关闭
    setSelectedFiles([])
    setSelectedLinks([])
    onClose()
  }

  const handleCancel = () => {
    setSelectedFiles([])
    setSelectedLinks([])
    onClose()
  }

  const hasContent = selectedFiles.length > 0 || selectedLinks.length > 0

  return (
    <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center ${Z_INDEX_CLASSES.MODAL} animate-fade-in p-2 sm:p-3 md:p-4`}>
      <div className="bg-gradient-to-br from-white to-healing-cream rounded-2xl sm:rounded-3xl md:rounded-bubble p-3 sm:p-4 md:p-6 lg:p-8 max-w-3xl w-full shadow-cute-xl border-2 sm:border-3 md:border-4 border-white animate-bounce-in max-h-[90vh] overflow-y-auto">
        {/* Header - 響應式優化 */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <h2 className="text-base sm:text-lg md:text-xl lg:text-cute-2xl font-bold bg-gradient-to-r from-candy-pink to-candy-purple bg-clip-text text-transparent">
            📎 上傳知識
          </h2>
          <button
            onClick={handleCancel}
            className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-healing-sunset hover:bg-candy-pink text-white text-lg sm:text-xl md:text-2xl font-bold transition-all duration-300 hover:rotate-90 hover:scale-110 shadow-cute flex-shrink-0"
            aria-label="關閉"
          >
            ×
          </button>
        </div>

        {/* Tabs - 響應式優化 */}
        <div className="flex gap-1.5 sm:gap-2 md:gap-3 mb-3 sm:mb-4 md:mb-6">
          <button
            onClick={() => setActiveTab('files')}
            className={`
              flex-1 px-2.5 sm:px-3 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 rounded-xl sm:rounded-2xl md:rounded-cute font-bold transition-all duration-300 text-xs sm:text-sm md:text-base active:scale-95
              ${activeTab === 'files'
                ? 'bg-gradient-to-r from-candy-pink to-candy-purple text-white shadow-cute'
                : 'bg-healing-gentle text-white hover:bg-candy-blue/20'
              }
            `}
          >
            <span className="hidden sm:inline">📁 文件</span>
            <span className="sm:hidden">📁</span>
            {selectedFiles.length > 0 && ` (${selectedFiles.length})`}
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`
              flex-1 px-2.5 sm:px-3 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 rounded-xl sm:rounded-2xl md:rounded-cute font-bold transition-all duration-300 text-xs sm:text-sm md:text-base active:scale-95
              ${activeTab === 'links'
                ? 'bg-gradient-to-r from-candy-blue to-candy-purple text-white shadow-cute'
                : 'bg-healing-gentle text-white hover:bg-candy-blue/20'
              }
            `}
          >
            <span className="hidden sm:inline">🔗 鏈接</span>
            <span className="sm:hidden">🔗</span>
            {selectedLinks.length > 0 && ` (${selectedLinks.length})`}
          </button>
        </div>

        {/* Content - 響應式優化 */}
        <div className="min-h-[180px] sm:min-h-[200px] md:min-h-[250px] lg:min-h-[300px] mb-3 sm:mb-4 md:mb-6">
          {activeTab === 'files' ? (
            <div className="space-y-3 sm:space-y-4">
              <FilePreview
                files={selectedFiles}
                onRemove={(id) => setSelectedFiles(files => files.filter(f => f.id !== id))}
              />
              <FileUpload
                onFilesSelected={(files) => setSelectedFiles(prev => [...prev, ...files])}
              />
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <LinkPreview
                links={selectedLinks}
                onRemove={(id) => setSelectedLinks(links => links.filter(l => l.id !== id))}
              />
              <LinkInput
                onLinkAdded={(link) => setSelectedLinks(prev => [...prev, link])}
              />
            </div>
          )}
        </div>

        {/* Actions - 響應式優化 */}
        <div className="flex gap-1.5 sm:gap-2 md:gap-3">
          <button
            onClick={handleConfirm}
            disabled={!hasContent}
            className="flex-1 px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-candy-pink to-candy-purple text-white rounded-xl sm:rounded-2xl md:rounded-cute font-bold shadow-cute hover:shadow-cute-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base"
          >
            <span className="hidden sm:inline">✅ 確認上傳</span>
            <span className="sm:hidden">✅ 確認</span>
          </button>
          <button
            onClick={handleCancel}
            className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-healing-gentle hover:bg-candy-blue text-white font-bold rounded-xl sm:rounded-2xl md:rounded-cute shadow-cute hover:shadow-cute-lg transition-all duration-300 hover:scale-105 active:scale-95 text-xs sm:text-sm md:text-base whitespace-nowrap"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
