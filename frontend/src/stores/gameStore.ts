import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { generateSpawnPoints } from '@/game/spawn'
import { getTreeColliders } from '@/components/3D/TerrainModel'
import { getGround } from '@/game/ground'

const PLAYER_SAFE_OFFSET = 0.12
const CENTER = { x: 0, z: 0 }

// 分配出生點給玩家和 NPC
function assignSpawnPoints(npcList: NPC[]): {
  playerPosition: [number, number, number],
  updatedNpcs: NPC[]
} {
  const count = npcList.length + 1 // 玩家 + NPC
  const trees = getTreeColliders()

  // 建築物碰撞數據 - 根據實際建築位置和大小
  const buildingColliders = [
    { x: -15, z: -45, r: 12 },  // Inn旅館
    { x: 45, z: -60, r: 15 },   // 風車
    { x: -55, z: -45, r: 12 },  // 房屋A
    { x: 35, z: 25, r: 13 },    // 倉庫
    { x: -45, z: 25, r: 12 },   // 房屋B
    { x: -5, z: -5, r: 10 },    // Bell Tower 起始視野內
    { x: 5, z: -25, r: 16 },    // 大型鐵匠鋪 (較大碰撞半徑)
  ]

  console.log(`🎯 生成 ${count} 個出生點 (1個玩家 + ${npcList.length}個NPC)`)
  console.log(`🌳 使用 ${trees.length} 個樹木碰撞器`)
  console.log(`🏠 使用 ${buildingColliders.length} 個建築物碰撞器，避免NPC生成在建築物內`)

  // 依地圖中心產生一圈分散點 - 超大間距避免NPC碰撞，並避開建築物
  const spawns = generateSpawnPoints({
    count,
    center: CENTER,
    startRadius: 25,     // 大幅增大初始半徑，讓NPC離得更遠
    step: 10.0,          // 大幅增大每點往外擴距
    minDist: 15.0,       // 超大兩點最小距離（避免NPC相撞）
    maxSlopeDeg: 25,     // 稍微降低坡度要求，確保有足夠安全位置
    treeColliders: trees,
    buildingColliders: buildingColliders, // 新增建築物避讓
  })

  console.log(`✅ 成功生成 ${spawns.length} 個出生點`)

  // 第一個給玩家
  const playerSpawn = spawns.shift()
  let playerPosition: [number, number, number] = [-15, 5, -15] // 預設位置

  if (playerSpawn) {
    const gh = getGround(playerSpawn.x, playerSpawn.z)
    const y = (gh.y ?? playerSpawn.y) + PLAYER_SAFE_OFFSET
    playerPosition = [playerSpawn.x, y, playerSpawn.z]
    console.log(`🎮 玩家出生點: (${playerSpawn.x.toFixed(1)}, ${y.toFixed(1)}, ${playerSpawn.z.toFixed(1)})`)
  }

  // 其餘給 NPC
  const updatedNpcs = npcList.map((npc, i) => {
    const spawn = spawns[i] ?? spawns[spawns.length - 1] ?? { x: 0, y: 5, z: 0 }
    const gh = getGround(spawn.x, spawn.z)
    const y = (gh.y ?? spawn.y) + PLAYER_SAFE_OFFSET
    const newPosition: [number, number, number] = [spawn.x, y, spawn.z]

    console.log(`🤖 ${npc.name} 出生點: (${spawn.x.toFixed(1)}, ${y.toFixed(1)}, ${spawn.z.toFixed(1)})`)

    return {
      ...npc,
      position: newPosition
    }
  })

  return { playerPosition, updatedNpcs }
}

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
  getPlayerPosition: () => { x: number; y: number; z: number } | null
}

export const useGameStore = create<GameState>()(
  devtools(
    (set, get) => ({
      // Initial state
      playerId: null,
      playerName: '',
      playerPosition: [-15, 0, -15], // 安全的spawn位置，遠離山脈和NPC位置
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
        
        // 建立預設NPC數據（暫時位置，稍後會被出生點替換）
        const defaultNPCs = [
          {
            id: 'npc-1',
            name: '陸培修',
            personality: '夢幻的藝術家',
            currentMood: 'cheerful',
            position: [0, 5, 0] as [number, number, number], // 臨時位置
            relationshipLevel: 1,
          },
          {
            id: 'npc-2',
            name: '劉宇岑',
            personality: '充滿活力的朋友',
            currentMood: 'excited',
            position: [0, 5, 0] as [number, number, number], // 臨時位置
            relationshipLevel: 1,
          },
          {
            id: 'npc-3',
            name: '陳庭安',
            personality: '溫柔的靈魂',
            currentMood: 'dreamy',
            position: [0, 5, 0] as [number, number, number], // 臨時位置
            relationshipLevel: 1,
          },
        ]

        // 使用出生點系統分配預設NPC位置
        const { playerPosition: defaultPlayerPos, updatedNpcs: defaultNPCsWithSpawns } = assignSpawnPoints(defaultNPCs)

        try {
          console.log('🎮 開始載入NPC數據...')

          console.log('✅ 使用預設NPC數據並分配出生點:')
          defaultNPCsWithSpawns.forEach(npc =>
            console.log(`  ${npc.name}: (${npc.position[0].toFixed(1)}, ${npc.position[1].toFixed(1)}, ${npc.position[2].toFixed(1)})`)
          )
          
          set({
            playerId: 'player-1',
            playerName: '旅人',
            playerPosition: [-15, 18, -15],
            npcs: defaultNPCs,
            isLoading: false,
          })
          
          // 嘗試從後端載入作為備用
          try {
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
            console.log('📡 後端NPC數據:', data)
            
            if (data?.data?.npcs && data.data.npcs.length > 0) {
              // 預設的3D模型內安全位置（稍微抬高）
              const defaultPositions: Record<string, [number, number, number]> = {
                'npc-1': [5, 10, 8],     // 陸培修 - 中央附近安全位置
                'npc-2': [-8, 10, 5],    // 劉宇岑 - 中央附近安全位置
                'npc-3': [3, 10, -6]     // 陳庭安 - 中央附近安全位置
              }
              
              // 將後端資料轉換為前端格式，暫時使用臨時位置
              const npcs = data.data.npcs.map((npc: any) => {
                return {
                  id: npc.id,
                  name: npc.name,
                  personality: npc.personality || '載入中...',
                  currentMood: npc.currentMood || 'neutral',
                  position: [0, 5, 0] as [number, number, number], // 臨時位置，稍後會被出生點替換
                  relationshipLevel: 1,
                }
              })

              // 使用出生點系統分配位置，確保彼此不相撞
              const { playerPosition, updatedNpcs } = assignSpawnPoints(npcs)

              console.log('✅ 成功從後端載入NPC資料並分配出生點:')
              updatedNpcs.forEach(npc =>
                console.log(`  ${npc.name}: (${npc.position[0].toFixed(1)}, ${npc.position[1].toFixed(1)}, ${npc.position[2].toFixed(1)})`)
              )
              console.log(`✅ 玩家出生點: (${playerPosition[0].toFixed(1)}, ${playerPosition[1].toFixed(1)}, ${playerPosition[2].toFixed(1)})`)

              set({
                playerId: 'player-1',
                playerName: '旅人',
                playerPosition,
                npcs: updatedNpcs,
                isLoading: false,
              })
            } else {
              // 後端無資料，使用預設值
              console.warn('後端無NPC資料，使用預設值')
              set({
                playerId: 'player-1',
                playerName: '旅人',
                playerPosition: defaultPlayerPos,
                npcs: defaultNPCsWithSpawns,
                isLoading: false,
              })
            }
          } catch (backendError) {
            console.log('📡 後端載入失敗（使用預設數據）:', backendError)
            set({
              playerId: 'player-1',
              playerName: '旅人',
              playerPosition: defaultPlayerPos,
              npcs: defaultNPCsWithSpawns,
              isLoading: false,
            })
          }
        } catch (error) {
          console.error('載入遊戲資料失敗:', error)
          // 使用預設資料
          set({
            playerId: 'player-1',
            playerName: '旅人',
            playerPosition: defaultPlayerPos,
            npcs: defaultNPCsWithSpawns,
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
      
      getPlayerPosition: () => {
        const state = get()
        return {
          x: state.playerPosition[0],
          y: state.playerPosition[1],
          z: state.playerPosition[2]
        }
      },
    }),
    {
      name: 'heart-whisper-town-game-v4',
    }
  )
)