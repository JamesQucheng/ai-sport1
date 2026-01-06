# 本地运行指南 (Windows)

## 1. 安装依赖
- Node.js (v21.7.3+): 下载安装 LTS 版本。
- 若本机未安装 MongoDB，可使用 Docker 方式启动单独的数据库容器（见下）。
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

### 如果本机没有安装 MongoDB
可用 Docker 快速拉起单独的数据库容器（无需安装完整版 MongoDB）。

1. 确保已安装 Docker Desktop 或 Docker Engine。
2. 在 `ai-sport` 根目录运行：
   ```bash
   docker run -d \
     --name ai-sport-mongo \
     -p 27017:27017 \
     -v ai-sport-mongo-data:/data/db \
     mongo:6
   ```
3. 将 `backend/.env` 中的 `MONGODB_URI` 设置为 `mongodb://localhost:27017/ai-sport`（或你期望的库名）。
4. 启动后端 `npm start`，确认日志显示成功连接 MongoDB。如果需要停止或删除数据库容器，执行 `docker stop ai-sport-mongo` / `docker rm ai-sport-mongo`。

## 5. 本地验证（可选但推荐）
- 后端快速检查：在 `backend` 目录执行 `npm test`，确认 API 基础依赖和示例测试通过。
- 前端构建检查：在 `ai-workout-vue` 目录执行 `npm run build`，验证类型检查与生产构建是否正常（首次构建可能耗时约 20-30 秒）。
