/**
 * CatChat - Type definitions
 */

export enum CatAgent {
  TORORO = 'tororo',
  HIJIKI = 'hijiki'
}

export interface ChatMessage {
  id: string
  catAgent: CatAgent
  message: string
  timestamp: Date
  isUser: boolean
}

export interface ChatSession {
  id: string
  catAgent: CatAgent
  messages: ChatMessage[]
  startTime: Date
  endTime?: Date
}
