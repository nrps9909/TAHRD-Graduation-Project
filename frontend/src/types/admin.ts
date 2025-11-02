/**
 * 管理員系統類型定義
 */

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface AdminUserSummary {
  id: string
  username: string
  email: string
  role: UserRole
  displayName?: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
  memoriesCount: number
  islandsCount: number
}

export interface AdminUsersResponse {
  users: AdminUserSummary[]
  total: number
  hasMore: boolean
}

export interface AdminUserDetail {
  user: {
    id: string
    username: string
    email: string
    role: UserRole
    displayName?: string
    isActive: boolean
    lastLogin?: string
    createdAt: string
  }
  memoriesCount: number
  islandsCount: number
  chatSessionsCount: number
  totalChatsCount: number
  accountAge: number
  activeIslands: Array<{
    id: string
    nameChinese: string
    emoji: string
    color: string
    memoryCount: number
  }>
  recentMemories: Array<{
    id: string
    title?: string
    emoji?: string
    rawContent: string
    createdAt: string
    island?: {
      nameChinese: string
      emoji: string
    }
  }>
}

export interface IslandMemoryCount {
  islandId: string
  islandName: string
  islandEmoji: string
  count: number
}

export interface DateCount {
  date: string
  count: number
}

export interface TagCount {
  tag: string
  count: number
}

export interface AdminUserStats {
  userId: string
  username: string
  memoriesByIsland: IslandMemoryCount[]
  memoriesOverTime: DateCount[]
  topTags: TagCount[]
  activityScore: number
  averageMemoryImportance: number
}

export interface AdminSystemStats {
  totalUsers: number
  totalMemories: number
  totalIslands: number
  totalChatSessions: number
  activeUsersToday: number
  activeUsersThisWeek: number
  activeUsersThisMonth: number
  memoriesCreatedToday: number
  memoriesCreatedThisWeek: number
  memoriesCreatedThisMonth: number
  averageMemoriesPerUser: number
  averageIslandsPerUser: number
}
