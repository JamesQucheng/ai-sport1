<template>
  <div class="checkin-page">
    <div class="checkin-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">运动签到</h1>
        <p class="page-subtitle">坚持每日签到，养成运动好习惯</p>
      </div>

      <div class="checkin-grid">
        <!-- 左侧：签到区域 -->
        <div class="checkin-main">
          <!-- 今日签到卡片 -->
          <el-card class="today-checkin-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Calendar /></el-icon>
                <span class="header-title">今日签到</span>
                <el-tag v-if="isCheckedInToday" type="success" size="small">已签到</el-tag>
              </div>
            </template>

            <div class="checkin-content">
              <div class="checkin-status">
                <div class="status-icon" :class="{ active: isCheckedInToday }">
                  <el-icon v-if="isCheckedInToday"><Check /></el-icon>
                  <el-icon v-else><Plus /></el-icon>
                </div>
                <div class="status-info">
                  <h3 v-if="isCheckedInToday">今天已签到</h3>
                  <h3 v-else>今天还未签到</h3>
                  <p v-if="isCheckedInToday && todayCheckIn">
                    签到时间：{{ formatTime(todayCheckIn.checkInTime) }}
                  </p>
                  <p v-else>点击按钮完成今日签到</p>
                </div>
              </div>

              <div class="checkin-actions">
                <el-button
                  v-if="!isCheckedInToday"
                  type="primary"
                  size="large"
                  :loading="isCheckingIn"
                  @click="checkIn"
                  class="checkin-btn"
                >
                  <el-icon><Check /></el-icon>
                  立即签到
                </el-button>
                
                <div v-else class="checkin-rewards">
                  <h4>今日奖励</h4>
                  <div class="rewards-display">
                    <div class="reward-item">
                      <el-icon class="reward-icon"><Coin /></el-icon>
                      <span>{{ todayCheckIn?.rewards?.points || 0 }} 积分</span>
                    </div>
                    <div class="reward-item">
                      <el-icon class="reward-icon"><Trophy /></el-icon>
                      <span>{{ todayCheckIn?.rewards?.experience || 0 }} 经验</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 签到统计卡片 -->
          <el-card class="stats-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><DataAnalysis /></el-icon>
                <span class="header-title">签到统计</span>
              </div>
            </template>

            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-icon streak">
                  <el-icon><Lightning /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ stats.currentStreak || 0 }}</div>
                  <div class="stat-label">连续天数</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon total">
                  <el-icon><Calendar /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ stats.totalCheckIns || 0 }}</div>
                  <div class="stat-label">总签到次数</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon points">
                  <el-icon><Coin /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ stats.totalPoints || 0 }}</div>
                  <div class="stat-label">累计积分</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon experience">
                  <el-icon><Trophy /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ stats.totalExperience || 0 }}</div>
                  <div class="stat-label">累计经验</div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 签到日历 -->
          <el-card class="calendar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Calendar /></el-icon>
                <span class="header-title">签到日历</span>
                <div class="calendar-nav">
                  <el-button @click="previousMonth" :icon="ArrowLeft" circle size="small" />
                  <span class="current-month">{{ currentYear }}年{{ currentMonth }}月</span>
                  <el-button @click="nextMonth" :icon="ArrowRight" circle size="small" />
                </div>
              </div>
            </template>

            <div class="calendar-grid">
              <div class="calendar-header">
                <div v-for="day in weekDays" :key="day" class="day-header">{{ day }}</div>
              </div>
              <div class="calendar-body">
                <div
                  v-for="(day, index) in calendarDays"
                  :key="index"
                  class="calendar-day"
                  :class="{
                    'other-month': day.isOtherMonth,
                    'today': day.isToday,
                    'checked-in': day.isCheckedIn,
                    'has-workout': day.hasWorkout
                  }"
                >
                  <span class="day-number">{{ day.day }}</span>
                  <div v-if="day.isCheckedIn" class="checkin-indicator">
                    <el-icon><Check /></el-icon>
                  </div>
                  <div v-if="day.hasWorkout" class="workout-indicator">
                    <el-icon><Trophy /></el-icon>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 右侧：排行榜和历史 -->
        <div class="checkin-sidebar">
          <!-- 排行榜卡片 -->
          <el-card class="leaderboard-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Trophy /></el-icon>
                <span class="header-title">签到排行榜</span>
                <el-select v-model="leaderboardType" size="small" style="width: 100px">
                  <el-option label="连续" value="streak" />
                  <el-option label="总数" value="total" />
                  <el-option label="本月" value="monthly" />
                </el-select>
              </div>
            </template>

            <div class="leaderboard-list">
              <div
                v-for="(item, index) in leaderboard"
                :key="item.user._id"
                class="leaderboard-item"
                :class="{ 'current-user': item.user._id === user?._id }"
              >
                <div class="rank" :class="`rank-${item.rank}`">
                  <span v-if="item.rank <= 3" class="rank-medal">
                    {{ item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉' }}
                  </span>
                  <span v-else>{{ item.rank }}</span>
                </div>
                
                <div class="user-info">
                  <div class="avatar">
                    <img v-if="item.user.avatar" :src="getAvatarUrl(item.user.avatar)" alt="头像" />
                    <el-icon v-else><User /></el-icon>
                  </div>
                  <span class="username">{{ item.user.nickname || item.user.username }}</span>
                </div>
                
                <div class="score">
                  <span class="value">{{ item.value }}</span>
                  <span class="unit">{{ item.label }}</span>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 签到历史 -->
          <el-card class="history-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Clock /></el-icon>
                <span class="header-title">最近签到</span>
              </div>
            </template>

            <div class="history-list">
              <div
                v-for="checkIn in recentCheckIns"
                :key="checkIn._id"
                class="history-item"
              >
                <div class="history-date">
                  <span class="date">{{ formatDate(checkIn.date) }}</span>
                  <span class="time">{{ formatTime(checkIn.checkInTime) }}</span>
                </div>
                
                <div class="history-details">
                  <div class="checkin-type">
                    <el-tag :type="checkIn.type === 'auto' ? 'success' : 'primary'" size="small">
                      {{ checkIn.type === 'auto' ? '运动签到' : '手动签到' }}
                    </el-tag>
                  </div>
                  
                  <div class="rewards">
                    <span class="points">+{{ checkIn.rewards.points }}积分</span>
                    <span class="experience">+{{ checkIn.rewards.experience }}经验</span>
                  </div>
                </div>
                
                <div v-if="checkIn.workoutId" class="workout-info">
                  <el-icon><Trophy /></el-icon>
                  <span>{{ checkIn.workoutId.workoutName }}</span>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 补签功能 -->
          <el-card class="makeup-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><RefreshRight /></el-icon>
                <span class="header-title">补签功能</span>
              </div>
            </template>

            <div class="makeup-content">
              <p class="makeup-desc">忘记签到了？可以补签最近7天的记录</p>
              
              <el-date-picker
                v-model="makeupDate"
                type="date"
                placeholder="选择补签日期"
                :disabled-date="disableMakeupDate"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%; margin-bottom: 16px;"
              />
              
              <el-button
                type="warning"
                :disabled="!makeupDate"
                :loading="isMakingUp"
                @click="makeupCheckIn"
                style="width: 100%;"
              >
                补签 (消耗50积分)
              </el-button>
              
              <p class="makeup-note">
                当前积分：{{ user?.stats?.totalPoints || 0 }}
              </p>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Calendar,
  Check,
  Plus,
  Coin,
  Trophy,
  DataAnalysis,
  Lightning,
  ArrowLeft,
  ArrowRight,
  Clock,
  RefreshRight,
  User
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'

const { user, apiRequest } = useAuth()

// 响应式数据
const isCheckingIn = ref(false)
const isCheckedInToday = ref(false)
const todayCheckIn = ref<any>(null)
const stats = ref<any>({})
const leaderboardType = ref('streak')
const leaderboard = ref<any[]>([])
const recentCheckIns = ref<any[]>([])
const calendar = ref<any>({})
const makeupDate = ref('')
const isMakingUp = ref(false)

// 日历相关
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// 计算属性
const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const firstDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const today = new Date()
  
  const days = []
  
  // 添加上个月的日期
  const prevMonth = new Date(year, month - 2, 0)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonth.getDate() - i
    days.push({
      day,
      date: `${year}-${String(month - 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      isOtherMonth: true,
      isToday: false,
      isCheckedIn: false,
      hasWorkout: false
    })
  }
  
  // 添加当月的日期
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isToday = today.getFullYear() === year && today.getMonth() === month - 1 && today.getDate() === day
    const calendarDay = calendar.value[day]
    
    days.push({
      day,
      date,
      isOtherMonth: false,
      isToday,
      isCheckedIn: calendarDay?.isCheckedIn || false,
      hasWorkout: calendarDay?.hasWorkout || false
    })
  }
  
  // 添加下个月的日期
  const totalCells = 42 // 6周 × 7天
  const remainingCells = totalCells - days.length
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    days.push({
      day,
      date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      isOtherMonth: true,
      isToday: false,
      isCheckedIn: false,
      hasWorkout: false
    })
  }
  
  return days
})

// 方法
const checkIn = async () => {
  if (!user.value) {
    ElMessage.warning('请先登录')
    return
  }
  
  try {
    isCheckingIn.value = true
    const response = await apiRequest('/checkin', {
      method: 'POST',
      body: JSON.stringify({
        type: 'manual',
        note: '手动签到'
      })
    })
    
    if (response.status === 'success') {
      ElMessage.success(response.message)
      await loadCheckInStatus()
      await loadStats()
      await loadCalendar()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '签到失败')
  } finally {
    isCheckingIn.value = false
  }
}

const loadCheckInStatus = async () => {
  try {
    const response = await apiRequest('/checkin/status')
    if (response.status === 'success') {
      isCheckedInToday.value = response.data.isCheckedInToday
      todayCheckIn.value = response.data.todayCheckIn
      stats.value = response.data.stats
    }
  } catch (error) {
    console.error('加载签到状态失败:', error)
  }
}

const loadLeaderboard = async () => {
  try {
    const response = await apiRequest(`/checkin/leaderboard?type=${leaderboardType.value}&limit=10`)
    if (response.status === 'success') {
      leaderboard.value = response.data.leaderboard
    }
  } catch (error) {
    console.error('加载排行榜失败:', error)
  }
}

const loadRecentCheckIns = async () => {
  try {
    const response = await apiRequest('/checkin/history?limit=5')
    if (response.status === 'success') {
      recentCheckIns.value = response.data.checkIns
    }
  } catch (error) {
    console.error('加载签到历史失败:', error)
  }
}

const loadCalendar = async () => {
  try {
    const response = await apiRequest(`/checkin/calendar?year=${currentYear.value}&month=${currentMonth.value}`)
    if (response.status === 'success') {
      calendar.value = response.data.calendar
    }
  } catch (error) {
    console.error('加载签到日历失败:', error)
  }
}

const previousMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const makeupCheckIn = async () => {
  if (!makeupDate.value) {
    ElMessage.warning('请选择补签日期')
    return
  }
  
  if ((user.value?.stats?.totalPoints || 0) < 50) {
    ElMessage.error('积分不足，补签需要50积分')
    return
  }
  
  try {
    isMakingUp.value = true
    const response = await apiRequest('/checkin/makeup', {
      method: 'POST',
      body: JSON.stringify({
        date: makeupDate.value,
        note: '补签记录'
      })
    })
    
    if (response.status === 'success') {
      ElMessage.success(response.message)
      makeupDate.value = ''
      await loadCheckInStatus()
      await loadCalendar()
      await loadRecentCheckIns()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '补签失败')
  } finally {
    isMakingUp.value = false
  }
}

const disableMakeupDate = (date: Date) => {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  // 只能补签最近7天，且不能是今天或未来的日期
  return date >= today || date < sevenDaysAgo
}

const formatTime = (timeString: string) => {
  return new Date(timeString).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00.000Z')
  const today = new Date()
  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
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

// 监听器
watch([currentYear, currentMonth], () => {
  loadCalendar()
})

watch(leaderboardType, () => {
  loadLeaderboard()
})

// 生命周期
onMounted(() => {
  if (user.value) {
    loadCheckInStatus()
    loadLeaderboard()
    loadRecentCheckIns()
    loadCalendar()
  }
})
</script>

<style scoped>
.checkin-page {
  min-height: calc(100vh - 140px);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  position: relative;
  overflow-x: hidden;
}

.checkin-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60vh;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 0 0 50px 50px;
  z-index: 0;
}

.checkin-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
  position: relative;
  z-index: 1;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 3rem;
  font-weight: 800;
  color: white;
  margin: 0 0 16px 0;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.5;
  font-weight: 300;
}

/* 网格布局 */
.checkin-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
}

.checkin-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.checkin-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 卡片通用样式 */
.el-card {
  border-radius: 20px;
  border: none;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.el-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
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

/* 今日签到卡片 */
.checkin-content {
  padding: 20px 0;
}

.checkin-status {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
}

.status-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #a0aec0;
  transition: all 0.3s ease;
}

.status-icon.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: scale(1.1);
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

.checkin-btn {
  width: 200px;
  height: 56px;
  font-size: 1.2rem;
  font-weight: 600;
  border-radius: 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.checkin-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(102, 126, 234, 0.3);
}

.checkin-rewards h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 16px 0;
}

.rewards-display {
  display: flex;
  gap: 20px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f7fafc;
  border-radius: 12px;
  color: #4a5568;
  font-weight: 500;
}

.reward-icon {
  color: #667eea;
  font-size: 1.25rem;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: #e2e8f0;
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.stat-icon.streak {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.total {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
}

.stat-icon.points {
  background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
}

.stat-icon.experience {
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
}

.stat-content {
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

/* 日历 */
.calendar-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-month {
  font-weight: 600;
  color: #2d3748;
}

.calendar-grid {
  padding: 20px 0;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.day-header {
  text-align: center;
  font-weight: 600;
  color: #718096;
  padding: 8px;
}

.calendar-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.calendar-day {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.calendar-day.other-month {
  color: #a0aec0;
}

.calendar-day.today {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  font-weight: 600;
}

.calendar-day.checked-in {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.day-number {
  font-size: 0.875rem;
  font-weight: 500;
}

.checkin-indicator,
.workout-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  background: #48bb78;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: white;
}

.workout-indicator {
  background: #ed8936;
  top: 2px;
  left: 2px;
}

/* 排行榜 */
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.leaderboard-item:hover {
  background: #e2e8f0;
}

.leaderboard-item.current-user {
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.rank {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: 50%;
  background: #e2e8f0;
  color: #4a5568;
  flex-shrink: 0;
}

.rank-medal {
  font-size: 1.2rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e2e8f0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.username {
  font-weight: 500;
  color: #2d3748;
}

.score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.value {
  font-weight: 600;
  color: #667eea;
}

.unit {
  font-size: 0.75rem;
  color: #718096;
}

/* 历史记录 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.history-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.history-item:hover {
  background: #e2e8f0;
}

.history-date {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.date {
  font-weight: 500;
  color: #2d3748;
}

.time {
  font-size: 0.875rem;
  color: #718096;
}

.history-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.rewards {
  display: flex;
  gap: 8px;
  font-size: 0.875rem;
}

.points {
  color: #667eea;
}

.experience {
  color: #48bb78;
}

.workout-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  color: #718096;
}

/* 补签功能 */
.makeup-content {
  padding: 16px 0;
}

.makeup-desc {
  color: #718096;
  margin: 0 0 16px 0;
  font-size: 0.9rem;
}

.makeup-note {
  font-size: 0.875rem;
  color: #4a5568;
  margin: 8px 0 0 0;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .checkin-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .checkin-sidebar {
    order: -1;
  }
  
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .checkin-page {
    padding: 20px 15px;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .checkin-status {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .calendar-body {
    gap: 4px;
  }
  
  .rewards-display {
    flex-direction: column;
    gap: 12px;
  }
}

/* Element Plus 样式覆盖 */
:deep(.el-card__header) {
  background: rgba(102, 126, 234, 0.02);
  border-bottom: 1px solid rgba(102, 126, 234, 0.08);
}
</style>
