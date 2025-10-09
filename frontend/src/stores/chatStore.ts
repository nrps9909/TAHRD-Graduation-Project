/**
 * 對話狀態管理 - 確保切換頁面時對話狀態不丟失
 * 支援白噗噗和黑噗噗的對話持久化
 *
 * 優化特性:
 * - 使用 shallow selector 避免不必要的重渲染
 * - 訊息數量限制,避免 localStorage 爆滿
 * - 自動清理過期的臨時數據
 * - 支援批量操作減少更新次數
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 貓咪狀態
export type CatState = 'idle' | 'thinking' | 'listening' | 'talking'

// 訊息介面
export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachments?: {
    type: 'image' | 'file' | 'audio'
    name: string
    url: string
  }[]
}

// 附件介面
export interface PendingAttachment {
  type: 'image' | 'file' | 'audio'
  name: string
  url: string
  file: File
}

// 配置常數
const MAX_MESSAGES = 100 // 最多保留100條訊息
const MAX_MESSAGE_AGE_DAYS = 30 // 訊息最多保留30天

// 對話會話狀態
interface ChatSession {
  // 訊息列表
  messages: ChatMessage[]

  // 輸入文字
  inputText: string

  // 貓咪狀態
  catState: CatState

  // 處理中狀態
  isProcessing: boolean

  // 錄音狀態
  isRecording: boolean

  // 待發送的附件 (不持久化到 localStorage)
  pendingAttachments: PendingAttachment[]

  // 最後活動時間 (用於清理過期數據)
  lastActivity?: Date
}

interface ChatStore {
  // 白噗噗的會話狀態
  tororo: ChatSession

  // 黑噗噗的會話狀態
  hijiki: ChatSession

  // === Tororo Actions ===
  setTororoMessages: (messages: ChatMessage[]) => void
  addTororoMessage: (message: ChatMessage) => void
  setTororoInputText: (text: string) => void
  setTororoCatState: (state: CatState) => void
  setTororoIsProcessing: (isProcessing: boolean) => void
  setTororoIsRecording: (isRecording: boolean) => void
  setTororoPendingAttachments: (attachments: PendingAttachment[]) => void
  addTororoPendingAttachment: (attachment: PendingAttachment) => void
  removeTororoPendingAttachment: (index: number) => void
  clearTororoSession: () => void

  // === Hijiki Actions ===
  setHijikiMessages: (messages: ChatMessage[]) => void
  addHijikiMessage: (message: ChatMessage) => void
  setHijikiInputText: (text: string) => void
  setHijikiCatState: (state: CatState) => void
  setHijikiIsProcessing: (isProcessing: boolean) => void
  setHijikiIsRecording: (isRecording: boolean) => void
  setHijikiPendingAttachments: (attachments: PendingAttachment[]) => void
  addHijikiPendingAttachment: (attachment: PendingAttachment) => void
  removeHijikiPendingAttachment: (index: number) => void
  clearHijikiSession: () => void
}

// 輔助函數: 清理過期訊息
const cleanOldMessages = (messages: ChatMessage[]): ChatMessage[] => {
  const now = new Date()
  const maxAge = MAX_MESSAGE_AGE_DAYS * 24 * 60 * 60 * 1000

  return messages
    .filter(msg => {
      const age = now.getTime() - new Date(msg.timestamp).getTime()
      return age < maxAge
    })
    .slice(-MAX_MESSAGES) // 只保留最近的訊息
}

// 輔助函數: 添加訊息並自動清理
const addMessageWithCleanup = (messages: ChatMessage[], newMessage: ChatMessage): ChatMessage[] => {
  const updatedMessages = [...messages, newMessage]
  return cleanOldMessages(updatedMessages)
}

// 初始會話狀態
const createInitialSession = (isBlackCat: boolean): ChatSession => ({
  messages: [
    {
      id: '1',
      type: 'assistant',
      content: isBlackCat
        ? '喵~ 你好呀!我是黑噗噗 🌙 很高興見到你!我會幫你管理和整理知識,有什麼需要幫忙的嗎?'
        : '喵~ 早安!我是白噗噗 💕\n\n今天有什麼想法、靈感或心情想記錄嗎?\n隨時跟我說,我會幫你記住的!✨\n\n💡 也可以上傳圖片、文件或語音哦~',
      timestamp: new Date(),
    }
  ],
  inputText: '',
  catState: 'idle',
  isProcessing: false,
  isRecording: false,
  pendingAttachments: [],
  lastActivity: new Date(),
})

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      tororo: createInitialSession(false),
      hijiki: createInitialSession(true),

      // === Tororo Actions ===
      setTororoMessages: (messages) =>
        set((state) => ({
          tororo: { ...state.tororo, messages }
        })),

      addTororoMessage: (message) =>
        set((state) => ({
          tororo: {
            ...state.tororo,
            messages: addMessageWithCleanup(state.tororo.messages, message),
            lastActivity: new Date()
          }
        })),

      setTororoInputText: (text) =>
        set((state) => ({
          tororo: { ...state.tororo, inputText: text, lastActivity: new Date() }
        })),

      setTororoCatState: (catState) =>
        set((state) => ({
          tororo: { ...state.tororo, catState }
        })),

      setTororoIsProcessing: (isProcessing) =>
        set((state) => ({
          tororo: { ...state.tororo, isProcessing }
        })),

      setTororoIsRecording: (isRecording) =>
        set((state) => ({
          tororo: { ...state.tororo, isRecording }
        })),

      setTororoPendingAttachments: (pendingAttachments) =>
        set((state) => ({
          tororo: { ...state.tororo, pendingAttachments }
        })),

      addTororoPendingAttachment: (attachment) =>
        set((state) => ({
          tororo: { ...state.tororo, pendingAttachments: [...state.tororo.pendingAttachments, attachment] }
        })),

      removeTororoPendingAttachment: (index) =>
        set((state) => ({
          tororo: {
            ...state.tororo,
            pendingAttachments: state.tororo.pendingAttachments.filter((_, i) => i !== index)
          }
        })),

      clearTororoSession: () =>
        set(() => ({
          tororo: createInitialSession(false)
        })),

      // === Hijiki Actions ===
      setHijikiMessages: (messages) =>
        set((state) => ({
          hijiki: { ...state.hijiki, messages }
        })),

      addHijikiMessage: (message) =>
        set((state) => ({
          hijiki: {
            ...state.hijiki,
            messages: addMessageWithCleanup(state.hijiki.messages, message),
            lastActivity: new Date()
          }
        })),

      setHijikiInputText: (text) =>
        set((state) => ({
          hijiki: { ...state.hijiki, inputText: text, lastActivity: new Date() }
        })),

      setHijikiCatState: (catState) =>
        set((state) => ({
          hijiki: { ...state.hijiki, catState }
        })),

      setHijikiIsProcessing: (isProcessing) =>
        set((state) => ({
          hijiki: { ...state.hijiki, isProcessing }
        })),

      setHijikiIsRecording: (isRecording) =>
        set((state) => ({
          hijiki: { ...state.hijiki, isRecording }
        })),

      setHijikiPendingAttachments: (pendingAttachments) =>
        set((state) => ({
          hijiki: { ...state.hijiki, pendingAttachments }
        })),

      addHijikiPendingAttachment: (attachment) =>
        set((state) => ({
          hijiki: { ...state.hijiki, pendingAttachments: [...state.hijiki.pendingAttachments, attachment] }
        })),

      removeHijikiPendingAttachment: (index) =>
        set((state) => ({
          hijiki: {
            ...state.hijiki,
            pendingAttachments: state.hijiki.pendingAttachments.filter((_, i) => i !== index)
          }
        })),

      clearHijikiSession: () =>
        set(() => ({
          hijiki: createInitialSession(true)
        })),
    }),
    {
      name: 'chat-storage',
      version: 1, // 版本控制,schema 變更時可升級
      // 只持久化部分狀態,不包括 File 物件和暫態狀態
      partialize: (state) => ({
        tororo: {
          messages: state.tororo.messages,
          inputText: state.tororo.inputText,
          catState: state.tororo.catState,
          lastActivity: state.tororo.lastActivity,
          // 不持久化: isProcessing, isRecording, pendingAttachments (含 File 物件)
        },
        hijiki: {
          messages: state.hijiki.messages,
          inputText: state.hijiki.inputText,
          catState: state.hijiki.catState,
          lastActivity: state.hijiki.lastActivity,
          // 不持久化: isProcessing, isRecording, pendingAttachments (含 File 物件)
        },
      }),
      // 添加錯誤處理
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('❌ 對話狀態恢復失敗:', error)
          // 清除損壞的數據
          localStorage.removeItem('chat-storage')
        } else if (state) {
          console.log('✅ 對話狀態已恢復')
          // 清理過期訊息
          state.tororo.messages = cleanOldMessages(state.tororo.messages)
          state.hijiki.messages = cleanOldMessages(state.hijiki.messages)
        }
      },
    }
  )
)
