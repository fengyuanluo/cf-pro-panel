# CF Pro Panel

## 前言

CF Pro Panel 是一个专为 Cloudflare 服务设计的现代化合租管理面板。在当今云服务盛行的时代，Cloudflare 作为全球领先的 CDN 和安全服务提供商，其强大的功能和稳定的性能深受开发者喜爱。然而，对于个人用户或小团队来说，直接使用 Cloudflare 的企业级功能可能存在成本考虑。

CF Pro Panel 应运而生，旨在为用户提供一个简洁、高效、安全的 Cloudflare 服务合租解决方案。通过本面板，管理员可以轻松管理多个用户的自定义主机名需求，用户可以便捷地添加和管理自己的域名，实现资源的合理分配和成本的有效控制。

本项目采用现代化的技术栈，基于 React + Node.js + SQLite 构建，具有部署简单、维护方便、性能优异的特点。我们致力于为社区提供一个开源、免费、可靠的 Cloudflare 合租管理工具。

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

本项目采用 GNU General Public License v3.0 开源协议。

这意味着您可以自由地使用、修改和分发本软件，但必须遵守以下条件：
- 任何基于本项目的衍生作品也必须采用 GPL v3 协议开源
- 必须保留原始的版权声明和许可证声明
- 如果您分发修改后的版本，必须提供源代码

详细信息请参阅 [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html)。

## 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目。在贡献代码前，请确保：
- 遵循项目的代码风格
- 添加适当的测试
- 更新相关文档

## 支持

如果您在使用过程中遇到问题，可以通过以下方式获取帮助：
- 提交 GitHub Issue
- 查看项目文档
- 参与社区讨论

## 免责声明

本项目仅供学习和研究使用。使用者应当遵守相关法律法规，合理使用 Cloudflare 服务。项目作者不对使用本软件造成的任何损失承担责任。
