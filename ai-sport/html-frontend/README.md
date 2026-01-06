# HTML5 前端示例

纯 HTML + JavaScript 页面，用于演示重构后的前后端分离方案。

## 启动

```bash
cd ai-sport/html-frontend
python -m http.server 4173
# 后端需同时运行 uvicorn app.main:app --reload --port 8000
```

页面打开后：
- 点击“创建测试用户”生成一个演示账号（写入 FastAPI + SQLite）
- 点击“开始检测”即可每 2 秒上传一帧到 `/api/pose/analyze`，并在右侧读取 `/api/analytics/chart.png` 图表
