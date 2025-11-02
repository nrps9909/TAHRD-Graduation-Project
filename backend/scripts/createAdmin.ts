import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    console.log('🔧 開始創建管理員帳號...')

    // Admin credentials
    const adminUsername = 'admin'
    const adminEmail = 'admin@heartwhisper.com'
    const adminPassword = 'admin123456' // 請在首次登入後修改密碼
    const adminDisplayName = '系統管理員'

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { username: adminUsername },
          { email: adminEmail },
          { role: UserRole.ADMIN }
        ]
      }
    })

    if (existingAdmin) {
      console.log('⚠️  管理員帳號已存在:')
      console.log(`   Username: ${existingAdmin.username}`)
      console.log(`   Email: ${existingAdmin.email}`)
      console.log(`   Role: ${existingAdmin.role}`)
      console.log(`   Created: ${existingAdmin.createdAt}`)
      return
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10)

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
        displayName: adminDisplayName,
        isActive: true
      }
    })

    console.log('✅ 管理員帳號創建成功！')
    console.log('━'.repeat(50))
    console.log('📋 登入資訊:')
    console.log(`   Username: ${adminUsername}`)
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Password: ${adminPassword}`)
    console.log(`   Role: ${admin.role}`)
    console.log('━'.repeat(50))
    console.log('⚠️  重要提醒: 請在首次登入後立即修改密碼！')
    console.log('')

  } catch (error) {
    console.error('❌ 創建管理員帳號失敗:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Execute
createAdmin()
  .then(() => {
    console.log('🎉 腳本執行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 腳本執行失敗:', error)
    process.exit(1)
  })
