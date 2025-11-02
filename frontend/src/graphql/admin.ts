import { gql } from '@apollo/client'

// 獲取所有用戶列表
export const GET_ALL_USERS = gql`
  query GetAllUsers($limit: Int, $offset: Int) {
    adminGetAllUsers(limit: $limit, offset: $offset) {
      users {
        id
        username
        email
        role
        displayName
        isActive
        lastLogin
        createdAt
        memoriesCount
        islandsCount
      }
      total
      hasMore
    }
  }
`

// 獲取用戶詳細資訊
export const GET_USER_DETAIL = gql`
  query GetUserDetail($userId: ID!) {
    adminGetUserById(userId: $userId) {
      user {
        id
        username
        email
        role
        displayName
        isActive
        lastLogin
        createdAt
      }
      memoriesCount
      islandsCount
      chatSessionsCount
      totalChatsCount
      accountAge
      activeIslands {
        id
        nameChinese
        emoji
        color
        memoryCount
      }
      recentMemories {
        id
        title
        emoji
        rawContent
        createdAt
        island {
          nameChinese
          emoji
        }
      }
    }
  }
`

// 獲取用戶統計資料
export const GET_USER_STATS = gql`
  query GetUserStats($userId: ID!) {
    adminGetUserStats(userId: $userId) {
      userId
      username
      memoriesByIsland {
        islandId
        islandName
        islandEmoji
        count
      }
      memoriesOverTime {
        date
        count
      }
      topTags {
        tag
        count
      }
      activityScore
      averageMemoryImportance
    }
  }
`

// 獲取系統整體統計
export const GET_SYSTEM_STATS = gql`
  query GetSystemStats {
    adminGetSystemStats {
      totalUsers
      totalMemories
      totalIslands
      totalChatSessions
      activeUsersToday
      activeUsersThisWeek
      activeUsersThisMonth
      memoriesCreatedToday
      memoriesCreatedThisWeek
      memoriesCreatedThisMonth
      averageMemoriesPerUser
      averageIslandsPerUser
    }
  }
`
