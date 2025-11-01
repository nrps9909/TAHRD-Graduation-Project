/**
 * LINE Bot 配置測試腳本
 * 驗證 Channel Secret 和 Channel Access Token 是否正確配置
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// ESM module 路徑處理
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 載入環境變數
dotenv.config({ path: path.join(__dirname, '../.env') })

console.log('🔍 LINE Bot 配置檢查\n')

// 檢查 Channel Secret
const channelSecret = process.env.LINE_CHANNEL_SECRET
if (channelSecret) {
  console.log('✅ LINE_CHANNEL_SECRET: 已設定')
  console.log(`   值: ${channelSecret.substring(0, 10)}...`)
} else {
  console.log('❌ LINE_CHANNEL_SECRET: 未設定')
}

// 檢查 Channel Access Token
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
if (channelAccessToken) {
  if (channelAccessToken === 'YOUR_CHANNEL_ACCESS_TOKEN_HERE' || channelAccessToken.includes('YOUR_')) {
    console.log('⚠️  LINE_CHANNEL_ACCESS_TOKEN: 使用預設值（需要更新）')
    console.log('   請到 LINE Developers Console 發行 Token')
  } else {
    console.log('✅ LINE_CHANNEL_ACCESS_TOKEN: 已設定')
    console.log(`   值: ${channelAccessToken.substring(0, 30)}...`)
    console.log(`   長度: ${channelAccessToken.length} 字元`)
  }
} else {
  console.log('❌ LINE_CHANNEL_ACCESS_TOKEN: 未設定')
}

console.log('\n📝 後續步驟：')

if (!channelSecret) {
  console.log('1. 在 .env 檔案中設定 LINE_CHANNEL_SECRET')
}

if (!channelAccessToken || channelAccessToken === 'YOUR_CHANNEL_ACCESS_TOKEN_HERE') {
  console.log('2. 前往 LINE Developers Console 發行 Channel Access Token')
  console.log('3. 將 Token 加入 .env 檔案的 LINE_CHANNEL_ACCESS_TOKEN')
}

if (channelSecret && channelAccessToken && channelAccessToken !== 'YOUR_CHANNEL_ACCESS_TOKEN_HERE') {
  console.log('✨ 配置完成！可以開始測試 LINE Bot')
  console.log('\n下一步：')
  console.log('1. 啟動後端：npm run dev')
  console.log('2. 啟動 ngrok：ngrok http 4000')
  console.log('3. 設定 Webhook URL')
  console.log('4. 測試 LINE Bot')
  console.log('\n詳細步驟請參考：LINE_BOT_QUICKSTART.md')
}

console.log('')
