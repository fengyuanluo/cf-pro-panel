# 多阶段构建 Dockerfile
FROM node:18-alpine AS frontend-builder

# 设置工作目录
WORKDIR /app/frontend

# 复制前端依赖文件
COPY frontend/package*.json ./

# 安装前端依赖（包括开发依赖，构建需要）
RUN npm ci

# 复制前端源码
COPY frontend/ ./

# 构建前端
RUN npm run build

# 后端构建阶段
FROM node:18-alpine AS backend-builder

# 设置工作目录
WORKDIR /app/backend

# 复制后端依赖文件
COPY backend/package*.json ./

# 安装后端依赖
RUN npm ci --only=production

# 复制后端源码
COPY backend/ ./

# 最终运行阶段
FROM alpine:3.18

# 安装必要的运行时依赖
RUN apk add --no-cache \
    nodejs \
    npm \
    caddy \
    sqlite \
    && rm -rf /var/cache/apk/*

# 创建应用用户（但最终以root运行以避免权限问题）
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# 设置工作目录
WORKDIR /app

# 从构建阶段复制文件
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=backend-builder /app/backend ./backend

# 复制 Caddy 配置文件
COPY Caddyfile /etc/caddy/Caddyfile

# 创建数据目录
RUN mkdir -p /app/data && \
    chmod 755 /app/data

# 保持 root 用户运行以避免权限问题
# USER appuser

# 暴露端口
EXPOSE 8080

# 启动脚本
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# 启动应用
CMD ["/app/start.sh"]
