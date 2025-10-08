/**
 * useTororoKnowledge Hook
 *
 * 管理白撲撲知識膠囊的創建和存儲
 * 與 GraphQL API 整合，支援多模態輸入
 * 每個知識膠囊會在島上生成一棵知識樹
 */

import { useState, useCallback } from 'react'
import { useMutation } from '@apollo/client'
import { gql } from '@apollo/client'

// ============ GraphQL Mutations ============

const CREATE_KNOWLEDGE_MEMORY = gql`
  mutation CreateKnowledgeMemory(
    $content: String!
    $emotion: String!
    $category: String!
    $tags: [String!]!
    $metadata: JSON
  ) {
    createMemory(
      content: $content
      emotion: $emotion
      tags: $tags
      metadata: $metadata
    ) {
      id
      content
      emotion
      tags
      createdAt
      embeddings
    }
  }
`

// ============ 類型定義 ============

export interface KnowledgeCapsule {
  content: string
  emotion: EmotionType
  category: CategoryType
  tags: string[]
  timestamp: Date
  image?: File
  audio?: Blob
}

export type EmotionType = 'happy' | 'peaceful' | 'inspired' | 'thoughtful' | 'excited' | 'grateful'
export type CategoryType = 'learning' | 'idea' | 'experience' | 'goal' | 'reflection' | 'discovery'

interface UseTororoKnowledgeOptions {
  onSuccess?: (capsule: KnowledgeCapsule) => void
  onError?: (error: Error) => void
}

// ============ Hook ============

export function useTororoKnowledge(options: UseTororoKnowledgeOptions = {}) {
  const [isCreating, setIsCreating] = useState(false)
  const [lastCreated, setLastCreated] = useState<KnowledgeCapsule | null>(null)

  const [createMemoryMutation] = useMutation(CREATE_KNOWLEDGE_MEMORY)

  /**
   * 創建知識膠囊
   */
  const createKnowledge = useCallback(async (capsule: KnowledgeCapsule) => {
    setIsCreating(true)

    try {
      // 準備 metadata
      const metadata = {
        category: capsule.category,
        timestamp: capsule.timestamp.toISOString(),
        hasImage: !!capsule.image,
        hasAudio: !!capsule.audio
      }

      // 如果有圖片，先上傳圖片
      let imageUrl: string | undefined
      if (capsule.image) {
        imageUrl = await uploadImage(capsule.image)
        metadata.imageUrl = imageUrl
      }

      // 如果有語音，先轉文字
      let audioTranscript: string | undefined
      if (capsule.audio) {
        audioTranscript = await transcribeAudio(capsule.audio)
        metadata.audioTranscript = audioTranscript
      }

      // 組合完整內容
      const fullContent = [
        capsule.content,
        audioTranscript && `[語音]: ${audioTranscript}`,
        imageUrl && `[圖片]: ${imageUrl}`
      ].filter(Boolean).join('\n\n')

      // 調用 GraphQL mutation
      const { data } = await createMemoryMutation({
        variables: {
          content: fullContent,
          emotion: capsule.emotion,
          category: capsule.category,
          tags: capsule.tags,
          metadata
        }
      })

      setLastCreated(capsule)
      options.onSuccess?.(capsule)

      return data.createMemory

    } catch (error) {
      console.error('Failed to create knowledge:', error)
      options.onError?.(error as Error)
      throw error
    } finally {
      setIsCreating(false)
    }
  }, [createMemoryMutation, options])

  /**
   * 快速創建（只有文字）
   */
  const quickCreate = useCallback(async (
    content: string,
    emotion: EmotionType = 'happy',
    category: CategoryType = 'learning'
  ) => {
    return createKnowledge({
      content,
      emotion,
      category,
      tags: [],
      timestamp: new Date()
    })
  }, [createKnowledge])

  return {
    createKnowledge,
    quickCreate,
    isCreating,
    lastCreated
  }
}

// ============ 輔助函數 ============

/**
 * 上傳圖片到服務器
 */
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error('Failed to upload image')
  }

  const { url } = await response.json()
  return url
}

/**
 * 語音轉文字（使用 Gemini multimodal）
 */
async function transcribeAudio(audio: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('audio', audio)

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error('Failed to transcribe audio')
  }

  const { transcript } = await response.json()
  return transcript
}

/**
 * 情緒到顏色的映射（用於視覺化）
 */
export function getEmotionColor(emotion: EmotionType): string {
  const colors = {
    happy: '#FFD93D',
    peaceful: '#A8E6CF',
    inspired: '#FFB7D5',
    thoughtful: '#C7CEEA',
    excited: '#FFAAA5',
    grateful: '#B5EAD7'
  }
  return colors[emotion]
}

/**
 * 類型到圖標的映射
 */
export function getCategoryIcon(category: CategoryType): string {
  const icons = {
    learning: '📚',
    idea: '💡',
    experience: '🌟',
    goal: '🎯',
    reflection: '🪞',
    discovery: '🔍'
  }
  return icons[category]
}
