# Minecraft 風格相機系統實現說明

## 已完成的功能

### 1. Pointer Lock API 實現
- 點擊畫面即可進入 Pointer Lock 模式（類似 Minecraft）
- 滑鼠會被隱藏，改為顯示準心
- 按 ESC 鍵退出 Pointer Lock 模式

### 2. 準心系統
- 在螢幕正中央顯示白色準心
- 準心設計包含：
  - 十字線（帶黑色陰影提高可見度）
  - 中心點
  - 外圈輔助圓環
- 只在 Pointer Lock 模式下顯示

### 3. 相機距離調整
- 相機距離從 `(0, 12, 15)` 調整為 `(0, 6, 8)`
- 提供更近的第三人稱視角
- 視野更貼近玩家，增強沉浸感

### 4. 視角控制系統
- **Pointer Lock 模式**：
  - 滑鼠移動直接控制視角旋轉
  - 支援上下視角（pitch）限制：-60° 到 +60°
  - 移動方向基於視角方向（WASD 相對於看的方向）
  - 玩家模型會跟隨視角旋轉

- **標準模式**：
  - 滑鼠位置控制相機環繞
  - 移動方向基於世界坐標
  - 玩家面向移動方向

### 5. 提示系統
- 初次進入遊戲顯示操作提示
- 提示內容：「點擊畫面進入第一人稱視角」
- 5秒後自動消失或進入 Pointer Lock 後立即消失

## 操作說明

### 控制方式
- **點擊畫面**：進入 Pointer Lock 模式
- **ESC**：退出 Pointer Lock 模式
- **WASD/方向鍵**：移動角色
- **Shift**：加速跑步
- **滑鼠移動**：控制視角

### 視角模式差異
1. **Pointer Lock 模式（類 Minecraft）**
   - 滑鼠消失，顯示準心
   - 視角自由旋轉
   - 移動基於視角方向

2. **標準模式**
   - 滑鼠可見
   - 相機環繞玩家
   - 移動基於世界方向

## 技術實現細節

### 新增組件
1. `Crosshair.tsx` - 準心顯示組件
2. `PointerLockHint.tsx` - 操作提示組件
3. `CameraController.tsx` - 增強的相機控制器

### 主要修改
1. **CameraController**
   - 添加 Pointer Lock 支援
   - 實現視角 pitch 限制
   - 回調玩家旋轉信息

2. **Player**
   - 根據 Pointer Lock 狀態切換移動邏輯
   - 同步玩家朝向與相機旋轉

3. **UI 系統**
   - 整合準心和提示組件
   - CSS 支援遊戲場景樣式

## 可調整參數

```typescript
// 相機距離
offset={new THREE.Vector3(0, 6, 8)}  // x, y, z

// 視角靈敏度
const sensitivity = 0.002  // 在 CameraController 中

// Pitch 限制
Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch))  // -60° 到 +60°
```

## 後續可優化項目
1. 添加視角靈敏度設定
2. 支援第一人稱視角切換
3. 添加準心樣式選項
4. 實現視角平滑過渡效果