const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Friend = require('../models/Friend');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 搜索用户（用于添加好友）
router.get('/search', authenticate, [
  query('username')
    .notEmpty()
    .withMessage('用户名不能为空')
    .isLength({ min: 2 })
    .withMessage('用户名至少2个字符')
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

    const { username } = req.query;
    const currentUserId = req.user._id;

    // 搜索用户（排除自己）
    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { $ne: currentUserId }
    }).select('username email avatar createdAt').limit(10);

    // 检查与当前用户的好友关系状态
    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const friendship = await Friend.findOne({
        $or: [
          { requester: currentUserId, recipient: user._id },
          { requester: user._id, recipient: currentUserId }
        ]
      });

      let relationStatus = 'none';
      if (friendship) {
        if (friendship.status === 'accepted') {
          relationStatus = 'friend';
        } else if (friendship.status === 'pending') {
          relationStatus = friendship.requester.toString() === currentUserId.toString() 
            ? 'sent_request' : 'received_request';
        }
      }

      return {
        ...user.toObject(),
        relationStatus
      };
    }));

    res.json({
      status: 'success',
      data: {
        users: usersWithStatus
      }
    });

  } catch (error) {
    next(error);
  }
});

// 发送好友请求
router.post('/request', authenticate, [
  body('recipientId')
    .isMongoId()
    .withMessage('用户ID格式无效'),
  body('message')
    .optional()
    .isLength({ max: 200 })
    .withMessage('消息最多200个字符')
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

    const { recipientId, message = '' } = req.body;
    const requesterId = req.user._id;

    // 检查目标用户是否存在
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    // 不能向自己发送好友请求
    if (requesterId.toString() === recipientId) {
      return res.status(400).json({
        status: 'error',
        message: '不能向自己发送好友请求'
      });
    }

    const friendRequest = await Friend.sendFriendRequest(requesterId, recipientId, message);

    res.json({
      status: 'success',
      message: '好友请求已发送',
      data: {
        friendRequest
      }
    });

  } catch (error) {
    if (error.message.includes('已经是好友') || error.message.includes('已发送')) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    next(error);
  }
});

// 获取待处理的好友请求
router.get('/requests/pending', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const pendingRequests = await Friend.getPendingRequests(userId);

    res.json({
      status: 'success',
      data: {
        requests: pendingRequests
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取已发送的好友请求
router.get('/requests/sent', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sentRequests = await Friend.getSentRequests(userId);

    res.json({
      status: 'success',
      data: {
        requests: sentRequests
      }
    });

  } catch (error) {
    next(error);
  }
});

// 处理好友请求（接受/拒绝）
router.put('/request/:id/:action', authenticate, async (req, res, next) => {
  try {
    const { id, action } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '请求ID格式无效'
      });
    }

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        status: 'error',
        message: '操作类型无效'
      });
    }

    let result;
    if (action === 'accept') {
      result = await Friend.acceptFriendRequest(id, userId);
    } else {
      result = await Friend.rejectFriendRequest(id, userId);
    }

    res.json({
      status: 'success',
      message: action === 'accept' ? '已接受好友请求' : '已拒绝好友请求',
      data: {
        friendship: result
      }
    });

  } catch (error) {
    if (error.message.includes('不存在') || error.message.includes('过期')) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    next(error);
  }
});

// 获取好友列表
router.get('/list', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const friends = await Friend.getFriendsList(userId);

    // 获取好友的运动统计信息
    const Workout = require('../models/Workout');
    const friendsWithStats = await Promise.all(friends.map(async (friendship) => {
      const friendId = friendship.friend._id;
      
      // 获取好友的运动统计
      const stats = await Workout.aggregate([
        {
          $match: {
            user: friendId,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalWorkouts: { $sum: 1 },
            totalReps: { $sum: '$totalReps' },
            avgReps: { $avg: '$totalReps' },
            lastWorkout: { $max: '$createdAt' }
          }
        }
      ]);

      // 获取连续运动天数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 检查CheckIn模型是否存在
      let checkins = [];
      let currentStreak = 0;
      let isActiveToday = false;
      
      try {
        const CheckIn = mongoose.model('CheckIn');
        checkins = await CheckIn.find({
          user: friendId,
          checkInTime: { $gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) }
        }).sort({ checkInTime: -1 });

        let currentDate = new Date(today);
        for (const checkin of checkins) {
          const checkinDate = new Date(checkin.checkInTime);
          checkinDate.setHours(0, 0, 0, 0);
          
          if (checkinDate.getTime() === currentDate.getTime()) {
            currentStreak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }

        isActiveToday = checkins.length > 0 && 
          new Date(checkins[0].checkInTime).toDateString() === today.toDateString();
      } catch (error) {
        console.warn('CheckIn模型不存在或查询失败:', error.message);
      }

      return {
        ...friendship,
        workoutStats: stats[0] || {
          totalWorkouts: 0,
          totalReps: 0,
          avgReps: 0,
          lastWorkout: null
        },
        currentStreak,
        isActiveToday
      };
    }));

    res.json({
      status: 'success',
      data: {
        friends: friendsWithStats
      }
    });

  } catch (error) {
    next(error);
  }
});

// 删除好友
router.delete('/:friendshipId', authenticate, async (req, res, next) => {
  try {
    const { friendshipId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(friendshipId)) {
      return res.status(400).json({
        status: 'error',
        message: '好友关系ID格式无效'
      });
    }

    const friendship = await Friend.findOne({
      _id: friendshipId,
      $or: [
        { requester: userId },
        { recipient: userId }
      ],
      status: 'accepted'
    });

    if (!friendship) {
      return res.status(404).json({
        status: 'error',
        message: '好友关系不存在'
      });
    }

    await Friend.findByIdAndDelete(friendshipId);

    res.json({
      status: 'success',
      message: '已删除好友'
    });

  } catch (error) {
    next(error);
  }
});

// 获取好友排行榜
router.get('/ranking', authenticate, [
  query('period')
    .optional()
    .isIn(['week', 'month', 'all'])
    .withMessage('时间范围无效')
], async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { period = 'week' } = req.query;

    // 获取好友列表
    const friends = await Friend.getFriendsList(userId);
    const friendIds = friends.map(f => f.friend._id);
    friendIds.push(userId); // 包含自己

    // 根据时间范围设置查询条件
    let timeFilter = {};
    const now = new Date();
    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      timeFilter = { createdAt: { $gte: weekAgo } };
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      timeFilter = { createdAt: { $gte: monthAgo } };
    }

    // 获取排行数据
    const Workout = require('../models/Workout');
    const rankings = await Workout.aggregate([
      {
        $match: {
          user: { $in: friendIds },
          status: 'completed',
          ...timeFilter
        }
      },
      {
        $group: {
          _id: '$user',
          totalWorkouts: { $sum: 1 },
          totalReps: { $sum: '$totalReps' },
          totalDuration: { $sum: '$actualDuration' },
          avgReps: { $avg: '$totalReps' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: {
            _id: '$user._id',
            username: '$user.username',
            avatar: '$user.avatar'
          },
          totalWorkouts: 1,
          totalReps: 1,
          totalDuration: 1,
          avgReps: { $round: ['$avgReps', 1] },
          isCurrentUser: { $eq: ['$_id', userId] }
        }
      },
      {
        $sort: { totalReps: -1, totalWorkouts: -1 }
      }
    ]);

    // 添加排名
    const rankedFriends = rankings.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    res.json({
      status: 'success',
      data: {
        rankings: rankedFriends,
        period
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
