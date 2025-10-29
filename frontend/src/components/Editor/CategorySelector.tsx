/**
 * Category Selector - Island Selection Component
 * Categories use Islands as the primary classification method.
 */

import { memo } from 'react'

export interface CategorySelectorProps {
  emptyMessage?: string
}

/**
 * Category Selector Component
 * Allows users to select an island category for their memories.
 */
const CategorySelector = memo(({
  emptyMessage = '分類系統已簡化為僅使用島嶼'
}: CategorySelectorProps) => {
  return (
    <div className="text-sm text-gray-500 py-2">
      {emptyMessage}
    </div>
  )
})

CategorySelector.displayName = 'CategorySelector'

export default CategorySelector
