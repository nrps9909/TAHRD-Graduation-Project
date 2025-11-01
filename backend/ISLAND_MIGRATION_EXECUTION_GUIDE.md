# Island Migration 執行指南

## ✅ 已完成

### Phase 1: 準備工作
- ✅ 備份關鍵文件到 `/tmp/assistant-migration-backup/`
- ✅ 提交當前變更為檢查點

### Phase 2: Prisma Schema 更新
- ✅ 重命名 `AssistantType` → `CategoryType`
- ✅ 移除 `Assistant` 模型
- ✅ 更新 `AgentDecision`: `assistantId` → `targetIslandId`, `targetCategory`
- ✅ 更新 `KnowledgeDistribution` 註釋
- ✅ 推送到資料庫 (`prisma db push`)
- ✅ 重新生成 Prisma Client

## 🚧 進行中

### Phase 3: 重構 Backend Services

需要更新的文件：
1. ❌ 刪除 `src/services/assistantService.ts`
2. ⏳ 創建 `src/services/categoryService.ts`
3. ⏳ 更新 `src/services/chiefAgentService.ts`
4. ⏳ 更新 `src/services/subAgentService.ts`
5. ⏳ 更新 `src/services/tororoService.ts`
6. ⏳ 更新 `src/services/chatSessionService.ts`
7. ⏳ 更新 `src/services/islandService.ts`

