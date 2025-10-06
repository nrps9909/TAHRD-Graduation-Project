import { gql } from '@apollo/client'

// ============ Queries ============

export const GET_ASSISTANTS = gql`
  query GetAssistants {
    assistants {
      id
      type
      name
      nameChinese
      emoji
      color
      systemPrompt
      personality
      chatStyle
      position {
        x
        y
        z
      }
      totalMemories
      totalChats
      isActive
      createdAt
      updatedAt
    }
  }
`

export const GET_ASSISTANT = gql`
  query GetAssistant($id: ID!) {
    assistant(id: $id) {
      id
      type
      name
      nameChinese
      emoji
      color
      systemPrompt
      personality
      chatStyle
      position {
        x
        y
        z
      }
      totalMemories
      totalChats
      isActive
      createdAt
      updatedAt
    }
  }
`

export const GET_ASSISTANT_BY_TYPE = gql`
  query GetAssistantByType($type: AssistantType!) {
    assistantByType(type: $type) {
      id
      type
      name
      nameChinese
      emoji
      color
      systemPrompt
      personality
      chatStyle
      position {
        x
        y
        z
      }
      totalMemories
      totalChats
    }
  }
`

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
      position {
        x
        y
        z
      }
      totalMemories
      totalChats
    }
  }
`

export const CLASSIFY_CONTENT = gql`
  query ClassifyContent($content: String!) {
    classifyContent(content: $content) {
      suggestedCategory
      confidence
      reason
      alternativeCategories
    }
  }
`

export const GET_CHIEF_SUMMARY = gql`
  query GetChiefSummary($days: Int) {
    chiefSummary(days: $days) {
      weeklyStats {
        startDate
        endDate
        totalMemories
        totalChats
        categoryBreakdown {
          category
          count
          percentage
        }
        topTags {
          tag
          count
        }
        aiSummary
      }
      crossDomainInsights {
        title
        description
        relatedMemories {
          id
          title
          emoji
        }
        actionable
      }
      suggestions
    }
  }
`

// ============ Mutations ============

export const CLASSIFY_AND_CREATE = gql`
  mutation ClassifyAndCreate($content: String!) {
    classifyAndCreate(content: $content) {
      memory {
        id
        rawContent
        summary
        title
        emoji
        category
        tags
        aiImportance
        aiSentiment
        createdAt
      }
      chat {
        id
        assistantResponse
        createdAt
      }
      suggestedTags
      relatedMemories {
        id
        title
        emoji
        category
      }
    }
  }
`
