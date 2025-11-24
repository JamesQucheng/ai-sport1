const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  // 关联用户
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '用户ID不能为空'],
    index: true
  },
  
  // 签到日期（年-月-日格式，用于唯一性约束）
  date: {
    type: String,
    required: [true, '签到日期不能为空'],
    match: [/^\d{4}-\d{2}-\d{2}$/, '签到日期格式必须为YYYY-MM-DD']
  },
  
  // 签到时间戳
  checkInTime: {
    type: Date,
    required: [true, '签到时间不能为空'],
    default: Date.now
  },
  
  // 签到类型
  type: {
    type: String,
    enum: ['manual', 'auto'], // manual: 手动签到, auto: 运动后自动签到
    default: 'manual'
  },
  
  // 当天是否完成运动
  hasWorkout: {
    type: Boolean,
    default: false
  },
  
  // 关联的运动记录ID（如果是运动后自动签到）
  workoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workout'
  },
  
  // 签到奖励（积分、经验值等）
  rewards: {
    points: {
      type: Number,
      default: 0
      // 移除 min 限制，允许负积分（用于补签等消费情况）
    },
    experience: {
      type: Number,
      default: 0,
      min: [0, '经验值不能为负数']
    }
  },
  
  // 连续签到天数（当时的）
  streakDays: {
    type: Number,
    default: 1,
    min: [1, '连续天数至少为1']
  },
  
  // 备注
  note: {
    type: String,
    maxlength: [200, '备注最多200个字符']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引：用户+日期唯一
checkInSchema.index({ user: 1, date: 1 }, { unique: true });

// 时间索引
checkInSchema.index({ checkInTime: -1 });
checkInSchema.index({ createdAt: -1 });

// 虚拟字段：签到日期的Date对象
checkInSchema.virtual('dateObject').get(function() {
  return new Date(this.date + 'T00:00:00.000Z');
});

// 静态方法：获取用户签到统计
checkInSchema.statics.getUserCheckInStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalCheckIns: { $sum: 1 },
        totalPoints: { $sum: '$rewards.points' },
        totalExperience: { $sum: '$rewards.experience' },
        lastCheckIn: { $max: '$checkInTime' },
        firstCheckIn: { $min: '$checkInTime' }
      }
    }
  ]);
  
  return stats[0] || {
    totalCheckIns: 0,
    totalPoints: 0,
    totalExperience: 0,
    lastCheckIn: null,
    firstCheckIn: null
  };
};

// 静态方法：计算用户当前连续签到天数
checkInSchema.statics.calculateCurrentStreak = async function(userId) {
  const checkIns = await this.find({ user: userId })
    .sort({ date: -1 })
    .limit(365) // 最多查询一年的数据
    .select('date checkInTime');
  
  if (checkIns.length === 0) {
    return 0;
  }
  
  let streak = 0;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // 检查今天或昨天是否有签到记录
  let currentDate = checkIns[0].date === todayStr ? todayStr : 
                   checkIns[0].date === yesterdayStr ? yesterdayStr : null;
  
  if (!currentDate) {
    return 0;
  }
  
  // 从最近的签到日期开始，向前计算连续天数
  for (const checkIn of checkIns) {
    if (checkIn.date === currentDate) {
      streak++;
      // 计算前一天的日期
      const prevDate = new Date(currentDate + 'T00:00:00.000Z');
      prevDate.setDate(prevDate.getDate() - 1);
      currentDate = prevDate.toISOString().split('T')[0];
    } else {
      break;
    }
  }
  
  return streak;
};

// 静态方法：检查用户今天是否已签到
checkInSchema.statics.isCheckedInToday = async function(userId) {
  const today = new Date().toISOString().split('T')[0];
  const checkIn = await this.findOne({ user: userId, date: today });
  return !!checkIn;
};

// 静态方法：获取用户签到日历（某个月的签到记录）
checkInSchema.statics.getCheckInCalendar = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  const checkIns = await this.find({
    user: userId,
    date: { $gte: startDateStr, $lte: endDateStr }
  }).sort({ date: 1 });
  
  // 构建日历数据
  const calendar = {};
  for (let day = 1; day <= endDate.getDate(); day++) {
    const dayStr = new Date(year, month - 1, day).toISOString().split('T')[0];
    calendar[day] = {
      date: dayStr,
      isCheckedIn: false,
      hasWorkout: false,
      checkIn: null
    };
  }
  
  // 填充签到数据
  checkIns.forEach(checkIn => {
    const day = new Date(checkIn.date + 'T00:00:00.000Z').getDate();
    calendar[day] = {
      date: checkIn.date,
      isCheckedIn: true,
      hasWorkout: checkIn.hasWorkout,
      checkIn: checkIn
    };
  });
  
  return calendar;
};

// 实例方法：计算签到奖励
checkInSchema.methods.calculateRewards = function(streakDays) {
  // 基础奖励
  let points = 10;
  let experience = 5;
  
  // 连续签到奖励
  if (streakDays >= 7) {
    points += 20; // 连续7天额外奖励
    experience += 10;
  }
  if (streakDays >= 30) {
    points += 50; // 连续30天额外奖励
    experience += 25;
  }
  if (streakDays >= 100) {
    points += 100; // 连续100天额外奖励
    experience += 50;
  }
  
  // 如果当天有运动，额外奖励
  if (this.hasWorkout) {
    points += 15;
    experience += 8;
  }
  
  this.rewards.points = points;
  this.rewards.experience = experience;
  
  return this.rewards;
};

module.exports = mongoose.model('CheckIn', checkInSchema);

