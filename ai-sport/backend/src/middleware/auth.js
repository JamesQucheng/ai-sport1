const jwt = require('jsonwebtoken');
const User = require('../models/User');
const memoryStore = require('../utils/memoryStore');

// 验证JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    // 开发环境下的特殊处理 - 允许在没有token的情况下也能正常访问
    if (process.env.NODE_ENV === 'development') {
      console.log('开发环境：模拟认证通过');
      // 创建模拟用户对象
      const mockUser = {
        _id: 'mock-admin-id',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
        // 添加必要的方法
        getPublicProfile: function() {
          return {
            _id: this._id,
            username: this.username,
            email: this.email,
            role: this.role,
            isActive: this.isActive
          };
        }
      };
      
      req.user = mockUser;
      return next();
    }
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: '访问被拒绝，请提供有效的token'
      });
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    try {
      user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // 如果数据库不可用，使用内存存储
      user = await memoryStore.findUserById(decoded.id);
      if (user) {
        // 移除密码字段
        const { password, ...userWithoutPassword } = user;
        user = userWithoutPassword;
      }
    }
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: '账户已被禁用'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('认证错误:', error);
    res.status(401).json({
      status: 'error',
      message: 'Token无效'
    });
  }
};

// 验证管理员权限
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      status: 'error',
      message: '需要管理员权限'
    });
  }
};

// 验证用户权限（用户只能访问自己的数据）
const requireOwnershipOrAdmin = (req, res, next) => {
  const userId = req.params.userId || req.params.id;
  
  if (req.user.role === 'admin' || req.user._id.toString() === userId) {
    next();
  } else {
    res.status(403).json({
      status: 'error',
      message: '权限不足，只能访问自己的数据'
    });
  }
};

// 可选认证（不强制要求登录）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      let user;
      try {
        user = await User.findById(decoded.id).select('-password');
      } catch (error) {
        // 如果数据库不可用，使用内存存储
        user = await memoryStore.findUserById(decoded.id);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          user = userWithoutPassword;
        }
      }
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (error) {
    // 忽略错误，继续处理请求
  }
  
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireOwnershipOrAdmin,
  optionalAuth
};