const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 验证中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: '输入验证失败',
      errors: errors.array()
    });
  }
  next();
};

// 发送运动邀请
router.post('/', 
  authenticate,
  body('inviteeId')
    .isMongoId()
    .withMessage('接收者ID格式无效'),
body('workoutType')
  .isIn(['push-up', 'squat', 'bend'])
  .withMessage('运动类型无效'),
  body('workoutName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('运动名称不能为空'),
  body('targetReps')
    .isInt({ min: 1 })
    .withMessage('目标次数必须是正整数'),
  body('duration')
    .isInt({ min: 1, max: 120 })
    .withMessage('时长必须在1-120分钟之间'),
  body('scheduledTime')
    .optional()
    .isISO8601()
    .withMessage('预定时间格式无效'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('消息长度不能超过500个字符'),
  handleValidationErrors,
  async (req, res, next) => {
  try {
    const { inviteeId, workoutType, workoutName, targetReps, duration, scheduledTime, message } = req.body;
    const senderId = req.user._id;

    // 检查是否给自己发邀请
    if (senderId.toString() === inviteeId) {
      return res.status(400).json({
        status: 'error',
        message: '不能给自己发送邀请'
      });
    }

    // 检查接收者是否存在
    const receiver = await User.findById(inviteeId);
    if (!receiver) {
      return res.status(404).json({
        status: 'error',
        message: '接收者不存在'
      });
    }

    // 检查是否已有待处理的相同邀请
    const existingInvitation = await Invitation.findOne({
      sender: senderId,
      receiver: inviteeId,
      type: 'workout_together',
      status: 'pending'
    });

    if (existingInvitation) {
      return res.status(400).json({
        status: 'error',
        message: '已有待处理的相同邀请'
      });
    }

    // 创建邀请
    const invitation = new Invitation({
      sender: senderId,
      receiver: inviteeId,
      type: 'workout_together',
      title: `一起${workoutName}`,
      message: message || '一起运动吧！',
      workoutInfo: {
        workoutType,
        targetReps,
        duration,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined
      }
    });

    await invitation.save();

    // 填充用户信息
    await invitation.populate('sender', 'username profile.nickname profile.avatar');
    await invitation.populate('receiver', 'username profile.nickname profile.avatar');

    res.status(201).json({
      status: 'success',
      message: '邀请发送成功',
      data: { invitation }
    });

  } catch (error) {
    next(error);
  }
});

// 获取邀请列表
router.get('/', 
  authenticate,
  query('type')
    .optional()
    .isIn(['sent', 'received'])
    .withMessage('类型必须是sent或received'),
  query('status')
    .optional()
    .isIn(['pending', 'accepted', 'rejected', 'expired', 'completed'])
    .withMessage('状态无效'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('每页数量必须在1-50之间'),
  handleValidationErrors,
  async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { 
      type = 'received', 
      status, 
      page = 1, 
      limit = 20 
    } = req.query;

    // 构建查询条件
    const query = type === 'sent' ? { sender: userId } : { receiver: userId };
    if (status) {
      query.status = status;
    }

    // 分页查询
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const invitations = await Invitation.find(query)
      .populate('sender', 'username profile.nickname profile.avatar')
      .populate('receiver', 'username profile.nickname profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 获取总数
    const total = await Invitation.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        invitations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 响应邀请（接受或拒绝）
router.put('/:id/respond', 
  authenticate,
  param('id')
    .isMongoId()
    .withMessage('邀请ID格式无效'),
  body('response')
    .isIn(['accepted', 'rejected'])
    .withMessage('响应必须是accepted或rejected'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('响应消息长度不能超过200个字符'),
  handleValidationErrors,
  async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response, message = '' } = req.body;
    const userId = req.user._id;

    // 查找邀请
    const invitation = await Invitation.findById(id)
      .populate('sender', 'username profile.nickname profile.avatar')
      .populate('receiver', 'username profile.nickname profile.avatar');

    if (!invitation) {
      return res.status(404).json({
        status: 'error',
        message: '邀请不存在'
      });
    }

    // 检查权限：只有接收者可以响应
    if (invitation.receiver._id.toString() !== userId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: '无权限响应此邀请'
      });
    }

    // 检查邀请状态
    if (invitation.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: '邀请已被处理或已过期'
      });
    }

    // 检查是否过期
    if (invitation.isExpired) {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(400).json({
        status: 'error',
        message: '邀请已过期'
      });
    }

    // 响应邀请
    if (response === 'accepted') {
      await invitation.accept(message);
    } else {
      await invitation.reject(message);
    }

    res.json({
      status: 'success',
      message: response === 'accepted' ? '邀请已接受' : '邀请已拒绝',
      data: { invitation }
    });

  } catch (error) {
    next(error);
  }
});

// 更新运动进度
router.put('/:id/progress', 
  authenticate,
  param('id')
    .isMongoId()
    .withMessage('邀请ID格式无效'),
  body('completedReps')
    .isInt({ min: 0 })
    .withMessage('完成次数必须是非负整数'),
  body('completedSets')
    .optional()
    .isInt({ min: 0 })
    .withMessage('完成组数必须是非负整数'),
  body('averageStandardLevel')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('平均标准度必须在0-100之间'),
  body('isCompleted')
    .optional()
    .isBoolean()
    .withMessage('完成状态必须是布尔值'),
  handleValidationErrors,
  async (req, res, next) => {
  try {
    const { id } = req.params;
    const progressData = req.body;
    const userId = req.user._id;

    // 查找邀请
    const invitation = await Invitation.findById(id)
      .populate('sender', 'username profile.nickname profile.avatar')
      .populate('receiver', 'username profile.nickname profile.avatar');

    if (!invitation) {
      return res.status(404).json({
        status: 'error',
        message: '邀请不存在'
      });
    }

    // 检查权限：只有参与者可以更新进度
    const isParticipant = invitation.sender._id.toString() === userId.toString() ||
                         invitation.receiver._id.toString() === userId.toString();

    if (!isParticipant) {
      return res.status(403).json({
        status: 'error',
        message: '无权限更新此邀请的进度'
      });
    }

    // 检查邀请状态
    if (invitation.status !== 'accepted') {
      return res.status(400).json({
        status: 'error',
        message: '只能更新已接受邀请的进度'
      });
    }

    // 更新进度
    await invitation.updateProgress(userId, progressData);

    res.json({
      status: 'success',
      message: '进度更新成功',
      data: { invitation }
    });

  } catch (error) {
    next(error);
  }
});

// 获取活跃的运动会话
router.get('/sessions/active', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sessions = await Invitation.getActiveSessions(userId);

    res.json({
      status: 'success',
      data: { sessions }
    });

  } catch (error) {
    next(error);
  }
});

// 获取邀请详情
router.get('/:id', 
  authenticate,
  param('id')
    .isMongoId()
    .withMessage('邀请ID格式无效'),
  handleValidationErrors,
  async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const invitation = await Invitation.findById(id)
      .populate('sender', 'username profile.nickname profile.avatar')
      .populate('receiver', 'username profile.nickname profile.avatar');

    if (!invitation) {
      return res.status(404).json({
        status: 'error',
        message: '邀请不存在'
      });
    }

    // 检查权限：只有参与者可以查看详情
    const isParticipant = invitation.sender._id.toString() === userId.toString() ||
                         invitation.receiver._id.toString() === userId.toString();

    if (!isParticipant) {
      return res.status(403).json({
        status: 'error',
        message: '无权限查看此邀请'
      });
    }

    res.json({
      status: 'success',
      data: { invitation }
    });

  } catch (error) {
    next(error);
  }
});

// 删除邀请（只有发送者可以删除待处理的邀请）
router.delete('/:id', 
  authenticate,
  param('id')
    .isMongoId()
    .withMessage('邀请ID格式无效'),
  handleValidationErrors,
  async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const invitation = await Invitation.findById(id);

    if (!invitation) {
      return res.status(404).json({
        status: 'error',
        message: '邀请不存在'
      });
    }

    // 检查权限：只有发送者可以删除
    if (invitation.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: '只有发送者可以删除邀请'
      });
    }

    // 只能删除待处理的邀请
    if (invitation.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: '只能删除待处理的邀请'
      });
    }

    await Invitation.findByIdAndDelete(id);

    res.json({
      status: 'success',
      message: '邀请已删除'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;