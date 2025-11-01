import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始種子資料建立...\n')

  // ============ 創建測試用戶 ============
  console.log('👤 創建測試用戶...')

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@heartwhisper.town' },
    update: {},
    create: {
      username: 'demo',
      email: 'demo@heartwhisper.town',
      passwordHash: '$2b$10$rZxJOQQZ2z4Z4Z4Z4Z4Z4OqYxQ4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4', // demo123
      displayName: 'Demo User',
      isActive: true
    }
  })

  console.log('✅ 測試用戶創建完成:', demoUser.username)

  // ============ 創建用戶設定 ============
  await prisma.userSettings.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      theme: 'light',
      language: 'zh-TW',
      defaultView: 'island',
      emailNotifications: true,
      dataRetentionDays: 365
    }
  })

  console.log('✅ 用戶設定創建完成')

  console.log('\n🎉 種子資料建立完成！')
  console.log('📧 測試帳號: demo@heartwhisper.town')
  console.log('🔑 測試密碼: demo123')
}

main()
  .catch((e) => {
    console.error('❌ 種子資料建立失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
