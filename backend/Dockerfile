# 後端 Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安裝系統依賴
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# 複製 package files
COPY package*.json ./
COPY prisma ./prisma/

# 安裝依賴
RUN npm install

# 生成 Prisma client
RUN npx prisma generate

# 複製源代碼
COPY . .

# 構建應用
RUN npm run build

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 改變目錄擁有者
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 4000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["npm", "start"]