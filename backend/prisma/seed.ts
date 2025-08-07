import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding NPCs...')
  
  // NPC 資料從個性檔案動態載入
  // 基本資料只定義位置和外觀
  const npcs = [
    {
      id: 'npc-1',
      name: '鋁配咻',
      personality: '從 personalities/lupeixiu_personality.txt 載入',
      backgroundStory: '從 personalities/lupeixiu_personality.txt 載入',
      appearanceConfig: {
        color: 'warm_brown',
        style: 'casual',
        accessories: ['apron', 'coffee_pin']
      },
      currentMood: 'cheerful',
      locationX: 3,
      locationY: 0,
      locationZ: 3
    },
    {
      id: 'npc-2',
      name: '流羽岑',
      personality: '從 personalities/liuyucen_personality.txt 載入',
      backgroundStory: '從 personalities/liuyucen_personality.txt 載入',
      appearanceConfig: {
        color: 'sunny_yellow',
        style: 'youthful',
        accessories: ['backpack', 'camera']
      },
      currentMood: 'excited',
      locationX: -3,
      locationY: 0,
      locationZ: 3
    },
    {
      id: 'npc-3',
      name: '沉停鞍',
      personality: '從 personalities/chentingan_personality.txt 載入',
      backgroundStory: '從 personalities/chentingan_personality.txt 載入',
      appearanceConfig: {
        color: 'moonlight_silver',
        style: 'artistic',
        accessories: ['moon_pendant', 'guitar_pick']
      },
      currentMood: 'dreamy',
      locationX: 0,
      locationY: 0,
      locationZ: 5
    }
  ]

  // Check if NPCs already exist
  const existingNPCs = await prisma.nPC.count()
  
  if (existingNPCs === 0) {
    // Create NPCs
    for (const npc of npcs) {
      await prisma.nPC.create({
        data: npc
      })
      console.log(`Created NPC: ${npc.name}`)
    }
    console.log('All NPCs seeded successfully!')
  } else {
    console.log('NPCs already exist, skipping seed.')
  }
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })