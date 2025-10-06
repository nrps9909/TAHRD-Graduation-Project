import { useState } from 'react'
import FileUpload from './FileUpload'
import FilePreview from './FilePreview'
import LinkInput from './LinkInput'
import LinkPreview from './LinkPreview'

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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gradient-to-br from-white to-healing-cream rounded-bubble p-8 max-w-3xl w-full m-4 shadow-cute-xl border-4 border-white animate-bounce-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-cute-2xl font-bold bg-gradient-to-r from-candy-pink to-candy-purple bg-clip-text text-transparent">
            📎 上傳知識
          </h2>
          <button
            onClick={handleCancel}
            className="w-10 h-10 rounded-full bg-healing-sunset hover:bg-candy-pink text-white text-2xl font-bold transition-all duration-300 hover:rotate-90 hover:scale-110 shadow-cute"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('files')}
            className={`
              flex-1 px-6 py-3 rounded-cute font-bold transition-all duration-300
              ${activeTab === 'files'
                ? 'bg-gradient-to-r from-candy-pink to-candy-purple text-white shadow-cute'
                : 'bg-healing-gentle text-gray-700 hover:bg-candy-blue/20'
              }
            `}
          >
            📁 文件 {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`
              flex-1 px-6 py-3 rounded-cute font-bold transition-all duration-300
              ${activeTab === 'links'
                ? 'bg-gradient-to-r from-candy-blue to-candy-purple text-white shadow-cute'
                : 'bg-healing-gentle text-gray-700 hover:bg-candy-blue/20'
              }
            `}
          >
            🔗 鏈接 {selectedLinks.length > 0 && `(${selectedLinks.length})`}
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[300px] mb-6">
          {activeTab === 'files' ? (
            <div className="space-y-4">
              <FilePreview
                files={selectedFiles}
                onRemove={(id) => setSelectedFiles(files => files.filter(f => f.id !== id))}
              />
              <FileUpload
                onFilesSelected={(files) => setSelectedFiles(prev => [...prev, ...files])}
              />
            </div>
          ) : (
            <div className="space-y-4">
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

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!hasContent}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-candy-pink to-candy-purple text-white rounded-cute font-bold shadow-cute hover:shadow-cute-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✅ 確認上傳
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-3 bg-healing-gentle hover:bg-candy-blue text-gray-700 font-bold rounded-cute shadow-cute hover:shadow-cute-lg transition-all duration-300 hover:scale-105 active:scale-95"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
