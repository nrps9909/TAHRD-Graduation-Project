import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import path from 'path'

// 載入環境變數
config({ path: path.resolve(__dirname, '../.env') })

const prisma = new PrismaClient()

async function testDatabase() {
  try {
    console.log('連接資料庫...')

    // 查詢最近註冊的用戶
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    console.log('\n最近註冊的用戶:')
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - 註冊於 ${user.createdAt}`)
    })

    console.log(`\n總共有 ${users.length} 個用戶`)

  } catch (error) {
    console.error('測試失敗:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
