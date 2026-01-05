const mongoose = require('mongoose');

const workoutPlanSchema = new mongoose.Schema({
  // 关联用户
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '用户ID不能为空'],
    index: true
  },
  
  // 计划基本信息
  title: {
    type: String,
    required: [true, '计划标题不能为空'],
    maxlength: [100, '计划标题最多100个字符']
  },
  description: {
    type: String,
    maxlength: [500, '计划描述最多500个字符']
  },
  
  // 计划类型
  type: {
    type: String,
    enum: ['system_generated', 'custom'], // system_generated: 系统生成, custom: 用户自定义
    default: 'system_generated'
  },
  
  // 计划难度等级
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'], // 初级、中级、高级
    required: [true, '难度等级不能为空']
  },
  
  // 计划目标
  goals: [{
    type: String,
    enum: ['weight_loss', 'muscle_building', 'endurance', 'flexibility', 'general_fitness'],
    // 减重、增肌、耐力、柔韧性、一般健身
  }],
  
  // 计划时长（周）
  durationWeeks: {
    type: Number,
    required: [true, '计划时长不能为空'],
    min: [1, '计划时长至少1周'],
    max: [52, '计划时长最多52周']
  },
  
  // 每周运动频率
  weeklyFrequency: {
    type: Number,
    required: [true, '每周运动频率不能为空'],
    min: [1, '每周至少运动1次'],
    max: [7, '每周最多运动7次']
  },
  
  // 计划详细内容
  weeks: [{
    weekNumber: {
      type: Number,
      required: [true, '周数不能为空'],
      min: [1, '周数至少为1']
    },
    days: [{
      dayNumber: {
        type: Number,
        required: [true, '天数不能为空'],
        min: [1, '天数至少为1'],
        max: [7, '天数最多为7']
      },
      dayName: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      isRestDay: {
        type: Boolean,
        default: false
      },
      workouts: [{
        workoutType: {
          type: String,
          enum: ['push-up', 'squat', 'bend'],
          required: [true, '运动类型不能为空']
        },
        workoutName: {
          type: String,
          required: [true, '运动名称不能为空']
        },
        duration: {
          type: String,
          enum: ['1分钟', '3分钟', '5分钟', '7分钟'],
          required: [true, '运动时长不能为空']
        },
        durationSeconds: {
          type: Number,
          required: [true, '运动时长（秒）不能为空']
        },
        targetReps: {
          type: Number,
          min: [1, '目标次数至少为1']
        },
        sets: {
          type: Number,
          default: 1,
          min: [1, '组数至少为1']
        },
        restBetweenSets: {
          type: Number,
          default: 30, // 组间休息时间（秒）
          min: [0, '休息时间不能为负数']
        },
        difficulty: {
          type: Number,
          min: [1, '难度至少为1'],
          max: [5, '难度最多为5'],
          default: 3
        },
        calories: {
          type: Number,
          min: [0, '卡路里不能为负数'],
          default: 0
        },
        tips: {
          type: String,
          maxlength: [300, '运动提示最多300个字符']
        },
        // 实际完成进度
        progress: {
          completedReps: {
            type: Number,
            default: 0,
            min: [0, '完成次数不能为负数']
          },
          completedSets: {
            type: Number,
            default: 0,
            min: [0, '完成组数不能为负数']
          },
          lastCompletedDate: {
            type: Date
          },
          isCompleted: {
            type: Boolean,
            default: false
          },
          completionRate: {
            type: Number,
            default: 0,
            min: [0, '完成率不能小于0%'],
            max: [100, '完成率不能超过100%']
          }
        }
      }],
      notes: {
        type: String,
        maxlength: [200, '当日备注最多200个字符']
      }
    }]
  }],
  
  // 计划执行状态
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'paused', 'cancelled'],
    default: 'draft'
  },
  
  // 开始和结束时间
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  actualEndDate: {
    type: Date // 实际完成日期
  },
  
  // 计划执行进度
  progress: {
    currentWeek: {
      type: Number,
      default: 1,
      min: [1, '当前周数至少为1']
    },
    currentDay: {
      type: Number,
      default: 1,
      min: [1, '当前天数至少为1']
    },
    completedWorkouts: {
      type: Number,
      default: 0,
      min: [0, '完成运动次数不能为负数']
    },
    totalWorkouts: {
      type: Number,
      default: 0,
      min: [0, '总运动次数不能为负数']
    },
    completionRate: {
      type: Number,
      default: 0,
      min: [0, '完成率不能小于0%'],
      max: [100, '完成率不能超过100%']
    }
  },
  
  // 生成参数（用于系统生成的计划）
    generationParams: {
      userAge: Number,
      userWeight: Number,
      userHeight: Number,
      fitnessLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced']
      },
      availableTime: Number, // 每次运动可用时间（分钟）
      preferredWorkouts: [{
        type: String,
        enum: ['push-up', 'squat', 'bend', 'plank', 'jumping-jack']
      }],
    goals: [{
      type: String,
      enum: ['weight_loss', 'muscle_building', 'endurance', 'flexibility', 'general_fitness']
    }],
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // 计划统计数据
  stats: {
    totalCalories: {
      type: Number,
      default: 0,
      min: [0, '总卡路里不能为负数']
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, '平均评分不能小于0'],
      max: [5, '平均评分不能超过5']
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: [0, '评分次数不能为负数']
    }
  },
  
  // 分享设置
  isPublic: {
    type: Boolean,
    default: false
  },
  shareCode: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // 标签
  tags: [{
    type: String,
    maxlength: [20, '标签最多20个字符']
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
workoutPlanSchema.index({ user: 1, status: 1 });
workoutPlanSchema.index({ difficulty: 1, goals: 1 });
workoutPlanSchema.index({ isPublic: 1, 'stats.averageRating': -1 });
workoutPlanSchema.index({ createdAt: -1 });

// 虚拟字段：计划总时长（天）
workoutPlanSchema.virtual('totalDays').get(function() {
  return this.durationWeeks * 7;
});

// 虚拟字段：预计总卡路里
workoutPlanSchema.virtual('estimatedTotalCalories').get(function() {
  let totalCalories = 0;
  this.weeks.forEach(week => {
    week.days.forEach(day => {
      if (!day.isRestDay) {
        day.workouts.forEach(workout => {
          totalCalories += workout.calories || 0;
        });
      }
    });
  });
  return totalCalories * this.durationWeeks;
});

// 静态方法：生成智能运动计划
workoutPlanSchema.statics.generateSmartPlan = async function(user, params) {
  const {
    goals = ['general_fitness'],
    durationWeeks = 4,
    weeklyFrequency = 3,
    availableTime = 15, // 分钟
    fitnessLevel = 'beginner'
  } = params;
  
  // 基于用户数据和目标生成计划
  const plan = {
    user: user._id,
    title: `${fitnessLevel === 'beginner' ? '初级' : fitnessLevel === 'intermediate' ? '中级' : '高级'}${durationWeeks}周训练计划`,
    description: `基于您的身体数据和健身目标量身定制的${durationWeeks}周运动计划`,
    type: 'system_generated',
    difficulty: fitnessLevel,
    goals: goals,
    durationWeeks: durationWeeks,
    weeklyFrequency: weeklyFrequency,
    weeks: [],
    generationParams: {
      userAge: user.profile?.age,
      userWeight: user.profile?.weight,
      userHeight: user.profile?.height,
      fitnessLevel: fitnessLevel,
      availableTime: availableTime,
        preferredWorkouts: user.preferences?.favoriteWorkouts || ['push-up', 'squat', 'bend'],
      goals: goals,
      generatedAt: new Date()
    }
  };
  
  // 生成每周计划
  for (let week = 1; week <= durationWeeks; week++) {
    const weekData = {
      weekNumber: week,
      days: []
    };
    
    // 生成每日计划
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (let day = 1; day <= 7; day++) {
      const dayData = {
        dayNumber: day,
        dayName: dayNames[day - 1],
        isRestDay: false,
        workouts: [],
        notes: ''
      };
      
      // 根据频率决定是否为休息日
      const workoutDays = this.calculateWorkoutDays(weeklyFrequency);
      if (!workoutDays.includes(day)) {
        dayData.isRestDay = true;
        dayData.notes = '休息日，让肌肉得到充分恢复';
      } else {
        // 生成当日运动计划
        dayData.workouts = this.generateDailyWorkouts(fitnessLevel, availableTime, goals, week);
      }
      
      weekData.days.push(dayData);
    }
    
    plan.weeks.push(weekData);
  }
  
  // 计算总运动次数
  let totalWorkouts = 0;
  plan.weeks.forEach(week => {
    week.days.forEach(day => {
      if (!day.isRestDay) {
        totalWorkouts += day.workouts.length;
      }
    });
  });
  
  plan.progress = {
    currentWeek: 1,
    currentDay: 1,
    completedWorkouts: 0,
    totalWorkouts: totalWorkouts,
    completionRate: 0
  };
  
  return new this(plan);
};

// 静态方法：计算运动日
workoutPlanSchema.statics.calculateWorkoutDays = function(frequency) {
  const patterns = {
    1: [1], // 周一
    2: [1, 4], // 周一、周四
    3: [1, 3, 5], // 周一、周三、周五
    4: [1, 2, 4, 6], // 周一、周二、周四、周六
    5: [1, 2, 3, 5, 6], // 周一到周三、周五、周六
    6: [1, 2, 3, 4, 5, 6], // 周一到周六
    7: [1, 2, 3, 4, 5, 6, 7] // 每天
  };
  
  return patterns[frequency] || patterns[3];
};

// 静态方法：生成每日运动
workoutPlanSchema.statics.generateDailyWorkouts = function(fitnessLevel, availableTime, goals, week) {
  const workouts = [];
  const workoutTypes = ['push-up', 'squat', 'bend'];
  
  // 根据可用时间和健身水平决定运动时长
  let duration = '3分钟';
  let durationSeconds = 180;
  
  if (availableTime <= 5) {
    duration = '1分钟';
    durationSeconds = 60;
  } else if (availableTime <= 10) {
    duration = '3分钟';
    durationSeconds = 180;
  } else if (availableTime <= 15) {
    duration = '5分钟';
    durationSeconds = 300;
  } else {
    duration = '7分钟';
    durationSeconds = 420;
  }
  
  // 根据目标选择运动类型
  let selectedWorkouts = [];
    if (goals.includes('flexibility')) {
      selectedWorkouts = ['bend', 'squat'];
    } else if (goals.includes('muscle_building')) {
      selectedWorkouts = ['push-up', 'squat'];
    } else if (goals.includes('weight_loss')) {
      selectedWorkouts = ['squat', 'push-up'];
    } else if (goals.includes('endurance')) {
      selectedWorkouts = ['push-up', 'squat'];
    } else {
      selectedWorkouts = ['push-up', 'squat', 'bend']; // 默认
    }
  
  // 随机选择1-2个运动
  const numWorkouts = Math.min(2, selectedWorkouts.length);
  const shuffled = selectedWorkouts.sort(() => 0.5 - Math.random());
  
    for (let i = 0; i < numWorkouts; i++) {
      const workoutType = shuffled[i];
      const workoutNames = {
        'push-up': '俯卧撑',
        'squat': '深蹲',
        'bend': '弯腰'
      };
    
    // 根据健身水平和周数调整难度
    let difficulty = 3;
    let targetReps = 15;
    
    if (fitnessLevel === 'beginner') {
      difficulty = Math.min(2 + Math.floor(week / 2), 4);
      targetReps = 10 + week * 2;
    } else if (fitnessLevel === 'intermediate') {
      difficulty = Math.min(3 + Math.floor(week / 2), 5);
      targetReps = 20 + week * 3;
    } else {
      difficulty = Math.min(4 + Math.floor(week / 3), 5);
      targetReps = 30 + week * 5;
    }
    
    const workout = {
      workoutType: workoutType,
      workoutName: workoutNames[workoutType],
      duration: duration,
      durationSeconds: durationSeconds,
      targetReps: targetReps,
      sets: 1,
      restBetweenSets: 30,
      difficulty: difficulty,
      calories: this.calculateWorkoutCalories(workoutType, durationSeconds, difficulty),
      tips: this.getWorkoutTips(workoutType, difficulty)
    };
    
    workouts.push(workout);
  }
  
  return workouts;
};

// 静态方法：计算运动卡路里
workoutPlanSchema.statics.calculateWorkoutCalories = function(workoutType, durationSeconds, difficulty) {
  const baseCalories = {
    'push-up': 8, // 每分钟基础卡路里
    'squat': 6
  };
  
  const minutes = durationSeconds / 60;
  const base = baseCalories[workoutType] || 6;
  const difficultyMultiplier = 0.8 + (difficulty - 1) * 0.1; // 0.8 - 1.2
  
  return Math.round(base * minutes * difficultyMultiplier);
};

// 静态方法：获取运动提示
workoutPlanSchema.statics.getWorkoutTips = function(workoutType, difficulty) {
  const tips = {
    'push-up': [
      '保持身体挺直，核心收紧',
      '下降时胸部接近地面，推起时完全伸展',
      '呼吸要均匀，下降时吸气，推起时呼气',
      '如果太难，可以先做膝盖着地的俯卧撑',
      '注意手腕位置，避免受伤'
    ],
    'squat': [
      '双脚与肩同宽，脚尖略向外',
      '下蹲时膝盖不要超过脚尖',
      '保持背部挺直，重心在脚跟',
      '大腿与地面平行时停顿1秒',
      '上升时臀部发力，膝盖对齐脚尖'
    ]
  };
  
  const workoutTips = tips[workoutType] || [];
  if (workoutTips.length === 0) return '';
  
  // 根据难度选择提示
  const tipIndex = Math.min(difficulty - 1, workoutTips.length - 1);
  return workoutTips[tipIndex];
};

// 实例方法：更新计划进度
workoutPlanSchema.methods.updateProgress = function(completedWorkoutData) {
  const { weekNumber, dayNumber, workoutType, actualReps, actualSets = 1 } = completedWorkoutData;
  
  // 找到对应的运动项目
  const week = this.weeks.find(w => w.weekNumber === weekNumber);
  if (!week) return this.save();
  
  const day = week.days.find(d => d.dayNumber === dayNumber);
  if (!day) return this.save();
  
  const workout = day.workouts.find(w => w.workoutType === workoutType);
  if (!workout) return this.save();
  
  // 更新运动项目的进度
  workout.progress.completedReps += actualReps;
  workout.progress.completedSets += actualSets;
  workout.progress.lastCompletedDate = new Date();
  
  // 计算完成率
  const targetTotal = workout.targetReps * workout.sets;
  const completedTotal = workout.progress.completedReps;
  workout.progress.completionRate = Math.min(100, Math.round((completedTotal / targetTotal) * 100));
  
  // 检查运动是否完成
  if (workout.progress.completionRate >= 100) {
    workout.progress.isCompleted = true;
  }
  
  // 重新计算整个计划的进度
  this.recalculateProgress();
  
  return this.save();
};

// 实例方法：重新计算计划进度
workoutPlanSchema.methods.recalculateProgress = function() {
  let totalWorkouts = 0;
  let completedWorkouts = 0;
  
  this.weeks.forEach(week => {
    week.days.forEach(day => {
      if (!day.isRestDay) {
        day.workouts.forEach(workout => {
          totalWorkouts++;
          if (workout.progress.isCompleted) {
            completedWorkouts++;
          }
        });
      }
    });
  });
  
  this.progress.totalWorkouts = totalWorkouts;
  this.progress.completedWorkouts = completedWorkouts;
  this.progress.completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;
  
  // 更新当前周和天
  this.updateCurrentWeekDay();
  
  // 检查计划是否完成
  if (this.progress.completionRate >= 100) {
    this.status = 'completed';
    this.actualEndDate = new Date();
  } else if (this.status === 'draft') {
    this.status = 'active';
    if (!this.startDate) {
      this.startDate = new Date();
    }
  }
};

// 实例方法：更新当前周和天
workoutPlanSchema.methods.updateCurrentWeekDay = function() {
  // 找到第一个未完成的运动所在的周和天
  for (const week of this.weeks) {
    for (const day of week.days) {
      if (!day.isRestDay) {
        const hasIncompleteWorkout = day.workouts.some(workout => !workout.progress.isCompleted);
        if (hasIncompleteWorkout) {
          this.progress.currentWeek = week.weekNumber;
          this.progress.currentDay = day.dayNumber;
          return;
        }
      }
    }
  }
  
  // 如果所有运动都完成了，设置为最后一周最后一天
  if (this.weeks.length > 0) {
    const lastWeek = this.weeks[this.weeks.length - 1];
    this.progress.currentWeek = lastWeek.weekNumber;
    this.progress.currentDay = 7;
  }
};

// 实例方法：生成分享码
workoutPlanSchema.methods.generateShareCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  this.shareCode = result;
  this.isPublic = true;
  return this.save();
};

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);

