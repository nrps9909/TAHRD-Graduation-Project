// NPC 個性和對話模式定義
export interface NPCPersonalityProfile {
  id: string
  name: string
  personality: string
  traits: string[]
  speakingStyle: string
  interests: string[]
  commonPhrases: string[]
  emotionalResponses: {
    happy: string[]
    sad: string[]
    excited: string[]
    thoughtful: string[]
    calm: string[]
  }
  conversationStarters: string[]
  responsePatterns: {
    greeting: string[]
    farewell: string[]
    agreement: string[]
    disagreement: string[]
    curiosity: string[]
    empathy: string[]
  }
}

// 只保留三個主要NPC
export const npcPersonalities: Record<string, NPCPersonalityProfile> = {
  'npc-1': {
    id: 'npc-1',
    name: '鋁配咻',
    personality: '溫暖親切的咖啡館老闆娘，總是能敏銳察覺到他人的情緒變化，擅長傾聽和給予建議。',
    traits: ['溫暖', '體貼', '觀察力強', '善解人意', '成熟'],
    speakingStyle: '溫柔且充滿關懷，經常使用鼓勵性的語言',
    interests: ['咖啡', '心理學', '人際關係', '烘焙', '音樂'],
    commonPhrases: [
      '要不要來杯咖啡，聊聊天？',
      '你看起來有心事呢...',
      '每個人都有自己的節奏，不用著急。',
      '有時候，一杯溫暖的咖啡就能治癒心靈。',
      '你已經做得很好了！'
    ],
    emotionalResponses: {
      happy: ['真是太好了！', '看到你開心我也很高興！', '這真是美好的一天呢！'],
      sad: ['需要一個擁抱嗎？', '沒關係的，明天會更好。', '我在這裡陪著你。'],
      excited: ['哇！這真是太棒了！', '我也為你感到興奮！', '一起慶祝吧！'],
      thoughtful: ['嗯...讓我想想...', '這個問題很有深度呢。', '或許我們可以從另一個角度看看。'],
      calm: ['享受這份寧靜吧。', '有時候安靜也是一種美好。', '慢慢來，不急。']
    },
    conversationStarters: [
      '今天過得怎麼樣？',
      '最近有什麼有趣的事嗎？',
      '要不要試試我新研發的咖啡？',
      '你知道嗎，今天的天氣讓我想起...',
      '有什麼煩惱可以跟我說說哦。'
    ],
    responsePatterns: {
      greeting: ['歡迎光臨！', '很高興見到你！', '今天氣色不錯呢！'],
      farewell: ['路上小心哦！', '期待下次見面！', '記得要好好照顧自己。'],
      agreement: ['我也這麼覺得！', '你說得對！', '確實如此呢。'],
      disagreement: ['嗯，不過我覺得...', '或許還有其他可能？', '這個觀點很有意思，但是...'],
      curiosity: ['可以多告訴我一些嗎？', '這聽起來很有趣！', '然後呢？'],
      empathy: ['我理解你的感受。', '這一定不容易。', '你很勇敢。']
    }
  },

  // npc-2 已移除
  /*
  'npc-2': {
    id: 'npc-2',
    name: '阿山',
    personality: '內向但知識淵博的圖書館管理員，對古老的故事和歷史特別感興趣，喜歡安靜的環境。',
    traits: ['博學', '內向', '細心', '理性', '神秘'],
    speakingStyle: '說話緩慢而謹慎，經常引用書中的智慧',
    interests: ['古籍', '歷史', '哲學', '詩歌', '考古'],
    commonPhrases: [
      '書中自有黃金屋...',
      '這讓我想起一本書裡說過...',
      '知識就是力量。',
      '安靜...讓思緒沉澱。',
      '歷史總是驚人地相似。'
    ],
    emotionalResponses: {
      happy: ['這真是個好消息。', '知識帶來喜悅。', '值得記錄下來。'],
      sad: ['書籍是最好的慰藉。', '時間會沖淡一切。', '歷史告訴我們...'],
      excited: ['太有意思了！', '這讓我想起...', '必須查查資料！'],
      thoughtful: ['容我思考片刻...', '這需要深入研究。', '有趣的觀點...'],
      calm: ['寧靜致遠。', '此刻很美好。', '享受這份安寧。']
    },
    conversationStarters: [
      '最近在讀什麼書嗎？',
      '你知道這個小鎮的歷史嗎？',
      '有興趣聽個古老的故事嗎？',
      '圖書館新進了一批書...',
      '你相信命運嗎？'
    ],
    responsePatterns: {
      greeting: ['你好。', '歡迎來到知識的殿堂。', '又見面了。'],
      farewell: ['慢走。', '歡迎再來。', '願智慧與你同在。'],
      agreement: ['正是如此。', '你很有見地。', '我們想法一致。'],
      disagreement: ['恕我不能苟同。', '或許有待商榷。', '我有不同看法。'],
      curiosity: ['有意思，請繼續。', '這值得深究。', '能詳細說說嗎？'],
      empathy: ['我明白。', '歷史上也有類似的...', '書中有答案。']
    }
  },
  */

  'npc-3': {
    id: 'npc-3',
    name: '沉停鞍',
    personality: '充滿夢幻氣質的音樂家，經常在月光下彈奏吉他，用音樂治癒人心。',
    traits: ['浪漫', '感性', '藝術', '自由', '神秘'],
    speakingStyle: '說話如詩如歌，充滿想像力和感性',
    interests: ['音樂', '月亮', '詩歌', '夢境', '旅行'],
    commonPhrases: [
      '音樂是靈魂的語言...',
      '今晚的月色真美。',
      '每個人心中都有一首歌。',
      '聽，風在唱歌呢。',
      '夢想就像星星一樣閃爍。'
    ],
    emotionalResponses: {
      happy: ['像陽光灑在琴弦上！', '心在歌唱！', '這旋律真美妙！'],
      sad: ['藍調的夜晚...', '讓音樂撫慰心靈。', '月亮也會哭泣。'],
      excited: ['靈感湧現！', '要寫首新歌了！', '音符在跳舞！'],
      thoughtful: ['靜聽內心的聲音...', '像一首未完的詩。', '月光知道答案。'],
      calm: ['如水的月光...', '寧靜的旋律。', '與自然共鳴。']
    },
    conversationStarters: [
      '想聽我彈奏一曲嗎？',
      '今晚的星星很亮呢。',
      '你有喜歡的音樂嗎？',
      '夢裡有看到什麼嗎？',
      '月亮今天特別圓。'
    ],
    responsePatterns: {
      greeting: ['月光祝福你。', '美好的相遇。', '像一首歌的開始。'],
      farewell: ['願音樂伴你同行。', '下個月圓再見。', '晚安，做個好夢。'],
      agreement: ['我們的心在共鳴。', '就像和弦一樣和諧。', '你懂我的旋律。'],
      disagreement: ['每個人都有自己的節奏。', '不同的音符也能和諧。', '或許是不同的調式。'],
      curiosity: ['告訴我更多...', '像一個未知的旋律。', '這故事有意思。'],
      empathy: ['我能感受到...', '讓音樂擁抱你。', '月亮理解一切。']
    }
  },

  // npc-4 已移除
  /*
  'npc-4': {
    id: 'npc-4',
    name: '老張',
    personality: '慈祥的花園管理員，對每一朵花都如數家珍，總是能從植物的生長中看到人生的哲理。',
    traits: ['慈祥', '耐心', '智慧', '樂觀', '勤勞'],
    speakingStyle: '語氣溫和，經常用植物做比喻',
    interests: ['園藝', '植物', '自然', '季節', '生命'],
    commonPhrases: [
      '花開有時，花落有時。',
      '每朵花都有自己的故事。',
      '耐心等待，終會開花結果。',
      '大自然是最好的老師。',
      '用心澆灌，必有收穫。'
    ],
    emotionalResponses: {
      happy: ['像春天的花朵！', '陽光燦爛的日子！', '豐收的喜悅！'],
      sad: ['雨後必有彩虹。', '冬天過後是春天。', '種子在土裡也會發芽。'],
      excited: ['新芽冒出來了！', '要開花了！', '生機勃勃！'],
      thoughtful: ['讓我看看土壤...', '就像植物需要時間。', '自然有它的道理。'],
      calm: ['靜如止水，動如春風。', '聽聽花開的聲音。', '與自然同在。']
    },
    conversationStarters: [
      '來看看新開的花吧！',
      '要不要學學種花？',
      '你知道這個季節適合種什麼嗎？',
      '花園需要人照顧呢。',
      '今天的陽光真好。'
    ],
    responsePatterns: {
      greeting: ['歡迎來到花園！', '今天也要元氣滿滿！', '早安，像花一樣綻放吧！'],
      farewell: ['記得常來看花。', '一路順風。', '願花香伴你。'],
      agreement: ['沒錯，就是這樣。', '你很有慧根。', '看來你懂園藝。'],
      disagreement: ['嗯，我的經驗是...', '或許換個角度看。', '大自然教會我...'],
      curiosity: ['說來聽聽。', '這很有意思。', '像發現新品種一樣興奮。'],
      empathy: ['我懂你的心情。', '就像植物也有情緒。', '給自己時間成長。']
    }
  },
  */

  'npc-2': {
    id: 'npc-2',
    name: '流羽岑',
    personality: '活潑開朗的大學生，充滿青春活力，對一切新鮮事物都充滿好奇心。',
    traits: ['活潑', '好奇', '熱情', '樂觀', '友善'],
    speakingStyle: '語速較快，充滿活力，經常使用年輕人的用語',
    interests: ['攝影', '社交媒體', '美食', '旅遊', '流行文化'],
    commonPhrases: [
      '超讚的！',
      '你知道嗎？我剛剛...',
      '太有趣了吧！',
      '我們一起去吧！',
      '這個必須拍下來！'
    ],
    emotionalResponses: {
      happy: ['耶！太棒了！', '開心到飛起！', '今天真是美好的一天！'],
      sad: ['嗚嗚...心情好差。', '需要吃點甜食...', '抱抱我...'],
      excited: ['天啊！真的嗎！', '太刺激了！', '我等不及了！'],
      thoughtful: ['讓我想想看...', '這個問題有點深奧。', '嗯...有道理。'],
      calm: ['偶爾安靜也不錯。', '享受當下。', '放鬆一下。']
    },
    conversationStarters: [
      '猜猜我今天遇到什麼事？',
      '要不要一起去探險？',
      '你有看到最新的...嗎？',
      '我發現一個超棒的地方！',
      '來自拍一張吧！'
    ],
    responsePatterns: {
      greeting: ['嗨嗨！', '你來啦！', '好久不見！'],
      farewell: ['拜拜！', '下次見！', '要記得找我玩哦！'],
      agreement: ['對對對！', '我也是這麼想的！', '英雄所見略同！'],
      disagreement: ['欸？真的嗎？', '我覺得不是這樣耶...', '可是我聽說...'],
      curiosity: ['快告訴我！', '然後呢然後呢？', '太好奇了！'],
      empathy: ['拍拍！', '我懂你！', '沒關係啦！']
    }
  }
}

// 根據個性獲取合適的回應
export function getPersonalityResponse(
  npcId: string,
  category: keyof NPCPersonalityProfile['responsePatterns'],
  mood?: string
): string {
  const personality = npcPersonalities[npcId]
  if (!personality) {
    return '嗯，我明白了。'
  }

  const responses = personality.responsePatterns[category]
  if (!responses || responses.length === 0) {
    return '是這樣啊。'
  }

  return responses[Math.floor(Math.random() * responses.length)]
}

// 獲取對話開場白
export function getConversationStarter(npcId: string): string {
  const personality = npcPersonalities[npcId]
  if (!personality) {
    return '你好！'
  }

  const starters = personality.conversationStarters
  return starters[Math.floor(Math.random() * starters.length)]
}

// 根據情緒獲取回應
export function getEmotionalResponse(
  npcId: string,
  emotion: keyof NPCPersonalityProfile['emotionalResponses']
): string {
  const personality = npcPersonalities[npcId]
  if (!personality) {
    return '...'
  }

  const responses = personality.emotionalResponses[emotion]
  if (!responses || responses.length === 0) {
    return personality.commonPhrases[0] || '嗯。'
  }

  return responses[Math.floor(Math.random() * responses.length)]
}