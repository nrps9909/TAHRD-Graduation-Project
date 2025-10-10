import { memo } from 'react'

export interface SaveStatusIndicatorProps {
  isSaving: boolean
  saveError: string | null
  hasUnsavedChanges: boolean
  lastSaved: Date | null
  onRetry?: () => void
  showForMemoryId?: boolean
}

/**
 * 保存狀態指示器組件
 * 顯示當前的保存狀態：儲存中、錯誤、未保存、已保存等
 */
const SaveStatusIndicator = memo(({
  isSaving,
  saveError,
  hasUnsavedChanges,
  lastSaved,
  onRetry,
  showForMemoryId = true
}: SaveStatusIndicatorProps) => {
  // 如果不需要顯示（例如新建記憶還沒有 ID）
  if (!showForMemoryId) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-xs ml-4">
      {isSaving ? (
        <>
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-yellow-400 font-medium">儲存中...</span>
        </>
      ) : saveError ? (
        <>
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-red-400 font-medium">{saveError}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-1 px-2 py-0.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
              aria-label="重試保存"
            >
              重試
            </button>
          )}
        </>
      ) : hasUnsavedChanges ? (
        <>
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-gray-400 font-medium">未保存</span>
        </>
      ) : lastSaved ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-400 font-medium">
            已保存 {new Date(lastSaved).toLocaleTimeString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-gray-400 font-medium">自動儲存</span>
        </>
      )}
    </div>
  )
})

SaveStatusIndicator.displayName = 'SaveStatusIndicator'

export default SaveStatusIndicator
