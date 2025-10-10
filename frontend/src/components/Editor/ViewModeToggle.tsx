import { memo } from 'react'

export type ViewMode = 'edit' | 'preview' | 'split'

export interface ViewModeToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

/**
 * 視圖模式切換器組件
 * 提供編輯、預覽、同時顯示三種模式的切換
 */
const ViewModeToggle = memo(({
  viewMode,
  onViewModeChange
}: ViewModeToggleProps) => {
  const modes: Array<{ mode: ViewMode; label: string; title: string; icon: JSX.Element }> = [
    {
      mode: 'edit',
      label: '編輯',
      title: '編輯模式',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      mode: 'split',
      label: '同時',
      title: '同時顯示編輯和預覽',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v14a2 2 0 002 2h4m10-1V5a2 2 0 00-2-2h-4m5 0v18" />
        </svg>
      )
    },
    {
      mode: 'preview',
      label: '檢視',
      title: '預覽模式',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    }
  ]

  return (
    <div className="flex items-center bg-gray-700 rounded p-0.5">
      {modes.map(({ mode, label, title, icon }) => {
        const isActive = viewMode === mode

        return (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              isActive
                ? 'bg-gray-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
            title={title}
            aria-label={title}
            aria-pressed={isActive}
          >
            {icon}
            {label}
          </button>
        )
      })}
    </div>
  )
})

ViewModeToggle.displayName = 'ViewModeToggle'

export default ViewModeToggle
