/**
 * useCatChat - 簡化的貓咪對話 Hook
 * 自動根據貓咪類型選擇對應的狀態和 actions
 */

import { useMemo } from 'react'
import { useChatStore } from '../stores/chatStore'
import type { ChatMessage, PendingAttachment } from '../stores/chatStore'

type CatType = 'tororo' | 'hijiki'

interface UseCatChatReturn {
  // 狀態
  messages: ChatMessage[]
  inputText: string
  catState: 'idle' | 'thinking' | 'listening' | 'talking'
  isProcessing: boolean
  isRecording: boolean
  pendingAttachments: PendingAttachment[]

  // Actions
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  setInputText: (text: string) => void
  setCatState: (state: 'idle' | 'thinking' | 'listening' | 'talking') => void
  setIsProcessing: (isProcessing: boolean) => void
  setIsRecording: (isRecording: boolean) => void
  setPendingAttachments: (attachments: PendingAttachment[]) => void
  addPendingAttachment: (attachment: PendingAttachment) => void
  removePendingAttachment: (index: number) => void
  clearSession: () => void
}

export const useCatChat = (catType: CatType): UseCatChatReturn => {
  // 根據貓咪類型選擇對應的狀態
  const session = useChatStore(state => catType === 'tororo' ? state.tororo : state.hijiki)

  // 根據貓咪類型選擇對應的 actions
  const actions = useMemo(() => {
    if (catType === 'tororo') {
      return {
        setMessages: useChatStore.getState().setTororoMessages,
        addMessage: useChatStore.getState().addTororoMessage,
        setInputText: useChatStore.getState().setTororoInputText,
        setCatState: useChatStore.getState().setTororoCatState,
        setIsProcessing: useChatStore.getState().setTororoIsProcessing,
        setIsRecording: useChatStore.getState().setTororoIsRecording,
        setPendingAttachments: useChatStore.getState().setTororoPendingAttachments,
        addPendingAttachment: useChatStore.getState().addTororoPendingAttachment,
        removePendingAttachment: useChatStore.getState().removeTororoPendingAttachment,
        clearSession: useChatStore.getState().clearTororoSession,
      }
    } else {
      return {
        setMessages: useChatStore.getState().setHijikiMessages,
        addMessage: useChatStore.getState().addHijikiMessage,
        setInputText: useChatStore.getState().setHijikiInputText,
        setCatState: useChatStore.getState().setHijikiCatState,
        setIsProcessing: useChatStore.getState().setHijikiIsProcessing,
        setIsRecording: useChatStore.getState().setHijikiIsRecording,
        setPendingAttachments: useChatStore.getState().setHijikiPendingAttachments,
        addPendingAttachment: useChatStore.getState().addHijikiPendingAttachment,
        removePendingAttachment: useChatStore.getState().removeHijikiPendingAttachment,
        clearSession: useChatStore.getState().clearHijikiSession,
      }
    }
  }, [catType])

  return {
    ...session,
    ...actions,
  }
}
