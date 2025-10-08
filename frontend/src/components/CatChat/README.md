# CatChat 組件使用說明

## 功能介紹

CatChat 是白噗噗（Tororo）和黑噗噗（Hijiki）的聊天組件，支援:

- ✅ 與兩隻貓咪對話
- ✅ 歷史紀錄管理（自動儲存到 localStorage）
- ✅ 載入舊對話
- ✅ 刪除單一會話
- ✅ 清空所有歷史
- ✅ 最多保留 50 個會話

## 使用範例

```tsx
import { ChatBubble, useCatChat, CatAgent } from '@/components/CatChat'

function MyPage() {
  // 初始化 hook
  const {
    currentCat,
    messages,
    isLoading,
    chatHistory,
    sendMessage,
    switchCat,
    clearMessages,
    loadSession,
    deleteSession,
    clearHistory
  } = useCatChat({
    initialCat: CatAgent.TORORO,
    onCreateMemory: async (content: string) => {
      // 呼叫 API 創建記憶
      console.log('Creating memory:', content)
    },
    onSearchMemories: async (query: string) => {
      // 呼叫 API 搜尋記憶
      console.log('Searching:', query)
      return []
    }
  })

  return (
    <ChatBubble
      currentCat={currentCat}
      messages={messages}
      isLoading={isLoading}
      chatHistory={chatHistory}
      onSendMessage={sendMessage}
      onSwitchCat={switchCat}
      onLoadSession={loadSession}
      onDeleteSession={deleteSession}
      onClearHistory={clearHistory}
    />
  )
}
```

## API 說明

### useCatChat Hook

**選項參數:**
- `initialCat?: CatAgent` - 初始貓咪（預設: TORORO）
- `onCreateMemory?: (content: string) => Promise<void>` - 創建記憶回調
- `onSearchMemories?: (query: string) => Promise<any>` - 搜尋記憶回調

**返回值:**
- `currentCat: CatAgent | null` - 當前貓咪
- `messages: ChatMessage[]` - 當前對話訊息
- `isLoading: boolean` - 載入狀態
- `chatHistory: ChatSession[]` - 歷史會話列表
- `sendMessage: (message: string, catAgent: CatAgent) => void` - 發送訊息
- `switchCat: (catAgent: CatAgent) => void` - 切換貓咪
- `clearMessages: () => void` - 清空當前對話（並儲存到歷史）
- `loadSession: (sessionId: string) => void` - 載入歷史會話
- `deleteSession: (sessionId: string) => void` - 刪除歷史會話
- `clearHistory: () => void` - 清空所有歷史

### ChatBubble 組件

**Props:**
- `currentCat: CatAgent | null` - 當前貓咪
- `messages: ChatMessage[]` - 訊息列表
- `isLoading?: boolean` - 載入狀態
- `chatHistory?: ChatSession[]` - 歷史會話
- `onSendMessage: (message: string, catAgent: CatAgent) => void` - 發送訊息回調
- `onSwitchCat: (catAgent: CatAgent) => void` - 切換貓咪回調
- `onLoadSession?: (sessionId: string) => void` - 載入會話回調
- `onDeleteSession?: (sessionId: string) => void` - 刪除會話回調
- `onClearHistory?: () => void` - 清空歷史回調

## 類型定義

```typescript
// 貓咪類型
enum CatAgent {
  TORORO = 'tororo',  // 白噗噗 - 知識園丁
  HIJIKI = 'hijiki'   // 黑噗噗 - 知識管理員
}

// 訊息
interface ChatMessage {
  id: string
  catAgent: CatAgent
  message: string
  timestamp: Date
  isUser: boolean
}

// 會話
interface ChatSession {
  id: string
  catAgent: CatAgent
  messages: ChatMessage[]
  startTime: Date
  endTime?: Date
}
```

## 歷史紀錄功能

### 自動儲存
- 訊息變化後 1 秒自動儲存到 localStorage
- 每次清空對話時自動儲存當前會話
- 最多保留 50 個會話（FIFO）

### 查看歷史
1. 點擊聊天視窗頂部的 📜 圖標
2. 瀏覽所有歷史會話
3. 點擊任一會話即可載入

### 刪除會話
1. 在歷史紀錄視圖中找到要刪除的會話
2. 點擊 🗑️ 按鈕
3. 再次點擊「確定?」以確認刪除

### 清空所有歷史
1. 在歷史紀錄視圖頂部點擊「清空全部」
2. 確認對話框

## 儲存位置

歷史紀錄儲存在瀏覽器 localStorage:
- Key: `cat_chat_history`
- 格式: JSON 序列化的 ChatSession 陣列

## 注意事項

⚠️ **重要**
- 歷史紀錄僅儲存在瀏覽器本地
- 清除瀏覽器資料會刪除所有歷史
- 不同瀏覽器/裝置的歷史不同步
- 建議未來可實作雲端同步功能
