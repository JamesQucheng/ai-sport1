const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Workout = require('../models/Workout');
const User = require('../models/User');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 创建运动记录
router.post('/', authenticate, [
  body('workoutType')
    .isIn(['push-up', 'squat'])
    .withMessage('运动类型无效'),
  body('workoutName')
    .notEmpty()
    .withMessage('运动名称不能为空'),
  body('plannedDuration')
    .custom((value) => {
      // 支持多种格式的时长表示
      const validDurations = ['1分钟', '3分钟', '5分钟', '7分钟'];
      // 移除重复的"分钟"字符串
      const cleanedValue = value.replace(/分钟分钟$/, '分钟');
      if (validDurations.includes(cleanedValue)) {
        return true;
      }
      throw new Error('计划时长无效');
    })
    .withMessage('计划时长无效'),
  body('plannedDurationSeconds')
    .isInt({ min: 1 })
    .withMessage('计划时长（秒）必须是正整数'),
  body('actualDuration')
    .isInt({ min: 0 })
    .withMessage('实际时长必须是非负整数'),
  body('totalReps')
    .isInt({ min: 0 })
    .withMessage('总次数必须是非负整数'),
  
  // AI检测数据验证（可选）
  body('aiData.averageConfidence')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('平均置信度必须在0-1之间'),
  body('aiData.detectionAccuracy')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('检测准确率必须在0-100之间'),
  body('aiData.poseQualityScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('姿势质量评分必须在0-100之间'),
  body('aiData.frameCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('帧数必须是非负整数'),
  body('aiData.averageFPS')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('平均FPS必须是非负数'),
  
  // 运动详细数据验证（可选）
  body('repDetails')
    .optional()
    .isArray()
    .withMessage('运动详细数据必须是数组'),
  body('repDetails.*.repNumber')
    .optional()
    .isInt({ min: 1 })
    .withMessage('动作编号必须是正整数'),
  body('repDetails.*.timestamp')
    .optional()
    .isNumeric()
    .withMessage('时间戳必须是数字'),
  body('repDetails.*.confidence')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('置信度必须在0-1之间'),
  body('repDetails.*.quality')
    .optional()
    .isIn(['excellent', 'good', 'fair', 'poor'])
    .withMessage('动作质量必须是excellent、good、fair或poor')
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

    const workoutData = {
      ...req.body,
      user: req.user._id
    };

    // 创建运动记录
    const workout = await Workout.create(workoutData);

    // 更新用户统计信息
    const user = req.user;
    user.stats.totalWorkouts += 1;
    user.stats.totalDuration += workout.actualDuration;
    user.stats.totalReps += workout.totalReps;
    user.stats.lastWorkoutDate = new Date();
    
    // 更新卡路里统计（如果有计算出的卡路里消耗）
    if (workout.caloriesBurned) {
      if (!user.stats.totalCalories) {
        user.stats.totalCalories = 0;
      }
      user.stats.totalCalories += workout.caloriesBurned;
    }
    
    // 计算连续运动天数
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const lastWorkout = await Workout.findOne({
      user: user._id,
      createdAt: { $gte: yesterday },
      _id: { $ne: workout._id }
    }).sort({ createdAt: -1 });
    
    if (lastWorkout) {
      const lastWorkoutDate = new Date(lastWorkout.createdAt);
      lastWorkoutDate.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((today - lastWorkoutDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        user.stats.streak += 1;
      } else if (diffDays > 1) {
        user.stats.streak = 1;
      }
    } else {
      user.stats.streak = 1;
    }
    
    await user.save();

    res.status(201).json({
      status: 'success',
      message: '运动记录创建成功',
      data: {
        workout
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取运动记录列表
router.get('/', optionalAuth, [
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
    .isIn(['push-up', 'squat'])
    .withMessage('运动类型无效'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('用户ID格式无效')
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
      userId,
      status = 'completed',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    const query = { status };
    
    if (workoutType) {
      query.workoutType = workoutType;
    }
    
    if (userId) {
      query.user = userId;
    } else if (req.user) {
      // 如果没有指定用户ID且用户已登录，只返回该用户的记录
      query.user = req.user._id;
    } else {
      // 未登录用户只能查看公开的记录
      query.isPublic = true;
    }

    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [workouts, total] = await Promise.all([
      Workout.find(query)
        .populate('user', 'username profile.nickname profile.avatar')
        .sort(sort)
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

// 获取单个运动记录
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const workout = await Workout.findById(req.params.id)
      .populate('user', 'username profile.nickname profile.avatar');
    
    if (!workout) {
      return res.status(404).json({
        status: 'error',
        message: '运动记录不存在'
      });
    }

    // 检查访问权限
    const isOwner = req.user && workout.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';
    const isPublic = workout.isPublic;

    if (!isOwner && !isAdmin && !isPublic) {
      return res.status(403).json({
        status: 'error',
        message: '权限不足，无法查看此记录'
      });
    }

    res.json({
      status: 'success',
      data: {
        workout
      }
    });

  } catch (error) {
    next(error);
  }
});

// 更新运动记录
router.put('/:id', authenticate, [
  body('userFeedback.difficulty')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('难度评分必须在1-5之间'),
  body('userFeedback.satisfaction')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('满意度评分必须在1-5之间'),
  body('userFeedback.aiAccuracy')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('AI准确度评分必须在1-5之间'),
  body('userFeedback.comments')
    .optional()
    .isLength({ max: 500 })
    .withMessage('评论最多500个字符'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('公开状态必须是布尔值'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('备注最多1000个字符')
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

    const workout = await Workout.findById(req.params.id);
    
    if (!workout) {
      return res.status(404).json({
        status: 'error',
        message: '运动记录不存在'
      });
    }

    // 检查权限：只有记录所有者或管理员可以修改
    const isOwner = workout.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: '权限不足，只能修改自己的运动记录'
      });
    }

    const { userFeedback, isPublic, tags, notes } = req.body;

    // 更新允许的字段
    if (userFeedback) {
      Object.assign(workout.userFeedback, userFeedback);
    }
    
    if (isPublic !== undefined) {
      workout.isPublic = isPublic;
    }
    
    if (tags) {
      workout.tags = tags;
    }
    
    if (notes !== undefined) {
      workout.notes = notes;
    }

    await workout.save();

    res.json({
      status: 'success',
      message: '运动记录更新成功',
      data: {
        workout
      }
    });

  } catch (error) {
    next(error);
  }
});

// 删除运动记录
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const workout = await Workout.findById(req.params.id);
    
    if (!workout) {
      return res.status(404).json({
        status: 'error',
        message: '运动记录不存在'
      });
    }

    // 检查权限：只有记录所有者或管理员可以删除
    const isOwner = workout.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: '权限不足，只能删除自己的运动记录'
      });
    }

    await Workout.findByIdAndDelete(req.params.id);

    // 更新用户统计信息
    if (workout.status === 'completed') {
      const user = await User.findById(workout.user);
      if (user) {
        user.stats.totalWorkouts = Math.max(0, user.stats.totalWorkouts - 1);
        user.stats.totalDuration = Math.max(0, user.stats.totalDuration - workout.actualDuration);
        user.stats.totalReps = Math.max(0, user.stats.totalReps - workout.totalReps);
        await user.save();
      }
    }

    res.json({
      status: 'success',
      message: '运动记录删除成功'
    });

  } catch (error) {
    next(error);
  }
});

// 获取运动统计
router.get('/stats/overview', authenticate, [
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
    const userId = req.user._id;

    // 获取用户运动统计
    const stats = await Workout.getUserStats(userId, timeRange);

    // 获取每日运动数据（用于图表）
    const days = timeRange === 'all' ? 30 : parseInt(timeRange.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const dailyStats = await Workout.aggregate([
      {
        $match: {
          user: userId, // 直接使用 userId，它已经是 ObjectId
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          workouts: { $sum: 1 },
          totalReps: { $sum: '$totalReps' },
          totalDuration: { $sum: '$actualDuration' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // 获取运动类型分布
    const typeDistribution = await Workout.aggregate([
      {
        $match: {
          user: userId, // 直接使用 userId，它已经是 ObjectId
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$workoutType',
          count: { $sum: 1 },
          totalReps: { $sum: '$totalReps' },
          avgReps: { $avg: '$totalReps' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      status: 'success',
      data: {
        overview: stats,
        dailyStats,
        typeDistribution,
        timeRange
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取排行榜
router.get('/stats/leaderboard', optionalAuth, [
  query('workoutType')
    .optional()
    .isIn(['push-up', 'squat'])
    .withMessage('运动类型无效'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('限制数量必须在1-100之间')
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

    const { workoutType, limit = 10 } = req.query;

    const leaderboard = await Workout.getLeaderboard(workoutType, parseInt(limit));

    res.json({
      status: 'success',
      data: {
        leaderboard,
        workoutType: workoutType || 'all'
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取运动统计数据
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 基础统计
    const totalWorkouts = await Workout.countDocuments({ user: userId });
    const totalRepsResult = await Workout.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$totalReps' } } }
    ]);
    const totalReps = totalRepsResult.length > 0 ? totalRepsResult[0].total : 0;

    // 运动类型统计
    const workoutTypeStats = await Workout.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$workoutType',
          totalReps: { $sum: '$totalReps' },
          sessions: { $sum: 1 },
          avgIntensity: { $avg: '$averageStandardLevel' },
          avgCompletion: { $avg: '$averageStandardLevel' }
        }
      },
      {
        $project: {
          workoutType: '$_id',
          totalReps: 1,
          sessions: 1,
          averageIntensity: { $round: ['$avgIntensity', 1] },
          completionRate: { $round: ['$avgCompletion', 0] },
          _id: 0
        }
      }
    ]);

    // 计算连续训练天数
    const recentWorkouts = await Workout.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('createdAt');

    let currentStreak = 0;
    if (recentWorkouts.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let currentDate = new Date(today);
      const workoutDates = new Set(
        recentWorkouts.map(w => {
          const date = new Date(w.createdAt);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
      );

      // 检查是否今天有训练
      if (!workoutDates.has(currentDate.getTime())) {
        currentDate.setDate(currentDate.getDate() - 1);
      }

      // 向前查找连续的训练日
      while (workoutDates.has(currentDate.getTime())) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    // 计算平均完成率
    const avgCompletionResult = await Workout.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, avg: { $avg: '$averageStandardLevel' } } }
    ]);
    const averageCompletion = avgCompletionResult.length > 0 ? 
      Math.round(avgCompletionResult[0].avg) : 0;

    res.json({
      status: 'success',
      data: {
        totalWorkouts,
        totalReps,
        currentStreak,
        averageCompletion,
        workoutTypeStats
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;