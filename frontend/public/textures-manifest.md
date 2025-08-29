# 材質資產清單

## 專案材質結構

目前專案使用 Kenney Mini Characters 資產包，每個角色都有 GLB 模型和對應的貼圖。

### [人物模型] 路徑：public/characters/
- CHAR-M-A/CHAR-M-A.glb (男性角色 A - Player 和 NPC 鋁配咻使用)
- CHAR-F-B/CHAR-F-B.glb (女性角色 B - NPC 流羽岑使用)  
- CHAR-M-C/CHAR-M-C.glb (男性角色 C - NPC 沉停鞍使用)

### [貼圖] 路徑：public/characters/[CHAR-CODE]/textures/
每個角色都有：
- basecolor: colormap.png (sRGB) - 顏色貼圖

### 目前材質狀態：
- 只有 basecolor (colormap.png) 貼圖
- GLB 內建材質使用 MeshStandardMaterial
- 已設定 sRGB 色彩空間
- 支援 SkinnedMesh 動畫

### 要統一的材質設定：
- Player 使用 CHAR-M-A 模型和材質
- NPC 各自使用對應角色的模型和材質  
- 確保 Player 和 NPC 材質渲染一致

### 可能新增的 PBR 貼圖 (如果需要增強)：
- normal.jpg (法線貼圖)
- roughness.jpg (粗糙度)
- metallic.jpg (金屬度)
- ao.jpg (環境光遮蔽)

## 目前問題：
1. Player 模型有時不顯示或顯示異常
2. 需要確保 Player 和 NPC 使用相同的材質系統
3. 需要統一材質處理邏輯