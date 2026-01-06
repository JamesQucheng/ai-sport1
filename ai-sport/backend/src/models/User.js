const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // 基本信息
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [20, '用户名最多20个字符'],
    match: [/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文']
  },
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少6个字符'],
    select: false // 默认查询时不返回密码
  },
  
  // 个人信息
  profile: {
    nickname: {
      type: String,
      trim: true,
      maxlength: [30, '昵称最多30个字符']
    },
    avatar: {
      type: String,
      default: ''
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other'
    },
    age: {
      type: Number,
      min: [1, '年龄必须大于0'],
      max: [150, '年龄不能超过150']
    },
    height: {
      type: Number,
      min: [50, '身高不能小于50cm'],
      max: [300, '身高不能超过300cm']
    },
    weight: {
      type: Number,
      min: [10, '体重不能小于10kg'],
      max: [500, '体重不能超过500kg']
    },
    bio: {
      type: String,
      maxlength: [200, '个人简介最多200个字符']
    }
  },
  
  // 系统信息
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // 运动偏好
  preferences: {
    favoriteWorkouts: [{
      type: String,
      enum: ['push-up', 'squat', 'bend']
    }],
    defaultDuration: {
      type: String,
      enum: ['1分钟', '3分钟', '5分钟', '7分钟'],
      default: '3分钟'
    },
    reminderEnabled: {
      type: Boolean,
      default: false
    },
    reminderTime: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '提醒时间格式不正确']
    },
    reminderDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Wednesday', 'Friday']
    }],
    reminderMessage: {
      type: String,
      maxlength: [100, '提醒消息最多100个字符'],
      default: '该运动了！保持健康的生活习惯 💪'
    },
    notificationSound: {
      type: Boolean,
      default: true
    }
  },
  
  // 统计信息
  stats: {
    totalWorkouts: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number,
      default: 0 // 总运动时长（秒）
    },
    totalReps: {
      type: Number,
      default: 0 // 总运动次数
    },
    totalCalories: {
      type: Number,
      default: 0 // 总消耗卡路里
    },
    lastWorkoutDate: {
      type: Date
    },
    streak: {
      type: Number,
      default: 0 // 连续运动天数
    },
    // 积分和等级系统
    totalPoints: {
      type: Number,
      default: 0 // 总积分
    },
    experience: {
      type: Number,
      default: 0 // 经验值
    },
    level: {
      type: Number,
      default: 1 // 用户等级
    },
    // 签到统计
    totalCheckIns: {
      type: Number,
      default: 0 // 总签到次数
    },
    longestStreak: {
      type: Number,
      default: 0 // 最长连续签到天数
    },
    // 运动计划统计
    completedPlans: {
      type: Number,
      default: 0 // 完成的计划数量
    },
    activePlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan'
    }
  },
  
  // 时间戳
  lastLoginAt: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：BMI计算
userSchema.virtual('profile.bmi').get(function() {
  if (this.profile.height && this.profile.weight) {
    const heightInMeters = this.profile.height / 100;
    return Math.round((this.profile.weight / (heightInMeters * heightInMeters)) * 10) / 10;
  }
  return null;
});

// 索引
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// 密码加密中间件
userSchema.pre('save', async function(next) {
  // 只有密码被修改时才加密
  if (!this.isModified('password')) return next();
  
  try {
    // 加密密码
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    // 设置密码修改时间
    this.passwordChangedAt = new Date();
    
    next();
  } catch (error) {
    next(error);
  }
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 检查密码是否在JWT签发后被修改
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// 更新最后登录时间
userSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save({ validateBeforeSave: false });
};

// 获取公开信息（不包含敏感数据）
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordChangedAt;
  return userObject;
};

// 更新积分和经验值
userSchema.methods.addPointsAndExperience = function(points, experience) {
  this.stats.totalPoints += points;
  this.stats.experience += experience;
  
  // 计算等级（每100经验值升一级）
  const newLevel = Math.floor(this.stats.experience / 100) + 1;
  if (newLevel > this.stats.level) {
    this.stats.level = newLevel;
    return { levelUp: true, newLevel: newLevel };
  }
  
  return { levelUp: false, newLevel: this.stats.level };
};

// 更新签到统计
userSchema.methods.updateCheckInStats = function(newStreak) {
  this.stats.totalCheckIns += 1;
  this.stats.streak = newStreak;
  if (newStreak > this.stats.longestStreak) {
    this.stats.longestStreak = newStreak;
  }
  return this.save();
};

// 获取下一级所需经验值
userSchema.methods.getNextLevelExperience = function() {
  const currentLevelBase = (this.stats.level - 1) * 100;
  const nextLevelBase = this.stats.level * 100;
  return {
    current: this.stats.experience - currentLevelBase,
    required: nextLevelBase - currentLevelBase,
    remaining: nextLevelBase - this.stats.experience
  };
};

// 检查用户是否应该收到提醒
userSchema.methods.shouldReceiveReminder = function(currentTime, dayOfWeek) {
  if (!this.preferences.reminderEnabled || !this.preferences.reminderTime) {
    return false;
  }
  
  // 检查是否是提醒日
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[dayOfWeek];
  
  if (!this.preferences.reminderDays.includes(dayName)) {
    return false;
  }
  
  // 检查时间是否匹配
  const [hour, minute] = this.preferences.reminderTime.split(':').map(Number);
  const reminderTime = hour * 60 + minute; // 转换为分钟
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  
  // 允许5分钟的误差
  return Math.abs(currentMinutes - reminderTime) <= 5;
};

module.exports = mongoose.model('User', userSchema);