# 本地运行指南 (Windows)

## 1. 安装依赖
- Node.js (v21.7.3+): 下载安装 LTS 版本。
- MongoDB: 下载安装 Community Server，作为服务运行。
- node版本大于21.7.3
## 2. 项目设置
- 克隆仓库: `git clone <url>` 并进入 `ai-sport`

### 后端
- 进入 `backend`
- 复制 `.env.example` 到 `.env`，修改 MONGODB_URI、JWT_SECRET 等
- `npm install`
-  npm start
### 前端
- 进入 `ai-workout-vue`
- `npm install`

## 3. 启动
- 后端: 在 backend 目录 `npm start` (端口 3001)
- 前端: 新终端，在 ai-workout-vue 目录 `npm run dev` (端口 8080/8081)

## 4. 访问
- 浏览器打开 http://localhost:8081

## 5. 本地验证（可选但推荐）
- 后端快速检查：在 `backend` 目录执行 `npm test`，确认 API 基础依赖和示例测试通过。
- 前端构建检查：在 `ai-workout-vue` 目录执行 `npm run build`，验证类型检查与生产构建是否正常（首次构建可能耗时约 20-30 秒）。
