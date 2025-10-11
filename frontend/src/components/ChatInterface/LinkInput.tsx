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
    <div className="space-y-2 sm:space-y-3">
      <div className="flex gap-1.5 sm:gap-2 md:gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="輸入網址..."
          className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-white border-2 sm:border-3 border-transparent rounded-xl sm:rounded-2xl md:rounded-cute focus:border-candy-blue focus:shadow-glow-blue transition-all duration-300 text-xs sm:text-sm md:text-base"
          disabled={isLoading}
        />
        <button
          onClick={handleAddLink}
          disabled={isLoading || !url.trim()}
          className="flex-shrink-0 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-candy-blue to-candy-purple text-white rounded-xl sm:rounded-2xl md:rounded-cute font-bold shadow-cute hover:shadow-cute-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base whitespace-nowrap"
        >
          {isLoading ? '⏳' : <><span className="hidden sm:inline">🔗 添加</span><span className="sm:hidden">🔗</span></>}
        </button>
      </div>

      <div className="flex gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-cute-xs text-gray-500">
        <span>💡</span>
        <span className="hidden sm:inline">提示: 支持網頁、文章、視頻等鏈接</span>
        <span className="sm:hidden">支持網頁、文章、視頻等</span>
      </div>
    </div>
  )
}
