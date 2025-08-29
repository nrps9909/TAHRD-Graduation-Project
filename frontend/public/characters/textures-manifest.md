# 角色材質資產清單

## 可用的 NPC 角色模型與貼圖

所有角色都使用 Kenney 的 Mini Characters 資產，每個角色都有以下結構：

### 角色列表

| 角色代碼 | 資料夾名稱 | 模型檔案 | 貼圖檔案 |
|---------|------------|----------|----------|
| char-m-a | CHAR-M-A | CHAR-M-A.glb | textures/colormap.png |
| char-m-b | CHAR-M-B | CHAR-M-B.glb | textures/colormap.png |
| char-m-c | CHAR-M-C | CHAR-M-C.glb | textures/colormap.png |
| char-m-d | CHAR-M-D | CHAR-M-D.glb | textures/colormap.png |
| char-m-e | CHAR-M-E | CHAR-M-E.glb | textures/colormap.png |
| char-m-f | CHAR-M-F | CHAR-M-F.glb | textures/colormap.png |
| char-f-a | CHAR-F-A | CHAR-F-A.glb | textures/colormap.png |
| char-f-b | CHAR-F-B | CHAR-F-B.glb | textures/colormap.png |
| char-f-c | CHAR-F-C | CHAR-F-C.glb | textures/colormap.png |
| char-f-d | CHAR-F-D | CHAR-F-D.glb | textures/colormap.png |
| char-f-e | CHAR-F-E | CHAR-F-E.glb | textures/colormap.png |
| char-f-f | CHAR-F-F | CHAR-F-F.glb | textures/colormap.png |

### 檔案路徑結構

```
public/characters/
├── CHAR-M-A/
│   ├── CHAR-M-A.glb (3D模型檔，含骨架動畫)
│   ├── CHAR-M-A.fbx (原始FBX檔)
│   └── textures/
│       └── colormap.png (主要貼圖，sRGB色彩空間)
├── CHAR-M-B/ (同樣結構)
├── CHAR-M-C/ (同樣結構)
├── ... (其他角色)
```

### 貼圖詳細資訊

- **檔案類型**: PNG
- **貼圖類型**: Base Color / Albedo Map
- **色彩空間**: sRGB (需要設定 `texture.colorSpace = THREE.SRGBColorSpace`)
- **UV設定**: 
  - `flipY = false` (GLB內建貼圖通常已設定)
  - `wrapS = THREE.RepeatWrapping`
  - `wrapT = THREE.RepeatWrapping`

### NPC 角色映射

| NPC名稱 | 對應角色 | 模型路徑 |
|---------|----------|----------|
| 流羽岑 | CHAR-M-A | /characters/CHAR-M-A/CHAR-M-A.glb |
| 鋁配咻 | CHAR-F-B | /characters/CHAR-F-B/CHAR-F-B.glb |
| 沉停鞍 | CHAR-M-C | /characters/CHAR-M-C/CHAR-M-C.glb |

### 材質設定參數

所有角色統一使用以下 PBR 材質參數：
- **metalness**: 0
- **roughness**: 0.8-0.9
- **side**: THREE.DoubleSide
- **transparent**: false (除非特別需要透明效果)
- **skinning**: true (所有SkinnedMesh必須啟用)

### 注意事項

1. 所有GLB檔案已包含骨架與動畫資訊
2. 貼圖路徑相對於各角色資料夾
3. 載入時需要正確設定 resourcePath
4. 材質需要啟用 skinning 以支援骨架動畫
5. 若需要環境光照，可加載 HDR 環境貼圖