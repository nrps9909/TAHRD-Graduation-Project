# 白噗噗對話持久化 - 前端修改說明

## 修改檔案: `frontend/src/components/TororoKnowledgeAssistant.tsx`

### 1. 新增 import

在檔案頂部新增：

```typescript
import { getTororoChatHistory, saveTororoMessage, type TororoMessage } from '../services/tororoChatService'
```

### 2. 修改 conversationHistory 的型別和初始化

將現有的：
```typescript
const [conversationHistory, setConversationHistory] = useState<string[]>([])
```

改為：
```typescript
const [conversationHistory, setConversationHistory] = useState<TororoMessage[]>([])
const [isLoadingHistory, setIsLoadingHistory] = useState(true)
```

### 3. 新增載入歷史對話的 useEffect

在組件內新增（大約在 line 120 附近，其他 useEffect 之後）：

```typescript
// 載入歷史對話記錄
useEffect(() => {
  const loadChatHistory = async () => {
    if (!token) {
      setIsLoadingHistory(false)
      return
    }

    try {
      const history = await getTororoChatHistory(token)
      setConversationHistory(history.messages)
      console.log(`[Tororo Chat] 載入 ${history.messages.length} 條歷史對話`)
    } catch (error) {
      console.error('[Tororo Chat] 載入歷史失敗:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  loadChatHistory()
}, [token]) // 只在 token 改變時執行
```

### 4. 修改儲存對話的邏輯

找到更新 conversationHistory 的地方（大約 line 183）：

```typescript
// 更新對話歷史
setConversationHistory(prev => [...prev, response].slice(-10))
```

改為：

```typescript
// 儲存對話記錄到資料庫
if (token && response) {
  try {
    const savedMessage = await saveTororoMessage(
      token,
      inputText, // 用戶輸入
      response,  // 白噗噗回應
      processingResult?.memoryId // 關聯的 Memory ID（如果有）
    )

    // 更新本地對話歷史
    const newMessage: TororoMessage = {
      id: savedMessage.messageId,
      userMessage: inputText,
      assistantResponse: response,
      createdAt: new Date().toISOString(),
      memoryId: processingResult?.memoryId || null
    }

    setConversationHistory(prev => [...prev, newMessage])
    console.log('[Tororo Chat] 對話已儲存')
  } catch (error) {
    console.error('[Tororo Chat] 儲存對話失敗:', error)
    // 即使儲存失敗也更新 UI（使用臨時 ID）
    const tempMessage: TororoMessage = {
      id: `temp-${Date.now()}`,
      userMessage: inputText,
      assistantResponse: response,
      createdAt: new Date().toISOString(),
      memoryId: processingResult?.memoryId || null
    }
    setConversationHistory(prev => [...prev, tempMessage])
  }
} else {
  // 沒有 token 時的降級處理（只保存在記憶體）
  const tempMessage: TororoMessage = {
    id: `temp-${Date.now()}`,
    userMessage: inputText,
    assistantResponse: response,
    createdAt: new Date().toISOString(),
    memoryId: null
  }
  setConversationHistory(prev => [...prev, tempMessage])
}
```

### 5. 修改 getLatestDialogPrompt 函數

找到這個函數（大約 line 170），修改它使用新的型別：

```typescript
const getLatestDialogPrompt = useCallback(async (abortController: AbortController) => {
  // ... 現有代碼 ...

  const response = await chiefAgentService.getAudioDialogResponse({
    userInput: inputText,
    uploadedFiles: uploadedCloudinaryFiles.map(f => ({ url: f.url, type: f.type })),
    previousMessages: conversationHistory.slice(-3).map(m => m.assistantResponse), // ← 修改這裡
  })

  // ... 現有代碼 ...
}, [inputText, uploadedCloudinaryFiles.length, history.length, conversationHistory])
```

### 6. （可選）新增清空對話按鈕

可以在 UI 中新增一個清空對話的按鈕（例如在設定選單中）：

```typescript
import { clearTororoChatHistory } from '../services/tororoChatService'

const handleClearChat = async () => {
  if (!token) return

  try {
    await clearTororoChatHistory(token)
    setConversationHistory([])
    console.log('[Tororo Chat] 對話記錄已清空')
  } catch (error) {
    console.error('[Tororo Chat] 清空對話失敗:', error)
  }
}
```

---

## 測試步驟

1. **重新啟動前後端**
   ```bash
   # Backend
   cd backend
   npm run build
   npm start

   # Frontend
   cd frontend
   npm run dev
   ```

2. **測試載入歷史對話**
   - 打開知識上傳頁面
   - 檢查 console 是否顯示載入歷史對話的日誌
   - 應該能看到之前的對話記錄

3. **測試儲存新對話**
   - 上傳一條知識
   - 等待白噗噗回應
   - 檢查 console 是否顯示「對話已儲存」
   - 重新整理頁面，應該能看到剛才的對話

4. **測試清空對話**（如果實作了清空功能）
   - 點擊清空按鈕
   - 對話記錄應該消失
   - 重新整理頁面，對話記錄應該仍然是空的

---

## 資料庫驗證

可以用這個腳本檢查資料庫中的對話記錄：

```bash
cd backend
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.chatMessage.findMany({
  where: { assistantId: '68e3a41c7a9b02fdbf181521' },
  orderBy: { createdAt: 'desc' },
  take: 5,
  select: {
    userMessage: true,
    assistantResponse: true,
    createdAt: true
  }
}).then(messages => {
  console.log('最近 5 條白噗噗對話:');
  messages.forEach((m, i) => {
    console.log(\`\n[\${i+1}] \${m.createdAt.toLocaleString()}\`);
    console.log(\`用戶: \${m.userMessage.substring(0, 50)}...\`);
    console.log(\`白噗噗: \${m.assistantResponse.substring(0, 50)}...\`);
  });
  prisma.\$disconnect();
});
"
```

---

## 預期效果

✅ 打開知識上傳頁面時，自動載入歷史對話
✅ 每次上傳知識後，對話記錄自動儲存到資料庫
✅ 關閉網頁再打開，歷史對話仍然存在
✅ 對話記錄與 Memory 關聯（可以追蹤哪條對話創建了哪個記憶）
✅ 支援清空對話記錄功能（歸檔舊的 session）

---

**文檔建立時間**: 2025-11-01
**相關檔案**:
- Backend: `src/routes/tororoChat.ts`
- Frontend: `src/services/tororoChatService.ts`
- Frontend: `src/components/TororoKnowledgeAssistant.tsx` (需要手動修改)
