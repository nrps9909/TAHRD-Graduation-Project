import { Z_INDEX_CLASSES } from '../constants/zIndex'

interface BulkActionsBarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onBulkDelete: () => void
  onBulkArchive: () => void
  style?: 'cute' | 'modern'
}

export default function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkArchive,
  style = 'modern',
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  // Cute style
  if (style === 'cute') {
    return (
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 ${Z_INDEX_CLASSES.BULK_ACTIONS} animate-slide-up`}
        style={{
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        <div
          className="flex items-center gap-3 px-6 py-4 rounded-2xl backdrop-blur-md shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 245, 240, 0.95))',
            border: '2px solid #FFE5F0',
          }}
        >
          {/* Selected count */}
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
              }}
            >
              <span className="text-white font-bold">{selectedCount}</span>
            </div>
            <span className="text-sm font-bold" style={{ color: '#666' }}>
              已選擇 {selectedCount}/{totalCount}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-8" style={{ background: '#FFE5F0' }} />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={selectedCount === totalCount ? onDeselectAll : onSelectAll}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{
                background: 'white',
                border: '2px solid #FFE5F0',
                color: '#FF8FB3',
              }}
            >
              {selectedCount === totalCount ? '✕ 取消全選' : '✓ 全選'}
            </button>

            <button
              onClick={onBulkArchive}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #FFFACD, #FFE97F)',
                border: '2px solid #FFE97F',
                color: '#666',
              }}
            >
              📦 封存 ({selectedCount})
            </button>

            <button
              onClick={onBulkDelete}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #FFB3B3, #FF8F8F)',
                border: '2px solid #FF8F8F',
              }}
            >
              🗑️ 刪除 ({selectedCount})
            </button>
          </div>
        </div>

        <style>{`
          @keyframes slideUp {
            from {
              transform: translate(-50%, 100%);
              opacity: 0;
            }
            to {
              transform: translate(-50%, 0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    )
  }

  // Modern style
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 ${Z_INDEX_CLASSES.BULK_ACTIONS} animate-slide-up-modern`}>
      <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-xl shadow-2xl border border-gray-200">
        {/* Selected count */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">{selectedCount}</span>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            已選擇 {selectedCount}/{totalCount} 項
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={selectedCount === totalCount ? onDeselectAll : onSelectAll}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
          >
            {selectedCount === totalCount ? '取消全選' : '全選'}
          </button>

          <button
            onClick={onBulkArchive}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
            封存 ({selectedCount})
          </button>

          <button
            onClick={onBulkDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            刪除 ({selectedCount})
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up-modern {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .animate-slide-up-modern {
          animation: slide-up-modern 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
