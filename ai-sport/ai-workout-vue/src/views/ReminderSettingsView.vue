<template>
  <div class="reminder-page">
    <div class="reminder-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">运动提醒</h1>
        <p class="page-subtitle">设置个性化运动提醒，养成规律运动习惯</p>
      </div>

      <div class="reminder-grid">
        <!-- 左侧：提醒设置 -->
        <div class="reminder-main">
          <!-- 提醒开关卡片 -->
          <el-card class="switch-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Bell /></el-icon>
                <span class="header-title">运动提醒</span>
                <el-switch
                  v-model="reminderSettings.enabled"
                  @change="handleSwitchChange"
                  size="large"
                />
              </div>
            </template>

            <div v-if="reminderSettings.enabled" class="reminder-status active">
              <div class="status-icon">
                <el-icon><Check /></el-icon>
              </div>
              <div class="status-info">
                <h3>提醒已开启</h3>
                <p>系统将按照您的设置准时提醒您运动</p>
              </div>
            </div>

            <div v-else class="reminder-status inactive">
              <div class="status-icon">
                <el-icon><Close /></el-icon>
              </div>
              <div class="status-info">
                <h3>提醒已关闭</h3>
                <p>开启提醒功能，帮助您养成规律运动习惯</p>
              </div>
            </div>
          </el-card>

          <!-- 提醒设置表单 -->
          <el-card v-if="reminderSettings.enabled" class="settings-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Setting /></el-icon>
                <span class="header-title">提醒设置</span>
              </div>
            </template>

            <el-form :model="reminderSettings" :rules="reminderRules" ref="reminderFormRef" label-width="100px">
              <el-form-item label="提醒时间" prop="time">
                <el-time-picker
                  v-model="timeValue"
                  format="HH:mm"
                  value-format="HH:mm"
                  placeholder="选择提醒时间"
                  style="width: 200px;"
                  @change="handleTimeChange"
                />
                <p class="form-tip">选择您希望收到运动提醒的时间</p>
              </el-form-item>

              <el-form-item label="提醒日期" prop="days">
                <el-checkbox-group v-model="reminderSettings.days" @change="handleDaysChange">
                  <el-checkbox value="Monday">周一</el-checkbox>
                  <el-checkbox value="Tuesday">周二</el-checkbox>
                  <el-checkbox value="Wednesday">周三</el-checkbox>
                  <el-checkbox value="Thursday">周四</el-checkbox>
                  <el-checkbox value="Friday">周五</el-checkbox>
                  <el-checkbox value="Saturday">周六</el-checkbox>
                  <el-checkbox value="Sunday">周日</el-checkbox>
                </el-checkbox-group>
                <p class="form-tip">选择您希望收到提醒的日期</p>
              </el-form-item>

              <el-form-item label="提醒消息" prop="message">
                <el-input
                  v-model="reminderSettings.message"
                  type="textarea"
                  :rows="3"
                  placeholder="输入自定义提醒消息"
                  maxlength="100"
                  show-word-limit
                  @input="handleMessageChange"
                />
                <p class="form-tip">自定义您的提醒消息内容</p>
              </el-form-item>

              <el-form-item label="提醒声音">
                <el-switch
                  v-model="reminderSettings.sound"
                  @change="handleSoundChange"
                />
                <span class="sound-label">{{ reminderSettings.sound ? '开启声音提醒' : '静音提醒' }}</span>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" :loading="isSaving" @click="saveSettings">
                  保存设置
                </el-button>
                <el-button @click="testReminder" :icon="Bell">
                  测试提醒
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 快速设置卡片 -->
          <el-card v-if="reminderSettings.enabled" class="quick-setup-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Lightning /></el-icon>
                <span class="header-title">快速设置</span>
              </div>
            </template>

            <div class="quick-presets">
              <div
                v-for="preset in quickPresets"
                :key="preset.key"
                class="preset-item"
                @click="applyPreset(preset)"
              >
                <div class="preset-icon">{{ preset.icon }}</div>
                <div class="preset-info">
                  <h4 class="preset-name">{{ preset.name }}</h4>
                  <p class="preset-desc">{{ preset.description }}</p>
                  <div class="preset-details">
                    <span>{{ preset.days.length }}天/周</span>
                    <span>{{ preset.time }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 右侧：提醒预览和统计 -->
        <div class="reminder-sidebar">
          <!-- 提醒预览 -->
          <el-card class="preview-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><View /></el-icon>
                <span class="header-title">提醒预览</span>
              </div>
            </template>

            <div class="preview-content">
              <div class="preview-phone">
                <div class="phone-screen">
                  <div class="notification" :class="{ active: reminderSettings.enabled }">
                    <div class="notification-icon">
                      <el-icon><Trophy /></el-icon>
                    </div>
                    <div class="notification-content">
                      <div class="notification-title">AI运动助手</div>
                      <div class="notification-message">
                        {{ reminderSettings.message || '该运动了！保持健康的生活习惯 💪' }}
                      </div>
                      <div class="notification-time">{{ reminderSettings.time || '未设置' }}</div>
                    </div>
                    <div v-if="reminderSettings.sound" class="notification-sound">
                      <el-icon><VideoPlay /></el-icon>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="preview-info">
                <h4>提醒效果预览</h4>
                <p v-if="reminderSettings.enabled">
                  您将在 {{ getDaysText() }} 的 {{ reminderSettings.time }} 收到运动提醒
                </p>
                <p v-else class="disabled-text">
                  开启提醒功能以查看预览效果
                </p>
              </div>
            </div>
          </el-card>

          <!-- 提醒统计 -->
          <el-card class="stats-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><DataAnalysis /></el-icon>
                <span class="header-title">提醒统计</span>
              </div>
            </template>

            <div class="stats-content">
              <div class="stat-item">
                <div class="stat-icon">
                  <el-icon><Calendar /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ getWeeklyReminders() }}</div>
                  <div class="stat-label">每周提醒次数</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon">
                  <el-icon><Clock /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ getNextReminder() }}</div>
                  <div class="stat-label">下次提醒时间</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon">
                  <el-icon><TrendCharts /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">85%</div>
                  <div class="stat-label">提醒响应率</div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 提醒权限 -->
          <el-card class="permission-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Lock /></el-icon>
                <span class="header-title">通知权限</span>
              </div>
            </template>

            <div class="permission-content">
              <div class="permission-status" :class="{ granted: notificationPermission === 'granted' }">
                <div class="permission-icon">
                  <el-icon v-if="notificationPermission === 'granted'"><Check /></el-icon>
                  <el-icon v-else><Warning /></el-icon>
                </div>
                <div class="permission-info">
                  <h4 v-if="notificationPermission === 'granted'">通知权限已授权</h4>
                  <h4 v-else>需要通知权限</h4>
                  <p v-if="notificationPermission === 'granted'">
                    您将能够接收到浏览器推送的运动提醒
                  </p>
                  <p v-else>
                    请允许浏览器发送通知，以便接收运动提醒
                  </p>
                </div>
              </div>
              
              <el-button
                v-if="notificationPermission !== 'granted'"
                type="primary"
                @click="requestNotificationPermission"
                style="width: 100%;"
              >
                开启通知权限
              </el-button>
            </div>
          </el-card>

          <!-- 使用技巧 -->
          <el-card class="tips-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><InfoFilled /></el-icon>
                <span class="header-title">使用技巧</span>
              </div>
            </template>

            <div class="tips-content">
              <ul class="tips-list">
                <li>选择您最容易坚持的时间段设置提醒</li>
                <li>建议在工作日和休息日设置不同的提醒时间</li>
                <li>可以设置个性化的提醒消息增加动力</li>
                <li>定期检查并调整提醒设置以保持新鲜感</li>
                <li>结合运动计划使用效果更佳</li>
              </ul>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Bell,
  Check,
  Close,
  Setting,
  Lightning,
  View,
  Trophy,
  VideoPlay,
  DataAnalysis,
  Calendar,
  Clock,
  TrendCharts,
  Lock,
  Warning,
  InfoFilled
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'

const { user, apiRequest } = useAuth()

// 响应式数据
const isSaving = ref(false)
const reminderFormRef = ref()
const timeValue = ref('')
const notificationPermission = ref<NotificationPermission>('default')

const reminderSettings = reactive({
  enabled: false,
  time: '',
  days: [] as string[],
  message: '该运动了！保持健康的生活习惯 💪',
  sound: true
})

// 验证规则
const reminderRules = {
  time: [
    { required: true, message: '请选择提醒时间', trigger: 'change' }
  ],
  days: [
    { type: 'array', min: 1, message: '请至少选择一天', trigger: 'change' }
  ]
}

// 快速预设
const quickPresets = [
  {
    key: 'daily',
    name: '每日提醒',
    description: '每天早上提醒运动',
    icon: '🌅',
    time: '08:00',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  {
    key: 'workdays',
    name: '工作日提醒',
    description: '工作日晚上提醒运动',
    icon: '💼',
    time: '19:00',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    key: 'weekends',
    name: '周末提醒',
    description: '周末上午提醒运动',
    icon: '🌈',
    time: '10:00',
    days: ['Saturday', 'Sunday']
  },
  {
    key: 'custom',
    name: '隔日提醒',
    description: '每隔一天提醒运动',
    icon: '⚡',
    time: '18:00',
    days: ['Monday', 'Wednesday', 'Friday']
  }
]

// 计算属性
const getDaysText = () => {
  if (!reminderSettings.days.length) return '未设置'
  
  const dayMap: Record<string, string> = {
    Monday: '周一',
    Tuesday: '周二',
    Wednesday: '周三',
    Thursday: '周四',
    Friday: '周五',
    Saturday: '周六',
    Sunday: '周日'
  }
  
  if (reminderSettings.days.length === 7) {
    return '每天'
  } else if (reminderSettings.days.length === 5 && 
             !reminderSettings.days.includes('Saturday') && 
             !reminderSettings.days.includes('Sunday')) {
    return '工作日'
  } else if (reminderSettings.days.length === 2 && 
             reminderSettings.days.includes('Saturday') && 
             reminderSettings.days.includes('Sunday')) {
    return '周末'
  } else {
    return reminderSettings.days.map(day => dayMap[day]).join('、')
  }
}

const getWeeklyReminders = () => {
  return reminderSettings.enabled ? reminderSettings.days.length : 0
}

const getNextReminder = () => {
  if (!reminderSettings.enabled || !reminderSettings.time || !reminderSettings.days.length) {
    return '未设置'
  }
  
  const now = new Date()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = dayNames[now.getDay()]
  
  // 找到下一个提醒日
  let nextDay = ''
  let daysUntilNext = 0
  
  for (let i = 0; i < 7; i++) {
    const checkDay = dayNames[(now.getDay() + i) % 7]
    if (reminderSettings.days.includes(checkDay)) {
      if (i === 0) {
        // 今天，检查时间是否已过
        const [hour, minute] = reminderSettings.time.split(':').map(Number)
        const reminderTime = new Date(now)
        reminderTime.setHours(hour, minute, 0, 0)
        
        if (reminderTime > now) {
          nextDay = checkDay
          daysUntilNext = 0
          break
        }
      } else {
        nextDay = checkDay
        daysUntilNext = i
        break
      }
    }
  }
  
  if (!nextDay) return '未设置'
  
  const dayMap: Record<string, string> = {
    Sunday: '周日',
    Monday: '周一',
    Tuesday: '周二',
    Wednesday: '周三',
    Thursday: '周四',
    Friday: '周五',
    Saturday: '周六'
  }
  
  if (daysUntilNext === 0) {
    return `今天 ${reminderSettings.time}`
  } else if (daysUntilNext === 1) {
    return `明天 ${reminderSettings.time}`
  } else {
    return `${dayMap[nextDay]} ${reminderSettings.time}`
  }
}

// 方法
const loadReminderSettings = async () => {
  try {
    const response = await apiRequest('/reminders/settings')
    if (response.status === 'success') {
      const settings = response.data.reminderSettings
      Object.assign(reminderSettings, settings)
      timeValue.value = settings.time
    }
  } catch (error) {
    console.error('加载提醒设置失败:', error)
  }
}

const saveSettings = async () => {
  if (!reminderFormRef.value) return
  
  try {
    const valid = await reminderFormRef.value.validate()
    if (!valid) return
    
    isSaving.value = true
    const response = await apiRequest('/reminders/settings', {
      method: 'PUT',
      body: JSON.stringify(reminderSettings)
    })
    
    if (response.status === 'success') {
      ElMessage.success('提醒设置已保存')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存设置失败')
  } finally {
    isSaving.value = false
  }
}

const handleSwitchChange = () => {
  if (reminderSettings.enabled) {
    // 开启提醒时设置默认值
    if (!reminderSettings.time) {
      reminderSettings.time = '19:00'
      timeValue.value = '19:00'
    }
    if (reminderSettings.days.length === 0) {
      reminderSettings.days = ['Monday', 'Wednesday', 'Friday']
    }
  }
  saveSettings()
}

const handleTimeChange = (value: string | null) => {
  reminderSettings.time = value || ''
}

const handleDaysChange = () => {
  // 自动保存
  setTimeout(saveSettings, 500)
}

const handleMessageChange = () => {
  // 自动保存
  setTimeout(saveSettings, 1000)
}

const handleSoundChange = () => {
  saveSettings()
}

const applyPreset = (preset: any) => {
  reminderSettings.time = preset.time
  reminderSettings.days = [...preset.days]
  timeValue.value = preset.time
  
  ElMessage.success(`已应用${preset.name}设置`)
  saveSettings()
}

const testReminder = async () => {
  try {
    const response = await apiRequest('/reminders/test', {
      method: 'POST'
    })
    
    if (response.status === 'success') {
      const testData = response.data.testReminder
      
      // 如果浏览器支持通知API，发送测试通知
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(testData.title, {
          body: testData.message,
          icon: '/favicon.ico',
          silent: !testData.sound
        })
        
        setTimeout(() => notification.close(), 5000)
      }
      
      ElMessage.success('测试提醒已发送')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '发送测试提醒失败')
  }
}

const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    notificationPermission.value = permission
    
    if (permission === 'granted') {
      ElMessage.success('通知权限已开启')
    } else if (permission === 'denied') {
      ElMessage.warning('通知权限被拒绝，您可能无法接收到运动提醒')
    }
  } else {
    ElMessage.error('您的浏览器不支持通知功能')
  }
}

// 生命周期
onMounted(() => {
  if (user.value) {
    loadReminderSettings()
  }
  
  // 检查通知权限
  if ('Notification' in window) {
    notificationPermission.value = Notification.permission
  }
})
</script>

<style scoped>
.reminder-page {
  min-height: calc(100vh - 140px);
  background: #f8fafc;
  padding: 40px 20px;
}

.reminder-container {
  max-width: 1400px;
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
.reminder-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
}

.reminder-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.reminder-sidebar {
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
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #2d3748;
}

.header-icon {
  color: #667eea;
  font-size: 1.25rem;
}

.header-title {
  flex: 1;
}

/* 提醒状态 */
.reminder-status {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
}

.status-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.reminder-status.active .status-icon {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
}

.reminder-status.inactive .status-icon {
  background: #e2e8f0;
  color: #a0aec0;
}

.status-info h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.status-info p {
  color: #718096;
  margin: 0;
}

/* 表单样式 */
.form-tip {
  font-size: 0.875rem;
  color: #718096;
  margin: 4px 0 0 0;
}

.sound-label {
  margin-left: 8px;
  color: #4a5568;
}

/* 快速预设 */
.quick-presets {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.preset-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.preset-item:hover {
  background: #e2e8f0;
  transform: translateY(-2px);
}

.preset-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.preset-info {
  flex: 1;
}

.preset-name {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.preset-desc {
  font-size: 0.875rem;
  color: #718096;
  margin: 0 0 8px 0;
}

.preset-details {
  display: flex;
  gap: 12px;
  font-size: 0.75rem;
  color: #a0aec0;
}

/* 提醒预览 */
.preview-content {
  padding: 20px 0;
  text-align: center;
}

.preview-phone {
  margin-bottom: 24px;
}

.phone-screen {
  width: 250px;
  height: 120px;
  margin: 0 auto;
  background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
  border-radius: 16px;
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.notification {
  display: flex;
  gap: 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 12px;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.notification.active {
  opacity: 1;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.notification-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  text-align: left;
}

.notification-title {
  font-weight: 600;
  color: #2d3748;
  font-size: 0.875rem;
  margin-bottom: 2px;
}

.notification-message {
  color: #4a5568;
  font-size: 0.75rem;
  line-height: 1.3;
  margin-bottom: 4px;
}

.notification-time {
  color: #718096;
  font-size: 0.625rem;
}

.notification-sound {
  width: 24px;
  height: 24px;
  background: #48bb78;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75rem;
  flex-shrink: 0;
  align-self: flex-start;
}

.preview-info h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.preview-info p {
  color: #718096;
  margin: 0;
}

.disabled-text {
  color: #a0aec0 !important;
}

/* 统计卡片 */
.stats-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  line-height: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: #718096;
  margin-top: 4px;
}

/* 权限卡片 */
.permission-content {
  padding: 16px 0;
}

.permission-status {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.permission-status.granted {
  background: rgba(72, 187, 120, 0.1);
  border-left: 4px solid #48bb78;
}

.permission-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.permission-status:not(.granted) .permission-icon {
  background: #fed7d7;
  color: #e53e3e;
}

.permission-status.granted .permission-icon {
  background: #c6f6d5;
  color: #38a169;
}

.permission-info h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.permission-info p {
  font-size: 0.875rem;
  color: #718096;
  margin: 0;
}

/* 使用技巧 */
.tips-content {
  padding: 16px 0;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  color: #4a5568;
}

.tips-list li {
  margin-bottom: 12px;
  line-height: 1.5;
  font-size: 0.9rem;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .reminder-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .reminder-sidebar {
    order: -1;
  }
}

@media (max-width: 768px) {
  .reminder-page {
    padding: 20px 15px;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .reminder-status {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .quick-presets {
    gap: 12px;
  }
  
  .preset-item {
    padding: 12px;
  }
  
  .phone-screen {
    width: 200px;
    height: 100px;
    padding: 12px;
  }
  
  .notification {
    padding: 8px;
    gap: 8px;
  }
  
  .notification-icon {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
}

/* Element Plus 样式覆盖 */
:deep(.el-card__header) {
  background: rgba(102, 126, 234, 0.02);
  border-bottom: 1px solid rgba(102, 126, 234, 0.08);
}

:deep(.el-switch.is-checked .el-switch__core) {
  background-color: #667eea;
}

:deep(.el-checkbox.is-checked .el-checkbox__inner) {
  background-color: #667eea;
  border-color: #667eea;
}
</style>
