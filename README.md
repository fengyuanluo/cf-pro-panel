# CF Pro Panel

基于 React + Node.js + SQLite 的 Cloudflare 合租面板，支持自定义主机名管理和卡密系统。

## 功能特性

- 🔐 用户认证和权限管理
- 🌐 Cloudflare 自定义主机名管理
- 🎫 卡密系统（创建和续期）
- 📊 管理员面板
- 🔒 安全防护和限流
- 📱 响应式设计

## 快速部署

### 使用 Docker Compose（推荐）

```bash
# 克隆项目
git clone <repository-url>
cd cf-pro-panel

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 使用 Docker

```bash
# 构建镜像
docker build -t cf-pro-panel .

# 运行容器
docker run -d \
  --name cf-pro-panel \
  -p 8080:8080 \
  -v cf_panel_data:/app/data \
  cf-pro-panel
```

## 访问地址

- 前端界面：http://localhost:8080
- 健康检查：http://localhost:8080/health
- 默认管理员账户：admin / admin123

## 开发环境

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
# 安装所有依赖
npm run install:all

# 或分别安装
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 启动开发服务

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:backend  # 后端：http://localhost:3001
npm run dev:frontend # 前端：http://localhost:5173
```

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
cf-pro-panel/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由
│   │   ├── services/       # 服务层
│   │   ├── middleware/     # 中间件
│   │   └── database/       # 数据库
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/         # 页面
│   │   ├── services/      # API服务
│   │   └── utils/         # 工具函数
│   └── package.json
├── Dockerfile             # Docker构建文件
├── docker-compose.yml     # Docker Compose配置
├── Caddyfile             # Caddy反向代理配置
└── start.sh              # 启动脚本
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| NODE_ENV | development | 运行环境 |
| PORT | 3001 | 后端端口 |
| FRONTEND_URL | http://localhost:5173 | 前端地址 |

## 数据持久化

Docker 环境下，数据库文件存储在 `/app/data/cf_panel.db`，通过 Docker Volume 持久化。

## 安全特性

- Helmet 安全头
- CORS 跨域保护
- 请求限流
- JWT 认证
- 密码加密
- XSS 防护
- CSRF 保护

## 许可证

MIT License
