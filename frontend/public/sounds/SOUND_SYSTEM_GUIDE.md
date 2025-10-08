# 🎵 音效系統使用指南

## ✅ 已完成的功能

### 1. 音效管理系統
- ✅ 單例模式的音效管理器
- ✅ 自動加載和緩存音效
- ✅ 音量控制（全局 + 單個音效）
- ✅ 音效開關（保存到 localStorage）
- ✅ 優雅的錯誤處理（缺少音效文件不會報錯）

### 2. React Hook 整合
- ✅ `useSound()` hook 方便組件使用
- ✅ 支持所有音效類型播放
- ✅ 響應式狀態管理

### 3. Live2DCat 組件整合
音效已整合到以下互動時機：

| 觸發時機 | 音效 | 描述 |
|---------|------|------|
| 🐱 組件打開 | `meow_greeting` | 溫柔的問候貓叫聲 |
| 📤 發送訊息 | `message_sent` | 訊息發送提示音 |
| 👂 貓咪開始聽 | `meow_curious` | 好奇的貓叫聲 |
| 🤔 貓咪思考 | `meow_thinking` + 打字序列 | 思考音 + 模擬 AI 處理 |
| ✅ 上傳成功 | `upload_success` | 成功提示音 |
| 📥 收到回覆 | `message_received` + 隨機貓叫 | 接收音 + 開心貓叫 |
| 📎 上傳檔案 | `button_click` | 按鈕點擊音 |
| 📄 檔案添加成功 | `notification` | 通知音 |
| 🎤 開始/停止錄音 | `notification` + `meow_curious` | 通知音 + 好奇音 |
| 🔊 切換音效 | `button_click` | 按鈕點擊音 |
| ✕ 關閉窗口 | `button_click` | 按鈕點擊音 |

### 4. UI 控制
- ✅ 右上角音效開關按鈕（🔊/🔇）
- ✅ 視覺反饋（按鈕顏色變化）
- ✅ Hover 提示文字
- ✅ 用戶偏好保存到 localStorage

## 🎯 使用方法

### 在組件中使用音效

```typescript
import { useSound } from '../hooks/useSound'

function MyComponent() {
  const {
    play,              // 播放指定音效
    playRandomMeow,    // 播放隨機貓叫聲
    playTypingSequence,// 播放打字序列
    enabled,           // 音效是否啟用
    toggleSound,       // 切換音效開關
    volume,            // 當前音量
    setVolume          // 設置音量
  } = useSound()

  const handleClick = () => {
    play('button_click')
  }

  const handleSuccess = () => {
    play('achievement')
    playRandomMeow()
  }

  return (
    <button onClick={handleClick}>
      點我有音效！
    </button>
  )
}
```

### 直接使用 SoundManager

```typescript
import soundManager from '../utils/soundManager'

// 播放音效
soundManager.play('meow_greeting')

// 播放音效並自定義配置
soundManager.play('purr', {
  volume: 0.5,        // 音量（相對於全局音量）
  playbackRate: 1.2,  // 播放速度
  loop: true          // 是否循環
})

// 停止特定音效
soundManager.stop('purr')

// 停止所有音效
soundManager.stopAll()

// 設置全局音量
soundManager.setVolume(0.7) // 0-1

// 開關音效
soundManager.setEnabled(false)

// 播放隨機貓叫聲
soundManager.playRandomMeow()

// 播放打字序列（模擬真實打字）
soundManager.playTypingSequence(3000) // 持續 3 秒
```

## 🎨 可用的音效類型

```typescript
type SoundType =
  | 'meow_greeting'    // 問候貓叫
  | 'meow_happy'       // 開心貓叫
  | 'meow_curious'     // 好奇貓叫
  | 'meow_thinking'    // 思考中的貓叫
  | 'purr'             // 呼嚕聲
  | 'typing'           // 打字音效
  | 'message_sent'     // 訊息發送
  | 'message_received' // 訊息接收
  | 'notification'     // 通知音效
  | 'button_click'     // 按鈕點擊
  | 'upload_success'   // 上傳成功
  | 'achievement'      // 成就達成
```

## 📁 音效文件位置

所有音效文件應放置在：
```
frontend/public/sounds/
├── meow-greeting.mp3
├── meow-happy.mp3
├── meow-curious.mp3
├── meow-thinking.mp3
├── purr.mp3
├── typing.mp3
├── message-sent.mp3
├── message-received.mp3
├── notification.mp3
├── button-click.mp3
├── upload-success.mp3
└── achievement.mp3
```

## 🧪 測試音效系統

### 方法 1: 在瀏覽器控制台

```javascript
// 獲取 soundManager（已經是全局可用）
import soundManager from './src/utils/soundManager'

// 測試單個音效
soundManager.play('meow_greeting')

// 測試所有貓叫聲
soundManager.play('meow_greeting')
setTimeout(() => soundManager.play('meow_happy'), 1000)
setTimeout(() => soundManager.play('meow_curious'), 2000)
setTimeout(() => soundManager.play('meow_thinking'), 3000)

// 測試打字序列
soundManager.playTypingSequence(3000)

// 測試隨機貓叫
soundManager.playRandomMeow()

// 測試音量控制
soundManager.setVolume(0.3)
soundManager.play('notification')
```

### 方法 2: 創建測試頁面

創建 `frontend/src/pages/SoundTest.tsx`：

```typescript
import { useSound } from '../hooks/useSound'

export default function SoundTest() {
  const { play, playRandomMeow, playTypingSequence, volume, setVolume, enabled, toggleSound } = useSound()

  const sounds = [
    'meow_greeting', 'meow_happy', 'meow_curious', 'meow_thinking',
    'purr', 'typing', 'message_sent', 'message_received',
    'notification', 'button_click', 'upload_success', 'achievement'
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">音效系統測試</h1>

      <div className="mb-4">
        <label>音效開關: </label>
        <button onClick={toggleSound} className="px-4 py-2 bg-blue-500 text-white rounded">
          {enabled ? '🔊 開啟' : '🔇 關閉'}
        </button>
      </div>

      <div className="mb-4">
        <label>音量: {Math.round(volume * 100)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="ml-2"
        />
      </div>

      <div className="mb-4">
        <button
          onClick={playRandomMeow}
          className="px-4 py-2 bg-green-500 text-white rounded mr-2"
        >
          隨機貓叫
        </button>
        <button
          onClick={() => playTypingSequence(3000)}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          打字序列 (3秒)
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {sounds.map(sound => (
          <button
            key={sound}
            onClick={() => play(sound as any)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            {sound}
          </button>
        ))}
      </div>
    </div>
  )
}
```

## 🚨 故障排除

### 音效不播放？

1. **檢查音效文件是否存在**
   ```bash
   ls frontend/public/sounds/
   ```

2. **檢查瀏覽器控制台**
   - 看是否有 404 錯誤
   - 看是否有自動播放策略錯誤（NotAllowedError）

3. **確認音效已開啟**
   - 檢查右上角音效按鈕是否為 🔊
   - 在控制台執行：`soundManager.isEnabled()`

4. **檢查音量設置**
   - 全局音量可能設置為 0
   - 在控制台執行：`soundManager.getVolume()`

### 自動播放策略限制

某些瀏覽器需要用戶互動後才能播放音效。解決方案：

1. 在用戶首次點擊後再播放音效
2. 組件打開時的問候音可能需要用戶先點擊
3. 系統已處理此問題，會優雅降級

### 音效文件格式問題

- 確保使用 MP3 格式（最佳兼容性）
- 文件大小建議 < 100KB
- 採樣率 44.1kHz
- 比特率 128kbps 或更高

## 🎭 設計原則

### 音效應該：
- ✅ **柔和不刺耳** - 符合療癒風格
- ✅ **簡短不打斷** - UI 音效 < 0.5秒
- ✅ **有意義** - 每個音效都應該增強用戶體驗
- ✅ **可選** - 用戶可以隨時關閉

### 音效不應該：
- ❌ **過於頻繁** - 避免音效疲勞
- ❌ **過於突兀** - 保持和諧
- ❌ **強制播放** - 尊重用戶選擇

## 📊 性能優化

1. **預加載機制** - 所有音效在初始化時預加載
2. **單例模式** - 避免重複實例化
3. **錯誤處理** - 缺少文件不會導致崩潰
4. **localStorage** - 用戶偏好持久化
5. **優雅降級** - 音效不可用時不影響功能

## 🔮 未來擴展

可以考慮添加：

1. **更多貓咪音效** - 不同情緒的貓叫聲
2. **環境音效** - 背景音樂、海浪聲
3. **音效主題** - 用戶可選擇不同音效包
4. **音效可視化** - 播放時顯示聲波動畫
5. **語音互動** - 實際錄音和語音識別

## 📝 注意事項

1. **版權問題** - 確保使用合法授權的音效
2. **文件大小** - 控制總音效文件大小在 1MB 以內
3. **加載時機** - 音效在組件掛載時自動初始化
4. **內存管理** - 音效文件會被瀏覽器緩存

---

需要更多幫助？查看 `README.md` 了解如何獲取音效文件。
