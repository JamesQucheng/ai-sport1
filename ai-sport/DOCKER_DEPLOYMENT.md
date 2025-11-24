# 使用 Docker 部署 (Windows)

本文档将指导您如何使用 Docker 和 Docker Compose 在 Windows 系统上部署 AI Sport 项目。

## 1. 系统要求

- **Docker Desktop for Windows**: 请从 [Docker 官网](https://www.docker.com/products/docker-desktop/) 下载并安装。
- **Git**: 用于克隆代码库。
- **终端**: PowerShell 或 CMD。

## 2. 环境准备

### 2.1 安装 Docker Desktop

确保 Docker Desktop 已成功安装并正在运行。您可以在系统托盘中看到 Docker 图标。


## 3. 配置环境变量

Docker Compose 会使用 `.env` 文件来配置后端服务的环境变量。在项目根目录（`ai-sport`）下创建一个 `.env` 文件，并添加以下内容：

```dotenv
# .env

# 用于后端服务的 JWT 密钥，请务必修改为一个强随机字符串
JWT_SECRET=your-super-secret-and-long-random-string-for-production

# 默认管理员账户 (可选，可以修改)
DEFAULT_ADMIN_EMAIL=admin-prod@example.com
DEFAULT_ADMIN_PASSWORD=a-very-strong-password
```

**重要提示**: `JWT_SECRET` 必须是一个复杂且唯一的字符串，以确保生产环境的安全。

## 4. 构建和启动服务

### 4.1 依赖管理说明

本项目使用 npm 作为依赖管理工具。Dockerfile 已配置为使用 npm 安装依赖并启动应用程序。如果您在构建过程中遇到类似以下错误：

```
ERR_PNPM_NO_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is absent
```

这表明 Dockerfile 可能仍在尝试使用 pnpm。请检查 Dockerfile 中的依赖安装和启动命令，确保它们使用 npm 而不是 pnpm。

### 4.2 启动服务

在项目根目录（`ai-sport`）下，打开终端并运行以下命令：

```bash
docker-compose up --build -d
```

- `docker-compose up`: 启动 `docker-compose.yml` 文件中定义的所有服务。
- `--build`: 在启动容器之前，强制重新构建镜像。首次运行时或修改了 `Dockerfile` 后需要此参数。
- `-d`: 在后台（分离模式）运行容器。

这个过程可能需要一些时间，因为它会下载基础镜像、安装依赖并构建您的应用程序。

## 5. 验证部署

命令执行完毕后，所有服务都应在后台运行。

- **访问前端应用**: 打开浏览器，访问 `http://localhost`。
- **检查后端 API**: 您可以访问 `http://localhost:3001/api/health` 来检查后端服务的健康状况。
- **查看容器状态**: 运行 `docker-compose ps` 查看所有容器的运行状态。

## 6. 管理服务

- **停止服务**: `docker-compose down`
- **仅停止服务 (不删除容器)**: `docker-compose stop`
- **查看日志**: `docker-compose logs -f <service_name>` (例如: `docker-compose logs -f backend`)

## 7. 数据持久化

- **MongoDB 数据**: 存储在名为 `mongodb-data` 的 Docker 卷中，即使容器被删除，数据也会保留。
- **上传的文件**: 存储在名为 `backend-uploads` 的 Docker 卷中，确保用户上传的内容不会丢失。
