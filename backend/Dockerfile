# Backend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 安裝構建依賴
RUN apk add --no-cache python3 make g++ curl

# 複製 package files
COPY package.json ./
COPY package-lock.json* ./

# 安裝所有依賴（包括 devDependencies for TypeScript）
RUN npm ci && npm cache clean --force

# 複製 Prisma schema
COPY prisma ./prisma

# 生成 Prisma Client
RUN npx prisma generate

# 複製源代碼
COPY . .

# 構建 TypeScript（移除 || true，讓構建失敗時終止）
RUN npm run build

# 驗證構建結果
RUN test -d dist && test -f dist/index.js || (echo "❌ Build failed: dist/index.js not found" && exit 1)

# 生產階段
FROM node:20-alpine

WORKDIR /app

# 安裝運行時依賴
RUN apk add --no-cache curl openssl

# 複製 package files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json* ./

# 只安裝生產依賴（使用 ci 更快更可靠）
RUN npm ci --production --ignore-scripts && npm cache clean --force

# 複製構建結果和必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 生成 Prisma Client (生產環境)
RUN npx prisma generate

# 創建必要的目錄
RUN mkdir -p memories logs

# 設置權限
RUN chown -R node:node /app

# 切換到非 root 用戶
USER node

# 暴露端口
EXPOSE 4000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# 啟動應用
CMD ["node", "dist/index.js"]
