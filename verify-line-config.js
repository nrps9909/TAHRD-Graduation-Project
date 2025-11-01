require('dotenv').config({ path: '.env' })

console.log('🔍 LINE Bot 配置檢查\n')

const secret = process.env.LINE_CHANNEL_SECRET
const token = process.env.LINE_CHANNEL_ACCESS_TOKEN

if (secret) {
  console.log('✅ LINE_CHANNEL_SECRET: 已設定')
  console.log(`   值: ${secret.substring(0, 10)}...`)
} else {
  console.log('❌ LINE_CHANNEL_SECRET: 未設定')
}

if (token) {
  console.log('✅ LINE_CHANNEL_ACCESS_TOKEN: 已設定')
  console.log(`   值: ${token.substring(0, 30)}...`)
  console.log(`   長度: ${token.length} 字元`)
} else {
  console.log('❌ LINE_CHANNEL_ACCESS_TOKEN: 未設定')
}

if (secret && token) {
  console.log('\n✨ 配置完成！可以開始測試 LINE Bot')
  console.log('\n下一步：')
  console.log('1. 啟動後端：npm run dev')
  console.log('2. 啟動 ngrok：ngrok http 4000')
  console.log('3. 設定 Webhook URL 到 LINE Developers Console')
  console.log('   https://your-ngrok-url.ngrok.io/api/line/webhook')
  console.log('4. 用 LINE 掃描 QR Code 加入白噗噗官方帳號')
  console.log('5. 傳送 /login 開始測試')
  console.log('\n詳細步驟請參考：LINE_BOT_QUICKSTART.md')
}
