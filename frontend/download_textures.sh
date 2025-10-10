#!/bin/bash

# 紋理下載腳本
# 從 Poly Haven 和 ambientCG 下載免費 CC0 紋理

echo "🎨 開始下載紋理材質包..."

# 基礎目錄
TEXTURE_DIR="public/textures"

# 創建臨時目錄
mkdir -p "$TEXTURE_DIR/temp"

# ============ 草地紋理 (Grass) ============
echo "🌱 下載草地紋理..."
# Poly Haven - Grass 001 (1K)
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_001/grass_001_diff_1k.jpg" -o "$TEXTURE_DIR/grass/diffuse.jpg" 2>/dev/null || echo "⚠️ 草地漫反射貼圖下載失敗"
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_001/grass_001_nor_gl_1k.jpg" -o "$TEXTURE_DIR/grass/normal.jpg" 2>/dev/null || echo "⚠️ 草地法線貼圖下載失敗"
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_001/grass_001_rough_1k.jpg" -o "$TEXTURE_DIR/grass/roughness.jpg" 2>/dev/null || echo "⚠️ 草地粗糙度貼圖下載失敗"
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_001/grass_001_ao_1k.jpg" -o "$TEXTURE_DIR/grass/ao.jpg" 2>/dev/null || echo "⚠️ 草地AO貼圖下載失敗"

# ============ 沙灘紋理 (Sand) ============
echo "🏖️ 下載沙灘紋理..."
# ambientCG - Sand 002
curl -L "https://ambientcg.com/get?file=Sand002_1K-JPG_Color.jpg" -o "$TEXTURE_DIR/sand/diffuse.jpg" 2>/dev/null || echo "⚠️ 沙灘漫反射貼圖下載失敗"
curl -L "https://ambientcg.com/get?file=Sand002_1K-JPG_NormalGL.jpg" -o "$TEXTURE_DIR/sand/normal.jpg" 2>/dev/null || echo "⚠️ 沙灘法線貼圖下載失敗"
curl -L "https://ambientcg.com/get?file=Sand002_1K-JPG_Roughness.jpg" -o "$TEXTURE_DIR/sand/roughness.jpg" 2>/dev/null || echo "⚠️ 沙灘粗糙度貼圖下載失敗"

# ============ 石頭紋理 (Stone) ============
echo "🪨 下載石頭紋理..."
# Poly Haven - Rock 024
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_024/rock_024_diff_1k.jpg" -o "$TEXTURE_DIR/stone/diffuse.jpg" 2>/dev/null || echo "⚠️ 石頭漫反射貼圖下載失敗"
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_024/rock_024_nor_gl_1k.jpg" -o "$TEXTURE_DIR/stone/normal.jpg" 2>/dev/null || echo "⚠️ 石頭法線貼圖下載失敗"
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_024/rock_024_rough_1k.jpg" -o "$TEXTURE_DIR/stone/roughness.jpg" 2>/dev/null || echo "⚠️ 石頭粗糙度貼圖下載失敗"
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_024/rock_024_ao_1k.jpg" -o "$TEXTURE_DIR/stone/ao.jpg" 2>/dev/null || echo "⚠️ 石頭AO貼圖下載失敗"

# ============ 雪地紋理 (Snow) ============
echo "❄️ 下載雪地紋理..."
# Poly Haven - Snow 002
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/snow_002/snow_002_diff_1k.jpg" -o "$TEXTURE_DIR/snow/diffuse.jpg" 2>/dev/null || echo "⚠️ 雪地漫反射貼圖下載失敗"
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/snow_002/snow_002_nor_gl_1k.jpg" -o "$TEXTURE_DIR/snow/normal.jpg" 2>/dev/null || echo "⚠️ 雪地法線貼圖下載失敗"
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/snow_002/snow_002_rough_1k.jpg" -o "$TEXTURE_DIR/snow/roughness.jpg" 2>/dev/null || echo "⚠️ 雪地粗糙度貼圖下載失敗"

# ============ 泥土紋理 (Dirt) ============
echo "🌍 下載泥土紋理..."
# ambientCG - Ground 037
curl -L "https://ambientcg.com/get?file=Ground037_1K-JPG_Color.jpg" -o "$TEXTURE_DIR/dirt/diffuse.jpg" 2>/dev/null || echo "⚠️ 泥土漫反射貼圖下載失敗"
curl -L "https://ambientcg.com/get?file=Ground037_1K-JPG_NormalGL.jpg" -o "$TEXTURE_DIR/dirt/normal.jpg" 2>/dev/null || echo "⚠️ 泥土法線貼圖下載失敗"
curl -L "https://ambientcg.com/get?file=Ground037_1K-JPG_Roughness.jpg" -o "$TEXTURE_DIR/dirt/roughness.jpg" 2>/dev/null || echo "⚠️ 泥土粗糙度貼圖下載失敗"
curl -L "https://ambientcg.com/get?file=Ground037_1K-JPG_AmbientOcclusion.jpg" -o "$TEXTURE_DIR/dirt/ao.jpg" 2>/dev/null || echo "⚠️ 泥土AO貼圖下載失敗"

# ============ 森林紋理 (Forest) - 使用深色草地 ============
echo "🌲 下載森林紋理..."
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_ground_03/forest_ground_03_diff_1k.jpg" -o "$TEXTURE_DIR/forest/diffuse.jpg" 2>/dev/null || echo "⚠️ 森林漫反射貼圖下載失敗"
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_ground_03/forest_ground_03_nor_gl_1k.jpg" -o "$TEXTURE_DIR/forest/normal.jpg" 2>/dev/null || echo "⚠️ 森林法線貼圖下載失敗"
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_ground_03/forest_ground_03_rough_1k.jpg" -o "$TEXTURE_DIR/forest/roughness.jpg" 2>/dev/null || echo "⚠️ 森林粗糙度貼圖下載失敗"

# ============ 沙漠紋理 (Desert) ============
echo "🏜️ 下載沙漠紋理..."
curl -L "https://ambientcg.com/get?file=Sand004_1K-JPG_Color.jpg" -o "$TEXTURE_DIR/desert/diffuse.jpg" 2>/dev/null || echo "⚠️ 沙漠漫反射貼圖下載失敗"
curl -L "https://ambientcg.com/get?file=Sand004_1K-JPG_NormalGL.jpg" -o "$TEXTURE_DIR/desert/normal.jpg" 2>/dev/null || echo "⚠️ 沙漠法線貼圖下載失敗"
curl -L "https://ambientcg.com/get?file=Sand004_1K-JPG_Roughness.jpg" -o "$TEXTURE_DIR/desert/roughness.jpg" 2>/dev/null || echo "⚠️ 沙漠粗糙度貼圖下載失敗"

# ============ 岩漿紋理 (Lava) ============
echo "🌋 下載岩漿紋理..."
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/lava_01/lava_01_diff_1k.jpg" -o "$TEXTURE_DIR/lava/diffuse.jpg" 2>/dev/null || echo "⚠️ 岩漿漫反射貼圖下載失敗"
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/lava_01/lava_01_nor_gl_1k.jpg" -o "$TEXTURE_DIR/lava/normal.jpg" 2>/dev/null || echo "⚠️ 岩漿法線貼圖下載失敗"

# 清理臨時目錄
rm -rf "$TEXTURE_DIR/temp"

echo ""
echo "✅ 紋理下載完成！"
echo ""
echo "📊 下載統計："
for dir in grass sand stone snow dirt forest desert lava; do
    count=$(ls -1 "$TEXTURE_DIR/$dir"/*.jpg 2>/dev/null | wc -l)
    echo "  $dir: $count 個文件"
done

echo ""
echo "💡 提示："
echo "  - 所有紋理為 1K 解析度 (1024x1024)"
echo "  - 來源：Poly Haven 和 ambientCG (CC0 授權)"
echo "  - 重啟前端服務器以載入紋理"
echo ""
echo "🎨 享受你的自定義島嶼吧！"
