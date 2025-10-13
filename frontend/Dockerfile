# 前端 Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 設置為 development 以確保安裝 devDependencies
ENV NODE_ENV=development

# 複製 package files (包含 package-lock.json 如果存在)
COPY package*.json ./

# 安裝依賴
# 注意：此項目使用 npm workspaces，子目錄沒有 package-lock.json
# 因此使用 npm install 而不是 npm ci
# NODE_ENV=development 確保安裝 devDependencies（包含 TypeScript、Vite 等構建工具）
RUN npm install && npm cache clean --force

# 複製源代碼
COPY . .

# 構建應用（增加 Node.js 記憶體限制到 4GB）
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 設置構建時的環境變量（使用 ARG 允許在構建時傳入）
ARG VITE_BACKEND_URL
ARG VITE_GRAPHQL_URL
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_GEMINI_API_KEY
ARG VITE_OPENWEATHER_API_KEY
ARG VITE_DEBUG

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_OPENWEATHER_API_KEY=$VITE_OPENWEATHER_API_KEY
ENV VITE_DEBUG=$VITE_DEBUG

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