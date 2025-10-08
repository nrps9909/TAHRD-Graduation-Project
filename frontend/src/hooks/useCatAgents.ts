/**
 * Custom hooks for Cat Agent interactions
 *
 * Tororo (小白) - Knowledge Gardener
 * Hijiki (小黑) - Knowledge Manager
 */

import { useMutation, useQuery, useLazyQuery } from '@apollo/client'
import {
  CREATE_MEMORY_WITH_TORORO,
  SEARCH_MEMORIES_WITH_HIJIKI,
  GET_STATISTICS_WITH_HIJIKI,
  type TororoFileInput,
  type TororoLinkInput,
  type TororoResponse,
  type HijikiFilterInput,
  type HijikiSearchResponse,
  type HijikiStatisticsResponse
} from '../graphql/catAgents'

/**
 * Hook for Tororo chat and memory creation
 */
export function useTororoChat() {
  const [createMemory, { loading, error }] = useMutation<
    { createMemoryWithTororo: TororoResponse },
    {
      content: string
      files?: TororoFileInput[]
      links?: TororoLinkInput[]
    }
  >(CREATE_MEMORY_WITH_TORORO)

  const sendMessage = async (
    content: string,
    files?: TororoFileInput[],
    links?: TororoLinkInput[]
  ): Promise<TororoResponse | null> => {
    try {
      const { data } = await createMemory({
        variables: {
          content,
          files: files || [],
          links: links || []
        }
      })

      return data?.createMemoryWithTororo || null
    } catch (err) {
      console.error('Tororo chat error:', err)
      return null
    }
  }

  return {
    sendMessage,
    loading,
    error
  }
}

/**
 * Hook for Hijiki memory search
 */
export function useHijikiSearch() {
  const [search, { loading, error, data }] = useLazyQuery<
    { searchMemoriesWithHijiki: HijikiSearchResponse },
    {
      query: string
      type?: string
      filters?: HijikiFilterInput
    }
  >(SEARCH_MEMORIES_WITH_HIJIKI)

  const searchMemories = async (
    query: string,
    type?: string,
    filters?: HijikiFilterInput
  ): Promise<HijikiSearchResponse | null> => {
    try {
      const { data } = await search({
        variables: {
          query,
          type,
          filters
        }
      })

      return data?.searchMemoriesWithHijiki || null
    } catch (err) {
      console.error('Hijiki search error:', err)
      return null
    }
  }

  return {
    searchMemories,
    loading,
    error,
    results: data?.searchMemoriesWithHijiki
  }
}

/**
 * Hook for Hijiki statistics
 */
export function useHijikiStatistics(period: string = 'month') {
  const { loading, error, data, refetch } = useQuery<
    { getStatisticsWithHijiki: HijikiStatisticsResponse },
    { period: string }
  >(GET_STATISTICS_WITH_HIJIKI, {
    variables: { period },
    fetchPolicy: 'cache-and-network'
  })

  return {
    statistics: data?.getStatisticsWithHijiki,
    loading,
    error,
    refetch
  }
}

/**
 * Combined hook for easy chat management
 */
export function useCatChat() {
  const tororo = useTororoChat()
  const hijiki = useHijikiSearch()

  return {
    tororo,
    hijiki
  }
}
