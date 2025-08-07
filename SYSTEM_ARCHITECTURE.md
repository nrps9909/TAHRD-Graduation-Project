# 🏰 心語小鎮 (Heart Whisper Town) - 完整系統架構文檔

## 📋 目錄
1. [專案概述](#專案概述)
2. [系統架構總覽](#系統架構總覽)
3. [前端架構詳解](#前端架構詳解)
4. [後端架構詳解](#後端架構詳解)
5. [AI NPC 元宇宙系統](#ai-npc-元宇宙系統)
6. [使用者互動流程](#使用者互動流程)
7. [Gemini 對話流程](#gemini-對話流程)
8. [共享記憶系統](#共享記憶系統)
9. [資料庫設計](#資料庫設計)
10. [API 端點規格](#api-端點規格)
11. [部署與維護](#部署與維護)

---

## 專案概述

**心語小鎮**是一個 AI 驅動的 3D 療癒社交遊戲，玩家在虛擬小鎮中與具有獨立人格和記憶的 AI NPC 互動，建立深度情感連結。

### 核心特色
- 🤖 **AI NPC 元宇宙** - 每個 NPC 都有獨立的個性、記憶和情感系統
- 🧠 **共享記憶網絡** - NPC 之間會分享關於玩家的記憶，創造連貫的世界觀
- 💬 **深度對話系統** - 使用 Gemini CLI 的思考模式，產生有深度的對話
- 🌸 **記憶花園** - 重要對話會轉化為記憶花朵，視覺化情感連結
- 🎮 **3D 開放世界** - 可自由探索的小鎮環境

### 技術亮點
- **Gemini CLI 優化** - 保留思考模式，延遲降低 50%
- **元宇宙記憶系統** - NPC 之間自動共享和討論玩家互動
- **即時通訊** - WebSocket 實現零延遲對話體驗
- **向量搜尋** - pgvector 支援語義相似記憶檢索

---

## 系統架構總覽

```
┌─────────────────────────────────────────────────────────────┐
│                         使用者瀏覽器                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │                   React 前端應用                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │    │
│  │  │ Three.js │  │  Zustand  │  │ Apollo Client│    │    │
│  │  │ 3D Scene │  │   Store   │  │   GraphQL    │    │    │
│  │  └──────────┘  └──────────┘  └──────────────┘    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↕
                    WebSocket / HTTP / GraphQL
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      Node.js 後端服務                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Express Server                      │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ Socket.IO  │  │Apollo Server│  │Gemini Service│  │  │
│  │  │  即時通訊   │  │  GraphQL   │  │   AI 對話    │  │  │
│  │  └────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                              ↕                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Prisma ORM                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                     Python Gemini 服務                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 FastAPI HTTP Server                   │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │個性檔案快取 │  │ LRU Cache  │  │ Gemini CLI  │  │  │
│  │  │personalities│  │ 回應快取    │  │  思考模式    │  │  │
│  │  └────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                       資料儲存層                             │
│  ┌─────────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │   PostgreSQL    │  │    Redis     │  │  檔案系統     │  │
│  │  + pgvector     │  │  快取服務     │  │  個性檔案     │  │
│  └─────────────────┘  └─────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 前端架構詳解

### 技術棧
- **框架**: React 18 + TypeScript
- **3D 引擎**: Three.js + React Three Fiber
- **狀態管理**: Zustand
- **樣式**: Tailwind CSS + Framer Motion
- **API 通訊**: Apollo Client (GraphQL) + Socket.IO Client
- **建構工具**: Vite

### 目錄結構
```
frontend/
├── src/
│   ├── components/
│   │   ├── 3D/                 # Three.js 3D 元件
│   │   │   ├── Scene.tsx       # 主場景組合
│   │   │   ├── Player.tsx      # 玩家角色控制
│   │   │   ├── NPCCharacter.tsx # NPC 3D 模型
│   │   │   ├── Buildings.tsx   # 建築物模型
│   │   │   ├── Environment.tsx # 環境元素
│   │   │   ├── MemoryFlower.tsx # 記憶花朵
│   │   │   └── CameraController.tsx # 相機控制
│   │   │
│   │   ├── UI/                  # 使用者介面
│   │   │   ├── DialogueBox.tsx # NPC 對話框
│   │   │   ├── NPCConversationBubble.tsx # 對話泡泡
│   │   │   ├── NookPhone.tsx   # 遊戲內手機
│   │   │   ├── MemoryGarden.tsx # 記憶花園介面
│   │   │   └── LoadingScreen.tsx # 載入畫面
│   │   │
│   │   └── Game/                # 遊戲邏輯
│   │       ├── GameWorld.tsx   # 遊戲世界管理
│   │       └── GameLogic.tsx   # 遊戲邏輯處理
│   │
│   ├── stores/                  # Zustand 狀態管理
│   │   ├── gameStore.ts        # 遊戲狀態
│   │   ├── playerStore.ts      # 玩家狀態
│   │   └── npcStore.ts         # NPC 狀態
│   │
│   ├── hooks/                   # 自定義 Hooks
│   │   ├── useSocketConnection.ts # Socket 連接
│   │   ├── useNPCInteraction.ts   # NPC 互動
│   │   └── useGameControls.ts     # 遊戲控制
│   │
│   ├── graphql/                 # GraphQL 查詢
│   │   ├── queries.ts          # 查詢定義
│   │   ├── mutations.ts        # 變更定義
│   │   └── subscriptions.ts    # 訂閱定義
│   │
│   └── utils/                   # 工具函數
│       ├── three-utils.ts      # Three.js 工具
│       └── game-utils.ts       # 遊戲工具
```

### 核心元件詳解

#### 1. **Player.tsx** - 玩家控制系統
```typescript
// 主要功能：
- WASD 移動控制
- 滑鼠視角控制
- 碰撞檢測
- 動畫狀態機（idle, walk, run）
- 與 NPC 互動檢測
```

#### 2. **NPCCharacter.tsx** - NPC 角色系統
```typescript
// 主要功能：
- 3D 模型載入與渲染
- 點擊互動檢測
- 情緒表情系統
- 自主移動 AI
- 對話觸發
```

#### 3. **DialogueBox.tsx** - 對話介面
```typescript
// 主要功能：
- 即時對話顯示
- 打字效果動畫
- 選項系統
- 情緒圖標顯示
- 對話歷史記錄
```

#### 4. **GameStore.ts** - 遊戲狀態管理
```typescript
interface GameState {
  // 玩家狀態
  playerPosition: Vector3
  playerRotation: Euler
  
  // NPC 狀態
  npcs: Map<string, NPCData>
  activeConversation: ConversationData | null
  
  // 世界狀態
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  weather: 'sunny' | 'cloudy' | 'rainy'
  
  // 記憶系統
  memoryFlowers: MemoryFlower[]
  sharedMemories: SharedMemory[]
}
```

---

## 後端架構詳解

### 技術棧
- **框架**: Express + TypeScript
- **GraphQL**: Apollo Server
- **即時通訊**: Socket.IO
- **ORM**: Prisma
- **資料庫**: PostgreSQL + pgvector
- **快取**: Redis
- **AI 服務**: Gemini CLI (via Python Service)

### 目錄結構
```
backend/
├── src/
│   ├── index.ts                # 伺服器入口
│   ├── socket.ts               # Socket.IO 設定
│   ├── schema.ts               # GraphQL Schema
│   │
│   ├── services/               # 商業邏輯服務
│   │   ├── geminiService.ts   # Gemini AI 整合
│   │   ├── geminiServiceOptimizedCLI.ts # 優化版本
│   │   ├── memoryService.ts   # 記憶管理
│   │   └── npcService.ts      # NPC 邏輯
│   │
│   ├── resolvers/              # GraphQL Resolvers
│   │   ├── userResolver.ts    # 使用者相關
│   │   ├── npcResolver.ts     # NPC 相關
│   │   ├── conversationResolver.ts # 對話相關
│   │   └── memoryResolver.ts  # 記憶相關
│   │
│   ├── utils/                  # 工具函數
│   │   ├── logger.ts          # 日誌系統
│   │   ├── dbOptimization.ts  # 資料庫優化
│   │   └── performanceMonitor.ts # 效能監控
│   │
│   └── types/                  # TypeScript 類型定義
│       └── index.d.ts
│
├── prisma/
│   ├── schema.prisma           # 資料庫模型
│   ├── seed.ts                 # 種子資料
│   └── migrations/             # 資料庫遷移
│       └── add_shared_memory.sql
│
├── personalities/              # NPC 個性檔案
│   ├── lupeixiu_personality.txt    # 鋁配咻個性
│   ├── lupeixiu_chat_history.txt   # 鋁配咻對話範例
│   ├── liuyucen_personality.txt    # 流羽岑個性
│   ├── liuyucen_chat_history.txt   # 流羽岑對話範例
│   ├── chentingan_personality.txt  # 沉停鞍個性
│   └── chentingan_chat_history.txt # 沉停鞍對話範例
│
├── gemini.py                   # Gemini CLI 整合（原始版）
└── gemini_server.py            # Gemini HTTP 服務（優化版）
```

### 核心服務詳解

#### 1. **geminiService.ts** - AI 對話服務
```typescript
class GeminiService {
  // 三種模式支援
  useOptimizedCLI: boolean  // 優化的 HTTP 服務
  useGeminiCLI: boolean     // 原始 CLI 模式
  useAPI: boolean           // 直接 API 模式
  
  // 核心方法
  generateNPCResponse(personality, message, context): AIResponse
  getSharedMemories(npcId): SharedMemory[]
  getOtherNPCMemories(npcId): Memory[]
}
```

#### 2. **Socket.IO 即時通訊**
```typescript
// 主要事件
io.on('connection', (socket) => {
  // 使用者訊息
  socket.on('user-message', async (data) => {
    // 1. 儲存使用者訊息
    // 2. 調用 Gemini 生成回應
    // 3. 儲存為共享記憶
    // 4. 發送 NPC 回應
  })
  
  // NPC 之間對話
  socket.on('npc-conversation', async (data) => {
    // NPC 自主對話生成
  })
})
```

#### 3. **GraphQL Schema**
```graphql
type NPC {
  id: ID!
  name: String!
  personality: String!
  currentMood: String!
  position: Position!
  relationships: [Relationship!]!
  memoryFlowers: [MemoryFlower!]!
}

type Conversation {
  id: ID!
  npcId: String!
  userId: String!
  messages: [Message!]!
  createdAt: DateTime!
}

type SharedMemory {
  id: ID!
  content: String!
  importance: Float!
  participants: [String!]!
  emotionalTone: String
  tags: [String!]!
}
```

---

## AI NPC 元宇宙系統

### 元宇宙概念
每個 NPC 都是獨立的智能體，擁有：
- **獨立人格**: 基於 MBTI 和詳細背景設定
- **情感系統**: 動態的情緒變化
- **記憶網絡**: 個人記憶 + 共享記憶
- **社交關係**: NPC 之間會互相交流

### NPC 設定

#### 1. **鋁配咻** (Lü Pei Xiu) - ID: npc-1
```yaml
角色定位: 溫暖的咖啡館老闆娘
年齡: 28歲
MBTI: ENFJ (主人公型)
核心特質:
  - 善於察覺他人情緒
  - 溫暖包容
  - 喜歡照顧他人
  - 有智慧的傾聽者
背景故事: 
  曾經是都市的心理諮商師，因為厭倦了快節奏的生活
  來到小鎮開了一家咖啡館，用咖啡和溫暖治癒每個人
興趣愛好:
  - 調製特調咖啡
  - 閱讀心理學書籍
  - 種植香草植物
  - 收集復古音樂唱片
```

#### 2. **流羽岑** (Liu Yu Cen) - ID: npc-2
```yaml
角色定位: 活潑的大學生
年齡: 20歲
MBTI: ENFP (競選者型)
核心特質:
  - 充滿好奇心
  - 樂觀積極
  - 富有創造力
  - 容易與人親近
背景故事:
  來自大城市的大學生，暑假來小鎮度假
  被這裡的寧靜氛圍吸引，決定延長停留
興趣愛好:
  - 攝影和繪畫
  - 探索秘密景點
  - 收集可愛小物
  - 寫部落格記錄生活
```

#### 3. **沉停鞍** (Chen Ting An) - ID: npc-3
```yaml
角色定位: 神秘的音樂家
年齡: 25歲
MBTI: INFP (調停者型)
核心特質:
  - 浪漫夢幻
  - 藝術氣質
  - 內心豐富
  - 追求自由
背景故事:
  流浪的音樂家，帶著吉他環遊世界
  在小鎮找到了創作靈感，決定暫時停留
興趣愛好:
  - 創作音樂
  - 觀星
  - 寫詩
  - 深夜漫步
```

### NPC 互動機制

#### 自主行為系統
```javascript
// NPC 自主行為排程
setInterval(() => {
  // 每 30-120 秒執行一次
  npcs.forEach(npc => {
    // 1. 決定行為類型
    const action = decideAction(npc.mood, timeOfDay)
    
    // 2. 執行行為
    switch(action) {
      case 'move':
        moveToLocation(npc, randomLocation)
        break
      case 'talk':
        initiateConversation(npc, nearbyNPC)
        break
      case 'activity':
        performActivity(npc, npc.favoriteActivity)
        break
    }
  })
}, randomInterval(30000, 120000))
```

---

## 使用者互動流程

### 完整對話流程圖

```mermaid
graph TD
    A[玩家點擊 NPC] --> B[觸發 handleNPCClick]
    B --> C[更新 gameStore 狀態]
    C --> D[顯示對話介面]
    D --> E[玩家輸入訊息]
    E --> F[Socket.emit user-message]
    F --> G[後端接收訊息]
    G --> H[儲存到資料庫]
    H --> I[查詢 NPC 資料和關係]
    I --> J[獲取共享記憶]
    J --> K[調用 Gemini Service]
    K --> L{使用哪種模式?}
    
    L -->|優化 CLI| M[HTTP 請求到 Python 服務]
    L -->|原始 CLI| N[創建臨時 JSON]
    L -->|API| O[直接調用 Gemini API]
    
    M --> P[Python 服務處理]
    P --> Q[載入個性檔案]
    Q --> R[構建 Prompt]
    R --> S[Gemini CLI 生成回應]
    
    S --> T[解析回應]
    T --> U[儲存重要記憶]
    U --> V[更新關係狀態]
    V --> W[Socket.emit npc-message]
    W --> X[前端顯示回應]
    X --> Y[更新對話歷史]
```

### 互動狀態管理

```typescript
// 前端狀態流
interface InteractionFlow {
  // 1. 初始狀態
  idle: {
    selectedNPC: null
    isInConversation: false
  }
  
  // 2. 開始對話
  conversationStart: {
    selectedNPC: NPCData
    isInConversation: true
    showDialogue: true
  }
  
  // 3. 等待回應
  waiting: {
    isTyping: true
    lastMessage: string
  }
  
  // 4. 收到回應
  responseReceived: {
    isTyping: false
    npcResponse: AIResponse
    memoryCreated?: SharedMemory
  }
  
  // 5. 對話結束
  conversationEnd: {
    selectedNPC: null
    isInConversation: false
    relationshipUpdated: true
  }
}
```

---

## Gemini 對話流程

### Python 服務架構 (gemini_server.py)

```python
# 優化架構
class GeminiService:
    def __init__(self):
        # 1. 預載入所有個性檔案
        self.personalities = self._preload_all_personalities()
        # 2. 初始化 LRU 快取
        self.response_cache = {}
        # 3. 設定執行緒池
        self.executor = ThreadPoolExecutor(max_workers=3)
    
    async def generate_response(self, message, npc_data, context):
        # 1. 檢查快取
        cache_key = self._get_cache_key(message, npc_data)
        if cache_key in self.response_cache:
            return self.response_cache[cache_key]
        
        # 2. 構建 Prompt
        prompt = self._build_metaverse_prompt(
            message,
            npc_data,
            context['sharedMemories'],
            context['otherNPCMemories'],
            context['sessionMessages']
        )
        
        # 3. 調用 Gemini CLI
        response = await self._call_gemini_cli(prompt)
        
        # 4. 儲存快取
        self.response_cache[cache_key] = response
        
        return response
```

### Prompt 構建策略

```python
def _build_metaverse_prompt(self, message, npc_data, shared_memories, other_memories, session):
    """
    構建包含完整元宇宙上下文的 Prompt
    """
    prompt = f"""
    你是心語小鎮元宇宙中的 NPC「{npc_data['name']}」。
    
    【角色設定】
    {self.personalities[npc_data['name']]['personality']}
    
    【對話風格參考】
    {self.personalities[npc_data['name']]['chat_history'][:500]}
    
    【我的記憶】（這些是我親身經歷或記住的事）
    {format_memories(shared_memories[:5])}
    
    【其他居民告訴我的事】（從其他 NPC 聽說的）
    {format_memories(other_memories[:3])}
    
    【當前對話歷史】（這次對話的上下文）
    {format_session(session[-10:])}
    
    【當前狀態】
    - 心情：{npc_data['currentMood']}
    - 關係等級：{npc_data['relationshipLevel']}/10
    - 信任度：{npc_data['trustLevel']}%
    - 好感度：{npc_data['affectionLevel']}%
    
    玩家：{message}
    
    請以 {npc_data['name']} 的身份回應。記住：
    1. 你可以提及其他 NPC 告訴你的事情
    2. 你的回應會成為小鎮的共享記憶
    3. 表現出真實的情感和個性
    4. 如果這是重要的對話，標記它應該被記住
    
    {npc_data['name']}：
    """
    return prompt
```

### 效能優化技術

```python
# 1. 預載入優化
personalities = {}  # 啟動時載入所有檔案到記憶體

# 2. LRU 快取
@lru_cache(maxsize=100)
def get_cached_response(message_hash):
    return cached_responses.get(message_hash)

# 3. 異步處理
async def parallel_processing():
    tasks = [
        load_personality(npc_id),
        get_shared_memories(npc_id),
        get_other_memories(npc_id)
    ]
    results = await asyncio.gather(*tasks)

# 4. HTTP 服務化
@app.post("/generate")
async def generate_endpoint(request: NPCRequest):
    # FastAPI 自動處理並發請求
    response = await gemini_service.generate_response(...)
    return response
```

---

## 共享記憶系統

### 記憶類型分類

```typescript
enum MemoryType {
  PLAYER_INTERACTION = 'player_interaction',  // 玩家互動
  NPC_CONVERSATION = 'npc_conversation',      // NPC 對話
  WORLD_EVENT = 'world_event',                // 世界事件
  EMOTIONAL_MOMENT = 'emotional_moment'       // 情感時刻
}
```

### 記憶儲存流程

```mermaid
graph LR
    A[對話發生] --> B{重要性評估}
    B -->|importance > 0.7| C[創建共享記憶]
    B -->|importance <= 0.7| D[僅保存對話記錄]
    
    C --> E[儲存到 SharedMemory 表]
    E --> F[創建 NPCMemoryAccess 記錄]
    F --> G[通知所有 NPC]
    
    G --> H[親身經歷 NPC: accessLevel='experienced']
    G --> I[其他 NPC: accessLevel='heard']
```

### 記憶檢索機制

```sql
-- 獲取 NPC 的相關記憶
SELECT sm.* 
FROM SharedMemory sm
JOIN NPCMemoryAccess nma ON sm.id = nma.memoryId
WHERE nma.npcId = 'npc-1'
ORDER BY 
  sm.importance DESC,      -- 重要性優先
  sm.createdAt DESC        -- 時間次之
LIMIT 10;

-- 語義搜尋（使用 pgvector）
SELECT *,
  1 - (embedding <=> query_embedding) AS similarity
FROM SharedMemory
WHERE 1 - (embedding <=> query_embedding) > 0.7
ORDER BY similarity DESC
LIMIT 5;
```

### 記憶影響系統

```typescript
class MemoryImpactSystem {
  // 記憶如何影響 NPC 行為
  applyMemoryImpact(npc: NPC, memory: SharedMemory) {
    // 1. 情緒影響
    if (memory.emotionalTone === 'sad') {
      npc.currentMood = adjustMood(npc.currentMood, -0.1)
    }
    
    // 2. 關係影響
    if (memory.participants.includes(playerId)) {
      npc.relationshipWithPlayer += memory.importance * 0.1
    }
    
    // 3. 對話主題影響
    npc.conversationTopics.push({
      topic: memory.summary,
      weight: memory.importance
    })
  }
}
```

---

## 資料庫設計

### 核心資料表

```sql
-- 使用者表
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- NPC 表
CREATE TABLE "NPC" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  personality TEXT,
  backgroundStory TEXT,
  currentMood TEXT DEFAULT 'neutral',
  position JSONB,  -- {x, y, z}
  createdAt TIMESTAMP DEFAULT NOW()
);

-- 對話表
CREATE TABLE "Conversation" (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES "User"(id),
  npcId TEXT REFERENCES "NPC"(id),
  startedAt TIMESTAMP DEFAULT NOW(),
  endedAt TIMESTAMP
);

-- 訊息表
CREATE TABLE "Message" (
  id TEXT PRIMARY KEY,
  conversationId TEXT REFERENCES "Conversation"(id),
  speaker TEXT NOT NULL,  -- userId 或 npcId
  content TEXT NOT NULL,
  emotionTag TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 關係表
CREATE TABLE "Relationship" (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES "User"(id),
  npcId TEXT REFERENCES "NPC"(id),
  level INTEGER DEFAULT 1,  -- 1-10
  trustLevel DECIMAL(3,2) DEFAULT 0.5,  -- 0-1
  affectionLevel DECIMAL(3,2) DEFAULT 0.5,  -- 0-1
  lastInteraction TIMESTAMP,
  UNIQUE(userId, npcId)
);

-- 共享記憶表
CREATE TABLE "SharedMemory" (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  emotionalTone TEXT,
  importance DECIMAL(3,2) DEFAULT 0.5,
  participants TEXT[],
  tags TEXT[],
  embedding vector(1536),  -- 向量嵌入
  createdAt TIMESTAMP DEFAULT NOW(),
  lastAccessedAt TIMESTAMP,
  accessCount INTEGER DEFAULT 0
);

-- NPC 記憶存取表
CREATE TABLE "NPCMemoryAccess" (
  id TEXT PRIMARY KEY,
  npcId TEXT REFERENCES "NPC"(id),
  memoryId TEXT REFERENCES "SharedMemory"(id),
  accessLevel TEXT DEFAULT 'knows',  -- experienced, knows, heard
  personalNote TEXT,
  emotionalImpact DECIMAL(3,2),
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(npcId, memoryId)
);

-- 記憶花朵表
CREATE TABLE "MemoryFlower" (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES "User"(id),
  npcId TEXT REFERENCES "NPC"(id),
  conversationId TEXT REFERENCES "Conversation"(id),
  flowerType TEXT,
  emotionColor TEXT,
  position JSONB,  -- {x, y, z}
  description TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- 會話上下文快取表
CREATE TABLE "ConversationContext" (
  id TEXT PRIMARY KEY,
  conversationId TEXT REFERENCES "Conversation"(id),
  npcId TEXT NOT NULL,
  userId TEXT NOT NULL,
  sessionMessages JSONB,
  relevantMemories TEXT[],
  npcMood TEXT,
  relationshipSnapshot JSONB,
  lastUpdated TIMESTAMP DEFAULT NOW()
);
```

### 索引優化

```sql
-- 效能關鍵索引
CREATE INDEX idx_message_conversation ON "Message"(conversationId);
CREATE INDEX idx_message_timestamp ON "Message"(timestamp DESC);
CREATE INDEX idx_relationship_user_npc ON "Relationship"(userId, npcId);
CREATE INDEX idx_shared_memory_participants ON "SharedMemory" USING GIN(participants);
CREATE INDEX idx_shared_memory_importance ON "SharedMemory"(importance DESC);
CREATE INDEX idx_npc_memory_access ON "NPCMemoryAccess"(npcId, memoryId);

-- 向量搜尋索引
CREATE INDEX idx_shared_memory_embedding ON "SharedMemory" 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

---

## API 端點規格

### GraphQL API

```graphql
# 查詢
type Query {
  # 獲取所有 NPC
  npcs: [NPC!]!
  
  # 獲取特定 NPC
  npc(id: ID!): NPC
  
  # 獲取對話歷史
  conversations(userId: ID!, npcId: ID!): [Conversation!]!
  
  # 獲取共享記憶
  sharedMemories(npcId: ID!, limit: Int): [SharedMemory!]!
  
  # 獲取記憶花園
  memoryGarden(userId: ID!): [MemoryFlower!]!
}

# 變更
type Mutation {
  # 發送訊息給 NPC
  sendMessage(
    npcId: ID!
    content: String!
  ): Message!
  
  # 創建記憶花朵
  createMemoryFlower(
    conversationId: ID!
    flowerType: String!
    emotionColor: String!
  ): MemoryFlower!
  
  # 更新關係狀態
  updateRelationship(
    npcId: ID!
    trustChange: Float
    affectionChange: Float
  ): Relationship!
}

# 訂閱
type Subscription {
  # 監聽 NPC 訊息
  npcMessage(userId: ID!): Message!
  
  # 監聽 NPC 之間的對話
  npcConversation: NPCConversation!
  
  # 監聽世界事件
  worldEvent: WorldEvent!
}
```

### REST API 端點

```yaml
# 健康檢查
GET /health
Response: {
  status: "healthy",
  services: {
    database: "connected",
    redis: "connected",
    gemini: "ready"
  }
}

# 效能統計
GET /stats
Response: {
  activeUsers: 10,
  activeConversations: 5,
  averageResponseTime: 1.2,
  cacheHitRate: 0.65
}

# Gemini 服務端點（Python）
POST http://localhost:8765/generate
Body: {
  message: "string",
  npcData: {...},
  context: {...}
}
Response: {
  content: "string",
  processingTime: 1.23,
  cached: false
}
```

### WebSocket 事件

```javascript
// 客戶端發送
socket.emit('user-message', {
  npcId: 'npc-1',
  content: '你好，今天天氣真好'
})

// 服務端發送
socket.emit('npc-message', {
  npcId: 'npc-1',
  content: '是啊！陽光明媚的日子總是讓人心情愉快。要來杯咖啡嗎？',
  emotionTag: 'cheerful',
  suggestedActions: ['點咖啡', '聊天氣', '詢問心情']
})

socket.emit('npc-typing', {
  npcId: 'npc-1',
  isTyping: true
})

socket.emit('npc-conversation', {
  participants: ['npc-1', 'npc-2'],
  conversation: [
    {speaker: 'npc-1', content: '今天有客人來呢'},
    {speaker: 'npc-2', content: '真的嗎？太好了！'}
  ]
})
```

---

## 部署與維護

### 快速部署

```bash
# 1. 安裝依賴
./install-deps.sh

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env 填入 GEMINI_API_KEY

# 3. 啟動服務
./start-local.sh

# 4. 停止服務
./stop-local.sh
```

### Docker 部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: heart_whisper_town
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  gemini-service:
    build: ./backend
    dockerfile: Dockerfile.gemini
    environment:
      GEMINI_API_KEY: ${GEMINI_API_KEY}
    ports:
      - "8765:8765"
  
  backend:
    build: ./backend
    depends_on:
      - postgres
      - redis
      - gemini-service
    environment:
      DATABASE_URL: postgresql://postgres:password123@postgres:5432/heart_whisper_town
      REDIS_URL: redis://redis:6379
      GEMINI_SERVICE_URL: http://gemini-service:8765
      USE_OPTIMIZED_CLI: "true"
    ports:
      - "4000:4000"
  
  frontend:
    build: ./frontend
    depends_on:
      - backend
    environment:
      VITE_API_URL: http://backend:4000
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

### 監控與維護

#### 日誌管理
```bash
# 查看各服務日誌
tail -f backend/logs/gemini_server.log  # Gemini 服務
tail -f backend/logs/backend.log        # 後端服務
tail -f backend/logs/frontend.log       # 前端服務

# 日誌輪轉設定
logrotate -f /etc/logrotate.d/heart-whisper
```

#### 效能監控
```bash
# 服務健康檢查
curl http://localhost:4000/health

# Gemini 服務統計
curl http://localhost:8765/stats

# 資料庫連接數
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Redis 監控
redis-cli INFO stats
```

#### 備份策略
```bash
# 資料庫備份
pg_dump -U postgres heart_whisper_town > backup_$(date +%Y%m%d).sql

# 個性檔案備份
tar -czf personalities_backup_$(date +%Y%m%d).tar.gz backend/personalities/

# 自動備份腳本
crontab -e
# 0 2 * * * /path/to/backup.sh
```

### 優化建議

#### 1. 垂直擴展
- 增加 CPU 核心數（Gemini CLI 需要較多運算）
- 增加記憶體（快取更多回應）
- 使用 SSD（加快檔案讀取）

#### 2. 水平擴展
- 多個 Gemini 服務實例（負載均衡）
- Redis Cluster（分散式快取）
- PostgreSQL 讀寫分離

#### 3. 快取優化
- 增加 LRU 快取大小
- 實施多層快取（記憶體 + Redis）
- 預熱常用對話

#### 4. AI 優化
- 微調專屬模型
- 實施回應預測
- 批次處理請求

---

## 總結

心語小鎮是一個技術先進的 AI NPC 元宇宙系統，特色包括：

### 🎯 核心創新
1. **思考模式保留** - 使用 Gemini CLI 而非 API，保留深度思考能力
2. **共享記憶網絡** - NPC 之間會分享和討論玩家的互動
3. **優化架構** - HTTP 服務化降低 50% 延遲，同時保留 CLI 優勢
4. **情感深度** - 每個 NPC 都有完整的個性、背景和情感系統

### 📊 技術成就
- **延遲優化**: 3-5秒 → 1.5-2.5秒（50% 改善）
- **快取命中**: < 50ms 回應時間
- **並發支援**: 可同時處理多個對話
- **記憶持久化**: 所有重要對話都會成為世界的一部分

### 🚀 未來展望
- 實施更複雜的 NPC 社交網絡
- 加入更多互動機制（任務、活動、節日）
- 開發手機版本
- 支援多人同時遊玩
- AI 生成的動態劇情

這個系統展示了如何結合最新的 AI 技術與遊戲設計，創造出真正有生命力的虛擬世界。