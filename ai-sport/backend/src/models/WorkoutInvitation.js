const mongoose = require('mongoose');

const workoutInvitationSchema = new mongoose.Schema({
  // 邀请发起者
  inviter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '邀请者ID不能为空'],
    index: true
  },
  
  // 被邀请者
  invitee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '被邀请者ID不能为空'],
    index: true
  },
  
  // 邀请状态
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired', 'completed'],
    default: 'pending',
    index: true
  },
  
  // 运动类型
  workoutType: {
    type: String,
    enum: ['push-up', 'squat'],
    required: [true, '运动类型不能为空']
  },
  
  // 运动名称
  workoutName: {
    type: String,
    required: [true, '运动名称不能为空']
  },
  
  // 计划运动时间
  scheduledTime: {
    type: Date,
    required: [true, '计划运动时间不能为空'],
    index: true
  },
  
  // 运动时长（分钟）
  duration: {
    type: Number,
    required: [true, '运动时长不能为空'],
    min: [1, '运动时长至少1分钟'],
    max: [120, '运动时长最多120分钟']
  },
  
  // 目标次数
  targetReps: {
    type: Number,
    min: [1, '目标次数至少为1']
  },
  
  // 邀请消息
  message: {
    type: String,
    maxlength: [200, '邀请消息最多200个字符'],
    default: ''
  },
  
  // 邀请时间
  invitedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // 响应时间
  respondedAt: {
    type: Date,
    index: true
  },
  
  // 运动完成时间
  completedAt: {
    type: Date,
    index: true
  },
  
  // 邀请者运动结果
  inviterResult: {
    completed: {
      type: Boolean,
      default: false
    },
    actualReps: {
      type: Number,
      default: 0
    },
    actualDuration: {
      type: Number,
      default: 0
    },
    completedAt: Date
  },
  
  // 被邀请者运动结果
  inviteeResult: {
    completed: {
      type: Boolean,
      default: false
    },
    actualReps: {
      type: Number,
      default: 0
    },
    actualDuration: {
      type: Number,
      default: 0
    },
    completedAt: Date
  },
  
  // 运动房间ID（用于实时同步）
  roomId: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引
workoutInvitationSchema.index({ inviter: 1, invitee: 1, scheduledTime: 1 });
workoutInvitationSchema.index({ status: 1, scheduledTime: 1 });

// 虚拟字段：是否双方都完成
workoutInvitationSchema.virtual('bothCompleted').get(function() {
  return this.inviterResult.completed && this.inviteeResult.completed;
});

// 虚拟字段：获胜者
workoutInvitationSchema.virtual('winner').get(function() {
  if (!this.bothCompleted) return null;
  
  const inviterScore = this.inviterResult.actualReps;
  const inviteeScore = this.inviteeResult.actualReps;
  
  if (inviterScore > inviteeScore) return 'inviter';
  if (inviteeScore > inviterScore) return 'invitee';
  return 'tie';
});

// 静态方法：创建运动邀请
workoutInvitationSchema.statics.createInvitation = async function(inviterId, inviteeId, invitationData) {
  // 检查被邀请者是否是好友
  const Friend = mongoose.model('Friend');
  const friendship = await Friend.findOne({
    $or: [
      { requester: inviterId, recipient: inviteeId, status: 'accepted' },
      { requester: inviteeId, recipient: inviterId, status: 'accepted' }
    ]
  });
  
  if (!friendship) {
    throw new Error('只能邀请好友一起运动');
  }
  
  // 检查时间冲突
  const conflictInvitation = await this.findOne({
    $or: [
      { inviter: inviterId, status: { $in: ['pending', 'accepted'] } },
      { invitee: inviterId, status: { $in: ['pending', 'accepted'] } },
      { inviter: inviteeId, status: { $in: ['pending', 'accepted'] } },
      { invitee: inviteeId, status: { $in: ['pending', 'accepted'] } }
    ],
    scheduledTime: {
      $gte: new Date(invitationData.scheduledTime.getTime() - 30 * 60000), // 前30分钟
      $lte: new Date(invitationData.scheduledTime.getTime() + 30 * 60000)  // 后30分钟
    }
  });
  
  if (conflictInvitation) {
    throw new Error('该时间段已有其他运动安排');
  }
  
  // 生成唯一房间ID
  const roomId = `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const invitation = new this({
    inviter: inviterId,
    invitee: inviteeId,
    roomId: roomId,
    ...invitationData
  });
  
  return await invitation.save();
};

// 静态方法：接受邀请
workoutInvitationSchema.statics.acceptInvitation = async function(invitationId, userId) {
  const invitation = await this.findOne({
    _id: invitationId,
    invitee: userId,
    status: 'pending'
  });
  
  if (!invitation) {
    throw new Error('邀请不存在或已过期');
  }
  
  // 检查是否过期
  if (new Date() > invitation.scheduledTime) {
    invitation.status = 'expired';
    await invitation.save();
    throw new Error('邀请已过期');
  }
  
  invitation.status = 'accepted';
  invitation.respondedAt = new Date();
  
  return await invitation.save();
};

// 静态方法：拒绝邀请
workoutInvitationSchema.statics.rejectInvitation = async function(invitationId, userId) {
  const invitation = await this.findOne({
    _id: invitationId,
    invitee: userId,
    status: 'pending'
  });
  
  if (!invitation) {
    throw new Error('邀请不存在或已过期');
  }
  
  invitation.status = 'rejected';
  invitation.respondedAt = new Date();
  
  return await invitation.save();
};

// 静态方法：记录运动结果
workoutInvitationSchema.statics.recordWorkoutResult = async function(invitationId, userId, result) {
  const invitation = await this.findOne({
    _id: invitationId,
    status: 'accepted',
    $or: [{ inviter: userId }, { invitee: userId }]
  });
  
  if (!invitation) {
    throw new Error('邀请不存在或状态无效');
  }
  
  const isInviter = invitation.inviter.toString() === userId.toString();
  const resultField = isInviter ? 'inviterResult' : 'inviteeResult';
  
  invitation[resultField] = {
    completed: true,
    actualReps: result.actualReps,
    actualDuration: result.actualDuration,
    completedAt: new Date()
  };
  
  // 如果双方都完成了，更新邀请状态
  if (invitation.inviterResult.completed && invitation.inviteeResult.completed) {
    invitation.status = 'completed';
    invitation.completedAt = new Date();
    
    // 更新好友互动数据
    const Friend = mongoose.model('Friend');
    const friendship = await Friend.findOne({
      $or: [
        { requester: invitation.inviter, recipient: invitation.invitee, status: 'accepted' },
        { requester: invitation.invitee, recipient: invitation.inviter, status: 'accepted' }
      ]
    });
    
    if (friendship) {
      await friendship.updateInteraction('workout_together');
    }
  }
  
  return await invitation.save();
};

// 静态方法：获取用户的邀请列表
workoutInvitationSchema.statics.getUserInvitations = async function(userId, status = null) {
  const query = {
    $or: [{ inviter: userId }, { invitee: userId }]
  };
  
  if (status) {
    query.status = status;
  }
  
  const invitations = await this.find(query)
    .populate('inviter invitee', 'username email avatar')
    .sort({ scheduledTime: -1 });
  
  return invitations;
};

// 自动过期处理
workoutInvitationSchema.pre('save', function(next) {
  if (this.status === 'pending' && this.scheduledTime < new Date()) {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('WorkoutInvitation', workoutInvitationSchema);
