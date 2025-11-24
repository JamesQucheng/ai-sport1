// 内存数据存储 - 用于演示目的
class MemoryStore {
  constructor() {
    this.users = new Map();
    this.workouts = new Map();
    this.systemSettings = {
      appName: 'AI Sport Platform',
      version: '1.0.0',
      registrationEnabled: true,
      emailVerificationRequired: false,
      maintenanceMode: false,
      maxLoginAttempts: 5,
      maxFileSize: 10 * 1024 * 1024 // 10MB
    };
    this.userIdCounter = 1;
    this.workoutIdCounter = 1;
    
    // 创建默认管理员账户
    this.createDefaultAdmin();
  }

  createDefaultAdmin() {
    const bcrypt = require('bcryptjs');
    const adminId = 'admin_' + this.userIdCounter++;
    const hashedPassword = bcrypt.hashSync('admin123456', 10);
    
    const adminUser = {
      _id: adminId,
      username: 'admin',
      email: 'admin@aisport.com',
      password: hashedPassword,
      role: 'admin',
      profile: {
        nickname: '系统管理员',
        avatar: null,
        gender: null,
        age: null,
        height: null,
        weight: null,
        bio: '系统默认管理员账户'
      },
      isActive: true,
      emailVerified: true,
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      // 添加getPublicProfile方法
      getPublicProfile() {
        return {
          _id: this._id,
          username: this.username,
          email: this.email,
          role: this.role,
          profile: this.profile,
          isActive: this.isActive,
          emailVerified: this.emailVerified,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt
        };
      }
    };
    
    this.users.set(adminId, adminUser);
    
    console.log('✅ 默认管理员账户已创建 (用户名: admin, 密码: admin123)');
  }

  // 用户相关方法
  async findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findUserByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  async findUserById(id) {
    return this.users.get(id) || null;
  }

  async createUser(userData) {
    const userId = 'user_' + this.userIdCounter++;
    const user = {
      _id: userId,
      ...userData,
      role: userData.role || 'user',
      isActive: true,
      emailVerified: false,
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      // 添加getPublicProfile方法
      getPublicProfile() {
        return {
          _id: this._id,
          username: this.username,
          email: this.email,
          role: this.role,
          profile: this.profile,
          isActive: this.isActive,
          emailVerified: this.emailVerified,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt
        };
      }
    };
    
    this.users.set(userId, user);
    return user;
  }

  async updateUser(id, updateData) {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updateData,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(options = {}) {
    const { page = 1, limit = 10, role, status, search } = options;
    let users = Array.from(this.users.values());
    
    // 过滤
    if (role) {
      users = users.filter(user => user.role === role);
    }
    if (status !== undefined) {
      users = users.filter(user => user.isActive === status);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.profile.nickname && user.profile.nickname.toLowerCase().includes(searchLower))
      );
    }
    
    // 分页
    const total = users.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    return {
      users: paginatedUsers,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  // 运动记录相关方法
  async createWorkout(workoutData) {
    const workoutId = 'workout_' + this.workoutIdCounter++;
    const workout = {
      _id: workoutId,
      ...workoutData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.workouts.set(workoutId, workout);
    return workout;
  }

  async getUserWorkouts(userId, options = {}) {
    const { page = 1, limit = 10, type, startDate, endDate } = options;
    let workouts = Array.from(this.workouts.values()).filter(w => w.userId === userId);
    
    // 过滤
    if (type) {
      workouts = workouts.filter(w => w.type === type);
    }
    if (startDate) {
      workouts = workouts.filter(w => new Date(w.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      workouts = workouts.filter(w => new Date(w.createdAt) <= new Date(endDate));
    }
    
    // 排序（最新的在前）
    workouts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 分页
    const total = workouts.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedWorkouts = workouts.slice(startIndex, endIndex);
    
    return {
      workouts: paginatedWorkouts,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  async getWorkoutById(id) {
    return this.workouts.get(id) || null;
  }

  async deleteWorkout(id) {
    return this.workouts.delete(id);
  }

  // 系统设置相关方法
  getSystemSettings() {
    return this.systemSettings;
  }

  updateSystemSettings(settings) {
    this.systemSettings = { ...this.systemSettings, ...settings };
    return this.systemSettings;
  }

  // 统计相关方法
  getStats() {
    const users = Array.from(this.users.values());
    const workouts = Array.from(this.workouts.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      totalWorkouts: workouts.length,
      todayWorkouts: workouts.filter(w => new Date(w.createdAt) >= today).length,
      adminUsers: users.filter(u => u.role === 'admin').length
    };
  }
}

// 创建单例实例
const memoryStore = new MemoryStore();

module.exports = memoryStore;