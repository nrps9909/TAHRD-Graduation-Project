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

interface Friend {
  id: string
  name: string
  avatar: string
  status: 'online' | 'offline' | 'away' | 'busy'
  level: number
  lastSeen: Date
  relationshipLevel: number
  location?: string
}

interface ChatRoom {
  id: string
  name: string
  type: 'group' | 'direct'
  participants: string[]
  lastMessage?: {
    content: string
    sender: string
    timestamp: Date
  }
  unreadCount: number
}

interface ChatMessage {
  id: string
  chatRoomId: string
  content: string
  sender: string
  senderName: string
  timestamp: Date
  messageType: 'text' | 'image' | 'gift'
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
  
  // Social features
  friends: Friend[]
  chatRooms: ChatRoom[]
  chatMessages: ChatMessage[]
  
  // World state
  weather: string
  timeOfDay: number
  season: string
  
  // Game mode
  gameMode: 'single' | 'multiplayer' | 'exploration' | 'social' | null
  
  // UI state
  isLoading: boolean
  showDialogue: boolean
  showInventory: boolean
  showMap: boolean
  showSettings: boolean
  showDiary: boolean
  showGameMenu: boolean
  showSocialMenu: boolean
  showWorldMenu: boolean
  showQuickCommandMenu: boolean
  showQuickGameModeMenu: boolean
  
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
  setGameMode: (mode: 'single' | 'multiplayer' | 'exploration' | 'social' | null) => void
  setShowInventory: (show: boolean) => void
  setShowMap: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  setShowDiary: (show: boolean) => void
  setShowGameMenu: (show: boolean) => void
  setShowSocialMenu: (show: boolean) => void
  setShowWorldMenu: (show: boolean) => void
  setShowQuickCommandMenu: (show: boolean) => void
  setShowQuickGameModeMenu: (show: boolean) => void
  setPlayerPosition: (position: [number, number, number]) => void
  setPlayerRotation: (rotation: number) => void
  setJoystickInput: (x: number, y: number) => void
  updateNpcConversation: (npcId: string, partnerId: string | null, content: string | null) => void
  addFriend: (friend: Friend) => void
  updateFriendStatus: (friendId: string, status: 'online' | 'offline' | 'away' | 'busy') => void
  addChatRoom: (chatRoom: ChatRoom) => void
  addChatMessage: (message: ChatMessage) => void
}

export const useGameStore = create<GameState>()(
  devtools(
    (set, get) => ({
      // Initial state
      playerId: null,
      playerName: '',
      playerPosition: [0, 0.5, 0],
      playerRotation: 0,
      joystickInput: { x: 0, y: 0 },
      npcs: [],
      selectedNpc: null,
      conversations: [],
      isInConversation: false,
      isTyping: false,
      memoryFlowers: [],
      friends: [
        {
          id: 'friend-1',
          name: '陸培修',
          avatar: '🎨',
          status: 'online',
          level: 15,
          lastSeen: new Date(),
          relationshipLevel: 3,
          location: '藝術工作室'
        },
        {
          id: 'friend-2',
          name: '劉宇岑',
          avatar: '⚡',
          status: 'online',
          level: 22,
          lastSeen: new Date(Date.now() - 300000), // 5 minutes ago
          relationshipLevel: 4,
          location: '冒險廣場'
        },
        {
          id: 'friend-3',
          name: '陳庭安',
          avatar: '🌸',
          status: 'away',
          level: 18,
          lastSeen: new Date(Date.now() - 600000), // 10 minutes ago
          relationshipLevel: 2,
          location: '花園小徑'
        },
        {
          id: 'friend-4',
          name: '小雲',
          avatar: '☁️',
          status: 'offline',
          level: 8,
          lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
          relationshipLevel: 1,
          location: '未知'
        }
      ],
      chatRooms: [
        {
          id: 'room-1',
          name: '心語小鎮大廳',
          type: 'group',
          participants: ['player-1', 'friend-1', 'friend-2', 'friend-3'],
          lastMessage: {
            content: '今天天氣真好呢！',
            sender: 'friend-2',
            timestamp: new Date(Date.now() - 180000) // 3 minutes ago
          },
          unreadCount: 2
        },
        {
          id: 'room-2',
          name: '藝術交流群',
          type: 'group',
          participants: ['player-1', 'friend-1'],
          lastMessage: {
            content: '我剛完成了一幅新畫作',
            sender: 'friend-1',
            timestamp: new Date(Date.now() - 900000) // 15 minutes ago
          },
          unreadCount: 0
        },
        {
          id: 'room-3',
          name: '與陳庭安的對話',
          type: 'direct',
          participants: ['player-1', 'friend-3'],
          lastMessage: {
            content: '謝謝你的幫助！',
            sender: 'player-1',
            timestamp: new Date(Date.now() - 1800000) // 30 minutes ago
          },
          unreadCount: 1
        }
      ],
      chatMessages: [
        {
          id: 'msg-1',
          chatRoomId: 'room-1',
          content: '大家好！歡迎來到心語小鎮 💕',
          sender: 'friend-1',
          senderName: '陸培修',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          messageType: 'text'
        },
        {
          id: 'msg-2',
          chatRoomId: 'room-1',
          content: '哇！這個地方好美！',
          sender: 'player-1',
          senderName: '旅人',
          timestamp: new Date(Date.now() - 3300000), // 55 minutes ago
          messageType: 'text'
        },
        {
          id: 'msg-3',
          chatRoomId: 'room-1',
          content: '我們一起去探險吧！🌟',
          sender: 'friend-2',
          senderName: '劉宇岑',
          timestamp: new Date(Date.now() - 900000), // 15 minutes ago
          messageType: 'text'
        },
        {
          id: 'msg-4',
          chatRoomId: 'room-1',
          content: '今天天氣真好呢！',
          sender: 'friend-2',
          senderName: '劉宇岑',
          timestamp: new Date(Date.now() - 180000), // 3 minutes ago
          messageType: 'text'
        },
        {
          id: 'msg-5',
          chatRoomId: 'room-2',
          content: '我剛完成了一幅新畫作',
          sender: 'friend-1',
          senderName: '陸培修',
          timestamp: new Date(Date.now() - 900000), // 15 minutes ago
          messageType: 'text'
        },
        {
          id: 'msg-6',
          chatRoomId: 'room-3',
          content: '你今天過得怎麼樣？',
          sender: 'friend-3',
          senderName: '陳庭安',
          timestamp: new Date(Date.now() - 2100000), // 35 minutes ago
          messageType: 'text'
        },
        {
          id: 'msg-7',
          chatRoomId: 'room-3',
          content: '謝謝你的幫助！',
          sender: 'player-1',
          senderName: '旅人',
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          messageType: 'text'
        }
      ],
      weather: 'sunny',
      timeOfDay: 12,
      season: 'spring',
      gameMode: null,
      isLoading: true,
      showDialogue: false,
      showInventory: false,
      showMap: false,
      showSettings: false,
      showDiary: false,
      showGameMenu: false,
      showSocialMenu: false,
      showWorldMenu: false,
      showQuickCommandMenu: false,
      showQuickGameModeMenu: false,

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
            // 將後端資料轉換為前端格式
            const npcs = data.data.npcs.map((npc: any) => ({
              id: npc.id,
              name: npc.name,
              personality: npc.personality || '載入中...',
              currentMood: npc.currentMood || 'neutral',
              position: [npc.location?.x || 0, npc.location?.y || 0, npc.location?.z || 0] as [number, number, number],
              relationshipLevel: 1,
            }))
            
            set({
              playerId: 'player-1',
              playerName: '旅人',
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
                  position: [3, 0, 3],
                  relationshipLevel: 1,
                },
                {
                  id: 'npc-2',
                  name: '劉宇岑',
                  personality: '充滿活力的朋友',
                  currentMood: 'excited',
                  position: [-3, 0, 3],
                  relationshipLevel: 1,
                },
                {
                  id: 'npc-3',
                  name: '陳庭安',
                  personality: '溫柔的靈魂',
                  currentMood: 'dreamy',
                  position: [0, 0, 5],
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
            npcs: [
              {
                id: 'npc-1',
                name: '陸培修',
                personality: '夢幻的藝術家',
                currentMood: 'cheerful',
                position: [3, 0, 3],
                relationshipLevel: 1,
              },
              {
                id: 'npc-2',
                name: '劉宇岑',
                personality: '充滿活力的朋友',
                currentMood: 'excited',
                position: [-3, 0, 3],
                relationshipLevel: 1,
              },
              {
                id: 'npc-3',
                name: '陳庭安',
                personality: '溫柔的靈魂',
                currentMood: 'dreamy',
                position: [0, 0, 5],
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

      setGameMode: (mode) => set({ gameMode: mode }),

      setShowInventory: (show) => set({ showInventory: show }),
      setShowMap: (show) => set({ showMap: show }),
      setShowSettings: (show) => set({ showSettings: show }),
      setShowDiary: (show) => set({ showDiary: show }),
      setShowGameMenu: (show) => set({ showGameMenu: show }),
      setShowSocialMenu: (show) => set({ showSocialMenu: show }),
      setShowWorldMenu: (show) => set({ showWorldMenu: show }),
      setShowQuickCommandMenu: (show) => set({ showQuickCommandMenu: show }),
      setShowQuickGameModeMenu: (show) => set({ showQuickGameModeMenu: show }),
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

      addFriend: (friend) => {
        set(state => ({
          friends: [...state.friends, friend]
        }))
      },

      updateFriendStatus: (friendId, status) => {
        set(state => ({
          friends: state.friends.map(friend =>
            friend.id === friendId ? { ...friend, status, lastSeen: new Date() } : friend
          )
        }))
      },

      addChatRoom: (chatRoom) => {
        set(state => ({
          chatRooms: [...state.chatRooms, chatRoom]
        }))
      },

      addChatMessage: (message) => {
        set(state => ({
          chatMessages: [...state.chatMessages, message]
        }))
      },
    }),
    {
      name: 'heart-whisper-town-game',
    }
  )
)