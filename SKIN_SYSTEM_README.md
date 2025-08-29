# 角色皮膚更換系統

## 概述

本系統實現了角色皮膚的動態更換功能，支持使用提供的GLB模型和對應貼圖。

## 支援的角色模型

### NPC模型
- **npc-1**: `/characters/CHAR-M-A/CHAR-M-A.glb` - 陸培修 (鋁配咻) - 男性
- **npc-2**: `/characters/CHAR-F-B/CHAR-F-B.glb` - 劉宇岑 (流羽岑) - 女性  
- **npc-3**: `/characters/CHAR-M-C/CHAR-M-C.glb` - 陳庭安 (沉停鞍) - 男性

### Player模型
- **player-female-main**: `/characters/CHAR-F-A/CHAR-F-A.glb` - 主場景Player (女性A)
- **player-male-default**: `/characters/CHAR-M-A/CHAR-M-A.glb` - 預設Player (男性A)
- **player-female-simple**: `/characters/CHAR-F-E/CHAR-F-E.glb` - 簡化Player (女性E)

### 對應貼圖
每個模型都有對應的貼圖檔案，路徑格式：`/characters/[MODEL_ID]/textures/colormap.png`

## 核心組件

### 1. CharacterSkinSystem.tsx
主要的皮膚系統檔案，包含：
- 角色路徑映射
- 皮膚載入組件
- 皮膚切換Hook

### 2. CharacterWithSkin 組件
```tsx
<CharacterWithSkin 
  skinId="player-female-main"
  scale={1}
  position={[0, 0, 0]}
  onLoad={() => console.log('模型載入完成')}
/>
```

### 3. useCharacterSkin Hook
```tsx
const { currentSkinId, changeSkin, getAvailableSkins } = useCharacterSkin('player-female-main')
```

## UI組件

### 1. SkinSelector
完整的皮膚選擇UI，包含：
- 角色預覽網格
- 角色資訊顯示
- 確認/取消按鈕

### 2. SkinSelectorTrigger
觸發皮膚選擇器的按鈕

## 使用方式

### 遊戲內控制
- **C鍵**: 快速切換玩家皮膚
- **右下角按鈕**: 開啟皮膚選擇器

### 程式化使用

#### 1. 更新Player組件
```tsx
import { CharacterWithSkin } from '../CharacterSkinSystem'

// 在Player組件中替換原有的幾何體
<CharacterWithSkin 
  skinId={currentSkinId}
  scale={1}
  position={[0, 0, 0]}
/>
```

#### 2. 更新NPC組件
```tsx
// NPCCharacter.tsx中
<CharacterWithSkin 
  skinId={getDefaultSkinId(npc.id)}
  scale={size}
  position={[0, 0, 0]}
/>
```

#### 3. 自訂皮膚映射
```tsx
const getDefaultSkinId = (npcId: string): CharacterSkinId => {
  switch (npcId) {
    case 'npc-1': return 'npc-1'  // 陸培修
    case 'npc-2': return 'npc-2'  // 劉宇岑  
    case 'npc-3': return 'npc-3'  // 陳庭安
    default: return 'npc-1'
  }
}
```

## 特色功能

### 1. 自動材質應用
- 自動載入對應貼圖
- 應用Toon Shading材質
- 設定陰影和透明度

### 2. 模型預載入
系統啟動時自動預載入所有角色模型，提升切換速度。

### 3. 性能優化
- 模型複製避免資源衝突
- 貼圖參數優化
- 記憶體使用優化

## 測試功能

### SkinSystemTest組件
獨立的測試環境，包含：
- 3D預覽區域
- 皮膚選擇控制面板
- 系統資訊顯示
- 使用說明

使用方式：
```tsx
import { SkinSystemTest } from './components/SkinSystemTest'

// 在開發時替換主Scene
<SkinSystemTest />
```

## 擴展指南

### 添加新角色
1. 將GLB檔案放置到 `/characters/[ID]/[ID].glb`
2. 將貼圖放置到 `/characters/[ID]/textures/colormap.png`
3. 更新 `CHARACTER_PATHS` 和 `TEXTURE_PATHS`
4. 更新 `CHARACTER_INFO`

### 自訂材質
可以在 `CharacterWithSkin` 組件中修改材質設定：
```tsx
const toonMaterial = new THREE.MeshToonMaterial({
  map: colorTexture,
  transparent: true,
  alphaTest: 0.5,
  // 添加自訂屬性
})
```

## 故障排除

### 常見問題
1. **模型不顯示**: 檢查GLB檔案路徑是否正確
2. **貼圖異常**: 檢查PNG檔案路徑和格式
3. **效能問題**: 確認模型複雜度和貼圖解析度

### 除錯工具
- 瀏覽器控制台查看載入日誌
- React Developer Tools
- Three.js Inspector

## 技術規格

- **支援格式**: GLB (GLTF二進制)
- **貼圖格式**: PNG
- **材質系統**: MeshToonMaterial
- **相容性**: React Three Fiber
- **效能**: 支援即時切換

## 版本歷史

- v1.0.0: 初始版本，支援基本皮膚切換
- 支援6種角色模型
- UI選擇器
- 快捷鍵控制