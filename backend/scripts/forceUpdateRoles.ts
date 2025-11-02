import { PrismaClient, UserRole } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()

async function forceUpdateRoles() {
  try {
    console.log('🔧 強制更新所有用戶角色...')

    // 使用 MongoDB 原生更新，確保所有用戶都有 role 欄位
    const result = await prisma.user.updateMany({
      where: {
        username: {
          not: 'admin'
        }
      },
      data: {
        role: UserRole.USER
      }
    })

    console.log(`✅ 已更新 ${result.count} 位普通用戶的角色`)

    // 確認管理員角色
    const adminResult = await prisma.user.updateMany({
      where: {
        username: 'admin'
      },
      data: {
        role: UserRole.ADMIN
      }
    })

    console.log(`✅ 已更新 ${adminResult.count} 位管理員的角色`)

    // 顯示所有用戶
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    })

    console.log('━'.repeat(50))
    console.log('📋 所有用戶列表:')
    allUsers.forEach(user => {
      console.log(`   ${user.username} (${user.email}) - ${user.role}`)
    })
    console.log('━'.repeat(50))

    // 最終統計
    const userCount = await prisma.user.count({ where: { role: UserRole.USER } })
    const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } })

    console.log('📊 最終統計:')
    console.log(`   普通用戶: ${userCount}`)
    console.log(`   管理員: ${adminCount}`)
    console.log(`   總計: ${userCount + adminCount}`)

  } catch (error) {
    console.error('❌ 更新失敗:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Execute
forceUpdateRoles()
  .then(() => {
    console.log('🎉 腳本執行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 腳本執行失敗:', error)
    process.exit(1)
  })
