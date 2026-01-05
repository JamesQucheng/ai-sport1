const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const WorkoutPlan = require('../models/WorkoutPlan');
const User = require('../models/User');
const Workout = require('../models/Workout');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 生成智能运动计划
router.post('/generate', authenticate, [
  body('goals')
    .optional()
    .isArray()
    .withMessage('目标必须是数组'),
  body('goals.*')
    .isIn(['weight_loss', 'muscle_building', 'endurance', 'flexibility', 'general_fitness'])
    .withMessage('目标类型无效'),
  body('durationWeeks')
    .optional()
    .isInt({ min: 1, max: 52 })
    .withMessage('计划时长必须在1-52周之间'),
  body('weeklyFrequency')
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage('每周频率必须在1-7次之间'),
  body('availableTime')
    .optional()
    .isInt({ min: 5, max: 60 })
    .withMessage('可用时间必须在5-60分钟之间'),
  body('fitnessLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('健身水平无效')
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

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    const params = {
      goals: req.body.goals || ['general_fitness'],
      durationWeeks: req.body.durationWeeks || 4,
      weeklyFrequency: req.body.weeklyFrequency || 3,
      availableTime: req.body.availableTime || 15,
      fitnessLevel: req.body.fitnessLevel || 'beginner'
    };

    // 生成智能计划
    const plan = await WorkoutPlan.generateSmartPlan(user, params);

    // 保存计划
    await plan.save();

    res.status(201).json({
      status: 'success',
      message: '运动计划生成成功！',
      data: {
        plan: plan
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取用户的运动计划列表
router.get('/', authenticate, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('每页数量必须在1-50之间'),
  query('status')
    .optional()
    .isIn(['draft', 'active', 'completed', 'paused', 'cancelled'])
    .withMessage('状态无效'),
  query('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('难度无效')
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
      status,
      difficulty
    } = req.query;

    const userId = req.user._id;

    // 构建查询条件
    const query = { user: userId };
    
    if (status) {
      query.status = status;
    }
    
    if (difficulty) {
      query.difficulty = difficulty;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [plans, total] = await Promise.all([
      WorkoutPlan.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      WorkoutPlan.countDocuments(query)
    ]);

    res.json({
      status: 'success',
      data: {
        plans: plans,
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

// 获取今天的运动计划 (必须在 /:id 之前定义)
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const mondayBasedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 转换为1-7，周一为1

    // 查找活跃的计划
    const activePlan = await WorkoutPlan.findOne({ 
      user: userId, 
      status: 'active' 
    });

    if (!activePlan) {
      return res.json({
        status: 'success',
        data: {
          hasActivePlan: false,
          todaysPlan: null
        }
      });
    }

    // 计算当前应该在第几周
    const startDate = new Date(activePlan.startDate);
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(daysSinceStart / 7) + 1;

    // 查找今天的计划
    const week = activePlan.weeks.find(w => w.weekNumber === currentWeek);
    let todaysPlan = null;

    if (week) {
      const day = week.days.find(d => d.dayNumber === mondayBasedDay);
      if (day) {
        todaysPlan = {
          weekNumber: currentWeek,
          dayNumber: mondayBasedDay,
          dayName: day.dayName,
          isRestDay: day.isRestDay,
          workouts: day.workouts,
          notes: day.notes
        };
      }
    }

    res.json({
      status: 'success',
      data: {
        hasActivePlan: true,
        activePlan: {
          _id: activePlan._id,
          title: activePlan.title,
          difficulty: activePlan.difficulty,
          progress: activePlan.progress
        },
        todaysPlan: todaysPlan,
        currentWeek: currentWeek,
        currentDay: mondayBasedDay
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取单个运动计划详情
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '计划ID格式无效'
      });
    }

    const plan = await WorkoutPlan.findOne({ _id: id, user: userId });

    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: '运动计划不存在'
      });
    }

    res.json({
      status: 'success',
      data: {
        plan: plan
      }
    });

  } catch (error) {
    next(error);
  }
});

// 启动运动计划
router.put('/:id/start', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '计划ID格式无效'
      });
    }

    const plan = await WorkoutPlan.findOne({ _id: id, user: userId });

    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: '运动计划不存在'
      });
    }

    if (plan.status !== 'draft' && plan.status !== 'paused') {
      return res.status(400).json({
        status: 'error',
        message: '只能启动草稿或暂停状态的计划'
      });
    }

    // 检查用户是否已有活跃的计划
    const activePlan = await WorkoutPlan.findOne({ 
      user: userId, 
      status: 'active',
      _id: { $ne: id }
    });

    if (activePlan) {
      return res.status(400).json({
        status: 'error',
        message: '您已有一个活跃的运动计划，请先完成或暂停当前计划'
      });
    }

    // 启动计划
    plan.status = 'active';
    plan.startDate = new Date();
    plan.endDate = new Date(Date.now() + plan.durationWeeks * 7 * 24 * 60 * 60 * 1000);

    await plan.save();

    res.json({
      status: 'success',
      message: '运动计划已启动！',
      data: {
        plan: plan
      }
    });

  } catch (error) {
    next(error);
  }
});

// 暂停运动计划
router.put('/:id/pause', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '计划ID格式无效'
      });
    }

    const plan = await WorkoutPlan.findOne({ _id: id, user: userId });

    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: '运动计划不存在'
      });
    }

    if (plan.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: '只能暂停活跃状态的计划'
      });
    }

    plan.status = 'paused';
    await plan.save();

    res.json({
      status: 'success',
      message: '运动计划已暂停',
      data: {
        plan: plan
      }
    });

  } catch (error) {
    next(error);
  }
});

// 取消运动计划
router.put('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '计划ID格式无效'
      });
    }

    const plan = await WorkoutPlan.findOne({ _id: id, user: userId });

    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: '运动计划不存在'
      });
    }

    if (plan.status === 'completed' || plan.status === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: '无法取消已完成或已取消的计划'
      });
    }

    plan.status = 'cancelled';
    await plan.save();

    res.json({
      status: 'success',
      message: '运动计划已取消',
      data: {
        plan: plan
      }
    });

  } catch (error) {
    next(error);
  }
});

// 记录计划中的运动完成情况
router.post('/:id/workouts', authenticate, [
  body('weekNumber')
    .isInt({ min: 1 })
    .withMessage('周数必须是正整数'),
  body('dayNumber')
    .isInt({ min: 1, max: 7 })
    .withMessage('天数必须在1-7之间'),
  body('workoutIndex')
    .isInt({ min: 0 })
    .withMessage('运动索引必须是非负整数'),
  body('workoutId')
    .isMongoId()
    .withMessage('运动记录ID格式无效')
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

    const { id } = req.params;
    const { weekNumber, dayNumber, workoutIndex, workoutId } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '计划ID格式无效'
      });
    }

    const plan = await WorkoutPlan.findOne({ _id: id, user: userId });

    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: '运动计划不存在'
      });
    }

    if (plan.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: '只能在活跃的计划中记录运动'
      });
    }

    // 验证运动记录
    const workout = await Workout.findOne({ _id: workoutId, user: userId });
    if (!workout) {
      return res.status(404).json({
        status: 'error',
        message: '运动记录不存在'
      });
    }

    // 查找对应的计划项目
    const week = plan.weeks.find(w => w.weekNumber === weekNumber);
    if (!week) {
      return res.status(404).json({
        status: 'error',
        message: '指定的周不存在'
      });
    }

    const day = week.days.find(d => d.dayNumber === dayNumber);
    if (!day) {
      return res.status(404).json({
        status: 'error',
        message: '指定的天不存在'
      });
    }

    if (workoutIndex >= day.workouts.length) {
      return res.status(404).json({
        status: 'error',
        message: '指定的运动不存在'
      });
    }

    const planWorkout = day.workouts[workoutIndex];

    // 标记为已完成（可以添加完成状态字段）
    if (!planWorkout.completedAt) {
      planWorkout.completedAt = new Date();
      planWorkout.actualWorkout = workoutId;

      // 更新计划进度 - 使用新的进度跟踪方法
      await plan.updateProgress({
        weekNumber: weekNumber,
        dayNumber: dayNumber,
        workoutType: workout.workoutType,
        actualReps: workout.totalReps,
        actualSets: 1
      });
    }

    res.json({
      status: 'success',
      message: '运动完成记录已更新',
      data: {
        plan: plan,
        completedWorkout: planWorkout
      }
    });

  } catch (error) {
    next(error);
  }
});

// 更新运动计划进度（新增API）
router.put('/:id/progress', authenticate, [
  body('weekNumber')
    .isInt({ min: 1 })
    .withMessage('周数必须是正整数'),
  body('dayNumber')
    .isInt({ min: 1, max: 7 })
    .withMessage('天数必须是1-7之间的整数'),
  body('workoutType')
    .isIn(['push-up', 'squat', 'bend'])
    .withMessage('运动类型无效'),
  body('actualReps')
    .isInt({ min: 0 })
    .withMessage('实际完成次数必须是非负整数'),
  body('actualSets')
    .optional()
    .isInt({ min: 0 })
    .withMessage('实际完成组数必须是非负整数')
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

    const { id } = req.params;
    const { weekNumber, dayNumber, workoutType, actualReps, actualSets = 1 } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '计划ID格式无效'
      });
    }

    // 查找运动计划
    const plan = await WorkoutPlan.findOne({ _id: id, user: userId });
    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: '运动计划不存在'
      });
    }

    // 更新计划进度
    await plan.updateProgress({
      weekNumber: weekNumber,
      dayNumber: dayNumber,
      workoutType: workoutType,
      actualReps: actualReps,
      actualSets: actualSets
    });

    res.json({
      status: 'success',
      message: '运动计划进度已更新',
      data: {
        plan: plan
      }
    });

  } catch (error) {
    next(error);
  }
});



// 分享运动计划
router.post('/:id/share', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '计划ID格式无效'
      });
    }

    const plan = await WorkoutPlan.findOne({ _id: id, user: userId });

    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: '运动计划不存在'
      });
    }

    // 生成分享码
    await plan.generateShareCode();

    res.json({
      status: 'success',
      message: '分享链接已生成',
      data: {
        shareCode: plan.shareCode,
        shareUrl: `${req.protocol}://${req.get('host')}/api/plans/shared/${plan.shareCode}`
      }
    });

  } catch (error) {
    next(error);
  }
});

// 通过分享码获取计划
router.get('/shared/:shareCode', optionalAuth, async (req, res, next) => {
  try {
    const { shareCode } = req.params;

    const plan = await WorkoutPlan.findOne({ shareCode: shareCode, isPublic: true })
      .populate('user', 'username profile.nickname profile.avatar')
      .select('-generationParams'); // 不返回生成参数

    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: '分享的计划不存在或已停止分享'
      });
    }

    res.json({
      status: 'success',
      data: {
        plan: plan
      }
    });

  } catch (error) {
    next(error);
  }
});

// 复制分享的计划到自己的账户
router.post('/shared/:shareCode/copy', authenticate, async (req, res, next) => {
  try {
    const { shareCode } = req.params;
    const userId = req.user._id;

    const originalPlan = await WorkoutPlan.findOne({ shareCode: shareCode, isPublic: true });

    if (!originalPlan) {
      return res.status(404).json({
        status: 'error',
        message: '分享的计划不存在或已停止分享'
      });
    }

    // 创建计划副本
    const planCopy = new WorkoutPlan({
      ...originalPlan.toObject(),
      _id: undefined,
      user: userId,
      title: `${originalPlan.title}（副本）`,
      type: 'custom',
      status: 'draft',
      shareCode: undefined,
      isPublic: false,
      startDate: undefined,
      endDate: undefined,
      actualEndDate: undefined,
      progress: {
        currentWeek: 1,
        currentDay: 1,
        completedWorkouts: 0,
        totalWorkouts: originalPlan.progress.totalWorkouts,
        completionRate: 0
      },
      stats: {
        totalCalories: 0,
        averageRating: 0,
        ratingCount: 0
      },
      createdAt: undefined,
      updatedAt: undefined
    });

    await planCopy.save();

    res.status(201).json({
      status: 'success',
      message: '计划已复制到您的账户',
      data: {
        plan: planCopy
      }
    });

  } catch (error) {
    next(error);
  }
});

// 删除运动计划
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '计划ID格式无效'
      });
    }

    const plan = await WorkoutPlan.findOne({ _id: id, user: userId });

    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: '运动计划不存在'
      });
    }

    await WorkoutPlan.deleteOne({ _id: id });

    res.json({
      status: 'success',
      message: '运动计划已删除'
    });

  } catch (error) {
    next(error);
  }
});

// 更新计划进度
router.put('/:id/progress', authenticate, async (req, res, next) => {
  try {
    const { workoutIndex, progress } = req.body;
    const planId = req.params.id;
    const userId = req.user._id;

    const plan = await WorkoutPlan.findOne({ _id: planId, user: userId });
    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: '计划不存在'
      });
    }

    // 更新今日训练的进度
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const startDate = new Date(plan.startDate);
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(daysSinceStart / 7) + 1;

    const week = plan.weeks.find(w => w.weekNumber === currentWeek);
    if (week) {
      const day = week.days.find(d => d.dayNumber === dayOfWeek);
      if (day && day.workouts && day.workouts[workoutIndex]) {
        day.workouts[workoutIndex].progress = progress;
        await plan.save();
      }
    }

    res.json({
      status: 'success',
      message: '进度已更新'
    });
  } catch (error) {
    next(error);
  }
});

// 完成运动
router.put('/:id/complete-workout', authenticate, async (req, res, next) => {
  try {
    const { workoutIndex, completedReps, duration, completedAt } = req.body;
    const planId = req.params.id;
    const userId = req.user._id;

    const plan = await WorkoutPlan.findOne({ _id: planId, user: userId });
    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: '计划不存在'
      });
    }

    // 更新今日训练的完成状态
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const startDate = new Date(plan.startDate);
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(daysSinceStart / 7) + 1;

    const week = plan.weeks.find(w => w.weekNumber === currentWeek);
    if (week) {
      const day = week.days.find(d => d.dayNumber === dayOfWeek);
      if (day && day.workouts && day.workouts[workoutIndex]) {
        const workout = day.workouts[workoutIndex];
        workout.completedAt = new Date(completedAt);
        workout.actualReps = completedReps;
        workout.actualDuration = duration;
        
        // 清理进度数据
        delete workout.progress;

        // 创建运动记录
        const workoutRecord = new Workout({
          user: userId,
          workoutType: workout.workoutType,
          workoutName: workout.workoutName,
          targetReps: workout.targetReps,
          totalReps: completedReps,
          actualDuration: duration,
          standardLevel: Math.min(Math.round((completedReps / workout.targetReps) * 100), 100),
          caloriesBurned: Math.round(duration * 5), // 简单的卡路里计算
          planId: planId,
          createdAt: new Date(completedAt)
        });

        await workoutRecord.save();
      }
    }

    // 重新计算计划进度
    let totalWorkouts = 0;
    let completedWorkouts = 0;

    plan.weeks.forEach(week => {
      week.days.forEach(day => {
        if (!day.isRestDay && day.workouts) {
          totalWorkouts += day.workouts.length;
          completedWorkouts += day.workouts.filter(w => w.completedAt).length;
        }
      });
    });

    plan.progress.totalWorkouts = totalWorkouts;
    plan.progress.completedWorkouts = completedWorkouts;
    plan.progress.completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

    // 如果完成度达到100%，标记计划为完成
    if (plan.progress.completionRate >= 100) {
      plan.status = 'completed';
      plan.endDate = new Date();
    }

    await plan.save();

    res.json({
      status: 'success',
      message: '运动已完成',
      data: {
        plan: plan
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
