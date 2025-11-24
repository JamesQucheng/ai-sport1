const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  // 发起好友请求的用户
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '请求者ID不能为空'],
    index: true
  },
  
  // 接收好友请求的用户
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '接收者ID不能为空'],
    index: true
  },
  
  // 好友关系状态
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
    default: 'pending',
    index: true
  },
  
  // 请求消息
  message: {
    type: String,
    maxlength: [200, '请求消息最多200个字符'],
    default: ''
  },
  
  // 请求时间
  requestedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // 响应时间（接受/拒绝时间）
  respondedAt: {
    type: Date,
    index: true
  },
  
  // 成为好友的时间
  friendsSince: {
    type: Date,
    index: true
  },
  
  // 最后交互时间
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  
  // 亲密度分数（基于互动频率）
  intimacyScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // 互动统计
  interactions: {
    workoutInvitations: {
      type: Number,
      default: 0
    },
    workoutsTogether: {
      type: Number,
      default: 0
    },
    challengesShared: {
      type: Number,
      default: 0
    },
    messagesExchanged: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引，确保唯一性
friendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// 虚拟字段：好友关系持续天数
friendSchema.virtual('friendshipDuration').get(function() {
  if (!this.friendsSince) return 0;
  const now = new Date();
  const diffTime = now - this.friendsSince;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// 静态方法：发送好友请求
friendSchema.statics.sendFriendRequest = async function(requesterId, recipientId, message = '') {
  // 检查是否已存在好友关系
  const existingFriendship = await this.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId }
    ]
  });
  
  if (existingFriendship) {
    if (existingFriendship.status === 'accepted') {
      throw new Error('你们已经是好友了');
    } else if (existingFriendship.status === 'pending') {
      throw new Error('好友请求已发送，请等待对方回应');
    } else if (existingFriendship.status === 'blocked') {
      throw new Error('无法发送好友请求');
    }
  }
  
  // 创建新的好友请求
  const friendRequest = new this({
    requester: requesterId,
    recipient: recipientId,
    message: message,
    status: 'pending'
  });
  
  return await friendRequest.save();
};

// 静态方法：接受好友请求
friendSchema.statics.acceptFriendRequest = async function(requestId, userId) {
  const friendRequest = await this.findOne({
    _id: requestId,
    recipient: userId,
    status: 'pending'
  });
  
  if (!friendRequest) {
    throw new Error('好友请求不存在或已过期');
  }
  
  friendRequest.status = 'accepted';
  friendRequest.respondedAt = new Date();
  friendRequest.friendsSince = new Date();
  
  return await friendRequest.save();
};

// 静态方法：拒绝好友请求
friendSchema.statics.rejectFriendRequest = async function(requestId, userId) {
  const friendRequest = await this.findOne({
    _id: requestId,
    recipient: userId,
    status: 'pending'
  });
  
  if (!friendRequest) {
    throw new Error('好友请求不存在或已过期');
  }
  
  friendRequest.status = 'rejected';
  friendRequest.respondedAt = new Date();
  
  return await friendRequest.save();
};

// 静态方法：获取用户的好友列表
friendSchema.statics.getFriendsList = async function(userId) {
  const friends = await this.find({
    $or: [
      { requester: userId, status: 'accepted' },
      { recipient: userId, status: 'accepted' }
    ]
  }).populate('requester recipient', 'username email avatar createdAt')
    .sort({ lastInteraction: -1 });
  
  // 格式化好友列表，确保返回的是对方的信息
  return friends.map(friendship => {
    const isRequester = friendship.requester._id.toString() === userId.toString();
    const friend = isRequester ? friendship.recipient : friendship.requester;
    
    return {
      friendshipId: friendship._id,
      friend: friend,
      friendsSince: friendship.friendsSince,
      lastInteraction: friendship.lastInteraction,
      intimacyScore: friendship.intimacyScore,
      interactions: friendship.interactions,
      friendshipDuration: friendship.friendshipDuration
    };
  });
};

// 静态方法：获取待处理的好友请求
friendSchema.statics.getPendingRequests = async function(userId) {
  const requests = await this.find({
    recipient: userId,
    status: 'pending'
  }).populate('requester', 'username email avatar createdAt')
    .sort({ requestedAt: -1 });
  
  return requests;
};

// 静态方法：获取发送的好友请求
friendSchema.statics.getSentRequests = async function(userId) {
  const requests = await this.find({
    requester: userId,
    status: 'pending'
  }).populate('recipient', 'username email avatar createdAt')
    .sort({ requestedAt: -1 });
  
  return requests;
};

// 实例方法：更新互动数据
friendSchema.methods.updateInteraction = function(interactionType) {
  this.lastInteraction = new Date();
  
  switch (interactionType) {
    case 'workout_invitation':
      this.interactions.workoutInvitations += 1;
      break;
    case 'workout_together':
      this.interactions.workoutsTogether += 1;
      break;
    case 'challenge_shared':
      this.interactions.challengesShared += 1;
      break;
    case 'message_exchanged':
      this.interactions.messagesExchanged += 1;
      break;
  }
  
  // 重新计算亲密度分数
  this.calculateIntimacyScore();
  
  return this.save();
};

// 实例方法：计算亲密度分数
friendSchema.methods.calculateIntimacyScore = function() {
  const { workoutInvitations, workoutsTogether, challengesShared, messagesExchanged } = this.interactions;
  const friendshipDays = this.friendshipDuration || 1;
  
  // 基于互动频率和类型计算分数
  let score = 0;
  score += workoutsTogether * 10; // 一起运动权重最高
  score += workoutInvitations * 5;
  score += challengesShared * 3;
  score += messagesExchanged * 1;
  
  // 考虑时间因素，避免分数过高
  score = Math.min(100, score / Math.max(1, friendshipDays / 30));
  
  this.intimacyScore = Math.round(score);
};

module.exports = mongoose.model('Friend', friendSchema);
