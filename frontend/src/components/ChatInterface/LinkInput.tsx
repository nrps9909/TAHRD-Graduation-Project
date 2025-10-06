import { useState } from 'react'

interface LinkData {
  id: string
  url: string
  title?: string
  preview?: string
}

interface LinkInputProps {
  onLinkAdded: (link: LinkData) => void
}

export default function LinkInput({ onLinkAdded }: LinkInputProps) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString)
      return true
    } catch {
      return false
    }
  }

  const handleAddLink = async () => {
    if (!url.trim()) return

    // 确保URL有协议
    let fullUrl = url.trim()
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl
    }

    if (!isValidUrl(fullUrl)) {
      alert('請輸入有效的網址')
      return
    }

    setIsLoading(true)

    try {
      // 创建链接数据（暂时不抓取预览，后端会处理）
      const linkData: LinkData = {
        id: `link-${Date.now()}`,
        url: fullUrl,
        title: fullUrl
      }

      onLinkAdded(linkData)
      setUrl('')
    } catch (error) {
      console.error('添加鏈接失敗:', error)
      alert('添加鏈接失敗，請檢查網址是否正確')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddLink()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="輸入網址... (例如: example.com)"
          className="flex-1 px-4 py-3 bg-white border-3 border-transparent rounded-cute focus:border-candy-blue focus:shadow-glow-blue transition-all duration-300"
          disabled={isLoading}
        />
        <button
          onClick={handleAddLink}
          disabled={isLoading || !url.trim()}
          className="px-6 py-3 bg-gradient-to-r from-candy-blue to-candy-purple text-white rounded-cute font-bold shadow-cute hover:shadow-cute-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '⏳' : '🔗 添加'}
        </button>
      </div>

      <div className="flex gap-2 text-cute-xs text-gray-500">
        <span>💡 提示:</span>
        <span>支持網頁、文章、視頻等鏈接</span>
      </div>
    </div>
  )
}
