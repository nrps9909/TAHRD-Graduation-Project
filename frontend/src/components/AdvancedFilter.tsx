import { useState } from 'react'

export interface FilterOptions {
  dateRange?: {
    start: string | null
    end: string | null
  }
  importanceRange?: {
    min: number
    max: number
  }
  selectedTags?: string[]
}

interface AdvancedFilterProps {
  allTags: string[]
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  onReset: () => void
  style?: 'cute' | 'modern'
}

export default function AdvancedFilter({
  allTags,
  filters,
  onFiltersChange,
  onReset,
  style = 'modern',
}: AdvancedFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        start: type === 'start' ? value || null : filters.dateRange?.start || null,
        end: type === 'end' ? value || null : filters.dateRange?.end || null,
      },
    })
  }

  const handleImportanceChange = (type: 'min' | 'max', value: number) => {
    onFiltersChange({
      ...filters,
      importanceRange: {
        min: type === 'min' ? value : filters.importanceRange?.min || 0,
        max: type === 'max' ? value : filters.importanceRange?.max || 10,
      },
    })
  }

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.selectedTags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag]
    onFiltersChange({
      ...filters,
      selectedTags: newTags.length > 0 ? newTags : undefined,
    })
  }

  const hasActiveFilters =
    filters.dateRange?.start ||
    filters.dateRange?.end ||
    filters.importanceRange ||
    (filters.selectedTags && filters.selectedTags.length > 0)

  // Cute style
  if (style === 'cute') {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'white',
          border: '2px solid #FFE5F0',
        }}
      >
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between transition-colors hover:bg-pink-50"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <span className="font-bold" style={{ color: '#FF8FB3' }}>
              進階篩選
            </span>
            {hasActiveFilters && (
              <span
                className="px-2 py-0.5 text-xs font-bold rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                  color: 'white',
                }}
              >
                {(filters.selectedTags?.length || 0) +
                  (filters.dateRange?.start || filters.dateRange?.end ? 1 : 0) +
                  (filters.importanceRange ? 1 : 0)}
              </span>
            )}
          </div>
          <span className="text-xl" style={{ color: '#FF8FB3' }}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </button>

        {/* Content */}
        {isExpanded && (
          <div
            className="px-4 pb-4 pt-2 space-y-4"
            style={{ borderTop: '2px solid #FFE5F0' }}
          >
            {/* Date Range */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#FF8FB3' }}>
                📅 日期範圍
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-xl focus:outline-none"
                  style={{
                    border: '2px solid #FFE5F0',
                    color: '#666',
                  }}
                />
                <span className="flex items-center" style={{ color: '#999' }}>
                  ~
                </span>
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-xl focus:outline-none"
                  style={{
                    border: '2px solid #FFE5F0',
                    color: '#666',
                  }}
                />
              </div>
            </div>

            {/* Importance Range */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#FF8FB3' }}>
                ⭐ 重要度範圍
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={filters.importanceRange?.min ?? 0}
                  onChange={(e) => handleImportanceChange('min', parseInt(e.target.value))}
                  className="w-20 px-3 py-2 text-sm rounded-xl focus:outline-none"
                  style={{
                    border: '2px solid #FFE5F0',
                    color: '#666',
                  }}
                />
                <div className="flex-1 h-2 rounded-full" style={{ background: '#FFE5F0' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                      width: `${((filters.importanceRange?.max ?? 10) - (filters.importanceRange?.min ?? 0)) * 10}%`,
                      marginLeft: `${(filters.importanceRange?.min ?? 0) * 10}%`,
                    }}
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={filters.importanceRange?.max ?? 10}
                  onChange={(e) => handleImportanceChange('max', parseInt(e.target.value))}
                  className="w-20 px-3 py-2 text-sm rounded-xl focus:outline-none"
                  style={{
                    border: '2px solid #FFE5F0',
                    color: '#666',
                  }}
                />
              </div>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#FF8FB3' }}>
                  🏷️ 標籤篩選
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const isSelected = filters.selectedTags?.includes(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className="px-3 py-1.5 text-sm font-medium rounded-xl transition-all hover:scale-105"
                        style={
                          isSelected
                            ? {
                                background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                                color: 'white',
                                border: '2px solid #FF8FB3',
                              }
                            : {
                                background: 'white',
                                color: '#999',
                                border: '2px solid #FFE5F0',
                              }
                        }
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="w-full px-4 py-2 rounded-xl font-bold text-white transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #B3D9FF, #8FC5FF)',
                }}
              >
                🔄 重置篩選
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Modern style
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="font-semibold text-gray-900">進階篩選</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
              {(filters.selectedTags?.length || 0) +
                (filters.dateRange?.start || filters.dateRange?.end ? 1 : 0) +
                (filters.importanceRange ? 1 : 0)}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-gray-200">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">日期範圍</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="flex items-center text-gray-400">~</span>
              <input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Importance Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">重要度範圍</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="10"
                value={filters.importanceRange?.min ?? 0}
                onChange={(e) => handleImportanceChange('min', parseInt(e.target.value))}
                className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                  style={{
                    width: `${((filters.importanceRange?.max ?? 10) - (filters.importanceRange?.min ?? 0)) * 10}%`,
                    marginLeft: `${(filters.importanceRange?.min ?? 0) * 10}%`,
                  }}
                />
              </div>
              <input
                type="number"
                min="0"
                max="10"
                value={filters.importanceRange?.max ?? 10}
                onChange={(e) => handleImportanceChange('max', parseInt(e.target.value))}
                className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">標籤篩選</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const isSelected = filters.selectedTags?.includes(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              重置篩選
            </button>
          )}
        </div>
      )}
    </div>
  )
}
