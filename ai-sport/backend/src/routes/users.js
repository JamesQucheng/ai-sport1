const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Workout = require('../models/Workout');
const { authenticate, requireOwnershipOrAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取用户列表（分页）
router.get('/', authenticate, [
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
    .isLength({ max: 50 })
    .withMessage('搜索关键词最多50个字符'),
  query('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('角色必须是user或admin'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('激活状态必须是布尔值')
], async (req, res, next) => {
  try {
    // 验证输入
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
      limit = 10,
      search = '',
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

    // 分页查询
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -passwordChangedAt')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      status: 'success',
      data: {
        users,
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

// 获取单个用户信息
router.get('/:id', authenticate, requireOwnershipOrAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -passwordChangedAt');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取用户统计信息
router.get('/:id/stats', authenticate, requireOwnershipOrAdmin, [
  query('timeRange')
    .optional()
    .isIn(['7d', '30d', '90d', '365d', 'all'])
    .withMessage('时间范围必须是7d、30d、90d、365d或all')
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

    const { timeRange = '30d' } = req.query;
    const userId = req.params.id;

    // 获取用户基本信息
    const user = await User.findById(userId).select('stats createdAt');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    // 获取运动统计
    const workoutStats = await Workout.getUserStats(userId, timeRange);

    // 获取运动类型分布
    const workoutTypeStats = await Workout.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$workoutType',
          count: { $sum: 1 },
          totalReps: { $sum: '$totalReps' },
          totalDuration: { $sum: '$actualDuration' },
          avgReps: { $avg: '$totalReps' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // 获取最近的运动记录
    const recentWorkouts = await Workout.find({
      user: userId,
      status: 'completed'
    })
      .select('workoutType totalReps actualDuration createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      status: 'success',
      data: {
        userStats: user.stats,
        workoutStats,
        workoutTypeStats,
        recentWorkouts,
        memberSince: user.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
});

// 更新用户信息（管理员）
router.put('/:id', authenticate, [
  body('username')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('角色必须是user或admin'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('激活状态必须是布尔值')
], async (req, res, next) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    // 检查权限：只有管理员可以修改其他用户信息
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        status: 'error',
        message: '权限不足'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    const { username, email, role, isActive, profile, preferences } = req.body;

    // 普通用户不能修改角色和激活状态
    if (req.user.role !== 'admin') {
      if (role !== undefined || isActive !== undefined) {
        return res.status(403).json({
          status: 'error',
          message: '普通用户不能修改角色和激活状态'
        });
      }
    }

    // 检查用户名和邮箱唯一性
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: '用户名已被使用'
        });
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: '邮箱已被使用'
        });
      }
      user.email = email;
    }

    // 更新其他字段
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (profile) Object.assign(user.profile, profile);
    if (preferences) Object.assign(user.preferences, preferences);

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
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    // 只有管理员可以删除用户
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: '权限不足，只有管理员可以删除用户'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    // 不能删除自己
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: '不能删除自己的账户'
      });
    }

    // 软删除：设置为非激活状态
    user.isActive = false;
    await user.save();

    res.json({
      status: 'success',
      message: '用户已被禁用'
    });

  } catch (error) {
    next(error);
  }
});

// 恢复用户
router.post('/:id/restore', authenticate, async (req, res, next) => {
  try {
    // 只有管理员可以恢复用户
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: '权限不足，只有管理员可以恢复用户'
      });
    }

    const user = await User.findById(req.params.id);
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
      message: '用户已恢复激活'
    });

  } catch (error) {
    next(error);
  }
});

// 获取用户运动历史
router.get('/:id/workouts', authenticate, requireOwnershipOrAdmin, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('每页数量必须在1-50之间'),
  query('workoutType')
    .optional()
    .isIn(['push-up', 'squat', 'plank', 'jumping-jack'])
    .withMessage('运动类型无效')
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
      limit = 10,
      workoutType,
      status = 'completed'
    } = req.query;

    const query = { user: req.params.id, status };
    if (workoutType) {
      query.workoutType = workoutType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [workouts, total] = await Promise.all([
      Workout.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Workout.countDocuments(query)
    ]);

    res.json({
      status: 'success',
      data: {
        workouts,
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

module.exports = router;