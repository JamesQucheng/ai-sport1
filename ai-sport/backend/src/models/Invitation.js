const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  // 发送邀请的用户
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '发送者不能为空']
  },
  
  // 接收邀请的用户
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '接收者不能为空']
  },
  
  // 邀请类型
  type: {
    type: String,
    enum: ['workout_together', 'challenge', 'share_progress'],
    default: 'workout_together',
    required: [true, '邀请类型不能为空']
  },
  
  // 邀请标题
  title: {
    type: String,
    required: [true, '邀请标题不能为空'],
    maxlength: [100, '标题不能超过100个字符']
  },
  
  // 邀请内容
  message: {
    type: String,
    maxlength: [500, '消息不能超过500个字符']
  },
  
  // 运动相关信息
  workoutInfo: {
    workoutType: {
      type: String,
      enum: ['push-up', 'squat', 'bend'],
      required: function() {
        return this.type === 'workout_together' || this.type === 'challenge';
      }
    },
    targetReps: {
      type: Number,
      min: [1, '目标次数不能小于1'],
      required: function() {
        return this.type === 'workout_together' || this.type === 'challenge';
      }
    },
    duration: {
      type: Number, // 分钟
      min: [1, '时长不能小于1分钟'],
      max: [120, '时长不能超过120分钟']
    },
    scheduledTime: {
      type: Date, // 预定运动时间
      validate: {
        validator: function(value) {
          return !value || value > new Date();
        },
        message: '预定时间必须是未来时间'
      }
    }
  },
  
  // 邀请状态
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired', 'completed'],
    default: 'pending'
  },
  
  // 响应时间
  respondedAt: {
    type: Date
  },
  
  // 响应消息
  responseMessage: {
    type: String,
    maxlength: [200, '响应消息不能超过200个字符']
  },
  
  // 运动会话信息（接受邀请后创建）
  workoutSession: {
    sessionId: {
      type: String, // 用于实时同步的会话ID
      unique: true,
      sparse: true
    },
    startTime: Date,
    endTime: Date,
    senderProgress: {
      completedReps: { type: Number, default: 0 },
      completedSets: { type: Number, default: 0 },
      averageStandardLevel: { type: Number, default: 0 },
      isCompleted: { type: Boolean, default: false }
    },
    receiverProgress: {
      completedReps: { type: Number, default: 0 },
      completedSets: { type: Number, default: 0 },
      averageStandardLevel: { type: Number, default: 0 },
      isCompleted: { type: Boolean, default: false }
    }
  },
  
  // 过期时间
  expiresAt: {
    type: Date,
    default: function() {
      // 默认24小时后过期
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
invitationSchema.index({ sender: 1, createdAt: -1 });
invitationSchema.index({ receiver: 1, status: 1, createdAt: -1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 虚拟字段：是否已过期
invitationSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date() && this.status === 'pending';
});

// 虚拟字段：运动会话是否完成
invitationSchema.virtual('isSessionCompleted').get(function() {
  if (!this.workoutSession) return false;
  return this.workoutSession.senderProgress.isCompleted && 
         this.workoutSession.receiverProgress.isCompleted;
});

// 中间件：保存前检查过期状态
invitationSchema.pre('save', function(next) {
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
  }
  next();
});

// 中间件：响应邀请时设置响应时间
invitationSchema.pre('save', function(next) {
  if (this.isModified('status') && 
      (this.status === 'accepted' || this.status === 'rejected') && 
      !this.respondedAt) {
    this.respondedAt = new Date();
  }
  next();
});

// 实例方法：接受邀请
invitationSchema.methods.accept = function(responseMessage = '') {
  this.status = 'accepted';
  this.responseMessage = responseMessage;
  this.respondedAt = new Date();
  
  // 创建运动会话
  if (this.type === 'workout_together' || this.type === 'challenge') {
    this.workoutSession = {
      sessionId: `session_${this._id}_${Date.now()}`,
      startTime: new Date(),
      senderProgress: {
        completedReps: 0,
        completedSets: 0,
        averageStandardLevel: 0,
        isCompleted: false
      },
      receiverProgress: {
        completedReps: 0,
        completedSets: 0,
        averageStandardLevel: 0,
        isCompleted: false
      }
    };
  }
  
  return this.save();
};

// 实例方法：拒绝邀请
invitationSchema.methods.reject = function(responseMessage = '') {
  this.status = 'rejected';
  this.responseMessage = responseMessage;
  this.respondedAt = new Date();
  return this.save();
};

// 实例方法：更新运动进度
invitationSchema.methods.updateProgress = function(userId, progressData) {
  if (!this.workoutSession) {
    throw new Error('运动会话不存在');
  }
  
  const isSender = this.sender.toString() === userId.toString();
  const progressKey = isSender ? 'senderProgress' : 'receiverProgress';
  
  Object.assign(this.workoutSession[progressKey], progressData);
  
  // 检查是否两人都完成了
  if (this.workoutSession.senderProgress.isCompleted && 
      this.workoutSession.receiverProgress.isCompleted) {
    this.status = 'completed';
    this.workoutSession.endTime = new Date();
  }
  
  return this.save();
};

// 静态方法：获取用户的邀请列表
invitationSchema.statics.getUserInvitations = function(userId, type = 'received') {
  const query = type === 'sent' ? { sender: userId } : { receiver: userId };
  
  return this.find(query)
    .populate('sender', 'username profile.nickname profile.avatar')
    .populate('receiver', 'username profile.nickname profile.avatar')
    .sort({ createdAt: -1 });
};

// 静态方法：获取活跃的运动会话
invitationSchema.statics.getActiveSessions = function(userId) {
  return this.find({
    $or: [{ sender: userId }, { receiver: userId }],
    status: 'accepted',
    'workoutSession.sessionId': { $exists: true },
    'workoutSession.endTime': { $exists: false }
  })
  .populate('sender', 'username profile.nickname profile.avatar')
  .populate('receiver', 'username profile.nickname profile.avatar');
};

module.exports = mongoose.model('Invitation', invitationSchema);
