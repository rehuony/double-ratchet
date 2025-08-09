# 构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

COPY . .

RUN npm install --legacy-peer-deps && npm run build

# 运行阶段：用 nginx 托管构建后的静态文件
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
