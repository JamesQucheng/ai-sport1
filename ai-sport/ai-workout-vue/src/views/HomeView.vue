<template>
  <div class="home-page">
    <!-- 英雄区域 -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            让 AI 成为您的
            <span class="highlight">私人健身教练</span>
          </h1>
          <p class="hero-subtitle">
            基于 MediaPipe 的专业姿态识别，精准追踪与记录每一次训练，让您的居家健身更安全、更高效。
          </p>
          <div class="hero-actions">
            <el-button type="primary" size="large" @click="startWorkout" class="start-btn">
              <el-icon><VideoPlay /></el-icon>
              立即开始运动
            </el-button>
            <el-button size="large" @click="viewHistory" class="history-btn">
              <el-icon><DataAnalysis /></el-icon>
              查看运动记录
            </el-button>
          </div>
        </div>
        <div class="hero-image">
          <div class="floating-card">
            <el-icon class="card-icon"><TrendCharts /></el-icon>
            <div class="card-content">
              <h4>智能分析</h4>
              <p>AI 实时检测运动姿态</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 统计概览 -->
    <section v-if="user" class="stats-section">
      <div class="stats-container">
        <h2 class="section-title">您的运动概览</h2>
        <div class="stats-grid">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon total">
                <el-icon><Trophy /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ userStats.totalWorkouts || 0 }}</h3>
                <p>总运动次数</p>
              </div>
            </div>
          </el-card>
          
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon duration">
                <el-icon><Timer /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ formatDuration(userStats.totalDuration || 0) }}</h3>
                <p>总运动时长</p>
              </div>
            </div>
          </el-card>
          
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon streak">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ userStats.streak || 0 }}</h3>
                <p>连续运动天数</p>
              </div>
            </div>
          </el-card>
          
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon reps">
                <el-icon><DataAnalysis /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ userStats.totalReps || 0 }}</h3>
                <p>总重复次数</p>
              </div>
            </div>
          </el-card>
          
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon calories">
                <el-icon><Lightning /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ Math.round(userStats.totalCalories || 0) }}</h3>
                <p>消耗卡路里</p>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </section>

    <!-- 功能特色 -->
    <section class="features-section">
      <div class="features-container">
        <h2 class="section-title">为什么选择我们？</h2>
        <div class="features-grid">
          <el-card class="feature-card" shadow="hover">
            <div class="feature-icon ai">
              <el-icon><Star /></el-icon>
            </div>
            <h3>AI 智能识别</h3>
            <p>先进的计算机视觉技术，实时识别运动姿态，准确率高达98%以上</p>
          </el-card>
          
          <el-card class="feature-card" shadow="hover">
            <div class="feature-icon realtime">
              <el-icon><View /></el-icon>
            </div>
            <h3>实时反馈</h3>
            <p>即时纠正不规范动作，语音提示配合视觉指导，让运动更安全有效</p>
          </el-card>
          
          <el-card class="feature-card" shadow="hover">
            <div class="feature-icon analysis">
              <el-icon><PieChart /></el-icon>
            </div>
            <h3>数据分析</h3>
            <p>详细的运动数据统计和分析，帮助您了解运动效果，制定更好的计划</p>
          </el-card>
          
          <el-card class="feature-card" shadow="hover">
            <div class="feature-icon plan">
              <el-icon><DataAnalysis /></el-icon>
            </div>
            <h3>记录留存</h3>
            <p>完整保存训练轨迹与成绩，让每一次运动都能被追溯与分析</p>
          </el-card>
        </div>
      </div>
    </section>

    <!-- 运动类型 -->
    <section class="workouts-section">
      <div class="workouts-container">
        <h2 class="section-title">支持的运动类型</h2>
        <div class="workouts-grid">
          <el-card 
            v-for="workout in workoutTypes" 
            :key="workout.type"
            class="workout-card" 
            shadow="hover"
            @click="selectWorkout(workout.type)"
          >
            <div class="workout-icon">
              <span class="icon-emoji">{{ workout.icon }}</span>
            </div>
            <h3>{{ workout.name }}</h3>
            <p>{{ workout.description }}</p>
            <div class="workout-benefits">
              <el-tag 
                v-for="benefit in workout.benefits" 
                :key="benefit"
                size="small"
                type="info"
              >
                {{ benefit }}
              </el-tag>
            </div>
          </el-card>
        </div>
      </div>
    </section>

    <!-- 最近运动记录 -->
    <section v-if="user && recentWorkouts.length > 0" class="recent-section">
      <div class="recent-container">
        <div class="recent-header">
          <h2 class="section-title">最近的运动</h2>
          <el-button @click="viewHistory" link>
            查看全部
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
        <div class="recent-list">
          <el-card 
            v-for="workout in recentWorkouts.slice(0, 3)" 
            :key="workout._id"
            class="recent-card" 
            shadow="hover"
          >
            <div class="recent-content">
              <div class="recent-icon">
                <span>{{ getWorkoutIcon(workout.workoutType) }}</span>
              </div>
              <div class="recent-info">
                <h4>{{ workout.workoutName }}</h4>
                <p>{{ formatDate(workout.createdAt) }}</p>
              </div>
              <div class="recent-stats">
                <span class="stat">{{ workout.totalReps }} 次</span>
                <span class="stat">{{ formatDuration(workout.actualDuration) }}</span>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </section>

    <!-- 快捷功能导航 -->
    <section v-if="user" class="quick-nav-section">
      <div class="quick-nav-container">
        <h2 class="section-title">快捷功能</h2>
        <div class="quick-nav-grid">
          <el-card class="nav-card" shadow="hover" @click="startWorkout">
            <div class="nav-icon workout">
              <el-icon><VideoPlay /></el-icon>
            </div>
            <h3>开始运动</h3>
            <p>立即开始AI智能运动</p>
          </el-card>

          <el-card class="nav-card" shadow="hover" @click="viewHistory">
            <div class="nav-icon history">
              <el-icon><DataAnalysis /></el-icon>
            </div>
            <h3>运动记录</h3>
            <p>查看完整的数据留存</p>
          </el-card>
        </div>
      </div>
    </section>

    <!-- CTA 区域 -->
    <section class="cta-section">
      <div class="cta-container">
        <h2>准备好开始您的健身之旅了吗？</h2>
        <p>加入数千名用户，体验 AI 驱动的智能健身</p>
        <el-button type="primary" size="large" @click="startWorkout" class="cta-btn">
          <el-icon><VideoPlay /></el-icon>
          立即开始
        </el-button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  VideoPlay,
  DataAnalysis,
  TrendCharts,
  Trophy,
  Timer,
  Calendar,
  Star,
  View,
  PieChart,
  ArrowRight,
  Lightning
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, apiRequest } = useAuth()

// 响应式数据
const userStats = ref({
  totalWorkouts: 0,
  totalDuration: 0,
  streak: 0,
  totalReps: 0,
  totalCalories: 0
})
const recentWorkouts = ref<any[]>([])

// 运动类型数据
const workoutTypes = [
  {
    type: 'push-up',
    name: '俯卧撑',
    icon: '💪',
    description: '锻炼胸肌、肩膀和三头肌的经典动作',
    benefits: ['胸肌', '肩膀', '三头肌']
  },
  {
    type: 'squat',
    name: '深蹲',
    icon: '🦵',
    description: '全身性复合动作，主要锻炼腿部肌群',
    benefits: ['腿部', '臀部', '核心']
  },
  {
    type: 'bend',
    name: '弯腰',
    icon: '🙇',
    description: '提升腰背灵活性与腿后侧拉伸',
    benefits: ['腰背', '灵活性', '腘绳肌']
  }
]

// 方法
const startWorkout = () => {
  router.push('/workout')
}

const viewHistory = () => {
  router.push('/workout/history')
}

const selectWorkout = (workoutType: string) => {
  router.push(`/workout?type=${workoutType}`)
}

const formatDuration = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}分钟`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

const getWorkoutIcon = (type: string) => {
  const workout = workoutTypes.find(w => w.type === type)
  return workout?.icon || '🏃'
}

// 加载用户统计数据
const loadUserStats = async () => {
  if (!user?.value) return
  
  try {
    const response = await apiRequest('/workouts/stats/overview')
    if (response.status === 'success') {
      userStats.value = {
        totalWorkouts: response.data.overview?.totalWorkouts || 0,
        totalDuration: response.data.overview?.totalDuration || 0,
        streak: response.data.overview?.currentStreak || 0,
        totalReps: response.data.overview?.totalReps || 0,
        totalCalories: response.data.overview?.totalCalories || 0
      }
    }
  } catch (error) {
    console.warn('加载统计数据失败:', error)
  }
}

// 加载最近运动记录
const loadRecentWorkouts = async () => {
  if (!user?.value) return
  
  try {
    const response = await apiRequest('/workouts?limit=3&sortBy=createdAt&sortOrder=desc')
    if (response.status === 'success') {
      recentWorkouts.value = response.data.workouts || []
    }
  } catch (error) {
    console.warn('加载最近运动记录失败:', error)
  }
}

// 生命周期
onMounted(() => {
  if (user?.value) {
    loadUserStats()
    loadRecentWorkouts()
  }
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

/* 英雄区域 */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80px 20px;
  min-height: 70vh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
  opacity: 0.3;
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero-text {
  color: white;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 24px;
}

.highlight {
  background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 40px;
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.start-btn {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  border: none;
  padding: 12px 32px;
  font-size: 1.1rem;
  border-radius: 50px;
  box-shadow: 0 8px 32px rgba(0, 184, 148, 0.3);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 184, 148, 0.4);
}

.history-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 12px 32px;
  font-size: 1.1rem;
  border-radius: 50px;
  backdrop-filter: blur(10px);
}

.history-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.hero-image {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.floating-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  display: flex;
  align-items: center;
  gap: 20px;
  animation: float 6s ease-in-out infinite;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
}

.card-icon {
  font-size: 3rem;
  color: #ffeaa7;
}

.card-content h4 {
  color: white;
  font-size: 1.25rem;
  margin-bottom: 8px;
}

.card-content p {
  color: rgba(255, 255, 255, 0.8);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

/* 统计区域 */
.stats-section {
  padding: 80px 20px;
  background: white;
}

.stats-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.stat-card {
  text-align: center;
  transition: all 0.3s ease;
  border-radius: 16px;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
}

.stat-icon.total {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.duration {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.streak {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon.reps {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-info h3 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: #2d3748;
}

.stat-info p {
  color: #718096;
  font-size: 0.9rem;
}

/* 功能特色区域 */
.features-section {
  padding: 80px 20px;
  background: #f8fafc;
}

.features-container {
  max-width: 1200px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}

.feature-card {
  text-align: center;
  padding: 40px 24px;
  border-radius: 20px;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.feature-card:hover {
  transform: translateY(-12px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  font-size: 2rem;
  color: white;
}

.feature-icon.ai {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.feature-icon.realtime {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.feature-icon.analysis {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.feature-icon.plan {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.feature-card h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #2d3748;
}

.feature-card p {
  color: #718096;
  line-height: 1.6;
}

/* 运动类型区域 */
.workouts-section {
  padding: 80px 20px;
  background: white;
}

.workouts-container {
  max-width: 1200px;
  margin: 0 auto;
}

.workouts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.workout-card {
  text-align: center;
  padding: 32px 24px;
  border-radius: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
}

.workout-card:hover {
  transform: translateY(-8px);
  border-color: #667eea;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
}

.workout-icon {
  margin-bottom: 20px;
}

.icon-emoji {
  font-size: 3rem;
}

.workout-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #2d3748;
}

.workout-card p {
  color: #718096;
  margin-bottom: 20px;
  line-height: 1.5;
}

.workout-benefits {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 最近运动区域 */
.recent-section {
  padding: 80px 20px;
  background: #f8fafc;
}

.recent-container {
  max-width: 1200px;
  margin: 0 auto;
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.recent-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}

.recent-card {
  border-radius: 16px;
  transition: all 0.3s ease;
}

.recent-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

.recent-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
}

.recent-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.recent-info {
  flex: 1;
}

.recent-info h4 {
  font-weight: 600;
  margin-bottom: 4px;
  color: #2d3748;
}

.recent-info p {
  color: #718096;
  font-size: 0.9rem;
}

.recent-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: right;
}

.stat {
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 500;
}

/* 快捷功能导航 */
.quick-nav-section {
  padding: 60px 20px;
  background: #f8fafc;
}

.quick-nav-container {
  max-width: 1200px;
  margin: 0 auto;
}

.quick-nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 40px;
}

.nav-card {
  padding: 32px 24px;
  text-align: center;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

.nav-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
}

.nav-icon.workout {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.nav-icon.plans {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
}

.nav-icon.checkin {
  background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
}

.nav-icon.reminders {
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
}

.nav-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.nav-card p {
  color: #718096;
  margin: 0;
  font-size: 0.9rem;
}

/* CTA区域 */
.cta-section {
  padding: 100px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  text-align: center;
  color: white;
}

.cta-container {
  max-width: 600px;
  margin: 0 auto;
}

.cta-container h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 20px;
}

.cta-container p {
  font-size: 1.25rem;
  margin-bottom: 40px;
  opacity: 0.9;
}

.cta-btn {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  border: none;
  padding: 16px 40px;
  font-size: 1.2rem;
  border-radius: 50px;
  box-shadow: 0 12px 40px rgba(0, 184, 148, 0.3);
}

.cta-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 50px rgba(0, 184, 148, 0.4);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: 40px;
    text-align: center;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.1rem;
  }
  
  .hero-actions {
    justify-content: center;
  }
  
  .section-title {
    font-size: 2rem;
  }
  
  .stats-grid,
  .features-grid,
  .workouts-grid {
    grid-template-columns: 1fr;
  }
  
  .recent-header {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .recent-list {
    grid-template-columns: 1fr;
  }
  
  .cta-container h2 {
    font-size: 2rem;
  }
}
</style>
