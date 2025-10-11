import { useRef, useState } from 'react'

interface UploadedFile {
  id: string
  file: File
  preview?: string
  type: 'image' | 'document' | 'other'
}

interface FileUploadProps {
  onFilesSelected: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSize?: number // MB
}

export default function FileUpload({ onFilesSelected, maxFiles = 5, maxSize = 10 }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const getFileType = (file: File): UploadedFile['type'] => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) {
      return 'document'
    }
    return 'other'
  }

  const processFiles = async (files: FileList) => {
    const uploadedFiles: UploadedFile[] = []

    for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
      const file = files[i]

      // 检查文件大小
      if (file.size > maxSize * 1024 * 1024) {
        alert(`文件 ${file.name} 超过 ${maxSize}MB 限制`)
        continue
      }

      const fileType = getFileType(file)
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${i}`,
        file,
        type: fileType
      }

      // 如果是图片，生成预览
      if (fileType === 'image') {
        uploadedFile.preview = await createImagePreview(file)
      }

      uploadedFiles.push(uploadedFile)
    }

    onFilesSelected(uploadedFiles)
  }

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.md,.json,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 sm:border-3 border-dashed rounded-xl sm:rounded-2xl md:rounded-cute p-4 sm:p-6 md:p-8 text-center cursor-pointer
          transition-all duration-300 active:scale-95
          ${isDragging
            ? 'border-candy-pink bg-candy-pink/10 scale-105'
            : 'border-gray-300 hover:border-candy-blue hover:bg-candy-blue/5'
          }
        `}
      >
        <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4 animate-bounce-gentle">📎</div>
        <p className="text-sm sm:text-base md:text-cute-base text-gray-700 font-medium mb-1 sm:mb-2">
          <span className="hidden sm:inline">點擊或拖拽文件到這裡</span>
          <span className="sm:hidden">點擊上傳文件</span>
        </p>
        <p className="text-xs sm:text-sm md:text-cute-sm text-gray-500">
          <span className="hidden md:inline">支持圖片、PDF、文檔等（最多 {maxFiles} 個文件，每個不超過 {maxSize}MB）</span>
          <span className="md:hidden">支持圖片、文檔（≤{maxSize}MB）</span>
        </p>
      </div>
    </>
  )
}
