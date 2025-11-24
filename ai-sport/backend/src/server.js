const app = require('./app');
const connectDB = require('./config/database');
const SystemSettings = require('./models/SystemSettings');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// 加载环境变量
require('dotenv').config();

const PORT = process.env.PORT || 3001;

// 初始化数据库和系统设置
async function initializeApp() {
  try {
    // 连接数据库
    const dbConnection = await connectDB();
    
    if (dbConnection) {
      console.log('✅ 数据库连接成功');
      
      // 初始化系统设置
      await SystemSettings.getSettings();
      console.log('✅ 系统设置初始化完成');

      // 创建默认管理员账户（如果不存在）
      await createDefaultAdmin();
    } else {
      console.log('⚠️  在无数据库模式下运行');
    }

    // 启动服务器
    const server = app.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📱 API地址: http://localhost:${PORT}/api`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/api/health`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 开发模式已启用');
      }
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('\n🛑 收到SIGTERM信号，正在关闭服务器...');
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 收到SIGINT信号，正在关闭服务器...');
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ 应用初始化失败:', error.message);
    process.exit(1);
  }
}

// 创建默认管理员账户
async function createDefaultAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ai-sport.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    
    // 检查是否已存在管理员账户
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: adminEmail },
        { role: 'admin' }
      ]
    });

    if (existingAdmin) {
      console.log('✅ 管理员账户已存在');
      return;
    }

    // 创建默认管理员
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const admin = new User({
      username: 'admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      profile: {
        nickname: '系统管理员',
        bio: '系统默认管理员账户'
      }
    });

    await admin.save();
    
    console.log('✅ 默认管理员账户创建成功');
    console.log(`📧 管理员邮箱: ${adminEmail}`);
    console.log(`🔑 管理员密码: ${adminPassword}`);
    console.log('⚠️  请及时修改默认密码！');
    
  } catch (error) {
    console.error('❌ 创建默认管理员失败:', error.message);
  }
}

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动应用
initializeApp();

module.exports = app;