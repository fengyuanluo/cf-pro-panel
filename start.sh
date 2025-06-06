#!/bin/sh

# 设置环境变量
export NODE_ENV=production
export PORT=3001
export FRONTEND_URL=http://localhost:8080

# 确保数据库目录存在
echo "创建数据库目录..."
mkdir -p /app/data

# 初始化数据库
echo "初始化数据库..."
cd /app/backend
node src/database/init.js

# 启动后端服务（后台运行）
echo "启动后端服务..."
node src/app.js &
BACKEND_PID=$!

# 等待后端服务启动
echo "等待后端服务启动..."
sleep 5

# 检查后端服务是否启动成功
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "后端服务启动失败"
    exit 1
fi

echo "后端服务启动成功 (PID: $BACKEND_PID)"

# 启动 Caddy
echo "启动 Caddy 反向代理..."
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
CADDY_PID=$!

# 等待 Caddy 启动
sleep 3

# 检查 Caddy 是否启动成功
if ! kill -0 $CADDY_PID 2>/dev/null; then
    echo "Caddy 启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "Caddy 启动成功 (PID: $CADDY_PID)"
echo "CF Pro Panel 启动完成！"
echo "访问地址: http://localhost:8080"

# 优雅关闭处理
cleanup() {
    echo "正在关闭服务..."
    kill $CADDY_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    wait $CADDY_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    echo "服务已关闭"
    exit 0
}

# 捕获信号
trap cleanup SIGTERM SIGINT

# 保持脚本运行
wait
