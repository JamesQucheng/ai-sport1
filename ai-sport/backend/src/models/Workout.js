const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  // 关联用户
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '用户ID不能为空']
  },
  
  // 运动基本信息
  workoutType: {
    type: String,
    required: [true, '运动类型不能为空'],
    enum: ['push-up', 'squat', 'bend'],
    index: true
  },
  workoutName: {
    type: String,
    required: [true, '运动名称不能为空']
  },
  
  // 运动设置
  plannedDuration: {
    type: String,
    required: [true, '计划时长不能为空'],
    validate: {
      validator: function(value) {
        const validDurations = ['1分钟', '3分钟', '5分钟', '7分钟'];
        // 清理重复的"分钟"字符串
        const cleanedValue = value.replace(/分钟分钟$/, '分钟');
        return validDurations.includes(cleanedValue);
      },
      message: '计划时长无效'
    },
    set: function(value) {
      // 自动清理重复的"分钟"字符串
      return value.replace(/分钟分钟$/, '分钟');
    }
  },
  plannedDurationSeconds: {
    type: Number,
    required: [true, '计划时长（秒）不能为空']
  },
  
  // 运动结果
  actualDuration: {
    type: Number,
    required: [true, '实际时长不能为空'],
    min: [0, '实际时长不能为负数']
  },
  totalReps: {
    type: Number,
    required: [true, '总次数不能为空'],
    min: [0, '总次数不能为负数'],
    default: 0
  },
  completionRate: {
    type: Number,
    min: [0, '完成率不能小于0%'],
    max: [100, '完成率不能超过100%'],
    default: 0
  },
  
  // 运动质量和消耗
  averageStandardLevel: {
    type: Number,
    min: [0, '平均标准程度不能小于0%'],
    max: [100, '平均标准程度不能超过100%'],
    default: 0,
    comment: '基于AI检测的动作标准程度平均值'
  },
  caloriesBurned: {
    type: Number,
    min: [0, '消耗卡路里不能为负数'],
    default: 0,
    comment: '根据运动类型、时长和强度计算的卡路里消耗'
  },
  
  // AI检测数据
  aiData: {
    averageConfidence: {
      type: Number,
      min: [0, '置信度不能小于0'],
      max: [1, '置信度不能大于1'],
      default: 0
    },
    detectionAccuracy: {
      type: Number,
      min: [0, '检测准确率不能小于0%'],
      max: [100, '检测准确率不能超过100%'],
      default: 0
    },
    frameCount: {
      type: Number,
      min: [0, '帧数不能为负数'],
      default: 0
    },
    averageFPS: {
      type: Number,
      min: [0, 'FPS不能为负数'],
      default: 0
    },
    poseQualityScore: {
      type: Number,
      min: [0, '姿势质量评分不能小于0'],
      max: [100, '姿势质量评分不能超过100'],
      default: 0
    }
  },
  
  // 运动详细数据
  repDetails: [{
    repNumber: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Number,
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    angles: {
      type: Map,
      of: Number
    },
    quality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'fair'
    }
  }],
  
  // 运动状态
  status: {
    type: String,
    enum: ['completed', 'paused', 'cancelled', 'failed'],
    default: 'completed',
    index: true
  },
  
  // 设备信息
  deviceInfo: {
    userAgent: String,
    screenResolution: String,
    cameraResolution: String,
    browser: String,
    os: String
  },
  
  // 运动环境
  environment: {
    lightingCondition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    backgroundComplexity: {
      type: String,
      enum: ['simple', 'moderate', 'complex'],
      default: 'moderate'
    },
    cameraStability: {
      type: String,
      enum: ['stable', 'slightly_shaky', 'very_shaky'],
      default: 'stable'
    }
  },
  
  // 用户反馈
  userFeedback: {
    difficulty: {
      type: Number,
      min: [1, '难度评分最小为1'],
      max: [5, '难度评分最大为5']
    },
    satisfaction: {
      type: Number,
      min: [1, '满意度评分最小为1'],
      max: [5, '满意度评分最大为5']
    },
    aiAccuracy: {
      type: Number,
      min: [1, 'AI准确度评分最小为1'],
      max: [5, 'AI准确度评分最大为5']
    },
    comments: {
      type: String,
      maxlength: [500, '评论最多500个字符']
    }
  },
  
  // 成就和里程碑
  achievements: [{
    type: String,
    enum: [
      'first_workout',
      'streak_7_days',
      'streak_30_days',
      'total_100_reps',
      'total_1000_reps',
      'perfect_form',
      'endurance_master'
    ]
  }],
  
  // 分享设置
  isPublic: {
    type: Boolean,
    default: false
  },
  
  // 标签
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, '标签最多20个字符']
  }],
  
  // 备注
  notes: {
    type: String,
    maxlength: [1000, '备注最多1000个字符']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：平均每分钟次数
workoutSchema.virtual('repsPerMinute').get(function() {
  if (this.actualDuration > 0) {
    return Math.round((this.totalReps / (this.actualDuration / 60)) * 10) / 10;
  }
  return 0;
});

// 虚拟字段：运动强度等级
workoutSchema.virtual('intensityLevel').get(function() {
  const rpm = this.repsPerMinute;
  if (rpm >= 30) return 'high';
  if (rpm >= 20) return 'medium';
  if (rpm >= 10) return 'low';
  return 'very_low';
});

// 索引
workoutSchema.index({ user: 1, createdAt: -1 });
workoutSchema.index({ workoutType: 1, createdAt: -1 });
workoutSchema.index({ status: 1 });
workoutSchema.index({ createdAt: -1 });
workoutSchema.index({ user: 1, workoutType: 1 });
workoutSchema.index({ totalReps: -1 });
workoutSchema.index({ completionRate: -1 });

// 中间件：保存前计算完成率、平均标准程度和卡路里消耗
workoutSchema.pre('save', function(next) {
  // 计算完成率
  if (this.actualDuration && this.plannedDurationSeconds) {
    this.completionRate = Math.min(
      Math.round((this.actualDuration / this.plannedDurationSeconds) * 100),
      100
    );
  }
  
  // 计算平均标准程度（基于repDetails中的quality）
  if (this.repDetails && this.repDetails.length > 0) {
    const qualityScores = {
      'excellent': 95,
      'good': 80,
      'fair': 65,
      'poor': 40
    };
    
    const totalScore = this.repDetails.reduce((sum, rep) => {
      return sum + (qualityScores[rep.quality] || 65);
    }, 0);
    
    this.averageStandardLevel = Math.round(totalScore / this.repDetails.length);
  } else if (this.aiData && this.aiData.poseQualityScore) {
    // 如果没有详细数据，使用AI姿势质量评分
    this.averageStandardLevel = this.aiData.poseQualityScore;
  }
  
  // 计算卡路里消耗（基于运动类型、时长和强度）
  if (this.actualDuration && this.workoutType) {
    const caloriesPerMinute = {
      'push-up': 8.5,     // 俯卧撑：高强度
      'squat': 7.2,       // 深蹲：中高强度
      'bend': 6.0,        // 弯腰：灵活性与拉伸
      'plank': 4.8,       // 平板支撑：中等强度
      'jumping-jack': 9.8 // 开合跳：高强度
    };
    
    const baseCalories = (caloriesPerMinute[this.workoutType] || 6.0) * (this.actualDuration / 60);
    
    // 根据完成率和标准程度调整卡路里消耗
    let multiplier = 1.0;
    if (this.completionRate) {
      multiplier *= (this.completionRate / 100);
    }
    if (this.averageStandardLevel) {
      multiplier *= (0.7 + (this.averageStandardLevel / 100) * 0.3); // 标准程度影响30%
    }
    
    this.caloriesBurned = Math.round(baseCalories * multiplier * 10) / 10; // 保留一位小数
  }
  
  next();
});

// 静态方法：获取用户统计数据
workoutSchema.statics.getUserStats = async function(userId, timeRange = '30d') {
  const matchStage = { user: new mongoose.Types.ObjectId(userId), status: 'completed' };
  
  // 根据时间范围添加日期过滤
  if (timeRange !== 'all') {
    const days = parseInt(timeRange.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    matchStage.createdAt = { $gte: startDate };
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalWorkouts: { $sum: 1 },
        totalReps: { $sum: '$totalReps' },
        totalDuration: { $sum: '$actualDuration' },
        totalCalories: { $sum: '$caloriesBurned' },
        avgReps: { $avg: '$totalReps' },
        avgDuration: { $avg: '$actualDuration' },
        avgCompletionRate: { $avg: '$completionRate' },
        avgStandardLevel: { $avg: '$averageStandardLevel' },
        avgCaloriesPerWorkout: { $avg: '$caloriesBurned' },
        maxReps: { $max: '$totalReps' },
        maxCalories: { $max: '$caloriesBurned' },
        workoutTypes: { $addToSet: '$workoutType' }
      }
    }
  ]);
  
  return stats[0] || {
    totalWorkouts: 0,
    totalReps: 0,
    totalDuration: 0,
    totalCalories: 0,
    avgReps: 0,
    avgDuration: 0,
    avgCompletionRate: 0,
    avgStandardLevel: 0,
    avgCaloriesPerWorkout: 0,
    maxReps: 0,
    maxCalories: 0,
    workoutTypes: []
  };
};

// 静态方法：获取排行榜
workoutSchema.statics.getLeaderboard = async function(workoutType = null, limit = 10) {
  const matchStage = { status: 'completed' };
  if (workoutType) {
    matchStage.workoutType = workoutType;
  }
  
  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$user',
        totalReps: { $sum: '$totalReps' },
        totalWorkouts: { $sum: 1 },
        avgReps: { $avg: '$totalReps' },
        bestSingleWorkout: { $max: '$totalReps' },
        lastWorkout: { $max: '$createdAt' }
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
    { $unwind: '$user' },
    {
      $project: {
        username: '$user.username',
        nickname: '$user.profile.nickname',
        avatar: '$user.profile.avatar',
        totalReps: 1,
        totalWorkouts: 1,
        avgReps: { $round: ['$avgReps', 1] },
        bestSingleWorkout: 1,
        lastWorkout: 1
      }
    },
    { $sort: { totalReps: -1 } },
    { $limit: limit }
  ]);
};

module.exports = mongoose.model('Workout', workoutSchema);