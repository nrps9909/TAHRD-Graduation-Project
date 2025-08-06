// 測試NPC互動系統
const io = require('socket.io-client')

const socket = io('http://localhost:4000', {
  transports: ['websocket']
})

console.log('🔌 連接到伺服器...')

socket.on('connect', () => {
  console.log('✅ 已連接到伺服器')
  console.log('Socket ID:', socket.id)
  
  // 測試NPC對話
  console.log('\n🎭 觸發NPC對話測試...')
  
  // 測試1: 小雅和阿山對話（關於書籍）
  setTimeout(() => {
    console.log('\n📚 測試1: 小雅和阿山討論書籍')
    socket.emit('trigger-npc-conversation', {
      npc1Id: 'npc-1',
      npc2Id: 'npc-2', 
      topic: '書籍'
    })
  }, 1000)
  
  // 測試2: 月兒和小晴對話（關於音樂）
  setTimeout(() => {
    console.log('\n🎵 測試2: 月兒和小晴聊音樂')
    socket.emit('trigger-npc-conversation', {
      npc1Id: 'npc-3',
      npc2Id: 'npc-5',
      topic: '音樂'
    })
  }, 5000)
  
  // 測試3: 老張和小雅對話（關於花園）
  setTimeout(() => {
    console.log('\n🌻 測試3: 老張和小雅談論花園')
    socket.emit('trigger-npc-conversation', {
      npc1Id: 'npc-4',
      npc2Id: 'npc-1',
      topic: '花園'
    })
  }, 10000)
})

// 監聽NPC對話事件
socket.on('npc-conversation', (data) => {
  if (data.type === 'message') {
    console.log('\n💬 NPC對話:')
    console.log(`   ${data.speakerName} → ${data.listenerName}`)
    console.log(`   話題: ${data.topic}`)
    console.log(`   內容: "${data.content}"`)
    console.log(`   情緒: ${data.emotion}`)
  } else if (data.type === 'ended') {
    console.log('\n🔚 對話結束:')
    console.log(`   參與者: ${data.npc1} & ${data.npc2}`)
    console.log(`   話題: ${data.topic}`)
    console.log(`   消息數: ${data.messageCount}`)
  }
})

// 監聽活躍對話
socket.on('active-npc-conversations', (conversations) => {
  console.log('\n📊 當前活躍對話:', conversations.length)
  conversations.forEach(conv => {
    console.log(`   - ${conv.npc1Id} ↔ ${conv.npc2Id}: ${conv.topic} (${conv.messageCount}條消息)`)
  })
})

// 監聽錯誤
socket.on('error', (error) => {
  console.error('❌ 錯誤:', error)
})

socket.on('npc-conversation-started', (data) => {
  console.log('\n🎬 對話已開始:')
  console.log(`   NPC1: ${data.npc1Id}`)
  console.log(`   NPC2: ${data.npc2Id}`)
  console.log(`   話題: ${data.topic}`)
})

socket.on('disconnect', (reason) => {
  console.log('\n🔌 已斷開連接:', reason)
})

// 每10秒查詢一次活躍對話
setInterval(() => {
  socket.emit('get-active-npc-conversations')
}, 10000)

// 30秒後關閉測試
setTimeout(() => {
  console.log('\n👋 測試完成，關閉連接...')
  socket.close()
  process.exit(0)
}, 30000)

console.log('\n⏰ 測試將在30秒後結束...')
console.log('📝 觀察NPC之間的對話互動...\n')