// 臨時 mock PubSub，待正式修復
class MockPubSub {
  publish(event: string, payload: any) {
    console.log(`Published event: ${event}`, payload)
  }
  
  asyncIterator(events: string[]) {
    return {
      [Symbol.asyncIterator]: async function* () {
        // Mock async iterator
        yield null
      }
    }
  }
}

export const pubsub = new MockPubSub()

// 定義訂閱事件常量
export const SUBSCRIPTION_EVENTS = {
  CONVERSATION_ADDED: 'CONVERSATION_ADDED',
  NPC_MOOD_CHANGED: 'NPC_MOOD_CHANGED',
  LETTER_RECEIVED: 'LETTER_RECEIVED',
  MEMORY_FLOWER_GROWN: 'MEMORY_FLOWER_GROWN',
  WORLD_STATE_CHANGED: 'WORLD_STATE_CHANGED',
} as const