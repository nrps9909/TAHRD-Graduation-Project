# 多階段構建 - 構建階段
FROM node:18-alpine AS builder

WORKDIR /app

# 複製 package 檔案
COPY package*.json ./
RUN npm ci --only=production

# 複製源碼
COPY . .

# 構建 Next.js 應用
RUN npm run build

# 執行階段
FROM node:18-alpine AS runner

WORKDIR /app

# 安全性設定
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 複製構建產物
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# 設定環境變數
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]