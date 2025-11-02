/**
 * Authentication utilities
 */

import jwt from 'jsonwebtoken'
import { getConfig } from './config'
import { PrismaClient, UserRole } from '@prisma/client'

const config = getConfig()
const prisma = new PrismaClient()

export interface TokenPayload {
  userId: string
  email?: string
  iat?: number
  exp?: number
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload
    return decoded
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Generate JWT token
 */
export function generateToken(payload: { userId: string; email?: string }): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d'
  })
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    return user?.role === UserRole.ADMIN
  } catch (error) {
    return false
  }
}

/**
 * Require admin role (middleware helper)
 */
export async function requireAdmin(userId: string): Promise<void> {
  const admin = await isAdmin(userId)
  if (!admin) {
    throw new Error('Permission denied: Admin role required')
  }
}
