/**
 * Authentication utilities
 */

import jwt from 'jsonwebtoken'
import { getConfig } from './config'

const config = getConfig()

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
