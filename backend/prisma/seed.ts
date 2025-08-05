import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding NPCs...')
  
  // Define NPCs data
  const npcs = [
    {
      id: 'npc-1',
      name: '小雅',
      personality: '溫暖親切的咖啡館老闆娘，總是能敏銳察覺到他人的情緒變化，擅長傾聽和給予建議。',
      backgroundStory: '曾經是城市中的心理諮商師，因為想要用更輕鬆的方式幫助人們，所以來到小鎮開了這間咖啡館。',
      appearanceConfig: {
        color: 'warm_brown',
        style: 'casual',
        accessories: ['apron', 'coffee_pin']
      },
      currentMood: 'cheerful',
      locationX: 10,
      locationY: 0,
      locationZ: 15
    },
    {
      id: 'npc-2',
      name: '阿山',
      personality: '內向但知識淵博的圖書館管理員，對古老的故事和歷史特別感興趣，喜歡安靜的環境。',
      backgroundStory: '從小就生活在書香世家，繼承了家族的圖書館。雖然不擅長社交，但對真心求知的人總是特別友善。',
      appearanceConfig: {
        color: 'deep_blue',
        style: 'scholarly',
        accessories: ['glasses', 'book_charm']
      },
      currentMood: 'calm',
      locationX: -20,
      locationY: 0,
      locationZ: -10
    },
    {
      id: 'npc-3',
      name: '月兒',
      personality: '充滿夢幻氣質的音樂家，經常在月光下彈奏吉他，用音樂治癒人心。',
      backgroundStory: '曾經是城市裡小有名氣的音樂人，因為想要尋找內心的平靜而來到小鎮，在這裡找到了真正的音樂靈感。',
      appearanceConfig: {
        color: 'moonlight_silver',
        style: 'artistic',
        accessories: ['moon_pendant', 'guitar_pick']
      },
      currentMood: 'dreamy',
      locationX: 0,
      locationY: 5,
      locationZ: 25
    },
    {
      id: 'npc-4',
      name: '老張',
      personality: '慈祥的花園管理員，對每一朵花都如數家珍，總是能從植物的生長中看到人生的哲理。',
      backgroundStory: '年輕時是一位探險家，走遍了世界各地。退休後選擇在小鎮定居，用餘生照顧這片美麗的花園。',
      appearanceConfig: {
        color: 'earth_green',
        style: 'gardener',
        accessories: ['straw_hat', 'flower_badge']
      },
      currentMood: 'peaceful',
      locationX: 30,
      locationY: 0,
      locationZ: 0
    },
    {
      id: 'npc-5',
      name: '小晴',
      personality: '活潑開朗的大學生，充滿青春活力，對一切新鮮事物都充滿好奇心。',
      backgroundStory: '來自鄰近城市的大學生，假期時會來小鎮幫忙經營家族的小店。她的笑容總是能感染周圍的人。',
      appearanceConfig: {
        color: 'sunny_yellow',
        style: 'youthful',
        accessories: ['backpack', 'camera']
      },
      currentMood: 'excited',
      locationX: -15,
      locationY: 0,
      locationZ: 20
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