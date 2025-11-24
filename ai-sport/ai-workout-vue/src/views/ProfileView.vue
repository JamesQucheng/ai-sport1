<template>
  <div class="profile-page">
    <div class="profile-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">个人资料</h1>
        <p class="page-subtitle">管理您的账户信息和运动偏好</p>
      </div>

      <div class="profile-grid">
        <!-- 左侧：个人信息 -->
        <div class="profile-main">
          <!-- 头像和基本信息卡片 -->
          <el-card class="profile-overview-card" shadow="never">
            <div class="profile-overview">
              <div class="avatar-section">
                <div class="avatar-wrapper">
                  <div class="avatar" @click="triggerAvatarUpload">
                    <img v-if="user?.profile?.avatar" :src="getAvatarUrl(user.profile.avatar)" alt="头像" class="avatar-image" />
                    <el-icon v-else class="avatar-icon"><User /></el-icon>
                    <div class="avatar-overlay">
                      <el-icon><EditPen /></el-icon>
                    </div>
                  </div>
                  <el-button 
                    size="small" 
                    text 
                    class="change-avatar-btn" 
                    @click="triggerAvatarUpload"
                    :loading="isUploadingAvatar"
                  >
                    {{ isUploadingAvatar ? '上传中...' : '更换头像' }}
                  </el-button>
                  <input 
                    ref="avatarFileInput" 
                    type="file" 
                    accept="image/*" 
                    style="display: none" 
                    @change="handleAvatarUpload"
                  />
                </div>
              </div>
              
              <div class="overview-info">
                <h2 class="user-name">{{ user?.profile?.nickname || user?.username || '未知用户' }}</h2>
                <p class="user-email">{{ user?.email }}</p>
                <div class="user-badges">
                  <el-tag :type="user?.role === 'admin' ? 'danger' : 'primary'" size="small">
                    {{ user?.role === 'admin' ? '管理员' : '普通用户' }}
                  </el-tag>
                  <el-tag v-if="user?.isEmailVerified" type="success" size="small">
                    邮箱已验证
                  </el-tag>
                  <el-tag v-else type="warning" size="small">
                    邮箱未验证
                  </el-tag>
                </div>
                
                <div class="overview-stats">
                  <div class="stat-item">
                    <span class="stat-number">{{ user?.stats?.totalWorkouts || 0 }}</span>
                    <span class="stat-label">训练次数</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-number">{{ user?.stats?.streak || 0 }}</span>
                    <span class="stat-label">连续天数</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-number">{{ Math.round((user?.stats?.totalDuration || 0) / 60) }}</span>
                    <span class="stat-label">总时长(分)</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 详细信息卡片 -->
          <el-card class="profile-detail-card" shadow="never">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon class="header-icon"><EditPen /></el-icon>
                  <span class="header-title">详细信息</span>
                </div>
                <el-button 
                  v-if="!isEditingProfile" 
                  type="primary" 
                  size="small" 
                  @click="startEditProfile"
                  :icon="Edit"
                >
                  编辑资料
                </el-button>
              </div>
            </template>

            <el-form
              v-if="isEditingProfile"
              ref="profileFormRef"
              :model="profileForm"
              :rules="profileRules"
              label-width="100px"
              size="default"
              class="profile-form"
            >
              <el-row :gutter="24">
                <el-col :span="12">
                  <el-form-item label="昵称" prop="nickname">
                    <el-input v-model="profileForm.nickname" placeholder="请输入昵称" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="性别" prop="gender">
                    <el-radio-group v-model="profileForm.gender">
                      <el-radio value="male">男</el-radio>
                      <el-radio value="female">女</el-radio>
                      <el-radio value="other">其他</el-radio>
                    </el-radio-group>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="24">
                <el-col :span="8">
                  <el-form-item label="年龄" prop="age">
                    <el-input-number 
                      v-model="profileForm.age" 
                      :min="10" 
                      :max="100" 
                      placeholder="请输入年龄"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="身高(cm)" prop="height">
                    <el-input-number 
                      v-model="profileForm.height" 
                      :min="100" 
                      :max="250" 
                      placeholder="身高"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="体重(kg)" prop="weight">
                    <el-input-number 
                      v-model="profileForm.weight" 
                      :min="30" 
                      :max="200" 
                      :precision="1"
                      placeholder="体重"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="个人简介" prop="bio">
                <el-input 
                  v-model="profileForm.bio" 
                  type="textarea" 
                  :rows="4" 
                  placeholder="介绍一下自己吧..."
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item class="form-actions">
                <el-button 
                  type="primary" 
                  :loading="isLoading" 
                  @click="saveProfile"
                  :icon="Check"
                >
                  保存资料
                </el-button>
                <el-button @click="cancelEditProfile" :icon="Close">取消</el-button>
              </el-form-item>
            </el-form>

            <!-- 显示模式 -->
            <div v-else class="profile-display">
              <el-row :gutter="24">
                <el-col :span="12">
                  <div class="info-item">
                    <label class="info-label">昵称</label>
                    <span class="info-value">{{ user?.profile?.nickname || '未设置' }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="info-item">
                    <label class="info-label">性别</label>
                    <span class="info-value">{{ genderText }}</span>
                  </div>
                </el-col>
              </el-row>

              <el-row :gutter="24">
                <el-col :span="8">
                  <div class="info-item">
                    <label class="info-label">年龄</label>
                    <span class="info-value">{{ user?.profile?.age ? `${user.profile.age} 岁` : '未设置' }}</span>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div class="info-item">
                    <label class="info-label">身高</label>
                    <span class="info-value">{{ user?.profile?.height ? `${user.profile.height} cm` : '未设置' }}</span>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div class="info-item">
                    <label class="info-label">体重</label>
                    <span class="info-value">{{ user?.profile?.weight ? `${user.profile.weight} kg` : '未设置' }}</span>
                  </div>
                </el-col>
              </el-row>

              <div v-if="bmiValue" class="info-item bmi-item">
                <label class="info-label">BMI 指数</label>
                <div class="bmi-display">
                  <span class="bmi-value" :class="bmiClass">{{ bmiValue }}</span>
                  <span class="bmi-status" :class="bmiClass">{{ bmiStatus }}</span>
                </div>
              </div>

              <div v-if="user?.profile?.bio" class="info-item bio-item">
                <label class="info-label">个人简介</label>
                <p class="bio-content">{{ user.profile.bio }}</p>
              </div>
            </div>
          </el-card>

          <!-- 安全设置卡片 -->
          <el-card class="security-card" shadow="never">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon class="header-icon"><Lock /></el-icon>
                  <span class="header-title">安全设置</span>
                </div>
                <el-button 
                  v-if="!isChangingPassword" 
                  type="primary" 
                  size="small" 
                  @click="startChangePassword"
                  :icon="Key"
                >
                  修改密码
                </el-button>
              </div>
            </template>

            <el-form
              v-if="isChangingPassword"
              ref="passwordFormRef"
              :model="passwordForm"
              :rules="passwordRules"
              label-width="100px"
              size="default"
              class="password-form"
            >
              <el-form-item label="当前密码" prop="oldPassword">
                <el-input 
                  v-model="passwordForm.oldPassword" 
                  type="password" 
                  show-password 
                  placeholder="请输入当前密码"
                />
              </el-form-item>

              <el-form-item label="新密码" prop="newPassword">
                <el-input 
                  v-model="passwordForm.newPassword" 
                  type="password" 
                  show-password 
                  placeholder="请输入新密码(至少6位)"
                />
              </el-form-item>

              <el-form-item label="确认密码" prop="confirmNewPassword">
                <el-input 
                  v-model="passwordForm.confirmNewPassword" 
                  type="password" 
                  show-password 
                  placeholder="请再次输入新密码"
                />
              </el-form-item>

              <el-form-item class="form-actions">
                <el-button 
                  type="primary" 
                  :loading="isLoading" 
                  @click="savePassword"
                  :icon="Check"
                >
                  更新密码
                </el-button>
                <el-button @click="cancelChangePassword" :icon="Close">取消</el-button>
              </el-form-item>
            </el-form>

            <div v-else class="security-display">
              <div class="security-item">
                <div class="security-info">
                  <h4>登录密码</h4>
                  <p>用于登录账户和重要操作验证</p>
                </div>
                <span class="security-status">••••••••</span>
              </div>
              
              <div class="security-tips">
                <el-alert
                  title="安全提醒"
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    <ul class="tips-list">
                      <li>建议使用包含数字、字母和特殊字符的强密码</li>
                      <li>定期更换密码以保证账户安全</li>
                      <li>不要在公共场所或他人面前输入密码</li>
                    </ul>
                  </template>
                </el-alert>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 右侧：统计信息和快捷操作 -->
        <div class="profile-sidebar">
          <!-- 运动统计卡片 -->
          <el-card class="stats-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><DataAnalysis /></el-icon>
                <span class="header-title">运动数据</span>
              </div>
            </template>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon primary">
                  <el-icon><Trophy /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ user?.stats?.totalWorkouts || 0 }}</div>
                  <div class="stat-label">总训练次数</div>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-icon success">
                  <el-icon><Timer /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ formatDuration(user?.stats?.totalDuration || 0) }}</div>
                  <div class="stat-label">总训练时长</div>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-icon warning">
                  <el-icon><Calendar /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ user?.stats?.streak || 0 }}</div>
                  <div class="stat-label">连续训练天数</div>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-icon info">
                  <el-icon><Star /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ user?.stats?.totalReps || 0 }}</div>
                  <div class="stat-label">总重复次数</div>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-icon danger">
                  <el-icon><Lightning /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ Math.round(user?.stats?.totalCalories || 0) }}</div>
                  <div class="stat-label">消耗卡路里</div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 快捷操作卡片 -->
          <el-card class="actions-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Operation /></el-icon>
                <span class="header-title">快捷操作</span>
              </div>
            </template>
            
            <div class="actions-list">
              <el-button 
                type="primary" 
                size="large"
                class="action-btn" 
                @click="$router.push('/workout')"
                :icon="VideoPlay"
              >
                开始运动
              </el-button>
              
              <el-button 
                size="large"
                class="action-btn" 
                @click="$router.push('/workout/history')"
                :icon="DocumentCopy"
              >
                运动记录
              </el-button>
              
              <el-button 
                v-if="isAdmin" 
                type="warning" 
                size="large"
                class="action-btn" 
                @click="$router.push('/admin')"
                :icon="Setting"
              >
                管理后台
              </el-button>
            </div>
          </el-card>

          <!-- 账户状态卡片 -->
          <el-card class="status-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><UserFilled /></el-icon>
                <span class="header-title">账户状态</span>
              </div>
            </template>
            
            <div class="status-list">
              <div class="status-item">
                <span class="status-label">账户状态</span>
                <el-tag :type="user?.isActive ? 'success' : 'danger'" size="default">
                  {{ user?.isActive ? '正常' : '已停用' }}
                </el-tag>
              </div>
              
              <div class="status-item">
                <span class="status-label">注册时间</span>
                <span class="status-value">{{ formatDate(user?.createdAt) }}</span>
              </div>
              
              <div class="status-item">
                <span class="status-label">上次登录</span>
                <span class="status-value">{{ formatDate(user?.lastLoginAt) }}</span>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElForm, ElMessage } from 'element-plus'
import {
  User,
  EditPen,
  Edit,
  Check,
  Close,
  Lock,
  Key,
  DataAnalysis,
  Trophy,
  Timer,
  Calendar,
  Star,
  Lightning,
  Operation,
  VideoPlay,
  DocumentCopy,
  Setting,
  UserFilled
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'

const { user, isLoading, isAdmin, updateProfile, changePassword, uploadAvatar, fetchUser } = useAuth()

// 头像上传相关
const avatarFileInput = ref<HTMLInputElement>()
const isUploadingAvatar = ref(false)

// 表单引用
const profileFormRef = ref<InstanceType<typeof ElForm>>()
const passwordFormRef = ref<InstanceType<typeof ElForm>>()

// 编辑状态
const isEditingProfile = ref(false)
const isChangingPassword = ref(false)

// 个人资料表单
const profileForm = reactive({
  nickname: '',
  gender: '' as 'male' | 'female' | 'other' | '',
  age: undefined as number | undefined,
  height: undefined as number | undefined,
  weight: undefined as number | undefined,
  bio: ''
})

// 密码修改表单
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmNewPassword: ''
})

// 计算属性
const genderText = computed(() => {
  switch (user.value?.profile?.gender) {
    case 'male': return '男'
    case 'female': return '女'
    case 'other': return '其他'
    default: return '未设置'
  }
})

const bmiValue = computed(() => {
  const height = user.value?.profile?.height
  const weight = user.value?.profile?.weight
  
  if (!height || !weight) return null
  
  const bmi = weight / Math.pow(height / 100, 2)
  return bmi.toFixed(1)
})

const bmiStatus = computed(() => {
  if (!bmiValue.value) return ''
  
  const bmi = parseFloat(bmiValue.value)
  if (bmi < 18.5) return '偏瘦'
  if (bmi < 24) return '正常'
  if (bmi < 28) return '偏胖'
  return '肥胖'
})

const bmiClass = computed(() => {
  if (!bmiValue.value) return ''
  
  const bmi = parseFloat(bmiValue.value)
  if (bmi < 18.5) return 'bmi-underweight'
  if (bmi < 24) return 'bmi-normal'
  if (bmi < 28) return 'bmi-overweight'
  return 'bmi-obese'
})

// 表单验证规则
const profileRules = {
  nickname: [
    { max: 20, message: '昵称长度不能超过20个字符', trigger: 'blur' }
  ],
  age: [
    { type: 'number' as const, min: 10, max: 100, message: '年龄必须在10-100之间', trigger: 'blur' }
  ],
  height: [
    { type: 'number' as const, min: 100, max: 250, message: '身高必须在100-250cm之间', trigger: 'blur' }
  ],
  weight: [
    { type: 'number' as const, min: 30, max: 200, message: '体重必须在30-200kg之间', trigger: 'blur' }
  ],
  bio: [
    { max: 200, message: '个人简介不能超过200个字符', trigger: 'blur' }
  ]
}

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmNewPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 方法
const startEditProfile = () => {
  // 填充表单数据
  Object.assign(profileForm, {
    nickname: user.value?.profile?.nickname || '',
    gender: user.value?.profile?.gender || '',
    age: user.value?.profile?.age,
    height: user.value?.profile?.height,
    weight: user.value?.profile?.weight,
    bio: user.value?.profile?.bio || ''
  })
  isEditingProfile.value = true
}

const cancelEditProfile = () => {
  isEditingProfile.value = false
  // 重置表单
  Object.assign(profileForm, {
    nickname: '',
    gender: '',
    age: undefined,
    height: undefined,
    weight: undefined,
    bio: ''
  })
}

const saveProfile = async () => {
  if (!profileFormRef.value) return
  
  try {
    const valid = await profileFormRef.value.validate()
    if (!valid) return

    const success = await updateProfile(profileForm)
    if (success) {
      isEditingProfile.value = false
    }
  } catch (error) {
    console.error('保存资料失败:', error)
  }
}

const startChangePassword = () => {
  isChangingPassword.value = true
}

const cancelChangePassword = () => {
  isChangingPassword.value = false
  // 重置表单
  Object.assign(passwordForm, {
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })
}

const savePassword = async () => {
  if (!passwordFormRef.value) return
  
  try {
    const valid = await passwordFormRef.value.validate()
    if (!valid) return

    const success = await changePassword(passwordForm.oldPassword, passwordForm.newPassword, passwordForm.confirmNewPassword)
    if (success) {
      isChangingPassword.value = false
      // 重置表单
      Object.assign(passwordForm, {
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      })
    }
  } catch (error) {
    console.error('修改密码失败:', error)
  }
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return '< 1分钟'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return '未知'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// 头像上传相关函数
const triggerAvatarUpload = () => {
  avatarFileInput.value?.click()
}

const handleAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  
  // 验证文件大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过5MB')
    return
  }
  
  try {
    isUploadingAvatar.value = true
    const success = await uploadAvatar(file)
    if (success) {
      // 清空文件输入框
      if (avatarFileInput.value) {
        avatarFileInput.value.value = ''
      }
    }
  } catch (error) {
    console.error('头像上传失败:', error)
  } finally {
    isUploadingAvatar.value = false
  }
}

const getAvatarUrl = (avatar: string): string => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
  const baseUrl = API_BASE_URL.replace('/api', '')
  
  // 如果avatar已经是完整URL，直接返回
  if (avatar.startsWith('http')) {
    return avatar
  }
  
  // 如果avatar不以/开头，添加/
  const avatarPath = avatar.startsWith('/') ? avatar : `/${avatar}`
  
  return `${baseUrl}${avatarPath}`
}

// 生命周期
onMounted(async () => {
  if (!user?.value) {
    await fetchUser()
  }
})
</script>

<style scoped>
.profile-page {
  min-height: calc(100vh - 140px);
  background: #f8fafc;
  padding: 40px 20px;
}

.profile-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 16px 0;
}

.page-subtitle {
  font-size: 1.1rem;
  color: #718096;
  margin: 0;
  line-height: 1.5;
}

/* 网格布局 */
.profile-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
}

.profile-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 卡片通用样式 */
.el-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.el-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: #667eea;
  font-size: 1.25rem;
}

.header-title {
  font-weight: 600;
  color: #2d3748;
}

/* 个人概览卡片 */
.profile-overview {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 4px solid #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.15);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-icon {
  font-size: 3rem;
  color: white;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 50%;
}

.avatar:hover .avatar-overlay {
  opacity: 1;
}

.avatar-overlay .el-icon {
  color: white;
  font-size: 1.5rem;
}

.change-avatar-btn {
  color: #667eea;
  font-size: 0.875rem;
  padding: 4px 8px;
}

.change-avatar-btn:hover {
  color: #764ba2;
}

.overview-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.user-email {
  font-size: 1rem;
  color: #718096;
  margin: 0 0 16px 0;
}

.user-badges {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f7fafc;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: #edf2f7;
  transform: translateY(-2px);
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.875rem;
  color: #718096;
  font-weight: 500;
}
.profile-overview {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar-wrapper {
  text-align: center;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.avatar-icon {
  font-size: 3rem;
  color: white;
}

.change-avatar-btn {
  color: #667eea;
  font-size: 0.9rem;
}

.overview-info {
  flex: 1;
}

.user-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.user-email {
  color: #718096;
  margin: 0 0 16px 0;
  font-size: 1.1rem;
}

.user-badges {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.overview-stats {
  display: flex;
  gap: 32px;
}

.overview-stats .stat-item {
  text-align: center;
}

.overview-stats .stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 4px;
}

.overview-stats .stat-label {
  font-size: 0.9rem;
  color: #718096;
}

/* 详细信息显示 */
.profile-display {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #718096;
}

.info-value {
  font-size: 1rem;
  color: #2d3748;
}

.bmi-item .bmi-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bmi-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.bmi-status {
  font-size: 0.9rem;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.bmi-normal {
  color: #16a085;
  background: rgba(22, 160, 133, 0.1);
}

.bmi-underweight {
  color: #f39c12;
  background: rgba(243, 156, 18, 0.1);
}

.bmi-overweight {
  color: #e67e22;
  background: rgba(230, 126, 34, 0.1);
}

.bmi-obese {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
}

.bio-item {
  grid-column: 1 / -1;
}

.bio-content {
  color: #4a5568;
  line-height: 1.6;
  margin: 0;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

/* 表单样式 */
.profile-form,
.password-form {
  padding-top: 16px;
}

.form-actions {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

/* 安全设置 */
.security-display {
  padding-top: 16px;
}

.security-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #e2e8f0;
}

.security-info h4 {
  margin: 0 0 4px 0;
  color: #2d3748;
  font-weight: 600;
}

.security-info p {
  margin: 0;
  color: #718096;
  font-size: 0.9rem;
}

.security-status {
  color: #a0aec0;
  font-family: monospace;
  font-size: 1.2rem;
}

.security-tips {
  margin-top: 20px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  color: #4a5568;
}

.tips-list li {
  margin-bottom: 8px;
  line-height: 1.4;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: #e2e8f0;
  transform: translateY(-2px);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.stat-icon.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.success {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
}

.stat-icon.warning {
  background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
}

.stat-icon.info {
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: #2d3748;
  line-height: 1;
}

.stat-label {
  font-size: 0.8rem;
  color: #718096;
  margin-top: 2px;
}

/* 快捷操作 */
.actions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  width: 100%;
  height: 48px;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 12px;
}

/* 账户状态 */
.status-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 16px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  color: #718096;
  font-size: 0.9rem;
}

.status-value {
  color: #2d3748;
  font-size: 0.9rem;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .profile-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .profile-sidebar {
    order: -1;
  }
  
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .profile-page {
    padding: 20px 15px;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .profile-overview {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  
  .overview-stats {
    justify-content: center;
    gap: 20px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .overview-stats {
    flex-direction: column;
    gap: 16px;
  }
}

/* Element Plus 样式覆盖 */
:deep(.el-card__header) {
  background: rgba(102, 126, 234, 0.02);
  border-bottom: 1px solid rgba(102, 126, 234, 0.08);
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-alert--info) {
  background: rgba(102, 126, 234, 0.05);
  border: 1px solid rgba(102, 126, 234, 0.1);
}

:deep(.el-alert__icon) {
  color: #667eea;
}
</style>