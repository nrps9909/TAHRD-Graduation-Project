import { memo, useState, useCallback } from 'react'

export interface TagManagerProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
}

/**
 * 標籤管理組件
 * 提供標籤的添加、刪除功能
 */
const TagManager = memo(({
  tags,
  onTagsChange,
  placeholder = '+ 新增標籤',
  maxTags
}: TagManagerProps) => {
  const [newTag, setNewTag] = useState('')

  const handleAddTag = useCallback(() => {
    const trimmedTag = newTag.trim()

    if (!trimmedTag) return
    if (tags.includes(trimmedTag)) {
      setNewTag('')
      return
    }
    if (maxTags && tags.length >= maxTags) {
      alert(`最多只能添加 ${maxTags} 個標籤`)
      return
    }

    onTagsChange([...tags, trimmedTag])
    setNewTag('')
  }, [newTag, tags, onTagsChange, maxTags])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }, [tags, onTagsChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === 'Escape') {
      setNewTag('')
    }
  }, [handleAddTag])

  const handleBlur = useCallback(() => {
    handleAddTag()
  }, [handleAddTag])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors group"
        >
          #{tag}
          <button
            onClick={() => handleRemoveTag(tag)}
            className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
            aria-label={`移除標籤 ${tag}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={newTag}
        onChange={(e) => setNewTag(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="px-2 py-1 text-xs bg-transparent border border-dashed border-gray-700 rounded-md hover:border-gray-600 focus:border-gray-500 focus:outline-none transition-colors text-gray-400"
        style={{ width: '100px' }}
        aria-label="添加新標籤"
      />
    </div>
  )
})

TagManager.displayName = 'TagManager'

export default TagManager
