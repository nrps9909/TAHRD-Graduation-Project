interface LinkData {
  id: string
  url: string
  title?: string
  preview?: string
}

interface LinkPreviewProps {
  links: LinkData[]
  onRemove: (id: string) => void
}

export default function LinkPreview({ links, onRemove }: LinkPreviewProps) {
  if (links.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {links.map((link) => (
        <div
          key={link.id}
          className="bg-white rounded-cute p-4 shadow-cute hover:shadow-cute-lg transition-all duration-300 group flex items-center justify-between"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">🔗</span>
            <div className="flex-1 min-w-0">
              <p className="text-cute-sm font-medium text-gray-800 truncate">
                {link.title || link.url}
              </p>
              <p className="text-cute-xs text-gray-500 truncate">
                {link.url}
              </p>
            </div>
          </div>

          <button
            onClick={() => onRemove(link.id)}
            className="ml-3 w-8 h-8 rounded-full bg-healing-sunset hover:bg-candy-pink text-white font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 flex-shrink-0"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
