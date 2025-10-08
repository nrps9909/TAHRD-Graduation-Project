import { gql } from '@apollo/client'

// Re-export types for convenience
export type { Memory, MemoryCategory, RelatedMemoryPreview, ChatMessage, CreateMemoryInput, UpdateMemoryInput } from '../types/memory'

// ============ Fragments ============

export const MEMORY_FRAGMENT = gql`
  fragment MemoryFields on Memory {
    id
    rawContent
    summary
    title
    emoji
    category
    tags
    keyPoints
    aiSentiment
    aiImportance
    isPinned
    isArchived
    createdAt
    updatedAt
    assistant {
      id
      name
      nameChinese
      emoji
      color
    }
  }
`

// ============ Queries ============

export const GET_MEMORIES = gql`
  ${MEMORY_FRAGMENT}
  query GetMemories($filter: MemoryFilterInput, $limit: Int, $offset: Int) {
    memories(filter: $filter, limit: $limit, offset: $offset) {
      ...MemoryFields
    }
  }
`

export const GET_MEMORY = gql`
  ${MEMORY_FRAGMENT}
  query GetMemory($id: ID!) {
    memory(id: $id) {
      ...MemoryFields
      relatedMemories {
        id
        title
        emoji
        category
        summary
      }
      chatMessages {
        id
        userMessage
        assistantResponse
        createdAt
      }
    }
  }
`

export const SEARCH_MEMORIES = gql`
  ${MEMORY_FRAGMENT}
  query SearchMemories($query: String!, $limit: Int) {
    searchMemories(query: $query, limit: $limit) {
      ...MemoryFields
    }
  }
`

export const GET_RELATED_MEMORIES = gql`
  ${MEMORY_FRAGMENT}
  query GetRelatedMemories($memoryId: ID!, $limit: Int) {
    relatedMemories(memoryId: $memoryId, limit: $limit) {
      ...MemoryFields
    }
  }
`

export const GET_PINNED_MEMORIES = gql`
  ${MEMORY_FRAGMENT}
  query GetPinnedMemories {
    pinnedMemories {
      ...MemoryFields
    }
  }
`

export const GET_CHAT_HISTORY = gql`
  query GetChatHistory($assistantId: ID, $limit: Int) {
    chatHistory(assistantId: $assistantId, limit: $limit) {
      id
      userMessage
      assistantResponse
      contextType
      createdAt
      assistant {
        id
        name
        nameChinese
        emoji
      }
      memory {
        id
        title
        emoji
      }
    }
  }
`

// ============ Mutations ============

export const CREATE_MEMORY = gql`
  ${MEMORY_FRAGMENT}
  mutation CreateMemory($input: CreateMemoryInput!) {
    createMemory(input: $input) {
      memory {
        ...MemoryFields
      }
      chat {
        id
        assistantResponse
      }
      suggestedTags
      relatedMemories {
        id
        title
        emoji
      }
    }
  }
`

export const UPDATE_MEMORY = gql`
  ${MEMORY_FRAGMENT}
  mutation UpdateMemory($id: ID!, $input: UpdateMemoryInput!) {
    updateMemory(id: $id, input: $input) {
      ...MemoryFields
    }
  }
`

export const DELETE_MEMORY = gql`
  mutation DeleteMemory($id: ID!) {
    deleteMemory(id: $id)
  }
`

export const PIN_MEMORY = gql`
  ${MEMORY_FRAGMENT}
  mutation PinMemory($id: ID!) {
    pinMemory(id: $id) {
      ...MemoryFields
    }
  }
`

export const UNPIN_MEMORY = gql`
  ${MEMORY_FRAGMENT}
  mutation UnpinMemory($id: ID!) {
    unpinMemory(id: $id) {
      ...MemoryFields
    }
  }
`

export const ARCHIVE_MEMORY = gql`
  ${MEMORY_FRAGMENT}
  mutation ArchiveMemory($id: ID!) {
    archiveMemory(id: $id) {
      ...MemoryFields
    }
  }
`

export const UNARCHIVE_MEMORY = gql`
  ${MEMORY_FRAGMENT}
  mutation UnarchiveMemory($id: ID!) {
    unarchiveMemory(id: $id) {
      ...MemoryFields
    }
  }
`

export const LINK_MEMORIES = gql`
  ${MEMORY_FRAGMENT}
  mutation LinkMemories($memoryId: ID!, $relatedIds: [ID!]!) {
    linkMemories(memoryId: $memoryId, relatedIds: $relatedIds) {
      ...MemoryFields
      relatedMemories {
        id
        title
        emoji
      }
    }
  }
`

export const CHAT_WITH_ASSISTANT = gql`
  mutation ChatWithAssistant($input: ChatWithAssistantInput!) {
    chatWithAssistant(input: $input) {
      id
      userMessage
      assistantResponse
      contextType
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
