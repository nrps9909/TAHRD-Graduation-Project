# .env.production 環境變數設定範本

## 📋 使用方法

在服務器上創建 `.env.production` 檔案：

```bash
cd /home/jesse/heart-whisper-town
nano .env.production
```

複製以下內容並填入實際的值：

```env
# ========================================
# 心語小鎮 - 生產環境配置
# ========================================

# Node 環境
NODE_ENV=production

# MongoDB 資料庫連接（必須！）
DATABASE_URL=mongodb://mongodb:27017/heart-whisper-town

# Redis 緩存連接
REDIS_URL=redis://redis:6379

# Gemini AI API 金鑰（必須！）
# 前往 https://ai.google.dev/ 獲取
GEMINI_API_KEY=your_gemini_api_key_here

# Cloudinary 圖片儲存配置（可選）
# 前往 https://cloudinary.com/ 註冊獲取
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# 後端服務配置
PORT=4000
SERVER_HOST=0.0.0.0

# CORS 配置
CORS_ORIGIN=http://152.42.204.18

# 日誌等級
LOG_LEVEL=info
```

## ⚠️ 必填項目

以下環境變數是**必須**設定的：

1. **DATABASE_URL** - MongoDB 連接字串
   ```
   DATABASE_URL=mongodb://mongodb:27017/heart-whisper-town
   ```

2. **GEMINI_API_KEY** - Google Gemini AI 金鑰
   - 前往：https://ai.google.dev/
   - 點擊 "Get API Key"
   - 複製金鑰並填入

## 📝 快速設定指令

```bash
# 創建 .env.production 檔案
cat > /home/jesse/heart-whisper-town/.env.production << 'EOF'
NODE_ENV=production
DATABASE_URL=mongodb://mongodb:27017/heart-whisper-town
REDIS_URL=redis://redis:6379
GEMINI_API_KEY=your_gemini_api_key_here
PORT=4000
SERVER_HOST=0.0.0.0
CORS_ORIGIN=http://152.42.204.18
LOG_LEVEL=info
EOF

# 設定權限
chmod 600 /home/jesse/heart-whisper-town/.env.production
```

**記得將 `your_gemini_api_key_here` 替換為實際的 API 金鑰！**

## ✅ 驗證設定

設定完成後，重啟服務：

```bash
cd /home/jesse/heart-whisper-town
docker-compose -f docker-compose.production-prebuilt.yml down
docker-compose -f docker-compose.production-prebuilt.yml up -d
```

查看日誌確認啟動成功：

```bash
docker-compose -f docker-compose.production-prebuilt.yml logs -f backend
```

## 🔍 檢查清單

- [ ] DATABASE_URL 已設定
- [ ] GEMINI_API_KEY 已設定（必須是有效的 API 金鑰）
- [ ] .env.production 權限設為 600
- [ ] 後端容器啟動成功
- [ ] 健康檢查通過：`curl http://localhost:4000/health`

