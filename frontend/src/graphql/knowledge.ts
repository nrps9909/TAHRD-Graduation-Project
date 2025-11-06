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
        targetIslandId
        relevanceScore
        shouldStore
        reasoning
        confidence
        suggestedTags
        keyInsights
        createdAt
        island {
          id
          name
          nameChinese
          emoji
        }
      }
      memoriesCreated {
        id
        title
        summary
        tags
        emoji
        createdAt
        islandId
        island {
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
 * Chat with Chief Agent (Island)
 */
export const CHAT_WITH_CHIEF = gql`
  mutation ChatWithIsland($input: ChatWithIslandInput!) {
    chatWithIsland(input: $input) {
      id
      userMessage
      assistantResponse
      contextType
      processingTime
      createdAt
      island {
        id
        name
        nameChinese
        emoji
      }
    }
  }
`

/**
 * Get all islands (replaces assistant queries)
 */
export const GET_ISLANDS = gql`
  query GetIslands {
    islands {
      id
      name
      nameChinese
      emoji
      color
      description
      memoryCount
      isActive
      position
      positionX
      positionY
      positionZ
      createdAt
      updatedAt
    }
  }
`

/**
 * Get single island
 */
export const GET_ISLAND = gql`
  query GetIsland($id: ID!) {
    island(id: $id) {
      id
      name
      nameChinese
      emoji
      color
      description
      memoryCount
      isActive
      position
      positionX
      positionY
      positionZ
      createdAt
      updatedAt
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
        targetIslandId
        relevanceScore
        shouldStore
        reasoning
        island {
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
        targetIslandId
        relevanceScore
        shouldStore
        reasoning
        confidence
        suggestedTags
        keyInsights
        processingTime
        createdAt
        island {
          id
          name
          nameChinese
          emoji
          color
        }
      }
      memories {
        id
        title
        summary
        tags
        emoji
        createdAt
        islandId
        island {
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

export interface ChatWithIslandInput {
  islandId: string
  message: string
  contextType?: 'MEMORY_CREATION' | 'MEMORY_QUERY' | 'GENERAL_CHAT' | 'SUMMARY_REQUEST' | 'CLASSIFICATION'
  memoryId?: string
}
