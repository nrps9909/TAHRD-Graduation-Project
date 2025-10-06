interface UploadedFile {
  id: string
  file: File
  preview?: string
  type: 'image' | 'document' | 'other'
}

interface FilePreviewProps {
  files: UploadedFile[]
  onRemove: (id: string) => void
}

export default function FilePreview({ files, onRemove }: FilePreviewProps) {
  const getFileIcon = (type: UploadedFile['type']) => {
    switch (type) {
      case 'image':
        return '🖼️'
      case 'document':
        return '📄'
      default:
        return '📁'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (files.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {files.map((file) => (
        <div
          key={file.id}
          className="relative bg-white rounded-cute p-3 shadow-cute hover:shadow-cute-lg transition-all duration-300 group"
        >
          {/* 预览 */}
          {file.type === 'image' && file.preview ? (
            <div className="relative">
              <img
                src={file.preview}
                alt={file.file.name}
                className="w-32 h-32 object-cover rounded-lg"
              />
              {/* 删除按钮 */}
              <button
                onClick={() => onRemove(file.id)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-candy-pink text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:scale-110"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="w-32 h-32 flex flex-col items-center justify-center bg-healing-gentle rounded-lg">
              <span className="text-4xl mb-2">{getFileIcon(file.type)}</span>
              <p className="text-cute-xs text-gray-600 text-center px-2 truncate w-full">
                {file.file.name}
              </p>
              {/* 删除按钮 */}
              <button
                onClick={() => onRemove(file.id)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-candy-pink text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:scale-110"
              >
                ×
              </button>
            </div>
          )}

          {/* 文件信息 */}
          <div className="mt-2 text-center">
            <p className="text-cute-xs text-gray-600 truncate max-w-[128px]">
              {file.file.name}
            </p>
            <p className="text-cute-xs text-gray-400">
              {formatFileSize(file.file.size)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
