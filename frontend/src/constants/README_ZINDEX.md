# Z-Index 圖層管理系統

## 概述

本項目使用統一的 z-index 管理系統，確保所有 UI 組件的圖層順序清晰且可維護。

## 圖層結構

```
┌─────────────────────────────────────────┐
│  TOAST (z-70)                           │  ← 通知提示（最高優先級）
├─────────────────────────────────────────┤
│  FULLSCREEN_CHAT (z-68)                 │  ← Live2D 全屏聊天
├─────────────────────────────────────────┤
│  MODAL (z-65)                           │  ← 記憶詳情彈窗
│  MODAL_BACKDROP (z-60)                  │  ← 彈窗背景遮罩
├─────────────────────────────────────────┤
│  SIDEBAR (z-50)                         │  ← 設定選單側邊欄
├─────────────────────────────────────────┤
│  MINIMAP (z-48)                         │  ← 右下角小地圖
│  NAVIGATION (z-45)                      │  ← 導航欄
│  FIXED_PANEL (z-40)                     │  ← 島嶼狀態卡、設定按鈕
├─────────────────────────────────────────┤
│  BULK_ACTIONS (z-30)                    │  ← 批量操作欄
├─────────────────────────────────────────┤
│  LABEL (z-20)                           │  ← 標籤和文字
├─────────────────────────────────────────┤
│  CANVAS_3D (z-10)                       │  ← 3D 場景
│  DECORATION (z-5)                       │  ← 裝飾層
│  BACKGROUND (z-0)                       │  ← 背景
└─────────────────────────────────────────┘
```

## 使用方式

### 1. 導入常量

```tsx
import { Z_INDEX_CLASSES } from '../constants/zIndex'
```

### 2. 使用 Tailwind 類名

```tsx
// 固定面板
<div className={`fixed top-4 left-4 ${Z_INDEX_CLASSES.FIXED_PANEL}`}>
  <IslandStatusCard />
</div>

// 模態彈窗背景
<div className={`fixed inset-0 ${Z_INDEX_CLASSES.MODAL_BACKDROP}`} />

// 模態彈窗內容
<div className={`fixed inset-0 ${Z_INDEX_CLASSES.MODAL}`}>
  <MemoryDetailModal />
</div>
```

## 組件圖層分配

| 組件 | 圖層 | z-index | 說明 |
|------|------|---------|------|
| IslandStatusCard | FIXED_PANEL | z-40 | 左上角島嶼狀態卡片 |
| SettingsButton | FIXED_PANEL | z-40 | 左上角設定按鈕 |
| MiniMap | MINIMAP | z-48 | 右下角小地圖 |
| SettingsMenu | SIDEBAR | z-50 | 設定選單側邊欄 |
| SettingsMenu backdrop | MODAL_BACKDROP | z-60 | 設定選單背景遮罩 |
| MemoryDetailModal | MODAL | z-65 | 記憶詳情彈窗 |
| MemoryDetailModal backdrop | MODAL_BACKDROP | z-60 | 彈窗背景遮罩 |
| Toast | TOAST | z-70 | 通知提示 |
| Live2DCat | FULLSCREEN_CHAT | z-68 | 全屏聊天界面 |

## 使用規則

### 1. 固定面板 (FIXED_PANEL)
- 用於左上角、右上角等固定位置的小型 UI 元素
- 可以多個同時顯示，不會互相遮擋
- 不會覆蓋全屏

### 2. 側邊欄 (SIDEBAR)
- 用於從邊緣滑入的面板（設定選單等）
- 會覆蓋固定面板
- 有背景遮罩，但不是完全模態

### 3. 模態彈窗 (MODAL)
- 用於需要用戶關注的彈窗
- 完全覆蓋所有下層內容
- 有完整的背景遮罩 (MODAL_BACKDROP)
- 一次只應該打開一個

### 4. 通知 (TOAST)
- 最高優先級
- 不會被任何元素遮擋
- 通常顯示在右上角

## 最佳實踐

1. **總是使用常量**：不要硬編碼 z-index 值
2. **遵循層級**：不要跨層級使用
3. **模態背景**：彈窗類組件應該同時使用 MODAL_BACKDROP 和 MODAL
4. **避免濫用**：只在真正需要時才改變圖層
5. **測試覆蓋**：測試各種 UI 組合，確保圖層順序正確

## 維護指南

### 添加新的圖層級別
1. 在 `zIndex.ts` 中添加新的常量
2. 更新 `Z_INDEX_CLASSES` 映射
3. 更新本文檔的圖層結構圖
4. 測試與現有圖層的交互

### 調試圖層問題
1. 檢查組件是否使用了正確的 z-index 常量
2. 確認組件的父容器沒有 `z-index` 限制
3. 使用瀏覽器開發工具查看實際的 z-index 值
4. 檢查是否有 `transform` 等屬性創建了新的堆疊上下文

## 常見問題

### Q: 我的彈窗被其他元素遮擋了怎麼辦？
A: 確認彈窗使用了正確的 z-index 層級（MODAL 或更高），並且父容器沒有創建新的堆疊上下文。

### Q: 如何讓某個 UI 元素在點擊時顯示在最上層？
A: 使用 MODAL 層級，並通過狀態控制其顯示/隱藏。

### Q: 多個彈窗同時打開時的順序如何控制？
A: 設計上應該避免多個 MODAL 同時打開。如果必須，應該在代碼中控制只顯示最新打開的彈窗。
