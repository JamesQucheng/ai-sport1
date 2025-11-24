const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // 应用基本设置
  appName: {
    type: String,
    default: 'AI Sport Platform'
  },
  appVersion: {
    type: String,
    default: '1.0.0'
  },
  appDescription: {
    type: String,
    default: 'AI驱动的智能运动检测平台'
  },
  
  // 用户注册设置
  registration: {
    enabled: {
      type: Boolean,
      default: true
    },
    requireEmailVerification: {
      type: Boolean,
      default: false
    },
    defaultRole: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    allowedDomains: [{
      type: String,
      trim: true
    }],
    blockedDomains: [{
      type: String,
      trim: true
    }]
  },
  
  // 运动类型配置
  workoutTypes: [{
    slug: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    description: String,
    enabled: {
      type: Boolean,
      default: true
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    category: {
      type: String,
      enum: ['strength', 'cardio', 'flexibility', 'balance'],
      default: 'strength'
    },
    icon: String,
    instructions: [String],
    tips: [String],
    targetMuscles: [String],
    caloriesPerMinute: {
      type: Number,
      min: 0,
      default: 5
    }
  }],
  
  // 时长选项配置
  durationOptions: [{
    label: {
      type: String,
      required: true
    },
    seconds: {
      type: Number,
      required: true,
      min: 1
    },
    enabled: {
      type: Boolean,
      default: true
    },
    recommended: {
      type: Boolean,
      default: false
    }
  }],
  
  // AI模型配置
  aiSettings: {
    poseDetection: {
      model: {
        type: String,
        enum: ['MoveNet', 'PoseNet', 'BlazePose'],
        default: 'MoveNet'
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.3
      },
      maxPoses: {
        type: Number,
        min: 1,
        max: 10,
        default: 1
      }
    },
    classification: {
      enabled: {
        type: Boolean,
        default: true
      },
      threshold: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.7
      }
    },
    performance: {
      targetFPS: {
        type: Number,
        min: 1,
        max: 60,
        default: 30
      },
      maxProcessingTime: {
        type: Number,
        min: 10,
        max: 1000,
        default: 100
      }
    }
  },
  
  // 安全设置
  security: {
    maxLoginAttempts: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      min: 1,
      max: 3600,
      default: 900 // 15分钟
    },
    sessionTimeout: {
      type: Number,
      min: 300,
      max: 86400,
      default: 3600 // 1小时
    },
    passwordPolicy: {
      minLength: {
        type: Number,
        min: 6,
        max: 20,
        default: 6
      },
      requireUppercase: {
        type: Boolean,
        default: false
      },
      requireLowercase: {
        type: Boolean,
        default: false
      },
      requireNumbers: {
        type: Boolean,
        default: false
      },
      requireSpecialChars: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // 文件上传设置
  fileUpload: {
    maxFileSize: {
      type: Number,
      min: 1024,
      max: 10485760, // 10MB
      default: 5242880 // 5MB
    },
    allowedTypes: [{
      type: String,
      enum: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      default: 'image/jpeg'
    }],
    uploadPath: {
      type: String,
      default: 'uploads'
    }
  },
  
  // 邮件设置
  email: {
    enabled: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      enum: ['smtp', 'sendgrid', 'mailgun'],
      default: 'smtp'
    },
    from: {
      name: {
        type: String,
        default: 'AI Sport Platform'
      },
      address: {
        type: String,
        default: 'noreply@aisport.com'
      }
    },
    templates: {
      welcome: {
        subject: {
          type: String,
          default: '欢迎加入AI运动平台！'
        },
        enabled: {
          type: Boolean,
          default: true
        }
      },
      verification: {
        subject: {
          type: String,
          default: '请验证您的邮箱地址'
        },
        enabled: {
          type: Boolean,
          default: true
        }
      },
      passwordReset: {
        subject: {
          type: String,
          default: '重置您的密码'
        },
        enabled: {
          type: Boolean,
          default: true
        }
      }
    }
  },
  
  // 统计和分析
  analytics: {
    enabled: {
      type: Boolean,
      default: true
    },
    retentionDays: {
      type: Number,
      min: 30,
      max: 365,
      default: 90
    },
    trackUserBehavior: {
      type: Boolean,
      default: true
    },
    trackPerformance: {
      type: Boolean,
      default: true
    }
  },
  
  // 维护模式
  maintenance: {
    enabled: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: '系统正在维护中，请稍后再试。'
    },
    allowedIPs: [String],
    startTime: Date,
    endTime: Date
  },
  
  // 功能开关
  features: {
    socialSharing: {
      type: Boolean,
      default: true
    },
    leaderboard: {
      type: Boolean,
      default: true
    },
    achievements: {
      type: Boolean,
      default: true
    },
    userProfiles: {
      type: Boolean,
      default: true
    },
    workoutHistory: {
      type: Boolean,
      default: true
    },
    dataExport: {
      type: Boolean,
      default: true
    }
  },
  
  // 最后更新信息
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 确保只有一个系统设置文档
systemSettingsSchema.index({ _id: 1 }, { unique: true });

// 中间件：更新时间戳
systemSettingsSchema.pre('save', function(next) {
  this.lastUpdatedAt = new Date();
  next();
});

// 静态方法：获取系统设置（单例模式）
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  if (!settings) {
    // 如果没有设置，创建默认设置
    settings = await this.create({
      workoutTypes: [
        {
          slug: 'push-up',
          name: '俯卧撑',
          description: '经典的上肢力量训练动作',
          category: 'strength',
          targetMuscles: ['胸肌', '三角肌', '三头肌'],
          caloriesPerMinute: 8
        },
        {
          slug: 'squat',
          name: '深蹲',
          description: '下肢力量和核心稳定性训练',
          category: 'strength',
          targetMuscles: ['股四头肌', '臀大肌', '核心肌群'],
          caloriesPerMinute: 10
        }
      ],
      durationOptions: [
        { label: '1分钟', seconds: 60, recommended: false },
        { label: '3分钟', seconds: 180, recommended: true },
        { label: '5分钟', seconds: 300, recommended: true },
        { label: '7分钟', seconds: 420, recommended: false }
      ]
    });
  }
  
  return settings;
};

// 静态方法：更新设置
systemSettingsSchema.statics.updateSettings = async function(updates, updatedBy) {
  const settings = await this.getSettings();
  
  Object.assign(settings, updates);
  settings.lastUpdatedBy = updatedBy;
  
  return await settings.save();
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);