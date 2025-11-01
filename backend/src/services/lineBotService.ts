/**
 * LINE Bot Service
 * 處理 LINE Bot 的業務邏輯：認證、狀態管理、知識上傳
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { chiefAgentService } from './chiefAgentService'
import bcrypt from 'bcryptjs'
import Redis from 'ioredis'

const prisma = new PrismaClient()
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined
})

// 使用者狀態定義
enum UserState {
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  WAITING_FOR_EMAIL = 'WAITING_FOR_EMAIL',
  WAITING_FOR_PASSWORD = 'WAITING_FOR_PASSWORD',
  AUTHENTICATED = 'AUTHENTICATED'
}

interface UserSession {
  state: UserState
  email?: string
  userId?: string
  lastActivity: number
}

/**
 * LINE Bot Service Class
 */
class LineBotService {
  private readonly SESSION_TTL = 30 * 60 // 30 分鐘（秒）
  private readonly SESSION_PREFIX = 'linebot:session:'
  private readonly USER_MAPPING_PREFIX = 'linebot:user:'

  /**
   * 處理用戶訊息的主要入口
   */
  async handleMessage(lineUserId: string, message: string): Promise<string> {
    try {
      // 獲取或創建用戶會話
      let session = await this.getSession(lineUserId)

      // 處理指令
      if (message.startsWith('/')) {
        return await this.handleCommand(lineUserId, message, session)
      }

      // 根據狀態處理訊息
      switch (session.state) {
        case UserState.NOT_AUTHENTICATED:
        case UserState.WAITING_FOR_EMAIL:
          return await this.handleEmailInput(lineUserId, message, session)

        case UserState.WAITING_FOR_PASSWORD:
          return await this.handlePasswordInput(lineUserId, message, session)

        case UserState.AUTHENTICATED:
          return await this.handleKnowledgeUpload(lineUserId, message, session)

        default:
          return '發生了一些錯誤，請輸入 /login 重新登入'
      }

    } catch (error: any) {
      logger.error('[LINE Bot Service] Handle message error:', error)
      return '抱歉，發生了一些錯誤，請稍後再試～'
    }
  }

  /**
   * 處理指令（以 / 開頭的訊息）
   */
  private async handleCommand(lineUserId: string, command: string, session: UserSession): Promise<string> {
    const cmd = command.toLowerCase().trim()

    switch (cmd) {
      case '/login':
      case '/start':
        session.state = UserState.WAITING_FOR_EMAIL
        await this.saveSession(lineUserId, session)
        return '你好！我是白噗噗 🐾\n\n請輸入你的電子郵件地址來登入：'

      case '/logout':
        await this.clearSession(lineUserId)
        return '已登出！\n\n如要重新登入，請輸入 /login'

      case '/status':
        if (session.state === UserState.AUTHENTICATED) {
          const user = await prisma.user.findUnique({
            where: { id: session.userId }
          })
          return `✅ 已登入\n\n使用者：${user?.displayName || user?.username || user?.email}\n\n你可以直接傳送訊息來上傳知識！`
        } else {
          return '❌ 未登入\n\n請輸入 /login 開始登入'
        }

      case '/help':
        return this.getHelpMessage(session.state)

      default:
        return '不認識的指令呢～\n\n輸入 /help 查看可用指令'
    }
  }

  /**
   * 處理電子郵件輸入
   */
  private async handleEmailInput(lineUserId: string, email: string, session: UserSession): Promise<string> {
    // 驗證 email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return '這個電子郵件格式好像不太對喔～\n\n請重新輸入你的電子郵件地址：'
    }

    // 檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return '找不到這個帳號呢～\n\n請確認電子郵件是否正確，或先到網頁版註冊帳號！'
    }

    // 儲存 email，進入密碼輸入狀態
    session.email = email.toLowerCase()
    session.state = UserState.WAITING_FOR_PASSWORD
    await this.saveSession(lineUserId, session)

    return `找到你的帳號了！\n\n請輸入密碼：\n（你的密碼在 LINE 是安全的，我不會記錄下來）`
  }

  /**
   * 處理密碼輸入
   */
  private async handlePasswordInput(lineUserId: string, password: string, session: UserSession): Promise<string> {
    if (!session.email) {
      session.state = UserState.WAITING_FOR_EMAIL
      await this.saveSession(lineUserId, session)
      return '會話已過期，請重新輸入電子郵件：'
    }

    // 驗證密碼
    const user = await prisma.user.findUnique({
      where: { email: session.email }
    })

    if (!user) {
      session.state = UserState.WAITING_FOR_EMAIL
      session.email = undefined
      await this.saveSession(lineUserId, session)
      return '找不到帳號，請重新輸入電子郵件：'
    }

    // 比對密碼
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      return '密碼錯誤～\n\n請重新輸入密碼：'
    }

    // 登入成功！
    session.state = UserState.AUTHENTICATED
    session.userId = user.id
    await this.saveSession(lineUserId, session)

    // 儲存 LINE User ID 到用戶映射
    await this.saveUserMapping(user.id, lineUserId)

    logger.info(`[LINE Bot] 用戶登入成功: ${user.email} (LINE: ${lineUserId})`)

    return `✨ 登入成功！\n\n歡迎回來，${user.displayName || user.username || '旅人'}！\n\n現在你可以直接傳送訊息給我，我會幫你整理和記錄這些知識～\n\n💡 試著告訴我一些你想記錄的事情吧！`
  }

  /**
   * 處理知識上傳
   */
  private async handleKnowledgeUpload(lineUserId: string, content: string, session: UserSession): Promise<string> {
    if (!session.userId) {
      session.state = UserState.WAITING_FOR_EMAIL
      await this.saveSession(lineUserId, session)
      return '會話已過期，請輸入 /login 重新登入'
    }

    try {
      logger.info(`[LINE Bot] 開始處理知識上傳: 用戶 ${session.userId}`)

      // 使用 ChiefAgent 處理知識上傳（streaming 模式）
      const streamGenerator = chiefAgentService.uploadKnowledgeStream(session.userId, {
        content,
        files: [],
        links: []
      })

      // 收集所有 stream 事件
      let category = ''
      let warmResponse = ''
      let quickSummary = ''
      let memoryId = ''

      for await (const event of streamGenerator) {
        switch (event.type) {
          case 'initial':
            category = event.data.category || ''
            warmResponse = event.data.warmResponse || ''
            quickSummary = event.data.quickSummary || ''
            break

          case 'complete':
            memoryId = event.data.memoryId || ''
            break
        }
      }

      // 產生白噗噗風格的回應
      const response = this.generateTororoResponse(category, warmResponse, quickSummary)

      logger.info(`[LINE Bot] 知識上傳完成: Memory ${memoryId}`)

      return response

    } catch (error: any) {
      logger.error('[LINE Bot] Knowledge upload error:', error)
      return '哎呀，處理你的知識時遇到了一些問題～\n\n請稍後再試，或確認你的訊息格式是否正確！'
    }
  }

  /**
   * 產生白噗噗風格的回應訊息
   */
  private generateTororoResponse(category: string, warmResponse: string, quickSummary: string): string {
    const categoryNames: { [key: string]: string } = {
      'WORK': '工作',
      'STUDY': '學習',
      'LIFE': '生活',
      'EMOTION': '情感',
      'HEALTH': '健康',
      'FINANCE': '財務',
      'HOBBY': '興趣',
      'TRAVEL': '旅行',
      'FOOD': '美食',
      'ENTERTAINMENT': '娛樂',
      'NATURE': '自然'
    }

    const categoryName = categoryNames[category] || '其他'

    let response = '✨ 收到了！\n\n'

    if (warmResponse) {
      response += `${warmResponse}\n\n`
    } else {
      response += '很高興你跟我分享這個知識～\n\n'
    }

    response += `📁 已經幫你歸類到「${categoryName}」了\n\n`

    if (quickSummary) {
      response += `📝 ${quickSummary}\n\n`
    }

    response += '你可以到網頁版查看更多細節喔！'

    return response
  }

  /**
   * 取得幫助訊息
   */
  private getHelpMessage(state: UserState): string {
    if (state === UserState.AUTHENTICATED) {
      return `📖 白噗噗指令說明

直接傳送訊息 - 上傳知識
/status - 查看登入狀態
/logout - 登出
/help - 顯示此說明

💡 提示：
你可以直接傳送任何想記錄的內容給我，我會幫你整理和分類！`
    }

    return `📖 白噗噗指令說明

/login - 登入帳號
/help - 顯示此說明

💡 提示：
登入後就可以直接傳送訊息給我，上傳你想記錄的知識！`
  }

  /**
   * 會話管理 - 取得會話
   */
  private async getSession(lineUserId: string): Promise<UserSession> {
    const key = `${this.SESSION_PREFIX}${lineUserId}`
    const data = await redis.get(key)

    if (data) {
      const session = JSON.parse(data) as UserSession
      session.lastActivity = Date.now()
      await this.saveSession(lineUserId, session)
      return session
    }

    // 創建新會話
    const newSession: UserSession = {
      state: UserState.NOT_AUTHENTICATED,
      lastActivity: Date.now()
    }
    await this.saveSession(lineUserId, newSession)
    return newSession
  }

  /**
   * 會話管理 - 儲存會話
   */
  private async saveSession(lineUserId: string, session: UserSession): Promise<void> {
    const key = `${this.SESSION_PREFIX}${lineUserId}`
    await redis.setex(key, this.SESSION_TTL, JSON.stringify(session))
  }

  /**
   * 會話管理 - 清除會話
   */
  private async clearSession(lineUserId: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${lineUserId}`
    await redis.del(key)

    // 也清除用戶映射
    const session = await this.getSession(lineUserId)
    if (session.userId) {
      await redis.del(`${this.USER_MAPPING_PREFIX}${session.userId}`)
    }
  }

  /**
   * 用戶映射 - 儲存 userId 到 lineUserId 的映射
   */
  private async saveUserMapping(userId: string, lineUserId: string): Promise<void> {
    const key = `${this.USER_MAPPING_PREFIX}${userId}`
    await redis.setex(key, this.SESSION_TTL, lineUserId)
  }

  /**
   * 用戶映射 - 取得 LINE User ID（用於主動推送訊息）
   */
  async getLineUserId(userId: string): Promise<string | null> {
    const key = `${this.USER_MAPPING_PREFIX}${userId}`
    return await redis.get(key)
  }
}

export const lineBotService = new LineBotService()
