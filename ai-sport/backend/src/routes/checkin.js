const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const CheckIn = require('../models/CheckIn');
const User = require('../models/User');
const Workout = require('../models/Workout');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 用户签到
router.post('/', authenticate, [
  body('type')
    .optional()
    .isIn(['manual', 'auto'])
    .withMessage('签到类型必须是manual或auto'),
  body('workoutId')
    .optional()
    .isMongoId()
    .withMessage('运动记录ID格式无效'),
  body('note')
    .optional()
    .isLength({ max: 200 })
    .withMessage('备注最多200个字符')
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

    const { type = 'manual', workoutId, note } = req.body;
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    // 检查今天是否已经签到
    const existingCheckIn = await CheckIn.findOne({ user: userId, date: today });
    if (existingCheckIn) {
      return res.status(400).json({
        status: 'error',
        message: '今天已经签到过了',
        data: { checkIn: existingCheckIn }
      });
    }

    // 验证运动记录（如果提供）
    let hasWorkout = false;
    if (workoutId) {
      const workout = await Workout.findOne({ _id: workoutId, user: userId });
      if (!workout) {
        return res.status(404).json({
          status: 'error',
          message: '运动记录不存在'
        });
      }
      hasWorkout = true;
    }

    // 计算当前连续签到天数
    const currentStreak = await CheckIn.calculateCurrentStreak(userId);
    const newStreak = currentStreak + 1;

    // 创建签到记录
    const checkIn = new CheckIn({
      user: userId,
      date: today,
      type: type,
      hasWorkout: hasWorkout,
      workoutId: workoutId || null,
      streakDays: newStreak,
      note: note || ''
    });

    // 计算奖励
    checkIn.calculateRewards(newStreak);

    // 保存签到记录
    await checkIn.save();

    // 更新用户统计数据
    const user = await User.findById(userId);
    if (user) {
      user.stats.streak = newStreak;
      
      // 更新积分和经验值
      if (!user.stats.totalPoints) {
        user.stats.totalPoints = 0;
      }
      user.stats.totalPoints += checkIn.rewards.points;
      
      if (!user.stats.experience) {
        user.stats.experience = 0;
      }
      user.stats.experience += checkIn.rewards.experience;
      
      // 计算等级（每100经验值升一级）
      const newLevel = Math.floor(user.stats.experience / 100) + 1;
      if (newLevel > user.stats.level) {
        user.stats.level = newLevel;
      }
      
      if (!user.stats.lastWorkoutDate || new Date(user.stats.lastWorkoutDate).toISOString().split('T')[0] !== today) {
        // 更新最后运动日期（只有当天第一次签到时）
        user.stats.lastWorkoutDate = new Date();
      }
      await user.save();
    }

    // 填充关联数据
    await checkIn.populate('workoutId', 'workoutName workoutType actualDuration totalReps');

    res.status(201).json({
      status: 'success',
      message: '签到成功！',
      data: {
        checkIn: checkIn,
        rewards: checkIn.rewards,
        streakDays: newStreak
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取用户签到状态
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    // 检查今天是否已签到
    const todayCheckIn = await CheckIn.findOne({ user: userId, date: today })
      .populate('workoutId', 'workoutName workoutType actualDuration totalReps');

    // 获取签到统计
    const stats = await CheckIn.getUserCheckInStats(userId);
    const currentStreak = await CheckIn.calculateCurrentStreak(userId);

    res.json({
      status: 'success',
      data: {
        isCheckedInToday: !!todayCheckIn,
        todayCheckIn: todayCheckIn,
        currentStreak: currentStreak,
        stats: {
          ...stats,
          currentStreak: currentStreak
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取签到历史记录
router.get('/history', authenticate, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
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

    const {
      page = 1,
      limit = 30,
      startDate,
      endDate
    } = req.query;

    const userId = req.user._id;

    // 构建查询条件
    const query = { user: userId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate).toISOString().split('T')[0];
      }
      if (endDate) {
        query.date.$lte = new Date(endDate).toISOString().split('T')[0];
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [checkIns, total] = await Promise.all([
      CheckIn.find(query)
        .populate('workoutId', 'workoutName workoutType actualDuration totalReps caloriesBurned')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CheckIn.countDocuments(query)
    ]);

    res.json({
      status: 'success',
      data: {
        checkIns: checkIns,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取签到日历（某个月的签到记录）
router.get('/calendar', authenticate, [
  query('year')
    .isInt({ min: 2020, max: 2030 })
    .withMessage('年份必须在2020-2030之间'),
  query('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('月份必须在1-12之间')
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

    const { year, month } = req.query;
    const userId = req.user._id;

    const calendar = await CheckIn.getCheckInCalendar(userId, parseInt(year), parseInt(month));

    res.json({
      status: 'success',
      data: {
        year: parseInt(year),
        month: parseInt(month),
        calendar: calendar
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取签到排行榜
router.get('/leaderboard', authenticate, [
  query('type')
    .optional()
    .isIn(['streak', 'total', 'monthly'])
    .withMessage('排行榜类型必须是streak、total或monthly'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('排行榜数量必须在1-50之间')
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

    const { type = 'streak', limit = 10 } = req.query;

    let pipeline = [];

    if (type === 'streak') {
      // 连续签到天数排行榜
      const users = await User.find({ 'stats.streak': { $gt: 0 } })
        .select('username profile.nickname profile.avatar stats.streak')
        .sort({ 'stats.streak': -1 })
        .limit(parseInt(limit));

      res.json({
        status: 'success',
        data: {
          type: 'streak',
          leaderboard: users.map((user, index) => ({
            rank: index + 1,
            user: {
              _id: user._id,
              username: user.username,
              nickname: user.profile?.nickname,
              avatar: user.profile?.avatar
            },
            value: user.stats.streak,
            label: '天连续签到'
          }))
        }
      });

    } else if (type === 'total') {
      // 总签到次数排行榜
      pipeline = [
        {
          $group: {
            _id: '$user',
            totalCheckIns: { $sum: 1 },
            totalPoints: { $sum: '$rewards.points' },
            lastCheckIn: { $max: '$checkInTime' }
          }
        },
        { $sort: { totalCheckIns: -1 } },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            totalCheckIns: 1,
            totalPoints: 1,
            lastCheckIn: 1,
            'user._id': 1,
            'user.username': 1,
            'user.profile.nickname': 1,
            'user.profile.avatar': 1
          }
        }
      ];

    } else if (type === 'monthly') {
      // 本月签到次数排行榜
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      pipeline = [
        {
          $match: {
            checkInTime: {
              $gte: startOfMonth,
              $lte: endOfMonth
            }
          }
        },
        {
          $group: {
            _id: '$user',
            monthlyCheckIns: { $sum: 1 },
            monthlyPoints: { $sum: '$rewards.points' }
          }
        },
        { $sort: { monthlyCheckIns: -1 } },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            monthlyCheckIns: 1,
            monthlyPoints: 1,
            'user._id': 1,
            'user.username': 1,
            'user.profile.nickname': 1,
            'user.profile.avatar': 1
          }
        }
      ];
    }

    if (pipeline.length > 0) {
      const results = await CheckIn.aggregate(pipeline);
      
      res.json({
        status: 'success',
        data: {
          type: type,
          leaderboard: results.map((item, index) => ({
            rank: index + 1,
            user: {
              _id: item.user._id,
              username: item.user.username,
              nickname: item.user.profile?.nickname,
              avatar: item.user.profile?.avatar
            },
            value: type === 'total' ? item.totalCheckIns : item.monthlyCheckIns,
            points: type === 'total' ? item.totalPoints : item.monthlyPoints,
            label: type === 'total' ? '次总签到' : '次本月签到'
          }))
        }
      });
    }

  } catch (error) {
    next(error);
  }
});

// 补签功能（需要消耗积分或有其他限制）
router.post('/makeup', authenticate, [
  body('date')
    .isISO8601()
    .withMessage('日期格式无效'),
  body('note')
    .optional()
    .isLength({ max: 200 })
    .withMessage('备注最多200个字符')
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

    const { date, note } = req.body;
    const userId = req.user._id;
    const targetDate = new Date(date).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // 检查补签日期的有效性
    if (targetDate >= today) {
      return res.status(400).json({
        status: 'error',
        message: '只能补签过去的日期'
      });
    }

    // 检查补签日期不能太久远（比如只能补签最近7天）
    const targetDateTime = new Date(targetDate);
    const todayDateTime = new Date(today);
    const daysDiff = Math.floor((todayDateTime - targetDateTime) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 7) {
      return res.status(400).json({
        status: 'error',
        message: '只能补签最近7天的记录'
      });
    }

    // 检查该日期是否已经签到
    const existingCheckIn = await CheckIn.findOne({ user: userId, date: targetDate });
    if (existingCheckIn) {
      return res.status(400).json({
        status: 'error',
        message: '该日期已经有签到记录'
      });
    }

    // 检查用户积分是否足够（补签需要消耗积分）
    const user = await User.findById(userId);
    const makeupCost = 50; // 补签消耗50积分
    
    if ((user.stats.totalPoints || 0) < makeupCost) {
      return res.status(400).json({
        status: 'error',
        message: `积分不足，补签需要${makeupCost}积分`
      });
    }

    // 创建补签记录
    const checkIn = new CheckIn({
      user: userId,
      date: targetDate,
      type: 'manual',
      hasWorkout: false,
      streakDays: 1, // 补签不计入连续天数
      note: note || '补签记录',
      rewards: {
        points: -makeupCost, // 负积分表示消耗
        experience: 0
      }
    });

    await checkIn.save();

    // 扣除用户积分
    user.stats.totalPoints = (user.stats.totalPoints || 0) - makeupCost;
    await user.save();

    res.status(201).json({
      status: 'success',
      message: '补签成功！',
      data: {
        checkIn: checkIn,
        remainingPoints: user.stats.totalPoints
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;

