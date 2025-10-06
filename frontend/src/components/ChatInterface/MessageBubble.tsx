import { Message } from '../../types/message'

interface MessageBubbleProps {
  message: Message
  assistantEmoji?: string
  assistantColor?: string
}

export default function MessageBubble({ message, assistantEmoji, assistantColor }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isUser && (
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 shadow-cute"
          style={{
            background: assistantColor
              ? `linear-gradient(135deg, ${assistantColor}, ${assistantColor}dd)`
              : '#E8F4F8'
          }}
        >
          {assistantEmoji || '🤖'}
        </div>
      )}

      <div className={`flex-1 max-w-3xl ${isUser ? 'flex justify-end' : ''}`}>
        {/* Message Content */}
        <div
          className={`
            rounded-cute p-4 shadow-cute animate-fade-in
            ${isUser
              ? 'bg-gradient-to-br from-candy-pink to-candy-purple text-white'
              : 'bg-white/90 backdrop-blur-sm text-gray-700'
            }
          `}
        >
          {/* Files Preview */}
          {message.files && message.files.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.files.map((file) => (
                <div key={file.id}>
                  {file.type === 'image' && file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="max-w-full rounded-lg shadow-cute"
                    />
                  ) : (
                    <div className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
                      <span className="text-2xl">
                        {file.type === 'document' ? '📄' : '📁'}
                      </span>
                      <span className="text-cute-sm">{file.file.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Links Preview */}
          {message.links && message.links.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    flex items-center gap-2 rounded-lg p-2 transition-all duration-300
                    ${isUser
                      ? 'bg-white/20 hover:bg-white/30'
                      : 'bg-healing-gentle hover:bg-candy-blue/20'
                    }
                  `}
                >
                  <span className="text-xl">🔗</span>
                  <span className="text-cute-sm truncate">
                    {link.title || link.url}
                  </span>
                </a>
              ))}
            </div>
          )}

          {/* Text Content */}
          {message.content && (
            <p className="text-cute-base whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Loading Indicator */}
          {message.isLoading && (
            <div className="flex gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className={`text-cute-xs text-gray-400 mt-1 px-2 ${isUser ? 'text-right' : ''}`}>
          {message.timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br from-candy-blue to-candy-purple shadow-cute">
          👤
        </div>
      )}
    </div>
  )
}
