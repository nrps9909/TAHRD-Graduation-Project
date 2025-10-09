# 島嶼環境系統 - 時間與天氣

完整的動態時間和天氣系統，為島嶼世界帶來真實感和沉浸感。

## 功能概覽

### 🌞 時間系統
- **30分鐘日夜循環**：每30分鐘完成一次完整的日夜循環
- **真實時間映射**：遊戲時間與現實時間同步
- **動態天體**：太陽和月亮根據時間自動移動
  - 中午12:00 - 太陽在正上方
  - 午夜00:00 - 月亮在正上方
- **平滑光照過渡**：日出、白天、黃昏、夜晚的自然過渡

### 🌦️ 天氣系統
- **真實天氣同步**：根據使用者定位獲取當地天氣
- **多種天氣效果**：
  - ☀️ 晴天
  - ☁️ 多雲 / 局部多雲
  - 🌧️ 雨天
  - ⛈️ 暴風雨
  - ❄️ 雪天
  - 🌫️ 霧天
- **粒子效果**：真實的雨滴、雪花動畫
- **動態氛圍**：霧效和雲層根據天氣調整

## 架構設計

```
frontend/
├── src/
│   ├── stores/
│   │   └── environmentStore.ts          # 環境狀態管理
│   ├── components/
│   │   └── 3D/
│   │       ├── CelestialBodies.tsx      # 天體系統（太陽、月亮）
│   │       ├── WeatherEffects.tsx       # 天氣效果渲染
│   │       └── IslandScene.tsx          # 主場景（已整合）
│   └── .env.example                     # 環境變數範例
```

## 快速開始

### 1. 設定環境變數

複製 `.env.example` 到 `.env`：

```bash
cd frontend
cp .env.example .env
```

編輯 `.env` 並添加 OpenWeather API Key：

```env
VITE_OPENWEATHER_API_KEY=your_api_key_here
```

**獲取免費 API Key：**
1. 註冊 [OpenWeatherMap](https://openweathermap.org/api)
2. 免費方案：每分鐘60次呼叫，每天1000次
3. 複製 API Key 到 `.env` 檔案

### 2. 啟動應用

```bash
npm run dev
```

系統將自動：
- ✅ 初始化時間系統
- ✅ 請求使用者位置授權
- ✅ 獲取當地天氣資料
- ✅ 開始日夜循環

## 使用方式

### 基本使用

時間和天氣系統已整合到 `IslandScene` 中，無需額外配置：

```tsx
import { IslandScene } from './components/3D/IslandScene'

function App() {
  return <IslandScene />
}
```

### 進階使用

#### 訪問環境狀態

```tsx
import { useEnvironmentStore } from './stores/environmentStore'

function MyComponent() {
  const {
    gameTime,      // 當前遊戲時間 (0-24)
    isNight,       // 是否為夜晚
    weather,       // 天氣資料
    sunPosition,   // 太陽位置
    moonPosition,  // 月亮位置
  } = useEnvironmentStore()

  return (
    <div>
      <p>時間：{gameTime.toFixed(1)}點</p>
      <p>天氣：{weather?.description}</p>
    </div>
  )
}
```

#### 手動控制系統

```tsx
const {
  toggleTime,        // 切換時間系統開關
  toggleWeather,     // 切換天氣系統開關
  setWeather,        // 手動設置天氣
  fetchWeather,      // 手動更新天氣
} = useEnvironmentStore()

// 暫停時間系統
toggleTime(false)

// 手動設置測試天氣
setWeather({
  type: 'rainy',
  temperature: 20,
  humidity: 80,
  windSpeed: 5,
  description: '下雨',
  location: '測試位置',
  lastUpdated: new Date()
})
```

#### 獨立使用組件

如果需要在其他場景中使用：

```tsx
import { CelestialSystem } from './components/3D/CelestialBodies'
import { WeatherSystem } from './components/3D/WeatherEffects'

function CustomScene() {
  return (
    <Canvas>
      {/* 天體系統 */}
      <CelestialSystem />

      {/* 天氣效果 */}
      <WeatherSystem />

      {/* 其他場景內容 */}
    </Canvas>
  )
}
```

## 系統詳解

### 時間系統配置

在 `environmentStore.ts` 中修改：

```typescript
const TIME_CONFIG = {
  CYCLE_DURATION: 30 * 60 * 1000,  // 循環時長（毫秒）
  NIGHT_START_HOUR: 18,             // 夜晚開始時間
  NIGHT_END_HOUR: 6,                // 夜晚結束時間
}
```

### 天體位置計算

**太陽軌跡：**
- 軌道半徑：400單位
- 中午12:00在天頂（90度）
- 日出/日落在地平線（0度）
- 夜間在地平線下方（負角度）

**月亮軌跡：**
- 軌道半徑：350單位
- 與太陽相位差180度（對立）
- 午夜00:00在天頂

### 光照系統

**動態光照強度：**
- 白天環境光：0.7
- 夜晚環境光：0.2
- 太陽光強度：隨高度變化（最高1.2）
- 月光強度：固定0.4

**顏色變化：**
- 黃昏（17:00-19:00）：橘色 `#ff9966`
- 日出（05:00-07:00）：淡橘 `#ffcc99`
- 正午（10:00-14:00）：白色 `#ffffee`
- 月光：淡藍 `#b0c4de`

### 天氣效果

#### 雨天效果
- 5000個粒子
- 下落速度：0.5-1.0 單位/幀
- 顏色：`#a0c4ff`（淡藍）
- 透明度：60%

#### 雪天效果
- 3000個粒子
- 下落速度：0.1-0.2 單位/幀
- 橫向漂移效果
- 顏色：`#ffffff`
- 透明度：80%

#### 霧效果
- 動態霧近距離：50單位 × (1 - 濃度)
- 動態霧遠距離：400單位 × (1 - 濃度 × 0.5)

## 性能優化

### 粒子系統優化
- 使用 `BufferGeometry` 提升性能
- 粒子數量可調整：
  ```tsx
  <RainEffect intensity={0.5} />  // 減少粒子數量
  ```

### 更新頻率
- 時間更新：每秒1次
- 天氣更新：每30分鐘1次
- 天體位置：每幀更新（60 FPS）

### 記憶體管理
- 粒子系統使用對象池
- 自動清理超出範圍的粒子
- 霧效果僅在特定天氣啟用

## 測試模式

### 快速測試不同時間

修改 `environmentStore.ts` 的 `calculateGameTime` 函數：

```typescript
// 測試：加速時間 10 倍
function calculateGameTime(): number {
  const now = Date.now() * 10  // 加速10倍
  const millisInDay = TIME_CONFIG.CYCLE_DURATION
  const timeInCycle = now % millisInDay
  return (timeInCycle / millisInDay) * 24
}
```

### 測試不同天氣

```typescript
import { useEnvironmentStore } from './stores/environmentStore'

// 在組件中
const { setWeather } = useEnvironmentStore()

// 測試雨天
setWeather({
  type: 'rainy',
  temperature: 20,
  humidity: 80,
  windSpeed: 5,
  description: '大雨',
  location: '測試',
  lastUpdated: new Date()
})

// 測試雪天
setWeather({ type: 'snowy', /* ... */ })

// 測試暴風雨
setWeather({ type: 'stormy', /* ... */ })
```

## UI 組件

### WeatherInfo 顯示面板

位於場景右上角，顯示：
- 🕐 遊戲時間
- 🌤️ 當前天氣類型和圖標
- 🌡️ 溫度
- 💧 濕度
- 💨 風速
- 📍 位置

可以自訂樣式或隱藏：

```tsx
// 隱藏天氣面板
// 在 IslandScene.tsx 中註解掉：
// <WeatherInfo />
```

## 疑難排解

### 天氣無法獲取

**問題：** 無法獲取天氣資料

**解決方案：**
1. 檢查 API Key 是否正確設定
2. 檢查瀏覽器是否允許定位
3. 檢查網路連線
4. 查看控制台錯誤訊息

系統會自動使用預設天氣（晴天，25°C）作為備用。

### 位置授權被拒絕

**問題：** 使用者拒絕位置授權

**解決方案：**
- 系統會使用預設天氣
- 可以手動設置位置：

```typescript
const { userLocation, fetchWeather } = useEnvironmentStore()

// 手動設置位置（台北）
userLocation.set({ lat: 25.0330, lon: 121.5654 })
fetchWeather()
```

### 時間循環太快/太慢

修改 `TIME_CONFIG.CYCLE_DURATION`：

```typescript
// 更快（15分鐘循環）
CYCLE_DURATION: 15 * 60 * 1000

// 更慢（60分鐘循環）
CYCLE_DURATION: 60 * 60 * 1000

// 真實24小時
CYCLE_DURATION: 24 * 60 * 60 * 1000
```

### 性能問題

如果遇到性能問題：

1. **降低粒子數量**：
   ```tsx
   <RainEffect intensity={0.3} />
   <SnowEffect intensity={0.5} />
   ```

2. **關閉天氣效果**：
   ```tsx
   const { toggleWeather } = useEnvironmentStore()
   toggleWeather(false)
   ```

3. **降低更新頻率**：
   修改 `initialize()` 中的 interval 時間

## API 參考

### EnvironmentStore

#### 狀態

| 屬性 | 類型 | 說明 |
|-----|------|------|
| `gameTime` | `number` | 遊戲時間（0-24） |
| `isNight` | `boolean` | 是否為夜晚 |
| `sunPosition` | `CelestialPosition` | 太陽位置和屬性 |
| `moonPosition` | `CelestialPosition` | 月亮位置和屬性 |
| `weather` | `WeatherData \| null` | 天氣資料 |
| `userLocation` | `{lat, lon} \| null` | 使用者位置 |
| `timeEnabled` | `boolean` | 時間系統開關 |
| `weatherEnabled` | `boolean` | 天氣系統開關 |

#### 方法

| 方法 | 參數 | 說明 |
|-----|------|------|
| `initialize()` | - | 初始化環境系統 |
| `updateGameTime()` | - | 更新遊戲時間 |
| `updateCelestialPositions()` | - | 更新天體位置 |
| `requestUserLocation()` | - | 請求使用者位置 |
| `fetchWeather()` | - | 獲取天氣資料 |
| `setWeather(weather)` | `WeatherData` | 手動設置天氣 |
| `toggleTime(enabled)` | `boolean` | 切換時間系統 |
| `toggleWeather(enabled)` | `boolean` | 切換天氣系統 |

### WeatherData

```typescript
interface WeatherData {
  type: WeatherType           // 天氣類型
  temperature: number         // 溫度（°C）
  humidity: number           // 濕度（%）
  windSpeed: number          // 風速（m/s）
  description: string        // 描述
  location: string           // 位置
  lastUpdated: Date          // 更新時間
}

type WeatherType =
  | 'clear'
  | 'cloudy'
  | 'rainy'
  | 'stormy'
  | 'snowy'
  | 'foggy'
  | 'partly-cloudy'
```

## 未來擴展

### 計畫功能

- [ ] 四季系統
- [ ] 動態雲層密度
- [ ] 閃電效果（暴風雨）
- [ ] 彩虹效果（雨後）
- [ ] 星空系統（夜晚）
- [ ] 風向和風力可視化
- [ ] 溫度影響視覺效果
- [ ] 天氣預報系統
- [ ] 特殊天氣事件

### 擴展建議

歡迎貢獻新功能！可以考慮：
1. 更多天氣類型（冰雹、龍捲風等）
2. 季節性植被變化
3. 天氣影響遊戲機制
4. 歷史天氣記錄
5. 天氣主題音效

## 授權與感謝

- **OpenWeatherMap API**：天氣資料提供
- **Three.js**：3D 渲染引擎
- **React Three Fiber**：React 整合
- **Zustand**：狀態管理

---

建立日期：2025-10-09
版本：1.0.0
維護者：Heart Whisper Town Team
