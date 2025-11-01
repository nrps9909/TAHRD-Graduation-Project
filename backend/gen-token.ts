import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = 'heart_whisper_town_dev_secret_2025'

async function main() {
  const user = await prisma.user.findFirst()
  if (!user) {
    console.error('No user found')
    process.exit(1)
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  console.log(token)
  await prisma.$disconnect()
}

main()
