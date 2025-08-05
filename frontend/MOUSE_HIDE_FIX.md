# 滑鼠隱藏和360度旋轉修復說明

## 已修復的問題

### 1. 滑鼠隱藏系統
- 創建了 `PointerLockManager` 組件來強制管理游標狀態
- 使用動態 CSS 注入確保游標在 Pointer Lock 模式下完全隱藏
- 添加了多重保險機制：
  - CSS class `pointer-locked` 和 `game-active`
  - 內聯樣式 `cursor: none`
  - 強制 CSS 規則覆蓋所有元素

### 2. 360度相機旋轉
- **拖曳模式**（默認）：
  - 按住左鍵拖曳可以無限旋轉相機
  - 游標顯示為 grab/grabbing 圖標
  - 支援連續 360 度旋轉
  
- **Pointer Lock 模式**：
  - 點擊畫面進入（游標消失）
  - 滑鼠移動直接控制視角
  - 無限制的水平旋轉
  - 垂直視角限制在 -60° 到 +60°

### 3. 操作體驗優化
- 防止拖曳結束時誤觸發 Pointer Lock
- 更新操作提示說明兩種控制模式
- 確保模式切換時游標狀態正確

## 技術實現細節

### 游標隱藏機制
1. **PointerLockManager**：全局樣式管理器
2. **CameraController**：直接控制 canvas 游標
3. **CSS 層級**：多重 `!important` 規則確保優先級

### 旋轉實現
```javascript
// 拖曳模式
dragRotation.current -= deltaX * 0.01
targetRotation.current = dragRotation.current

// 球座標系統計算相機位置
rotatedOffset.x = Math.sin(currentRotation.current) * horizontalDistance
rotatedOffset.z = Math.cos(currentRotation.current) * horizontalDistance
```

## 操作說明

### 兩種控制模式
1. **拖曳模式**（默認）
   - 按住左鍵拖曳旋轉視角
   - 可以 360 度無限旋轉
   - 游標為抓手圖標

2. **Pointer Lock 模式**
   - 點擊畫面進入
   - 游標完全消失
   - 滑鼠移動控制視角
   - 按 ESC 退出

### 快捷鍵
- **點擊**：進入 Pointer Lock 模式
- **ESC**：退出 Pointer Lock 模式
- **左鍵拖曳**：旋轉相機（標準模式）

## 調試訊息
控制台會顯示：
- "Pointer lock requested" - 請求鎖定時
- "Pointer lock changed: true/false" - 狀態改變時
- "Pointer lock failed:" - 如果失敗

## 瀏覽器兼容性
- Chrome/Edge：完全支援
- Firefox：完全支援
- Safari：可能需要用戶設置允許 Pointer Lock

## 故障排除
如果游標仍然顯示：
1. 檢查瀏覽器是否支援 Pointer Lock API
2. 確認沒有其他 CSS 覆蓋游標樣式
3. 檢查控制台是否有錯誤訊息
4. 嘗試重新整理頁面