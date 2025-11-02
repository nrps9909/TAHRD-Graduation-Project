import { gql } from '@apollo/client'

/**
 * Upload knowledge to Chief Agent for distribution
 */
export const UPLOAD_KNOWLEDGE = gql`
  mutation UploadKnowledge($input: UploadKnowledgeInput!) {
    uploadKnowledge(input: $input) {
      distribution {
        id
        rawContent
        contentType
        chiefAnalysis
        chiefSummary
        identifiedTopics
        suggestedTags
        distributedTo
        storedBy
        processingTime
        createdAt
      }
      tororoResponse {
        warmMessage
        islandName
        islandEmoji
        quickSummary
        confidence
        reasoning
      }
      agentDecisions {
        id
        assistantId
        relevanceScore
        shouldStore
        reasoning
        confidence
        suggestedCategory
        suggestedTags
        keyInsights
        createdAt
        assistant {
          id
          name
          nameChinese
          emoji
          type
        }
      }
      memoriesCreated {
        id
        title
        summary
        tags
        emoji
        createdAt
        assistant {
          id
          name
          nameChinese
          emoji
        }
      }
      processingTime
      backgroundProcessing
    }
  }
`

/**
 * Chat with Chief Agent
 */
export const CHAT_WITH_CHIEF = gql`
  mutation ChatWithAssistant($input: ChatWithAssistantInput!) {
    chatWithAssistant(input: $input) {
      id
      userMessage
      assistantResponse
      contextType
      processingTime
      createdAt
      assistant {
        id
        name
        nameChinese
        emoji
      }
    }
  }
`

/**
 * Get Chief Assistant info
 */
export const GET_CHIEF_ASSISTANT = gql`
  query GetChiefAssistant {
    chiefAssistant {
      id
      type
      name
      nameChinese
      emoji
      color
      systemPrompt
      personality
      chatStyle
      totalMemories
      totalChats
    }
  }
`

/**
 * Get all assistants
 */
export const GET_ASSISTANTS = gql`
  query GetAssistants {
    assistants {
      id
      type
      name
      nameChinese
      emoji
      color
      totalMemories
      totalChats
      isActive
    }
  }
`

/**
 * Get knowledge distributions
 */
export const GET_KNOWLEDGE_DISTRIBUTIONS = gql`
  query GetKnowledgeDistributions($limit: Int, $offset: Int) {
    knowledgeDistributions(limit: $limit, offset: $offset) {
      id
      rawContent
      contentType
      chiefSummary
      identifiedTopics
      distributedTo
      storedBy
      createdAt
      agentDecisions {
        id
        relevanceScore
        shouldStore
        reasoning
        assistant {
          id
          name
          nameChinese
          emoji
        }
      }
      memories {
        id
        title
        tags
      }
    }
  }
`

/**
 * Get single knowledge distribution with full details
 */
export const GET_KNOWLEDGE_DISTRIBUTION = gql`
  query GetKnowledgeDistribution($id: ID!) {
    knowledgeDistribution(id: $id) {
      id
      rawContent
      contentType
      fileUrls
      fileNames
      fileTypes
      links
      linkTitles
      chiefAnalysis
      chiefSummary
      identifiedTopics
      suggestedTags
      distributedTo
      storedBy
      processingTime
      createdAt
      agentDecisions {
        id
        relevanceScore
        shouldStore
        reasoning
        confidence
        suggestedCategory
        suggestedTags
        keyInsights
        processingTime
        createdAt
        assistant {
          id
          name
          nameChinese
          emoji
          color
          type
        }
      }
      memories {
        id
        title
        summary
        tags
        emoji
        createdAt
        assistant {
          id
          name
          nameChinese
          emoji
        }
      }
    }
  }
`

// Type definitions for TypeScript
export interface FileInput {
  url: string
  name: string
  type: string
  size?: number
}

export interface LinkInput {
  url: string
  title?: string
}

export interface UploadKnowledgeInput {
  content: string
  files?: FileInput[]
  links?: LinkInput[]
  contentType?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'LINK' | 'MIXED'
}

export interface ChatWithAssistantInput {
  assistantId: string
  message: string
  contextType?: 'MEMORY_CREATION' | 'MEMORY_QUERY' | 'GENERAL_CHAT' | 'SUMMARY_REQUEST' | 'CLASSIFICATION'
  memoryId?: string
}
