/**
 * 白噗噗對話持久化服務
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export interface TororoMessage {
  id: string
  userMessage: string
  assistantResponse: string
  createdAt: string
  memoryId?: string | null
}

export interface TororoChatHistory {
  sessionId: string
  messages: TororoMessage[]
}

/**
 * 獲取白噗噗的歷史對話記錄
 */
export async function getTororoChatHistory(token: string): Promise<TororoChatHistory> {
  const response = await fetch(`${API_URL}/api/tororo-chat/messages`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('獲取對話記錄失敗')
  }

  return response.json()
}

/**
 * 儲存一條新的對話記錄
 */
export async function saveTororoMessage(
  token: string,
  userMessage: string,
  assistantResponse: string,
  memoryId?: string
): Promise<{ success: boolean; messageId: string; sessionId: string }> {
  const response = await fetch(`${API_URL}/api/tororo-chat/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userMessage,
      assistantResponse,
      memoryId
    })
  })

  if (!response.ok) {
    throw new Error('儲存對話記錄失敗')
  }

  return response.json()
}

/**
 * 清空白噗噗的對話記錄
 */
export async function clearTororoChatHistory(token: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/tororo-chat/session`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('清空對話記錄失敗')
  }
}
