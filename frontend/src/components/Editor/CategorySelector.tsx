import { memo } from 'react'
import { Subcategory } from '../../graphql/category'

export interface CategorySelectorProps {
  subcategories: Subcategory[]
  selectedSubcategoryId: string | null
  onSelectSubcategory: (id: string | null) => void
  emptyMessage?: string
}

/**
 * 分類選擇器組件
 * 顯示可選擇的分類列表
 */
const CategorySelector = memo(({
  subcategories,
  selectedSubcategoryId,
  onSelectSubcategory,
  emptyMessage = '尚無自訂分類，請前往設定頁面建立分類'
}: CategorySelectorProps) => {
  const handleCategoryClick = (categoryId: string) => {
    // 如果點擊已選擇的分類，則取消選擇
    onSelectSubcategory(selectedSubcategoryId === categoryId ? null : categoryId)
  }

  if (subcategories.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {subcategories.map((cat) => {
        const isSelected = selectedSubcategoryId === cat.id

        return (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              background: isSelected ? cat.color : '#2a2a2a',
              color: isSelected ? '#ffffff' : '#999',
              border: `1.5px solid ${isSelected ? cat.color : '#3d3d3d'}`,
            }}
            aria-label={`選擇分類：${cat.nameChinese}`}
            aria-pressed={isSelected}
          >
            <span className="mr-1" aria-hidden="true">{cat.emoji}</span>
            {cat.nameChinese}
          </button>
        )
      })}
    </div>
  )
})

CategorySelector.displayName = 'CategorySelector'

export default CategorySelector
