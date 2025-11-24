const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 获取用户的提醒设置
router.get('/settings', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('preferences');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    res.json({
      status: 'success',
      data: {
        reminderSettings: {
          enabled: user.preferences.reminderEnabled || false,
          time: user.preferences.reminderTime || '',
          days: user.preferences.reminderDays || [],
          message: user.preferences.reminderMessage || '该运动了！保持健康的生活习惯 💪',
          sound: user.preferences.notificationSound !== false
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 更新用户的提醒设置
router.put('/settings', 
  authenticate,
  body('enabled')
    .isBoolean()
    .withMessage('提醒开关必须是布尔值'),
  body('time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('时间格式必须为HH:MM'),
  body('days')
    .optional()
    .isArray()
    .withMessage('提醒日期必须是数组'),
  body('days.*')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('日期格式无效'),
  body('message')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('提醒消息长度必须在1-100个字符之间'),
  body('sound')
    .optional()
    .isBoolean()
    .withMessage('声音设置必须是布尔值'),
  async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const { enabled, time, days, message, sound } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    // 更新提醒设置
    user.preferences.reminderEnabled = enabled;
    
    if (enabled) {
      // 如果启用提醒，必须设置时间
      if (!time) {
        return res.status(400).json({
          status: 'error',
          message: '启用提醒时必须设置提醒时间'
        });
      }
      
      user.preferences.reminderTime = time;
      user.preferences.reminderDays = days && days.length > 0 ? days : ['Monday', 'Wednesday', 'Friday'];
      user.preferences.reminderMessage = message || '该运动了！保持健康的生活习惯 💪';
      user.preferences.notificationSound = sound !== false;
    }

    await user.save();

    res.json({
      status: 'success',
      message: enabled ? '运动提醒已设置' : '运动提醒已关闭',
      data: {
        reminderSettings: {
          enabled: user.preferences.reminderEnabled,
          time: user.preferences.reminderTime,
          days: user.preferences.reminderDays,
          message: user.preferences.reminderMessage,
          sound: user.preferences.notificationSound
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 测试提醒功能（立即发送一次提醒）
router.post('/test', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('preferences profile.nickname username');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    if (!user.preferences.reminderEnabled) {
      return res.status(400).json({
        status: 'error',
        message: '请先启用运动提醒'
      });
    }

    // 生成测试提醒内容
    const nickname = user.profile?.nickname || user.username;
    const testMessage = `嗨 ${nickname}！这是一条测试提醒：${user.preferences.reminderMessage}`;

    // 这里可以集成实际的推送服务（如 Web Push API, FCM 等）
    // 暂时返回提醒内容用于前端显示
    res.json({
      status: 'success',
      message: '测试提醒已发送',
      data: {
        testReminder: {
          title: 'AI运动助手',
          message: testMessage,
          sound: user.preferences.notificationSound,
          timestamp: new Date()
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取提醒历史（如果需要记录提醒发送历史）
router.get('/history', authenticate, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间')
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

    // 这里可以实现提醒历史记录功能
    // 需要创建一个 ReminderHistory 模型来记录发送的提醒
    
    res.json({
      status: 'success',
      message: '提醒历史功能待实现',
      data: {
        reminders: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 快速设置常用提醒方案
router.post('/quick-setup', authenticate, [
  body('preset')
    .isIn(['daily', 'workdays', 'weekends', 'custom'])
    .withMessage('预设方案无效'),
  body('time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('时间格式必须为HH:MM')
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

    const { preset, time } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    // 根据预设方案设置提醒日期
    let days = [];
    let message = '该运动了！保持健康的生活习惯 💪';

    switch (preset) {
      case 'daily':
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        message = '每日运动，身体倍棒！今天也要加油哦 💪';
        break;
      case 'workdays':
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        message = '工作日运动，缓解压力，提升活力！';
        break;
      case 'weekends':
        days = ['Saturday', 'Sunday'];
        message = '周末运动时光，享受健康生活！';
        break;
      default:
        days = ['Monday', 'Wednesday', 'Friday'];
        message = '规律运动，健康生活每一天！';
    }

    // 更新用户设置
    user.preferences.reminderEnabled = true;
    user.preferences.reminderTime = time;
    user.preferences.reminderDays = days;
    user.preferences.reminderMessage = message;
    user.preferences.notificationSound = true;

    await user.save();

    res.json({
      status: 'success',
      message: `${preset === 'daily' ? '每日' : preset === 'workdays' ? '工作日' : preset === 'weekends' ? '周末' : '自定义'}提醒已设置`,
      data: {
        reminderSettings: {
          enabled: true,
          time: time,
          days: days,
          message: message,
          sound: true
        },
        preset: preset
      }
    });

  } catch (error) {
    next(error);
  }
});

// 检查当前是否应该发送提醒（用于定时任务）
router.get('/check', async (req, res, next) => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // 查找所有启用了提醒的用户
    const users = await User.find({
      'preferences.reminderEnabled': true,
      'preferences.reminderTime': { $exists: true }
    }).select('preferences profile.nickname username');

    const usersToRemind = [];

    for (const user of users) {
      if (user.shouldReceiveReminder(now, dayOfWeek)) {
        usersToRemind.push({
          userId: user._id,
          nickname: user.profile?.nickname || user.username,
          message: user.preferences.reminderMessage,
          sound: user.preferences.notificationSound
        });
      }
    }

    res.json({
      status: 'success',
      data: {
        timestamp: now,
        usersToRemind: usersToRemind,
        count: usersToRemind.length
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;

