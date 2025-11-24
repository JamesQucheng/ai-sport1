const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// 路由导入
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const workoutRoutes = require('./routes/workouts');
const adminRoutes = require('./routes/admin');
const checkinRoutes = require('./routes/checkin');
const planRoutes = require('./routes/plans');
const reminderRoutes = require('./routes/reminders');
const friendRoutes = require('./routes/friends');
const invitationRoutes = require('./routes/invitations');

const app = express();

// 数据库连接由server.js处理

// 安全中间件
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));

// CORS配置 - 本地的都允许跨域
const corsOptions = {
  origin: /^(http?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?)$/,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));

// 预检请求处理
app.options('*', cors(corsOptions));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 500, // 限制每个IP 15分钟内最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});
app.use('/api/', limiter);

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（添加完整CORS支持）
app.use('/uploads', (req, res, next) => {
  // 设置CORS头
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'false');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}, express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, path) => {
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Access-Control-Allow-Origin', '*');
  }
}));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/invitations', invitationRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'AI Sport Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `路由 ${req.originalUrl} 不存在`
  });
});

// 错误处理中间件
app.use(errorHandler);

// 服务器启动由server.js处理

module.exports = app;