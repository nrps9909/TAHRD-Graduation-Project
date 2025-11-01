/**
 * 快速獲取測試用 Token
 *
 * 這個腳本會：
 * 1. 檢查資料庫是否有用戶
 * 2. 使用第一個用戶生成 token
 * 3. 打印 token 供測試使用
 */

import { PrismaClient } from '@prisma/client'
import { generateToken } from './src/utils/auth'

const prisma = new PrismaClient()

async function getTestToken() {
  try {
    console.log('🔍 查找測試用戶...\n')

    // 獲取第一個用戶
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        username: true
      }
    })

    if (!user) {
      console.error('❌ 資料庫中沒有用戶')
      console.error('\n💡 請先：')
      console.error('   1. 啟動前端應用')
      console.error('   2. 註冊一個測試帳號')
      console.error('   3. 再次執行此腳本')
      process.exit(1)
    }

    console.log('✅ 找到用戶:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Username: ${user.username}`)
    console.log()

    // 生成 token
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
    console.log(`   export TEST_TOKEN="${token}"`)
    console.log('   npx ts-node test-streaming-simple.ts')
    console.log()
    console.log('或直接:')
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
