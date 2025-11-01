# Assistant 系統完全移除指南

> **狀態**: Schema 已更新，部分 Service 已清理
> **目標**: 完全移除 Assistant 向後兼容代碼，只保留純 Island 系統

---

## ✅ 已完成的工作

### 1. Prisma Schema 清理 ✅
- ✅ Memory model: 移除 `assistantId`, 移除 `assistant` relation
- ✅ ChatSession model: 移除 `assistantId`, 移除 `assistant` relation
- ✅ ChatMessage model: 移除 `assistantId`, 移除 `assistant` relation
- ✅ Assistant model: 移除 `memories`, `chatSessions`, `chatMessages` relations
- ✅ 移除舊的 Assistant 相關索引
- ✅ 資料庫已同步 (`npx prisma db push`)

### 2. memoryService.ts 清理 ✅
- ✅ `MemoryFilterOptions`: 移除 `assistantId`
- ✅ `CreateMemoryInput`: 移除 `assistantId`, `islandId` 改為必填
- ✅ `createMemory`: 移除 assistant include
- ✅ `getMemories`: 移除 assistantId 過濾和 assistant include
- ✅ `getMemoryById`: 移除 assistant include

---

## 🔄 需要手動完成的清理

### 3. chiefAgentService.ts

**需要移除的代碼：**

```typescript
// ❌ 移除這些
import { assistantService } from './assistantService'

// Line 190, 398, 524, 756, 928 - getChiefAssistant() 調用
const chief = await assistantService.getChiefAssistant()

// Line 254 - getAssistantById()
const assistant = await assistantService.getAssistantById(assistantId)

// Line 339-340 - incrementAssistantStats()
await assistantService.incrementAssistantStats(assistantId, 'memory')
await assistantService.incrementAssistantStats(assistantId, 'chat')

// Line 369 - getAssistantByType()
const assistant = await assistantService.getAssistantByType(classification.suggestedCategory)

// Line 633 - incrementAssistantStats() for chief
await assistantService.incrementAssistantStats(chief.id, 'chat')

// Line 1394-1396 - getAssistantByType()
let assistant = await assistantService.getAssistantByType(primaryIsland.name as any)
```

**替換方案：**

1. **移除 Chief Assistant 概念**
   - Chief 只是用來做分類的，實際上可以用 Island 系統替代
   - 所有 `getChiefAssistant()` 調用都可以移除

2. **processAndCreateMemory 函數簽名修改**
   ```typescript
   // ❌ 舊的
   async processAndCreateMemory(
     userId: string,
     assistantId: string,  // 移除這個參數
     content: string,
     category: AssistantType,
     contextType: ChatContextType = ChatContextType.MEMORY_CREATION
   )

   // ✅ 新的
   async processAndCreateMemory(
     userId: string,
     islandId: string,  // 改用 islandId
     content: string,
     category: AssistantType,
     contextType: ChatContextType = ChatContextType.MEMORY_CREATION
   )
   ```

3. **移除統計更新**
   ```typescript
   // ❌ 移除 Assistant 統計
   await assistantService.incrementAssistantStats(assistantId, 'memory')

   // ✅ 只保留 Island 統計
   await islandService.incrementIslandStats(islandId, 'memory')
   ```

### 4. subAgentService.ts

**需要移除的代碼：**

```typescript
// ❌ 移除這些
import { assistantService } from './assistantService'

// Line 77, 149, 365 - getAssistantById()
const assistant = await assistantService.getAssistantById(assistantId)

// Line 211 - incrementAssistantStats()
await assistantService.incrementAssistantStats(assistantId, 'memory')

// Line 673-679 - getAssistantByType()
let primaryAssistant = await assistantService.getAssistantByType(primaryIsland.name as any)
if (!primaryAssistant) {
  primaryAssistant = await assistantService.getAssistantByType('LIFE')
}

// Line 746 - getAssistantById() for categoriesInfo
const assistant = await assistantService.getAssistantById(memory.assistantId)
```

**替換方案：**

1. **獲取 SystemPrompt**
   ```typescript
   // ❌ 舊的
   const assistant = await assistantService.getAssistantById(assistantId)
   const systemPrompt = assistant.systemPrompt

   // ✅ 新的
   const island = await islandService.getIslandById(islandId)
   const systemPrompt = await islandService.getSystemPrompt(islandId)
   ```

2. **移除 categoriesInfo 的 else 分支**
   ```typescript
   // ✅ 只保留 Island 邏輯
   const categoriesInfo = await Promise.all(
     memoriesCreated.map(async (memory) => {
       const island = await prisma.island.findUnique({
         where: { id: memory.islandId }
       })
       return {
         memoryId: memory.id,
         categoryName: island?.nameChinese || '未知分類',
         categoryEmoji: island?.emoji || '🏝️',
         islandName: island?.nameChinese
       }
     })
   )
   ```

3. **函數參數改為 islandId**
   ```typescript
   // ❌ 舊的
   async evaluateKnowledge(
     assistantId: string,
     distributionInput: DistributionInput
   )

   // ✅ 新的
   async evaluateKnowledge(
     islandId: string,
     distributionInput: DistributionInput
   )
   ```

### 5. tororoService.ts

**需要移除的代碼：**

```typescript
// ❌ 移除這些
import { assistantService } from './assistantService'

// Line 82-86
const assistant = await assistantService.getAssistantByType(classification.suggestedCategory)
if (!assistant) {
  throw new Error('無法找到對應的助手')
}

// Line 89-94 - processAndCreateMemory 調用
const result = await chiefAgentService.processAndCreateMemory(
  input.userId,
  assistant.id,  // 改為 islandId
  input.content,
  classification.suggestedCategory
)
```

**替換方案：**

```typescript
// ✅ 新的
const island = await islandService.getIslandByType(input.userId, classification.suggestedCategory)
if (!island) {
  throw new Error('無法找到對應的島嶼')
}

const result = await chiefAgentService.processAndCreateMemory(
  input.userId,
  island.id,  // 使用 islandId
  input.content,
  classification.suggestedCategory
)
```

### 6. chatSessionService.ts

**需要檢查和更新：**

```typescript
// 搜索所有 assistantId 參數
// 改為 islandId

// ❌ 舊的
async getOrCreateSession(userId: string, assistantId: string, contextType: ChatContextType)

// ✅ 新的
async getOrCreateSession(userId: string, islandId: string, contextType: ChatContextType)
```

### 7. memoryResolvers.ts

**需要移除的代碼：**

```typescript
// ❌ 移除 assistant resolver
assistant: async (parent: any, _: any, { prisma }: Context) => {
  if (!parent.assistantId) return null
  return prisma.assistant.findUnique({
    where: { id: parent.assistantId }
  })
}

// ❌ 移除 chatHistory 中的 assistant include
include: {
  assistant: true,  // 移除這行
  memory: true
}
```

### 8. 移除 assistantService.ts

```bash
rm backend/src/services/assistantService.ts
```

或者如果要保留 Chief 概念，只保留最小的功能：

```typescript
// 只保留 getChiefAssistant() 用於分類
export class AssistantService {
  async getChiefAssistant() {
    return await prisma.assistant.findFirst({
      where: { type: AssistantType.CHIEF }
    })
  }
}
```

### 9. 移除或標記 deprecated: assistantResolvers.ts

**選項 A: 完全移除**
```bash
rm backend/src/resolvers/assistantResolvers.ts
```

並從 `resolvers/index.ts` 移除引用。

**選項 B: 標記為 deprecated**
```typescript
export const assistantResolvers = {
  Query: {
    assistants: async () => {
      throw new Error('DEPRECATED: Use islands query instead')
    },
    assistant: async () => {
      throw new Error('DEPRECATED: Use island query instead')
    }
  }
}
```

### 10. 更新 resolvers/index.ts

```typescript
// ❌ 移除這些
import { assistantResolvers } from './assistantResolvers'

...assistantResolvers.Query,
...assistantResolvers.Mutation,
Assistant: assistantResolvers.Assistant,
```

---

## 🧪 測試檢查清單

完成所有清理後，執行以下測試：

### 1. TypeScript 編譯
```bash
npx tsc --noEmit
```
應該 0 錯誤。

### 2. 搜索剩餘的 Assistant 引用
```bash
# 搜索 assistantService 使用
grep -r "assistantService" src/ --include="*.ts" | grep -v "node_modules"

# 搜索 assistantId 使用
grep -r "assistantId" src/ --include="*.ts" | grep -v "node_modules"

# 搜索 Assistant import
grep -r "from.*assistantService" src/ --include="*.ts"
```

應該只在以下位置找到（如果保留 Chief）：
- `assistantService.ts` 本身
- 某些 Chief 相關的調用

### 3. 啟動服務
```bash
npm run dev
```

檢查是否有啟動錯誤。

### 4. 測試 API
- 創建用戶 → 檢查是否自動創建 8 個 Island
- 上傳知識 → 檢查是否創建 Memory with islandId
- 查看隊列 → 檢查是否顯示正確的 Island 名稱
- 查詢記憶 → 檢查 island relation 是否正確

---

## 📊 清理進度

- [x] Prisma Schema (Memory, ChatSession, ChatMessage)
- [x] memoryService.ts
- [ ] chiefAgentService.ts
- [ ] subAgentService.ts
- [ ] tororoService.ts
- [ ] chatSessionService.ts
- [ ] memoryResolvers.ts
- [ ] assistantService.ts (移除或最小化)
- [ ] assistantResolvers.ts (移除或 deprecated)
- [ ] resolvers/index.ts
- [ ] 測試編譯
- [ ] 測試運行

---

## 💡 建議執行順序

1. **先更新 Service 層** (chiefAgent, subAgent, tororo, chatSession)
2. **然後更新 Resolvers** (memoryResolvers, 移除 assistantResolvers)
3. **移除 assistantService.ts**
4. **更新 resolvers/index.ts**
5. **測試編譯和運行**

每完成一個文件，執行：
```bash
npx tsc --noEmit
```

確保沒有破壞其他部分。

---

**預計工作量**: 30-60 分鐘手動清理

**難度**: 中等（需要仔細修改函數簽名和調用）

**風險**: 低（資料庫已清空，沒有舊數據）

**收益**: 代碼更乾淨、更快速、更容易維護 🎯
