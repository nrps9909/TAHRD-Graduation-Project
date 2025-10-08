# 聊天記錄持久化系統 - ChatGPT 風格實現

## 📋 概述

實現了類似 ChatGPT 的聊天會話管理系統，所有對話記錄跟著用戶賬號走，支持會話列表、會話切換、歷史記錄查看等功能。

## 🏗️ 架構設計

### 數據模型

```
User (用戶)
  └── ChatSession (聊天會話) [1:N]
       └── ChatMessage (聊天消息) [1:N]
```

#### ChatSession 模型
```prisma
model ChatSession {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String   @map("user_id") @db.ObjectId
  assistantId      String   @map("assistant_id") @db.ObjectId

  // 會話信息
  title            String   @default("新對話")

  // 元數據
  messageCount     Int      @default(0)
  totalTokens      Int      @default(0)

  // 狀態
  isArchived       Boolean  @default(false)
  isPinned         Boolean  @default(false)

  // 時間戳
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  lastMessageAt    DateTime @default(now())
  archivedAt       DateTime?

  // 關聯
  user             User     @relation(fields: [userId], references: [id])
  assistant        Assistant @relation(fields: [assistantId], references: [id])
  messages         ChatMessage[]
}
```

#### ChatMessage 更新
```prisma
model ChatMessage {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String   @map("user_id") @db.ObjectId
  assistantId      String   @map("assistant_id") @db.ObjectId
  sessionId        String   @map("session_id") @db.ObjectId  // 新增：關聯到會話

  // ... 其他字段

  session          ChatSession @relation(fields: [sessionId], references: [id])
}
```

## 🔌 GraphQL API

### Queries

```graphql
type Query {
  # 獲取會話列表 (按更新時間倒序)
  chatSessions(
    assistantId: ID
    includeArchived: Boolean = false
    limit: Int = 50
  ): [ChatSession!]!

  # 獲取單個會話詳情 (包含所有消息)
  chatSession(id: ID!): ChatSession

  # 舊的聊天歷史查詢 (保持向後兼容)
  chatHistory(assistantId: ID, limit: Int = 50): [ChatMessage!]!
  chatMessage(id: ID!): ChatMessage
}
```

### Mutations

```graphql
type Mutation {
  # 創建新會話
  createChatSession(input: CreateChatSessionInput!): ChatSession!

  # 更新會話 (標題、置頂、歸檔狀態)
  updateChatSession(id: ID!, input: UpdateChatSessionInput!): ChatSession!

  # 刪除會話
  deleteChatSession(id: ID!): Boolean!

  # 歸檔/取消歸檔會話
  archiveChatSession(id: ID!): ChatSession!
  unarchiveChatSession(id: ID!): ChatSession!

  # 發送消息 (自動創建或加入會話)
  chatWithAssistant(input: ChatWithAssistantInput!): ChatMessage!
}
```

### Input Types

```graphql
input CreateChatSessionInput {
  assistantId: ID!
  title: String  # 可選，默認為"新對話"
}

input UpdateChatSessionInput {
  title: String
  isPinned: Boolean
  isArchived: Boolean
}

input ChatWithAssistantInput {
  assistantId: ID!
  sessionId: ID       # 可選：如果為空，自動創建新會話
  message: String!
  contextType: ChatContextType = GENERAL_CHAT
  memoryId: ID
}
```

## 📁 文件結構

```
backend/
├── prisma/
│   └── schema.prisma          # 數據庫模型定義
├── src/
│   ├── schema.ts             # GraphQL Schema定義
│   ├── resolvers/
│   │   ├── chatSessionResolvers.ts  # 會話相關的 resolvers (待創建)
│   │   └── memoryResolvers.ts       # 需要更新以支持sessionId
│   └── services/
│       ├── chatSessionService.ts    # 會話業務邏輯 (待創建)
│       └── chiefAgentService.ts     # 需要更新以支持sessionId
```

## 🔨 待完成任務

### 1. 創建 Chat Session Service
```typescript
// src/services/chatSessionService.ts
export class ChatSessionService {
  async createSession(userId: string, assistantId: string, title?: string)
  async getSession(sessionId: string, userId: string)
  async getSessions(userId: string, filters: {...})
  async updateSession(sessionId: string, userId: string, data: {...})
  async deleteSession(sessionId: string, userId: string)
  async archiveSession(sessionId: string, userId: string)
  async unarchiveSession(sessionId: string, userId: string)
  async incrementMessageCount(sessionId: string)
  async updateLastMessageAt(sessionId: string)
  async autoGenerateTitle(sessionId: string, firstMessage: string)
}
```

### 2. 創建 Chat Session Resolvers
```typescript
// src/resolvers/chatSessionResolvers.ts
export const chatSessionResolvers = {
  Query: {
    chatSessions: async (_, args, { userId, prisma }) => {...}
    chatSession: async (_, { id }, { userId, prisma }) => {...}
  },

  Mutation: {
    createChatSession: async (_, { input }, { userId }) => {...}
    updateChatSession: async (_, { id, input }, { userId }) => {...}
    deleteChatSession: async (_, { id }, { userId }) => {...}
    archiveChatSession: async (_, { id }, { userId }) => {...}
    unarchiveChatSession: async (_, { id }, { userId }) => {...}
  },

  ChatSession: {
    user: async (parent, _, { prisma }) => {...}
    assistant: async (parent, _, { prisma }) => {...}
    messages: async (parent, _, { prisma }) => {...}
  }
}
```

### 3. 更新現有代碼

#### chiefAgentService.ts (2處需要修改)

**Line 215** - processAndCreateMemory 方法:
```typescript
// 需要先創建或獲取會話
const session = await chatSessionService.getOrCreateSession(
  userId,
  assistantId,
  ChatContextType.MEMORY_CREATION
)

const chatMessage = await prisma.chatMessage.create({
  data: {
    userId,
    assistantId,
    sessionId: session.id,  // 添加這行
    userMessage: content,
    assistantResponse: parsed.response || '我已經幫你記下了！',
    memoryId: memory.id,
    contextType
  }
})
```

**Line 430** - chatWithChief 方法:
```typescript
// 同樣需要先創建或獲取會話
const session = await chatSessionService.getOrCreateSession(
  userId,
  chief.id,
  ChatContextType.GENERAL_CHAT
)

const chatMessage = await prisma.chatMessage.create({
  data: {
    userId,
    assistantId: chief.id,
    sessionId: session.id,  // 添加這行
    userMessage: message,
    assistantResponse: response,
    contextType: ChatContextType.GENERAL_CHAT
  }
})
```

#### memoryResolvers.ts - chatWithAssistant mutation

需要支持新的 `sessionId` 參數:

```typescript
chatWithAssistant: async (_, { input }, { userId, prisma }) => {
  // ... 驗證

  // 獲取或創建會話
  let session
  if (input.sessionId) {
    session = await chatSessionService.getSession(input.sessionId, userId)
  } else {
    session = await chatSessionService.createSession(userId, input.assistantId)
  }

  // 如果是 Chief，使用特殊處理
  if (assistant.type === AssistantType.CHIEF) {
    return await chiefAgentService.chatWithChief(userId, input.message, session.id)
  }

  // 創建聊天消息
  const chatMessage = await prisma.chatMessage.create({
    data: {
      userId,
      assistantId: input.assistantId,
      sessionId: session.id,  // 使用會話ID
      userMessage: input.message,
      assistantResponse: '此功能即將推出',
      contextType: input.contextType || ChatContextType.GENERAL_CHAT,
      memoryId: input.memoryId
    },
    include: {
      assistant: true,
      session: true,
      memory: true
    }
  })

  // 更新會話統計
  await chatSessionService.incrementMessageCount(session.id)
  await chatSessionService.updateLastMessageAt(session.id)

  return chatMessage
}
```

## 🎨 前端使用示例

### 1. 獲取會話列表

```typescript
const GET_CHAT_SESSIONS = gql`
  query GetChatSessions($assistantId: ID) {
    chatSessions(assistantId: $assistantId, includeArchived: false, limit: 50) {
      id
      title
      messageCount
      totalTokens
      isPinned
      isArchived
      createdAt
      updatedAt
      lastMessageAt
      assistant {
        id
        name
        emoji
      }
    }
  }
`

// 使用
const { data } = useQuery(GET_CHAT_SESSIONS, {
  variables: { assistantId: 'white-cat-id' }
})
```

### 2. 創建新會話並發送消息

```typescript
const CREATE_CHAT_SESSION = gql`
  mutation CreateChatSession($input: CreateChatSessionInput!) {
    createChatSession(input: $input) {
      id
      title
      createdAt
    }
  }
`

const CHAT_WITH_ASSISTANT = gql`
  mutation ChatWithAssistant($input: ChatWithAssistantInput!) {
    chatWithAssistant(input: $input) {
      id
      userMessage
      assistantResponse
      createdAt
      session {
        id
        title
      }
    }
  }
`

// 創建新會話
const { data: sessionData } = await createSession({
  variables: {
    input: {
      assistantId: 'white-cat-id',
      title: '與白噗噗的對話'
    }
  }
})

// 發送消息
const { data: messageData } = await chatWithAssistant({
  variables: {
    input: {
      assistantId: 'white-cat-id',
      sessionId: sessionData.createChatSession.id,
      message: '你好！'
    }
  }
})
```

### 3. 獲取會話詳情 (包含所有消息)

```typescript
const GET_CHAT_SESSION = gql`
  query GetChatSession($id: ID!) {
    chatSession(id: $id) {
      id
      title
      messageCount
      isPinned
      isArchived
      createdAt
      updatedAt
      lastMessageAt
      messages {
        id
        userMessage
        assistantResponse
        createdAt
        tokenCount
        processingTime
      }
      assistant {
        id
        name
        emoji
      }
    }
  }
`

const { data } = useQuery(GET_CHAT_SESSION, {
  variables: { id: sessionId }
})
```

### 4. 更新會話標題

```typescript
const UPDATE_CHAT_SESSION = gql`
  mutation UpdateChatSession($id: ID!, $input: UpdateChatSessionInput!) {
    updateChatSession(id: $id, input: $input) {
      id
      title
      isPinned
      isArchived
    }
  }
`

// 使用
await updateSession({
  variables: {
    id: sessionId,
    input: {
      title: '與白噗噗討論程式設計'
    }
  }
})
```

## 🚀 優勢特性

1. **完整的會話管理**: 類似 ChatGPT，所有對話都組織在會話中
2. **自動標題生成**: 根據首條消息自動生成有意義的標題
3. **會話置頂**: 重要對話可以置頂
4. **會話歸檔**: 舊對話可以歸檔，保持列表整潔
5. **統計信息**: 追蹤消息數量、Token使用量
6. **時間戳**: 記錄創建、更新、最後消息時間
7. **跨助手支持**: 每個AI助手都有獨立的會話列表
8. **向後兼容**: 保留舊的 `chatHistory` API

## 📊 數據庫索引優化

```prisma
@@index([userId, updatedAt(sort: Desc)])      // 獲取用戶會話列表
@@index([userId, assistantId])                // 按助手過濾
@@index([userId, isPinned, updatedAt(sort: Desc)])  // 置頂會話優先
@@index([sessionId, createdAt])              // 獲取會話消息
```

## 🔍 後續優化建議

1. **搜索功能**: 跨會話搜索消息內容
2. **會話分享**: 生成分享鏈接
3. **會話導出**: 導出為 Markdown/JSON
4. **會話合併**: 合併多個相關會話
5. **智能標題**: 使用 AI 生成更好的標題
6. **會話標籤**: 為會話添加標籤分類
7. **會話統計**: 每個會話的詳細統計數據

## ✅ 當前狀態

- [x] Prisma Schema 更新
- [x] GraphQL Schema 更新
- [x] Prisma Client 生成
- [ ] Chat Session Service (待創建)
- [ ] Chat Session Resolvers (待創建)
- [ ] 更新現有代碼修復 TypeScript 錯誤
- [ ] 前端集成
- [ ] 測試

## 🐛 當前問題

TypeScript 編譯錯誤（需要修復）:
```
src/services/chiefAgentService.ts(215,9): error TS2322
src/services/chiefAgentService.ts(430,9): error TS2322
```

原因: `ChatMessage.create()` 現在需要 `sessionId` 字段，但現有代碼沒有提供。

解決方案: 在創建 ChatMessage 之前，先創建或獲取對應的 ChatSession。
