# 前端 Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 複製 package files
COPY package.json package-lock.json* ./

# 安裝依賴（使用 ci 更快更可靠）
RUN npm ci && npm cache clean --force

# 複製源代碼
COPY . .

# 構建應用（增加 Node.js 記憶體限制到 4GB）
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 設置構建時的環境變量（使用 ARG 允許在構建時傳入）
ARG VITE_BACKEND_URL
ARG VITE_GRAPHQL_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL

# 構建應用
RUN npm run build

# 驗證構建結果
RUN test -d dist && test -f dist/index.html || (echo "❌ Build failed: dist/index.html not found" && exit 1)

# 生產階段
FROM nginx:alpine

# 複製構建結果
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]