import { PrismaClient } from '@prisma/client'
import { AGENTS } from '../services/multiAgentService'

const prisma = new PrismaClient()

// NPC配置（基於現有的3個NPC擴展為7個agents）
const NPC_CONFIGS = [
  // 保留原有的3個NPC
  {
    id: 'npc-1',
    name: '陸培修',
    personality: '夢幻、浪漫、喜歡藝術',
    backgroundStory: '一個充滿夢想的藝術家',
    currentMood: 'dreamy',
    locationX: 10,
    locationY: 0,
    locationZ: 10,
    appearanceConfig: {
      model: 'artist',
      color: '#FFD93D'
    }
  },
  {
    id: 'npc-2',
    name: '劉宇岑',
    personality: '活潑、熱情、充滿活力',
    backgroundStory: '充滿活力的朋友',
    currentMood: 'cheerful',
    locationX: -10,
    locationY: 0,
    locationZ: 10,
    appearanceConfig: {
      model: 'energetic',
      color: '#FF6B9D'
    }
  },
  {
    id: 'npc-3',
    name: '陳庭安',
    personality: '溫柔、細心、善於傾聽',
    backgroundStory: '溫柔的傾聽者',
    currentMood: 'calm',
    locationX: 0,
    locationY: 0,
    locationZ: -10,
    appearanceConfig: {
      model: 'gentle',
      color: '#FF8FA3'
    }
  },

  // 新增4個NPCs來對應其他agents
  {
    id: 'npc-4',
    name: '小知',
    personality: '聰明、溫暖、像個管家',
    backgroundStory: '你的主助手和管家',
    currentMood: 'helpful',
    locationX: 0,
    locationY: 0,
    locationZ: 0,
    appearanceConfig: {
      model: 'chief',
      color: '#4ECDC4'
    }
  },
  {
    id: 'npc-5',
    name: '八卦通',
    personality: '八卦、有趣、像閨蜜',
    backgroundStory: '專門記錄八卦的助手',
    currentMood: 'curious',
    locationX: 15,
    locationY: 0,
    locationZ: 0,
    appearanceConfig: {
      model: 'gossip',
      color: '#FF6B9D'
    }
  },
  {
    id: 'npc-6',
    name: '生活夥伴',
    personality: '實在、溫暖、關心細節',
    backgroundStory: '記錄你日常生活的助手',
    currentMood: 'caring',
    locationX: -15,
    locationY: 0,
    locationZ: 0,
    appearanceConfig: {
      model: 'life',
      color: '#6BCB77'
    }
  },
  {
    id: 'npc-7',
    name: '學習通',
    personality: '耐心、有條理、像家教',
    backgroundStory: '幫你整理學習筆記的助手',
    currentMood: 'focused',
    locationX: 0,
    locationY: 0,
    locationZ: 15,
    appearanceConfig: {
      model: 'study',
      color: '#4D96FF'
    }
  }
]

async function initializeAgentsAndNPCs() {
  console.log('🚀 初始化 AI Agents...')

  // 1. 初始化 AI Agents
  for (const [key, agent] of Object.entries(AGENTS)) {
    try {
      await prisma.aIAgent.upsert({
        where: { id: agent.id },
        update: {
          name: agent.name,
          category: agent.category,
          personality: agent.personality,
          emoji: agent.emoji,
          color: agent.color,
          systemPrompt: agent.systemPrompt
        },
        create: {
          id: agent.id,
          name: agent.name,
          category: agent.category,
          personality: agent.personality,
          emoji: agent.emoji,
          color: agent.color,
          systemPrompt: agent.systemPrompt
        }
      })
      console.log(`✅ Agent ${agent.name} (${agent.id}) initialized`)
    } catch (error) {
      console.error(`❌ Failed to initialize agent ${agent.name}:`, error)
    }
  }

  console.log('\n🎭 初始化 NPCs...')

  // 2. 初始化 NPCs
  for (const npcConfig of NPC_CONFIGS) {
    try {
      await prisma.nPC.upsert({
        where: { id: npcConfig.id },
        update: {
          name: npcConfig.name,
          personality: npcConfig.personality,
          backgroundStory: npcConfig.backgroundStory,
          currentMood: npcConfig.currentMood,
          locationX: npcConfig.locationX,
          locationY: npcConfig.locationY,
          locationZ: npcConfig.locationZ,
          appearanceConfig: npcConfig.appearanceConfig
        },
        create: {
          id: npcConfig.id,
          name: npcConfig.name,
          personality: npcConfig.personality,
          backgroundStory: npcConfig.backgroundStory,
          currentMood: npcConfig.currentMood,
          locationX: npcConfig.locationX,
          locationY: npcConfig.locationY,
          locationZ: npcConfig.locationZ,
          appearanceConfig: npcConfig.appearanceConfig
        }
      })
      console.log(`✅ NPC ${npcConfig.name} (${npcConfig.id}) initialized`)
    } catch (error) {
      console.error(`❌ Failed to initialize NPC ${npcConfig.name}:`, error)
    }
  }

  console.log('\n✨ 初始化完成！')
  console.log(`\n📊 統計：`)
  const agentCount = await prisma.aIAgent.count()
  const npcCount = await prisma.nPC.count()
  console.log(`- AI Agents: ${agentCount}`)
  console.log(`- NPCs: ${npcCount}`)
}

// 執行初始化
initializeAgentsAndNPCs()
  .then(() => {
    console.log('\n🎉 所有agents和NPCs初始化成功！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ 初始化失敗:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
