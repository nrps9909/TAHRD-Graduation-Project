/**
 * 簡單的 Token 生成腳本，繞過配置驗證
 */

import { PrismaClient } from '@prisma/client'
import { generateToken } from './src/utils/auth'

const prisma = new PrismaClient()

async function getTestToken() {
  try {
    console.log('🔍 查找用戶...\n')

    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        username: true
      }
    })

    if (!user) {
      console.error('❌ 資料庫中沒有用戶')
      console.error('\n💡 請先註冊一個測試帳號')
      process.exit(1)
    }

    console.log('✅ 找到用戶:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Username: ${user.username}`)
    console.log()

    // 使用與服務器相同的 generateToken 函數
    const token = generateToken({
      userId: user.id,
      email: user.email!
    })

    console.log('🎫 測試用 Token:')
    console.log('='.repeat(80))
    console.log(token)
    console.log('='.repeat(80))
    console.log()

    console.log('📋 使用方法:')
    console.log(`   ./test-streaming-quick.sh "${token}"`)
    console.log()
    console.log('或:')
    console.log(`   npx ts-node test-streaming-simple.ts "${token}"`)
    console.log()

    await prisma.$disconnect()

  } catch (error) {
    console.error('❌ 錯誤:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

getTestToken()
