# 後端 Dockerfile（優化版）
FROM node:18-alpine AS builder

WORKDIR /app

# 先複製 package files（利用 Docker 層快取）
COPY package*.json ./
COPY prisma ./prisma/

# 安裝依賴（這層會被快取，除非 package.json 改變）
RUN npm ci --only=production

# 生成 Prisma Client
RUN npx prisma generate

# 複製源代碼
COPY . .

# 構建 TypeScript
RUN npm run build

# 生產階段
FROM node:18-alpine

WORKDIR /app

# 只複製必要的文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# 創建必要的目錄
RUN mkdir -p /app/memories /app/logs

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 4000

CMD ["node", "dist/index.js"]

