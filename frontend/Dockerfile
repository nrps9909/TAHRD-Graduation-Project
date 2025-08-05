# 前端 Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 複製 package files
COPY package.json package-lock.json* ./
RUN npm install

# 複製源代碼
COPY . .

# 構建應用
RUN npm run build

# 生產階段
FROM nginx:alpine

# 複製構建結果
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]