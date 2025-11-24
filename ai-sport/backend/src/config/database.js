const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`📦 MongoDB 连接成功: ${conn.connection.host}`);
    
    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB 连接错误:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB 连接断开');
    });

    // 优雅关闭
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔒 MongoDB 连接已关闭');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.log('⚠️  提示: 请确保 MongoDB 服务正在运行');
    console.log('   - 安装 MongoDB: https://www.mongodb.com/try/download/community');
    console.log('   - 或使用 MongoDB Atlas: https://www.mongodb.com/atlas');
    console.log('   - 或使用 Docker: docker run -d -p 27017:27017 mongo');
    console.log('🔄 服务器将在没有数据库的情况下启动（仅用于演示）');
    return null;
  }
};

module.exports = connectDB;