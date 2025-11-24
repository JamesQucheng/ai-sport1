const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  console.error('❌ 错误详情:', err);

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} 已存在`;
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose 无效ObjectId错误
  if (err.name === 'CastError') {
    const message = '资源未找到';
    error = {
      message,
      statusCode: 404
    };
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的token';
    error = {
      message,
      statusCode: 401
    };
  }

  // JWT过期错误
  if (err.name === 'TokenExpiredError') {
    const message = 'Token已过期';
    error = {
      message,
      statusCode: 401
    };
  }

  res.status(error.statusCode || 500).json({
    status: 'error',
    message: error.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;