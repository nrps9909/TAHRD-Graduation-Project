import { Memory, MemoryCategory } from '../types/memory'
import { Z_INDEX_CLASSES } from '../constants/zIndex'

// 分類資訊對應
const CATEGORY_INFO: Record<MemoryCategory, { name: string; emoji: string; color: string }> = {
  LEARNING: { name: '學習筆記', emoji: '📚', color: '#4A90E2' },
  INSPIRATION: { name: '靈感創意', emoji: '💡', color: '#F5A623' },
  WORK: { name: '工作事務', emoji: '💼', color: '#7B68EE' },
  SOCIAL: { name: '人際關係', emoji: '👥', color: '#FF6B9D' },
  LIFE: { name: '生活記錄', emoji: '🌱', color: '#50C878' },
  GOALS: { name: '目標規劃', emoji: '🎯', color: '#FF6347' },
  RESOURCES: { name: '資源收藏', emoji: '📦', color: '#9370DB' },
}

interface MemoryPreviewCardProps {
  memory: Memory
  position: { x: number; y: number }
  style?: 'cute' | 'modern'
}

export default function MemoryPreviewCard({
  memory,
  position,
  style = 'modern',
}: MemoryPreviewCardProps) {
  // Cute style
  if (style === 'cute') {
    return (
      <div
        className={`fixed ${Z_INDEX_CLASSES.TOOLTIP} pointer-events-none animate-fade-in`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          maxWidth: '400px',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <div
          className="rounded-2xl p-5 shadow-2xl backdrop-blur-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 245, 240, 0.98))',
            border: '2px solid #FFE5F0',
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <span className="text-4xl flex-shrink-0">{memory.emoji}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg line-clamp-2 mb-1" style={{ color: '#FF8FB3' }}>
                {memory.title || memory.summary || '無標題'}
              </h3>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#999' }}>
                <span>
                  {new Date(memory.createdAt).toLocaleDateString('zh-TW', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          {memory.summary && (
            <p className="text-sm leading-relaxed mb-3 line-clamp-3" style={{ color: '#666' }}>
              {memory.summary}
            </p>
          )}

          {/* Category */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {memory.category && CATEGORY_INFO[memory.category] && (
              <span
                className="px-2 py-1 text-xs font-medium rounded-lg"
                style={{
                  background: `${CATEGORY_INFO[memory.category].color}15`,
                  color: CATEGORY_INFO[memory.category].color,
                  border: `1px solid ${CATEGORY_INFO[memory.category].color}30`,
                }}
              >
                {CATEGORY_INFO[memory.category].emoji} {CATEGORY_INFO[memory.category].name}
              </span>
            )}
          </div>

          {/* Tags */}
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {memory.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs font-medium rounded-lg"
                  style={{
                    background: '#FFFACD',
                    color: '#FF8FB3',
                  }}
                >
                  {tag}
                </span>
              ))}
              {memory.tags.length > 5 && (
                <span className="text-xs px-1" style={{ color: '#999' }}>
                  +{memory.tags.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Content Preview */}
          <p className="text-xs leading-relaxed line-clamp-4" style={{ color: '#999' }}>
            {memory.rawContent}
          </p>

          {/* Footer hint */}
          <div className="mt-3 pt-3 border-t text-xs text-center" style={{ borderColor: '#FFE5F0', color: '#999' }}>
            點擊查看完整內容
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    )
  }

  // Modern style
  return (
    <div
      className={`fixed ${Z_INDEX_CLASSES.TOOLTIP} pointer-events-none animate-fade-in-modern`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        maxWidth: '400px',
      }}
    >
      <div className="bg-white rounded-xl p-5 shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-4xl flex-shrink-0">{memory.emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 mb-1">
              {memory.title || memory.summary || '無標題'}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                {new Date(memory.createdAt).toLocaleDateString('zh-TW', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        {memory.summary && (
          <p className="text-sm text-gray-700 leading-relaxed mb-3 line-clamp-3">
            {memory.summary}
          </p>
        )}

        {/* Category */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {memory.category && CATEGORY_INFO[memory.category] && (
            <span
              className="px-2 py-1 text-xs font-medium rounded"
              style={{
                background: `${CATEGORY_INFO[memory.category].color}15`,
                color: CATEGORY_INFO[memory.category].color,
              }}
            >
              {CATEGORY_INFO[memory.category].emoji} {CATEGORY_INFO[memory.category].name}
            </span>
          )}
        </div>

        {/* Tags */}
        {memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {memory.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
            {memory.tags.length > 5 && (
              <span className="text-xs text-gray-400">
                +{memory.tags.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Content Preview */}
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-4">
          {memory.rawContent}
        </p>

        {/* Footer hint */}
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-center text-gray-400">
          點擊查看完整內容
        </div>
      </div>

      <style>{`
        @keyframes fade-in-modern {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-modern {
          animation: fade-in-modern 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
