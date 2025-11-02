import { PrismaClient, UserRole } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()

async function migrateUserRoles() {
  try {
    console.log('🔧 開始遷移用戶角色...')

    // 獲取所有用戶
    const allUsers = await prisma.user.findMany()

    console.log(`📊 找到 ${allUsers.length} 位用戶`)

    // 為每個用戶設置預設角色（如果還沒有的話）
    let updatedCount = 0
    for (const user of allUsers) {
      try {
        // 檢查 user.role 是否存在，如果不存在則設置為 USER
        const currentRole = (user as any).role

        if (!currentRole) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: UserRole.USER }
          })
          updatedCount++
          console.log(`✅ 已設置用戶 ${user.username} 的角色為 USER`)
        } else {
          console.log(`⏭️  用戶 ${user.username} 已有角色: ${currentRole}`)
        }
      } catch (error) {
        console.error(`❌ 更新用戶 ${user.username} 失敗:`, error)
      }
    }

    console.log('━'.repeat(50))
    console.log(`✅ 遷移完成！共更新 ${updatedCount} 位用戶`)
    console.log('━'.repeat(50))

    // 顯示統計
    const userCount = await prisma.user.count({ where: { role: UserRole.USER } })
    const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } })

    console.log('📊 當前用戶角色統計:')
    console.log(`   普通用戶 (USER): ${userCount}`)
    console.log(`   管理員 (ADMIN): ${adminCount}`)
    console.log('')

  } catch (error) {
    console.error('❌ 遷移失敗:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Execute
migrateUserRoles()
  .then(() => {
    console.log('🎉 腳本執行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 腳本執行失敗:', error)
    process.exit(1)
  })
