import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface NPC {
  id: string
  name: string
  personality: string
  currentMood: string
  position: [number, number, number]
  relationshipLevel: number
  lastInteraction?: Date
  isInConversation?: boolean
  conversationContent?: string
  conversationPartner?: string
}

interface Conversation {
  id: string
  npcId: string
  content: string
  speakerType: 'user' | 'npc'
  timestamp: Date
  emotionTag?: string
}

interface MemoryFlower {
  id: string
  npcId: string
  flowerType: string
  emotionColor: string
  position: [number, number, number]
  growthStage: number
  createdAt: Date
  npc?: { name: string }
  conversation?: { content: string }
}

interface GameState {
  // Player data
  playerId: string | null
  playerName: string
  playerPosition: [number, number, number]
  playerRotation: number
  
  // Mobile controls
  joystickInput: { x: number; y: number }
  
  // NPCs
  npcs: NPC[]
  selectedNpc: string | null
  
  // Conversations
  conversations: Conversation[]
  isInConversation: boolean
  isTyping: boolean
  
  // Memory flowers
  memoryFlowers: MemoryFlower[]
  
  // World state
  weather: string
  timeOfDay: number
  season: string
  
  // UI state
  isLoading: boolean
  showDialogue: boolean
  showInventory: boolean
  showMap: boolean
  showSettings: boolean
  showDiary: boolean
  
  // Actions
  initializeGame: () => void
  setSelectedNpc: (npcId: string | null) => void
  startConversation: (npcId: string) => void
  endConversation: () => void
  addMessage: (message: Conversation) => void
  setTyping: (isTyping: boolean) => void
  addMemoryFlower: (flower: MemoryFlower) => void
  updateNpcMood: (npcId: string, mood: string) => void
  updateNpcPosition: (npcId: string, position: [number, number, number]) => void
  setWorldState: (state: { weather?: string; timeOfDay?: number; season?: string }) => void
  setShowInventory: (show: boolean) => void
  setShowMap: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  setShowDiary: (show: boolean) => void
  setPlayerPosition: (position: [number, number, number]) => void
  setPlayerRotation: (rotation: number) => void
  setJoystickInput: (x: number, y: number) => void
  updateNpcConversation: (npcId: string, partnerId: string | null, content: string | null) => void
}

export const useGameStore = create<GameState>()(
  devtools(
    (set, get) => ({
      // Initial state
      playerId: null,
      playerName: '',
      playerPosition: [0, 10, 0], // 調整到3D模型中心安全位置，提高Y軸避免沉入地下
      playerRotation: 0,
      joystickInput: { x: 0, y: 0 },
      npcs: [],
      selectedNpc: null,
      conversations: [],
      isInConversation: false,
      isTyping: false,
      memoryFlowers: [],
      weather: 'sunny',
      timeOfDay: 12,
      season: 'spring',
      isLoading: true,
      showDialogue: false,
      showInventory: false,
      showMap: false,
      showSettings: false,
      showDiary: false,

      // Actions
      initializeGame: async () => {
        set({ isLoading: true })
        
        try {
          // 從後端 API 動態載入 NPC 資料
          const response = await fetch('http://localhost:4000/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `
                query GetNPCs {
                  npcs {
                    id
                    name
                    personality
                    currentMood
                    location {
                      x
                      y
                      z
                    }
                  }
                }
              `
            })
          })
          
          const data = await response.json()
          
          if (data.data && data.data.npcs) {
            // 預設的3D模型內安全位置（空中飄浮）
            const defaultPositions: Record<string, [number, number, number]> = {
              'npc-1': [5, 15, 8],     // 陸培修 - 中央附近安全位置，空中飄浮
              'npc-2': [-8, 15, 5],    // 劉宇岑 - 中央附近安全位置，空中飄浮
              'npc-3': [3, 15, -6]     // 陳庭安 - 中央附近安全位置，空中飄浮
            }
            
            // 將後端資料轉換為前端格式，使用預設3D安全位置
            const npcs = data.data.npcs.map((npc: any) => {
              const defaultPos = defaultPositions[npc.id]
              const backendPos = [npc.location?.x || 0, npc.location?.y || 0, npc.location?.z || 0]
              const finalPos = defaultPos || backendPos as [number, number, number]
              
              console.log(`NPC ${npc.name} (${npc.id}):`)
              console.log('  預設位置:', defaultPos)
              console.log('  後端位置:', backendPos) 
              console.log('  最終位置:', finalPos)
              
              return {
                id: npc.id,
                name: npc.name,
                personality: npc.personality || '載入中...',
                currentMood: npc.currentMood || 'neutral',
                position: finalPos,
                relationshipLevel: 1,
              }
            })
            
            console.log('從後端載入的NPC資料（使用3D模型中心安全位置）:', npcs.map((n: any) => ({ name: n.name, position: n.position })))
            
            set({
              playerId: 'player-1',
              playerName: '旅人',
              playerPosition: [0, 10, 0], // 重置到安全的中心位置，提高Y軸避免沉入地下
              npcs,
              isLoading: false,
            })
          } else {
            // 使用預設資料作為備援
            console.warn('無法從後端載入 NPC 資料，使用預設值')
            set({
              playerId: 'player-1',
              playerName: '旅人',
              npcs: [
                {
                  id: 'npc-1',
                  name: '陸培修',
                  personality: '夢幻的藝術家',
                  currentMood: 'cheerful',
                  position: [5, 15, -20],  // 中央附近的安全位置，空中飄浮
                  relationshipLevel: 1,
                },
                {
                  id: 'npc-2',
                  name: '劉宇岑',
                  personality: '充滿活力的朋友',
                  currentMood: 'excited',
                  position: [-8, 15, 5], // 中央附近的安全位置，空中飄浮
                  relationshipLevel: 1,
                },
                {
                  id: 'npc-3',
                  name: '陳庭安',
                  personality: '溫柔的靈魂',
                  currentMood: 'dreamy',
                  position: [3, 15, -6], // 中央附近的安全位置，空中飄浮
                  relationshipLevel: 1,
                },
              ],
              isLoading: false,
            })
          }
        } catch (error) {
          console.error('載入遊戲資料失敗:', error)
          // 使用預設資料
          set({
            playerId: 'player-1',
            playerName: '旅人',
            playerPosition: [0, 2, 0], // 重置到安全的中心位置
            npcs: [
              {
                id: 'npc-1',
                name: '陸培修',
                personality: '夢幻的藝術家',
                currentMood: 'cheerful',
                position: [5, 0, -20],  // 中央附近的安全位置，地面高度
                relationshipLevel: 1,
              },
              {
                id: 'npc-2',
                name: '劉宇岑',
                personality: '充滿活力的朋友',
                currentMood: 'excited',
                position: [-8, 15, 5], // 中央附近的安全位置，空中飄浮
                relationshipLevel: 1,
              },
              {
                id: 'npc-3',
                name: '陳庭安',
                personality: '溫柔的靈魂',
                currentMood: 'dreamy',
                position: [3, 20, -6], // 中央附近的安全位置，半空中
                relationshipLevel: 1,
              },
            ],
            isLoading: false,
          })
        }
      },

      setSelectedNpc: (npcId) => {
        set({ selectedNpc: npcId })
      },

      startConversation: (npcId) => {
        const npc = get().npcs.find(n => n.id === npcId)
        if (npc) {
          set({
            selectedNpc: npcId,
            isInConversation: true,
            showDialogue: true,
            conversations: get().conversations.filter(c => c.npcId === npcId), // Keep only this NPC's conversation history
          })
        }
      },

      endConversation: () => {
        set({
          isInConversation: false,
          showDialogue: false,
          selectedNpc: null,
        })
      },

      addMessage: (message) => {
        set((state) => {
          // Check if message already exists to prevent duplicates
          const exists = state.conversations.some(c => 
            c.content === message.content && 
            c.npcId === message.npcId && 
            Math.abs(new Date(c.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000
          )
          
          if (exists) {
            return state
          }
          
          return {
            conversations: [...state.conversations, message],
          }
        })
      },

      setTyping: (isTyping) => {
        set({ isTyping })
      },

      addMemoryFlower: (flower) => {
        set((state) => ({
          memoryFlowers: [...state.memoryFlowers, flower],
        }))
      },

      updateNpcMood: (npcId, mood) => {
        set((state) => ({
          npcs: state.npcs.map(npc =>
            npc.id === npcId ? { ...npc, currentMood: mood } : npc
          ),
        }))
      },

      updateNpcPosition: (npcId, position) => {
        set((state) => ({
          npcs: state.npcs.map(npc =>
            npc.id === npcId ? { ...npc, position } : npc
          ),
        }))
      },

      setWorldState: (newState) => {
        set((state) => ({
          weather: newState.weather ?? state.weather,
          timeOfDay: newState.timeOfDay ?? state.timeOfDay,
          season: newState.season ?? state.season,
        }))
      },

      setShowInventory: (show) => set({ showInventory: show }),
      setShowMap: (show) => set({ showMap: show }),
      setShowSettings: (show) => set({ showSettings: show }),
      setShowDiary: (show) => set({ showDiary: show }),
      setPlayerPosition: (position) => set({ playerPosition: position }),
      setPlayerRotation: (rotation) => set({ playerRotation: rotation }),
      setJoystickInput: (x, y) => set({ joystickInput: { x, y } }),
      
      updateNpcConversation: (npcId, partnerId, content) => {
        set(state => ({
          npcs: state.npcs.map(npc => {
            if (npc.id === npcId) {
              return {
                ...npc,
                isInConversation: !!content,
                conversationContent: content || undefined,
                conversationPartner: partnerId || undefined
              }
            }
            return npc
          })
        }))
      },
    }),
    {
      name: 'heart-whisper-town-game-v4',
    }
  )
)