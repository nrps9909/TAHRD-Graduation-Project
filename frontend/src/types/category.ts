/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * The system has migrated from CategoryType to Island-based organization.
 * Please use Island types from types/island.ts instead.
 *
 * 此文件已棄用，將在未來版本中移除。
 * 系統已從 CategoryType 遷移到基於 Island 的組織方式。
 * 請改用 types/island.ts 中的 Island 類型。
 */

export type CategoryType =
  | 'LEARNING'
  | 'INSPIRATION'
  | 'WORK'
  | 'SOCIAL'
  | 'LIFE'
  | 'GOALS'
  | 'RESOURCES'
  | 'MISC'

/**
 * @deprecated Use Island configuration instead
 */
export const CATEGORY_INFO: Record<CategoryType, {
  name: string
  nameChinese: string
  emoji: string
  color: string
}> = {
  LEARNING: { name: 'Learning', nameChinese: '學習', emoji: '📚', color: '#3B82F6' },
  INSPIRATION: { name: 'Inspiration', nameChinese: '靈感', emoji: '💡', color: '#8B5CF6' },
  WORK: { name: 'Work', nameChinese: '工作', emoji: '💼', color: '#10B981' },
  SOCIAL: { name: 'Social', nameChinese: '社交', emoji: '🤝', color: '#F59E0B' },
  LIFE: { name: 'Life', nameChinese: '生活', emoji: '🏡', color: '#EC4899' },
  GOALS: { name: 'Goals', nameChinese: '目標', emoji: '🎯', color: '#EF4444' },
  RESOURCES: { name: 'Resources', nameChinese: '資源', emoji: '📦', color: '#06B6D4' },
  MISC: { name: 'Misc', nameChinese: '雜項', emoji: '🗂️', color: '#64748B' }
}
