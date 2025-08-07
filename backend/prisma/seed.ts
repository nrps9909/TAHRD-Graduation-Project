import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding NPCs...')
  
  // Define NPCs data
  const npcs = [
    {
      id: 'npc-1',
      name: '鋁配咻',
      personality: '溫暖親切的咖啡館老闆娘，總是能敏銳察覺到他人的情緒變化，擅長傾聽和給予建議。',
      backgroundStory: '曾經是城市中的心理諮商師，因為想要用更輕鬆的方式幫助人們，所以來到小鎮開了這間咖啡館。',
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
      personality: '活潑開朗的大學生，充滿青春活力，對一切新鮮事物都充滿好奇心。',
      backgroundStory: '來自鄰近城市的大學生，假期時會來小鎮幫忙經營家族的小店。她的笑容總是能感染周圍的人。',
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
      personality: '充滿夢幻氣質的音樂家，經常在月光下彈奏吉他，用音樂治癒人心。',
      backgroundStory: '曾經是城市裡小有名氣的音樂人，因為想要尋找內心的平靜而來到小鎮，在這裡找到了真正的音樂靈感。',
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