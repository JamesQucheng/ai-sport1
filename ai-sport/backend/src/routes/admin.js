const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const Workout = require('../models/Workout');
const SystemSettings = require('../models/SystemSettings');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 所有管理员路由都需要管理员权限
router.use(authenticate, requireAdmin);

// 获取系统概览统计
router.get('/dashboard', async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 用户统计
    const [totalUsers, activeUsers, newUsersToday, newUsersThisWeek] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ 
        isActive: true, 
        lastLoginAt: { $gte: thisWeek } 
      }),
      User.countDocuments({ 
        isActive: true,
        createdAt: { $gte: today } 
      }),
      User.countDocuments({ 
        isActive: true,
        createdAt: { $gte: thisWeek } 
      })
    ]);

    // 运动记录统计
    const [totalWorkouts, workoutsToday, workoutsThisWeek, workoutsThisMonth] = await Promise.all([
      Workout.countDocuments({ status: 'completed' }),
      Workout.countDocuments({ 
        status: 'completed',
        createdAt: { $gte: today } 
      }),
      Workout.countDocuments({ 
        status: 'completed',
        createdAt: { $gte: thisWeek } 
      }),
      Workout.countDocuments({ 
        status: 'completed',
        createdAt: { $gte: thisMonth } 
      })
    ]);

    // 运动类型分布
    const workoutTypeStats = await Workout.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$workoutType',
          count: { $sum: 1 },
          totalReps: { $sum: '$totalReps' },
          avgReps: { $avg: '$totalReps' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 每日活跃用户（最近7天）
    const dailyActiveUsers = await Workout.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: thisWeek }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            }
          },
          activeUsers: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          date: '$_id.date',
          activeUsers: { $size: '$activeUsers' }
        }
      },
      { $sort: { date: 1 } }
    ]);

    res.json({
      status: 'success',
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek
        },
        workouts: {
          total: totalWorkouts,
          today: workoutsToday,
          thisWeek: workoutsThisWeek,
          thisMonth: workoutsThisMonth
        },
        workoutTypeStats,
        dailyActiveUsers
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取用户列表（管理员版本，包含更多信息）
router.get('/users', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('搜索关键词长度必须在1-50之间'),
  query('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('角色必须是user或admin'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('激活状态必须是布尔值'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'lastLoginAt', 'username', 'email'])
    .withMessage('排序字段无效'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('排序方向必须是asc或desc')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.nickname': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    // 获取每个用户的运动统计
    const userIds = users.map(user => user._id);
    const workoutStats = await Workout.aggregate([
      {
        $match: {
          user: { $in: userIds },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$user',
          totalWorkouts: { $sum: 1 },
          totalReps: { $sum: '$totalReps' },
          totalDuration: { $sum: '$actualDuration' },
          lastWorkout: { $max: '$createdAt' }
        }
      }
    ]);

    // 将统计信息合并到用户数据中
    const usersWithStats = users.map(user => {
      const stats = workoutStats.find(stat => stat._id.toString() === user._id.toString());
      return {
        ...user.toObject(),
        workoutStats: stats || {
          totalWorkouts: 0,
          totalReps: 0,
          totalDuration: 0,
          lastWorkout: null
        }
      };
    });

    res.json({
      status: 'success',
      data: {
        users: usersWithStats,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 更新用户信息（管理员权限）
router.put('/users/:id', [
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('角色必须是user或admin'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('激活状态必须是布尔值'),
  body('isEmailVerified')
    .optional()
    .isBoolean()
    .withMessage('邮箱验证状态必须是布尔值')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const userId = req.params.id;
    const { role, isActive, isEmailVerified } = req.body;

    // 防止管理员修改自己的角色或状态
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: '不能修改自己的角色或状态'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    // 更新字段
    if (role !== undefined) {
      user.role = role;
    }
    
    if (isActive !== undefined) {
      user.isActive = isActive;
    }
    
    if (isEmailVerified !== undefined) {
      user.isEmailVerified = isEmailVerified;
    }

    await user.save();

    res.json({
      status: 'success',
      message: '用户信息更新成功',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    next(error);
  }
});

// 删除用户（软删除）
router.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;

    // 防止管理员删除自己
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: '不能删除自己的账户'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    // 软删除：设置为非激活状态
    user.isActive = false;
    await user.save();

    res.json({
      status: 'success',
      message: '用户已被停用'
    });

  } catch (error) {
    next(error);
  }
});

// 恢复用户
router.post('/users/:id/restore', async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    user.isActive = true;
    await user.save();

    res.json({
      status: 'success',
      message: '用户已恢复激活',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取系统设置
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    // 转换为前端期望的格式
    const formattedSettings = {
      app: {
        name: settings.appName || 'AI 运动平台',
        version: settings.appVersion || '1.0.0'
      },
      registration: {
        enabled: settings.registration?.enabled ?? true,
        requireEmailVerification: settings.registration?.requireEmailVerification ?? false
      },
      security: {
        maxLoginAttempts: settings.security?.maxLoginAttempts || 5
      },
      fileUpload: {
        maxSize: Math.round((settings.fileUpload?.maxFileSize || 5242880) / 1024 / 1024) // 转换为MB
      },
      maintenance: {
        enabled: settings.maintenance?.enabled ?? false
      }
    }
    
    res.json({
      status: 'success',
      data: {
        settings: formattedSettings
      }
    });

  } catch (error) {
    next(error);
  }
});

// 更新系统设置
router.put('/settings', [
  body('app.name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('应用名称长度必须在1-100之间'),
  body('app.version')
    .optional()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage('版本号格式无效'),
  body('registration.enabled')
    .optional()
    .isBoolean()
    .withMessage('注册开关必须是布尔值'),
  body('registration.requireEmailVerification')
    .optional()
    .isBoolean()
    .withMessage('邮箱验证要求必须是布尔值'),
  body('security.maxLoginAttempts')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('最大登录尝试次数必须在1-20之间'),
  body('security.lockoutDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('锁定时长必须是正整数'),
  body('fileUpload.maxSize')
    .optional()
    .isInt({ min: 1 })
    .withMessage('文件上传大小限制必须是正整数'),
  body('maintenance.enabled')
    .optional()
    .isBoolean()
    .withMessage('维护模式开关必须是布尔值')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    // 转换前端格式到数据库格式
    const updateData = {};
    
    if (req.body.app?.name) {
      updateData.appName = req.body.app.name;
    }
    if (req.body.app?.version) {
      updateData.appVersion = req.body.app.version;
    }
    if (req.body.registration) {
      updateData.registration = {
        enabled: req.body.registration.enabled,
        requireEmailVerification: req.body.registration.requireEmailVerification
      };
    }
    if (req.body.security?.maxLoginAttempts) {
      updateData.security = { maxLoginAttempts: req.body.security.maxLoginAttempts };
    }
    if (req.body.fileUpload?.maxSize) {
      updateData.fileUpload = { 
        maxFileSize: req.body.fileUpload.maxSize * 1024 * 1024 // 转换MB为字节
      };
    }
    if (req.body.maintenance) {
      updateData.maintenance = { enabled: req.body.maintenance.enabled };
    }

    const updatedSettings = await SystemSettings.updateSettings(updateData, req.user._id);
    
    // 返回格式化的设置
    const formattedSettings = {
      app: {
        name: updatedSettings.appName || 'AI 运动平台',
        version: updatedSettings.appVersion || '1.0.0'
      },
      registration: {
        enabled: updatedSettings.registration?.enabled ?? true,
        requireEmailVerification: updatedSettings.registration?.requireEmailVerification ?? false
      },
      security: {
        maxLoginAttempts: updatedSettings.security?.maxLoginAttempts || 5
      },
      fileUpload: {
        maxSize: Math.round((updatedSettings.fileUpload?.maxFileSize || 5242880) / 1024 / 1024)
      },
      maintenance: {
        enabled: updatedSettings.maintenance?.enabled ?? false
      }
    }
    
    res.json({
      status: 'success',
      message: '系统设置更新成功',
      data: {
        settings: formattedSettings
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取系统日志（简单实现）
router.get('/logs', [
  query('level')
    .optional()
    .isIn(['error', 'warn', 'info', 'debug'])
    .withMessage('日志级别无效'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('限制数量必须在1-1000之间')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    // 这里可以实现真实的日志查询逻辑
    // 目前返回模拟数据
    const logs = [
      {
        timestamp: new Date(),
        level: 'info',
        message: '用户登录成功',
        userId: req.user._id,
        ip: req.ip
      }
    ];

    res.json({
      status: 'success',
      data: {
        logs
      }
    });

  } catch (error) {
    next(error);
  }
});

// 数据导出
router.get('/export/:type', [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式无效'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式无效')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const { type } = req.params;
    const { startDate, endDate } = req.query;

    let data = [];
    let filename = '';

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    switch (type) {
      case 'users':
        data = await User.find(
          Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
        ).select('-password').lean();
        filename = `users_${Date.now()}.json`;
        break;
        
      case 'workouts':
        data = await Workout.find(
          Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
        ).populate('user', 'username email').lean();
        filename = `workouts_${Date.now()}.json`;
        break;
        
      default:
        return res.status(400).json({
          status: 'error',
          message: '不支持的导出类型'
        });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.json({
      exportDate: new Date(),
      type,
      count: data.length,
      data
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;