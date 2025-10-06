export interface MessageFile {
  id: string
  file: File
  preview?: string
  type: 'image' | 'document' | 'other'
}

export interface MessageLink {
  id: string
  url: string
  title?: string
  preview?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  files?: MessageFile[]
  links?: MessageLink[]
  timestamp: Date
  isLoading?: boolean
}
