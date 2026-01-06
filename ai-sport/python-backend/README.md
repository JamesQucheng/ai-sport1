# FastAPI 版 AI Sport 后端

该目录提供了基于 **FastAPI + MediaPipe + SQLite** 的后端重构示例。前端使用 `ai-sport/html-frontend/index.html` 的纯 HTML + JavaScript 页面与接口交互。

## 快速启动

```bash
cd ai-sport/python-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务启动后，使用静态服务器打开前端：

```bash
# 终端 2
cd ai-sport/html-frontend
python -m http.server 4173
```

然后在浏览器访问 `http://localhost:4173`，摄像头采集的帧会通过 `/api/pose/analyze` 发送给 FastAPI。创建的用户与训练记录会写入 `python-backend/data/training.db`。

## 功能概览
- `/api/users`：创建、列出用户
- `/api/sessions`：写入并查询训练记录
- `/api/pose/analyze`：调用 MediaPipe Pose + OpenCV 进行关键点识别与动作评分
- `/api/analytics/summary`：使用 Pandas 聚合训练数据
- `/api/analytics/chart.png`：使用 Matplotlib 绘制训练趋势图

## 技术亮点
- MediaPipe 进行关键点检测，OpenCV 负责图片解码与色彩空间转换
- scikit-learn `LinearRegression` 模型在服务启动时预热，用于将姿态特征映射为评分
- Pandas 进行日度聚合，Matplotlib 输出趋势图
- SQLite 通过 SQLAlchemy 管理，默认数据文件存放于 `data/training.db`
