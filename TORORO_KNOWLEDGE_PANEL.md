# 白撲撲知識膠囊製造機 🌳

## 設計理念

**不是 Chatbot，是知識園丁助手**

白撲撲不應該像一個傳統的對話機器人，而應該是一個可愛、直覺、快速的知識記錄夥伴。就像在森林裡種樹一樣，每一個想法、學習、靈感都能快速變成一棵茁壯的知識樹。

### 核心改變

| 舊設計 (Chatbot) | 新設計 (知識膠囊製造機) |
|-----------------|---------------------|
| 對話式輸入 | 表單式快速記錄 |
| 訊息歷史堆疊 | 單次完成，即拍即走 |
| 文字回應 | 視覺化知識樹生長 |
| 被動等待 | 主動陪伴鼓勵 |
| 複雜操作 | 一鍵種植 |

## 功能特色

### 1. 快速記錄 ⚡
- 輸入想法 → 選擇心情 → 選擇類型 → 點擊種植
- 整個流程不超過 10 秒
- 像便利貼一樣簡單

### 2. 視覺化情緒 😊
6 種情緒類型，每種都有獨特顏色：
- 😊 開心 - 陽光黃
- 😌 平靜 - 薄荷綠
- ✨ 靈感 - 粉紅色
- 🤔 思考 - 薰衣草紫
- 🎉 興奮 - 珊瑚紅
- 🙏 感恩 - 海綠色

### 3. 分類管理 📚
6 種記錄類型：
- 📚 學習 - 今天學到的知識
- 💡 想法 - 突然冒出的點子
- 🌟 體驗 - 生活中的經歷
- 🎯 目標 - 想要達成的事
- 🪞 反思 - 對自己的思考
- 🔍 發現 - 新的洞察

### 4. 快速標籤 🏷️
預設 12 個常用標籤，一鍵選擇：
- 狀態類：重要、有趣、待深入、已實踐、需分享、靈感來源
- 領域類：日常、工作、興趣、人際、健康、成長

### 5. Live2D 陪伴 🐱
- 白撲撲會在旁邊鼓勵你
- 種植時會有可愛動作
- 成功後會開心表情
- 真正的「陪伴感」

### 6. 即時回饋 🌳
- 種植成功後顯示知識樹動畫
- 可以即時看到知識樹在島上生長
- 視覺化你的知識森林

## 使用方式

### 基本用法

```tsx
import TororoKnowledgePanel from '@/components/TororoKnowledgePanel'
import { useTororoKnowledge } from '@/hooks/useTororoKnowledge'

function MyPage() {
  const { createKnowledge } = useTororoKnowledge({
    onSuccess: (capsule) => {
      console.log('知識樹已種植！', capsule)
      // 可以在這裡觸發 3D 場景中的知識樹生成
    },
    onError: (error) => {
      console.error('種植失敗', error)
    }
  })

  return (
    <div>
      <TororoKnowledgePanel
        onCreateKnowledge={createKnowledge}
      />
    </div>
  )
}
```

### 整合到島嶼場景

```tsx
import { useRef } from 'react'
import TororoKnowledgePanel from '@/components/TororoKnowledgePanel'
import IslandScene from '@/components/3D/IslandScene'
import { useTororoKnowledge } from '@/hooks/useTororoKnowledge'

function IslandView() {
  const sceneRef = useRef()

  const { createKnowledge } = useTororoKnowledge({
    onSuccess: (capsule) => {
      // 在島上生成一棵新樹
      sceneRef.current?.addTree({
        position: getRandomPosition(),
        color: getEmotionColor(capsule.emotion),
        content: capsule.content
      })
    }
  })

  return (
    <>
      <IslandScene ref={sceneRef} />
      <TororoKnowledgePanel onCreateKnowledge={createKnowledge} />
    </>
  )
}
```

### 快速創建（無介面）

```tsx
import { useTororoKnowledge } from '@/hooks/useTororoKnowledge'

function QuickNote() {
  const { quickCreate } = useTororoKnowledge()

  const handleQuickSave = async () => {
    await quickCreate(
      '今天學會了 React Hook 的進階用法',
      'happy',
      'learning'
    )
  }

  return (
    <button onClick={handleQuickSave}>
      快速記錄
    </button>
  )
}
```

## 進階功能（待實現）

### 1. 多模態輸入 📸
```tsx
// 支援圖片上傳
const capsule = {
  content: '今天去了很美的地方',
  emotion: 'happy',
  category: 'experience',
  tags: ['旅行'],
  image: selectedImage, // File 對象
  timestamp: new Date()
}
```

### 2. 語音輸入 🎙️
```tsx
// 支援語音轉文字
const capsule = {
  content: '', // 可以為空
  emotion: 'inspired',
  category: 'idea',
  tags: [],
  audio: recordedBlob, // Blob 對象
  timestamp: new Date()
}
// Hook 會自動使用 Gemini 轉錄語音
```

### 3. 批量種植 🌺
```tsx
// 一次種植多個想法
const { batchCreate } = useTororoKnowledge()

await batchCreate([
  { content: '想法1', emotion: 'happy', category: 'idea', tags: [] },
  { content: '想法2', emotion: 'inspired', category: 'idea', tags: [] }
])
```

## 視覺設計

### 配色方案
```css
/* 主色調 - 溫暖柔和 */
background: linear-gradient(to-br, #FFF8F0, #FFEBCC);

/* 白撲撲主題色 */
primary: #FFB88C (溫暖橘)
secondary: #FF8C42 (活力橘)

/* 情緒色彩 */
happy: #FFD93D (陽光黃)
peaceful: #A8E6CF (薄荷綠)
inspired: #FFB7D5 (櫻花粉)
thoughtful: #C7CEEA (薰衣草)
excited: #FFAAA5 (珊瑚紅)
grateful: #B5EAD7 (海綠色)
```

### 動畫效果
- 浮動按鈕：彈跳 + 脈動光圈
- 面板展開：縮放 + 淡入
- 種植按鈕：懸停放大
- 成功動畫：旋轉知識樹 + 閃耀特效
- Live2D：點擊互動 + 表情變化

## 資料結構

### KnowledgeCapsule
```typescript
interface KnowledgeCapsule {
  content: string          // 主要內容
  emotion: EmotionType     // 情緒類型
  category: CategoryType   // 分類
  tags: string[]           // 標籤
  timestamp: Date          // 時間戳
  image?: File            // 圖片（選填）
  audio?: Blob            // 語音（選填）
}
```

### 儲存到資料庫
```graphql
mutation CreateKnowledgeMemory(
  $content: String!
  $emotion: String!
  $category: String!
  $tags: [String!]!
  $metadata: JSON
) {
  createMemory(
    content: $content
    emotion: $emotion
    tags: $tags
    metadata: $metadata
  ) {
    id
    content
    emotion
    tags
    createdAt
  }
}
```

## 與其他功能整合

### 1. 與黑撲撲（Hijiki）搜尋功能互補
- 白撲撲：快速種植知識
- 黑撲撲：智能搜尋知識

### 2. 與島嶼視覺化連動
- 每個知識膠囊 → 一棵樹
- 情緒 → 樹的顏色
- 類型 → 樹的形狀
- 標籤 → 樹的位置區域

### 3. 與 AI 對話系統整合
- 知識膠囊可作為對話上下文
- NPCs 可以根據你的知識樹給建議
- 形成真正的「個人化陪伴」

## 測試案例

### 1. 基本種植流程
```
1. 點擊浮動按鈕
2. 輸入「今天學會了 TypeScript 泛型」
3. 選擇心情：開心 😊
4. 選擇類型：學習 📚
5. 選擇標籤：重要、工作
6. 點擊「種下這朵知識花」
7. 看到成功動畫
8. 面板自動關閉
```

### 2. 快速輸入測試
```
- 連續創建 5 個知識膠囊
- 每個應該在 10 秒內完成
- UI 不應該卡頓
- 動畫應該流暢
```

### 3. 情緒視覺化測試
```
- 創建 6 個不同情緒的知識樹
- 每個應該有不同顏色
- 顏色應該和諧美觀
```

## 開發計劃

### Stage 1: 核心功能 ✅
- [x] 基本面板 UI
- [x] 情緒選擇器
- [x] 類型選擇器
- [x] 標籤系統
- [x] 創建 Hook
- [x] GraphQL 整合

### Stage 2: Live2D 整合 🔄
- [ ] 整合白撲撲 Live2D
- [ ] 互動動作觸發
- [ ] 表情變化
- [ ] 語音提示（選填）

### Stage 3: 多模態輸入 📋
- [ ] 圖片上傳功能
- [ ] 圖片預覽
- [ ] 語音錄製
- [ ] 語音轉文字
- [ ] Gemini 多模態處理

### Stage 4: 進階功能 📋
- [ ] 批量創建
- [ ] 智能建議標籤
- [ ] 情緒自動檢測
- [ ] 知識關聯推薦

### Stage 5: 視覺優化 📋
- [ ] 更豐富的動畫
- [ ] 主題切換
- [ ] 無障礙支援
- [ ] 響應式設計

## 設計原則

1. **簡單至上** - 任何人都能在 10 秒內完成操作
2. **視覺優先** - 用顏色和圖標代替文字
3. **即時回饋** - 每個操作都有明確反饋（知識樹生長動畫）
4. **情感連結** - Live2D 白撲撲營造陪伴感
5. **快速流暢** - 無縫動畫，不卡頓

## 與原 ChatBubble 的比較

| 特性 | ChatBubble (舊) | TororoKnowledgePanel (新) |
|-----|----------------|--------------------------|
| 互動模式 | 對話式 | 表單式 |
| 完成時間 | 30秒+ | <10秒 |
| 視覺化 | 文字氣泡 | 顏色+圖標 |
| 情緒表達 | 無 | 6種視覺化情緒 |
| 分類 | 手動輸入 | 圖標選擇 |
| 標籤 | 無 | 快速標籤 |
| 陪伴感 | 低 | 高（Live2D） |
| 即時回饋 | 文字回應 | 知識樹動畫 |
| 學習曲線 | 中 | 極低 |

## 結語

白撲撲不再是一個「聊天機器人」，而是一個「知識園丁助手」。

每一個想法都值得被好好種下，每一棵知識樹都值得在島上茁壯成長。🌳
