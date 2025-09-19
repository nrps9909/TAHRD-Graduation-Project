import { memo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useVirtualScroll } from '@/hooks/usePerformance'

interface ChatMessage {
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  files?: Array<{
    filename: string
    created: boolean
  }>
}

interface VirtualChatListProps {
  messages: ChatMessage[]
  containerHeight: number
  messageHeight?: number
}

const ChatMessageItem = memo(
  ({ message, index }: { message: ChatMessage; index: number }) => {
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className={`mb-4 ${
          message.type === 'user' ? 'flex justify-end' : 'flex justify-start'
        }`}
        style={{ minHeight: '60px' }}
      >
        <div
          className={`max-w-[80%] ${
            message.type === 'user'
              ? 'bg-gradient-to-r from-cat-pink to-cat-purple text-white'
              : message.type === 'system'
                ? 'bg-gray-100 text-gray-700'
                : 'bg-white border border-gray-200'
          } rounded-2xl px-4 py-3 shadow-sm`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">
              {message.type === 'user'
                ? '😺'
                : message.type === 'system'
                  ? '⚙️'
                  : '🤖'}
            </span>
            <div className="flex-1">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                  {message.content}
                </pre>
              </div>
              {message.files && message.files.length > 0 && (
                <div className="mt-2 text-xs opacity-70">
                  📁 創建了 {message.files.filter(f => f.created).length} 個文件
                </div>
              )}
              <div className="text-xs opacity-50 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }
)

ChatMessageItem.displayName = 'ChatMessageItem'

const VirtualChatList = memo(
  ({
    messages,
    containerHeight,
    messageHeight = 100,
  }: VirtualChatListProps) => {
    const containerRef = useRef<HTMLDivElement>(null)

    const { visibleItems, totalHeight, offsetY, handleScroll, startIndex } =
      useVirtualScroll(
        messages,
        messageHeight,
        containerHeight,
        3 // overscan
      )

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
      }
    }, [messages.length])

    return (
      <div
        ref={containerRef}
        className="h-full overflow-y-auto smooth-scroll virtual-scroll"
        onScroll={handleScroll}
        style={{ height: containerHeight }}
      >
        <div
          style={{
            height: totalHeight,
            position: 'relative',
          }}
        >
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.map((message, index) => (
              <div key={startIndex + index} className="virtual-scroll-item">
                <ChatMessageItem message={message} index={startIndex + index} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
)

VirtualChatList.displayName = 'VirtualChatList'

export default VirtualChatList
