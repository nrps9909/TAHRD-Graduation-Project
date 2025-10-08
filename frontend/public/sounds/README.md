# 音效文件說明

此目錄包含所有音效文件。請按照以下指南添加音效。

## 📋 需要的音效文件

系統需要以下音效文件（全部為 MP3 格式）：

### 貓咪音效
- `meow-greeting.mp3` - 問候時的貓叫聲（溫柔、友好）
- `meow-happy.mp3` - 開心的貓叫聲（活潑、高音調）
- `meow-curious.mp3` - 好奇的貓叫聲（中等音調、疑問語氣）
- `meow-thinking.mp3` - 思考時的貓叫聲（低沉、短促）
- `purr.mp3` - 呼嚕聲（舒適、放鬆）

### UI 互動音效
- `typing.mp3` - 打字音效（單個按鍵聲）
- `message-sent.mp3` - 訊息發送音效（輕快、向上）
- `message-received.mp3` - 訊息接收音效（柔和、提示）
- `notification.mp3` - 通知音效（溫和提醒）
- `button-click.mp3` - 按鈕點擊音效（輕脆）
- `upload-success.mp3` - 上傳成功音效（愉悅、完成感）
- `achievement.mp3` - 成就達成音效（慶祝、興奮）

## 🎵 推薦音效資源網站

### 免費商用音效庫
1. **Freesound** - https://freesound.org/
   - 需註冊，大量免費 CC0 授權音效
   - 搜索關鍵字：cat meow, typing, notification, button click

2. **Pixabay** - https://pixabay.com/sound-effects/
   - 無需註冊，完全免費商用
   - 高品質音效

3. **Mixkit** - https://mixkit.co/free-sound-effects/
   - 免費商用，無需註冊
   - 分類清晰

4. **Zapsplat** - https://www.zapsplat.com/
   - 需免費註冊
   - 大量高品質音效

### 搜索建議

#### 貓咪音效搜索關鍵字
```
- "cat meow soft"
- "cat purr"
- "kitten meow"
- "cat sound cute"
```

#### UI 音效搜索關鍵字
```
- "keyboard typing single key"
- "message pop"
- "notification soft"
- "button click soft"
- "success chime"
- "achievement unlock"
```

## 🛠️ 音效處理建議

### 推薦參數
- **格式**: MP3
- **音量**: 標準化到 -3dB 到 -6dB
- **長度**:
  - 貓叫聲: 0.5-2 秒
  - UI 音效: 0.1-0.5 秒
  - 呼嚕聲: 2-5 秒（可循環）
- **採樣率**: 44.1kHz
- **比特率**: 128kbps 或更高

### 線上音效編輯工具
- **AudioMass** - https://audiomass.co/ （線上免費）
- **TwistedWave** - https://twistedwave.com/online （線上免費）

### 編輯技巧
1. **音量標準化**: 確保所有音效音量一致
2. **淡入淡出**: 添加短暫淡入淡出避免爆音
3. **去噪**: 移除背景雜音
4. **裁剪**: 移除音效前後的靜音部分

## 🚀 快速測試

添加音效後，可以在瀏覽器控制台測試：

```javascript
// 測試單個音效
soundManager.play('meow_greeting')

// 測試隨機貓叫
soundManager.playRandomMeow()

// 測試打字序列
soundManager.playTypingSequence()

// 測試所有音效
soundManager.play('meow_greeting')
setTimeout(() => soundManager.play('meow_happy'), 1000)
setTimeout(() => soundManager.play('notification'), 2000)
```

## 📝 注意事項

1. **版權**: 確保使用的音效有適當授權（CC0、CC BY 或其他商用授權）
2. **文件大小**: 單個音效建議不超過 100KB
3. **瀏覽器兼容性**: MP3 格式被所有現代瀏覽器支持
4. **用戶體驗**: 音效應該柔和、不刺耳，符合療癒風格

## 🎨 推薦音效風格

### 貓咪音效
- 溫柔、可愛
- 避免太尖銳或兇猛
- 類似小貓或親人的家貓

### UI 音效
- 柔和、不刺耳
- 簡短、不打斷思維
- 符合「療癒」「溫暖」的整體設計風格

## 🔍 找不到合適音效？

如果找不到合適的音效，可以暫時使用系統提供的靜音檔案（音效系統會自動處理錯誤）。系統會優雅地降級，不會影響功能。

## 📦 臨時解決方案

如果想快速測試功能但還沒準備音效，可以使用以下方式生成臨時音效：

### 使用 Web Audio API 生成簡單音效

在瀏覽器控制台執行以下代碼生成測試用嗶聲：

```javascript
// 生成簡單的測試音效
function generateTestSound(frequency, duration) {
  const audioContext = new AudioContext()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = frequency
  oscillator.type = 'sine'

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

// 測試不同音調
generateTestSound(440, 0.2)  // A音
```

---

需要幫助？請參考專案文檔或提交 Issue。
