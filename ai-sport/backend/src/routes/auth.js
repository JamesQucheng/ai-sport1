const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const memoryStore = require('../utils/memoryStore');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer用于头像上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：用户ID_时间戳.扩展名
    const ext = path.extname(file.originalname);
    const filename = `${req.user._id}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制文件大小为5MB
  }
});

// 生成JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// 用户注册
router.post('/register', [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少需要6个字符'),
  body('role')
    .isIn(['user', 'admin'])
    .withMessage('角色必须是user或admin')
], async (req, res, next) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const { email, password, role = 'user' } = req.body;

    // 检查用户是否已存在
    let existingUser;
    try {
      existingUser = await User.findOne({ email });
    } catch (error) {
      // 如果数据库不可用，使用内存存储
      existingUser = await memoryStore.findUserByEmail(email);
    }

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: '邮箱已被使用'
      });
    }

    // 创建新用户
    let user;
    try {
      user = new User({
        username: email.split('@')[0], // 使用邮箱前缀作为用户名
        email,
        password,
        role,
        profile: {
          nickname: email.split('@')[0]
        }
      });
      await user.save();
    } catch (error) {
      // 如果数据库不可用，使用内存存储
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await memoryStore.createUser({
        username: email.split('@')[0],
        email,
        password: hashedPassword,
        role,
        profile: {
          nickname: email.split('@')[0]
        }
      });
    }

     // 生成token
    const token = generateToken(user._id);

    // 更新最后登录时间
    try {
      await user.updateLastLogin();
    } catch (error) {
      // 如果是内存存储，更新用户信息
      await memoryStore.updateUser(user._id, { lastLogin: new Date() });
    }

    res.status(201).json({
      status: 'success',
      message: '注册成功',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    next(error);
  }
});

// 用户登录
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('password')
    .notEmpty()
    .withMessage('请输入密码')
], async (req, res, next) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // 查找用户（使用邮箱登录）
    let user;
    try {
      user = await User.findOne({ email }).select('+password');
    } catch (error) {
      // 如果数据库不可用，使用内存存储
      user = await memoryStore.findUserByEmail(email);
    }

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: '邮箱或密码错误'
      });
    }

    // 检查账户状态
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: '账户已被禁用，请联系管理员'
      });
    }

    // 验证密码
    let isPasswordValid;
    try {
      isPasswordValid = await user.comparePassword(password);
    } catch (error) {
      // 如果是内存存储的用户，直接使用bcrypt比较
      isPasswordValid = await bcrypt.compare(password, user.password);
    }
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: '邮箱或密码错误'
      });
    }

    // 生成token
    const token = generateToken(user._id);

    // 更新最后登录时间
    try {
      await user.updateLastLogin();
    } catch (error) {
      // 如果是内存存储，更新用户信息
      await memoryStore.updateUser(user._id, { lastLogin: new Date() });
    }

    res.json({
      status: 'success',
      message: '登录成功',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', authenticate, async (req, res, next) => {
  try {
    let user;
    try {
      user = await User.findById(req.user._id).select('-password');
    } catch (error) {
      // 如果数据库不可用，使用内存存储
      user = await memoryStore.findUserById(req.user._id);
      if (user) {
        // 移除密码字段
        const { password, ...userWithoutPassword } = user;
        user = userWithoutPassword;
      }
    }
    
    if (!user) {
      return res.status(404).json({ status: 'error', message: '用户不存在' });
    }
    
    res.json({
      status: 'success',
      data: {
        user: user.getPublicProfile ? user.getPublicProfile() : user
      }
    });
  } catch (error) {
    next(error);
  }
});

// 更新用户资料
router.put('/profile', authenticate, [
  body('profile.nickname')
    .optional()
    .isLength({ max: 30 })
    .withMessage('昵称最多30个字符'),
  body('profile.age')
    .optional()
    .isInt({ min: 1, max: 150 })
    .withMessage('年龄必须在1-150之间'),
  body('profile.height')
    .optional()
    .isFloat({ min: 50, max: 300 })
    .withMessage('身高必须在50-300cm之间'),
  body('profile.weight')
    .optional()
    .isFloat({ min: 10, max: 500 })
    .withMessage('体重必须在10-500kg之间'),
  body('profile.bio')
    .optional()
    .isLength({ max: 200 })
    .withMessage('个人简介最多200个字符')
], async (req, res, next) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const { profile, preferences } = req.body;
    let user = req.user;

    // 更新用户资料
    if (profile) {
      Object.assign(user.profile, profile);
    }

    // 更新用户偏好
    if (preferences) {
      Object.assign(user.preferences, preferences);
    }

    try {
      await user.save();
    } catch (error) {
      // 如果是内存存储，更新用户信息
      const updateData = {};
      if (profile) updateData.profile = user.profile;
      if (preferences) updateData.preferences = user.preferences;
      user = await memoryStore.updateUser(user._id, updateData);
    }

    res.json({
      status: 'success',
      message: '资料更新成功',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    next(error);
  }
});

// 修改密码
router.put('/password', authenticate, [
  body('currentPassword')
    .notEmpty()
    .withMessage('请输入当前密码'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码至少需要6个字符'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('确认密码不匹配');
      }
      return true;
    })
], async (req, res, next) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    // 验证当前密码
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: '当前密码错误'
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: '密码修改成功'
    });

  } catch (error) {
    next(error);
  }
});

// 刷新token
router.post('/refresh', authenticate, async (req, res, next) => {
  try {
    const token = generateToken(req.user._id);
    
    res.json({
      status: 'success',
      message: 'Token刷新成功',
      data: {
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// 登出（客户端处理，服务端记录）
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // 这里可以添加登出日志记录
    console.log(`用户 ${req.user.username} 已登出`);
    
    res.json({
      status: 'success',
      message: '登出成功'
    });
  } catch (error) {
    next(error);
  }
});

// 验证token有效性
router.get('/verify', authenticate, async (req, res, next) => {
  try {
    res.json({
      status: 'success',
      message: 'Token有效',
      data: {
        user: req.user.getPublicProfile()
      }
    });
  } catch (error) {
    next(error);
  }
});

// 头像上传接口
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: '请选择要上传的图片文件'
      });
    }

    // 删除旧头像文件（如果存在）
    const user = await User.findById(req.user._id);
    if (user.profile.avatar) {
      const oldAvatarPath = path.join(__dirname, '../../uploads/avatars', path.basename(user.profile.avatar));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // 更新用户头像路径
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.profile.avatar = avatarUrl;
    await user.save();

    res.json({
      status: 'success',
      message: '头像上传成功',
      data: {
        avatar: avatarUrl,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    // 如果出错，删除已上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

module.exports = router;