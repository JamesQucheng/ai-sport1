<template>
  <div class="workout-page">
    <div class="workout-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">开始您的运动</h1>
        <p class="page-subtitle">选择运动类型和训练时长，AI 将为您提供专业指导</p>
      </div>

      <!-- 运动选择卡片 -->
      <el-card class="selection-card" shadow="always">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><Trophy /></el-icon>
            <span class="header-title">运动配置</span>
          </div>
        </template>

        <el-form :model="workoutConfig" class="workout-form" size="large">
          <!-- 运动类型选择 -->
          <el-form-item label="运动类型" class="form-item">
            <div class="workout-types">
              <div
                v-for="workout in workoutTypes"
                :key="workout.type"
                class="workout-type-card"
                :class="{ active: workoutConfig.workout === workout.type }"
                @click="selectWorkout(workout.type)"
              >
                <div class="workout-icon">
                  <span class="icon-emoji">{{ workout.icon }}</span>
                </div>
                <div class="workout-info">
                  <h3 class="workout-name">{{ workout.name }}</h3>
                  <p class="workout-desc">{{ workout.description }}</p>
                  <div class="workout-tags">
                    <el-tag
                      v-for="tag in workout.tags"
                      :key="tag"
                      size="small"
                      type="info"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                </div>
                <div class="selection-indicator">
                  <el-icon v-if="workoutConfig.workout === workout.type"><Check /></el-icon>
                </div>
              </div>
            </div>
          </el-form-item>

          <!-- 训练时长选择 -->
          <el-form-item label="训练时长" class="form-item">
            <div class="duration-options">
              <div
                v-for="duration in durationOptions"
                :key="duration.value"
                class="duration-card"
                :class="{ active: workoutConfig.duration === duration.value }"
                @click="selectDuration(duration.value)"
              >
                <div class="duration-icon">
                  <el-icon><Timer /></el-icon>
                </div>
                <div class="duration-info">
                  <h4 class="duration-title">{{ duration.label }}</h4>
                  <p class="duration-desc">{{ duration.description }}</p>
                  <div class="duration-stats">
                    <span class="stat">约 {{ duration.expectedReps }} 次</span>
                    <span class="stat">{{ duration.calories }} 卡路里</span>
                  </div>
                </div>
                <div class="selection-indicator">
                  <el-icon v-if="workoutConfig.duration === duration.value"><Check /></el-icon>
                </div>
              </div>
            </div>
          </el-form-item>
        </el-form>

        <!-- 开始按钮 -->
        <div class="action-section">
          <el-button
            type="primary"
            size="large"
            :disabled="!canStart"
            @click="startWorkout"
            class="start-button"
          >
            <el-icon><VideoPlay /></el-icon>
            开始训练
          </el-button>
          
          <div class="tips">
            <el-alert
              title="训练提示"
              type="info"
              :closable="false"
              show-icon
            >
              <template #default>
                <ul class="tip-list">
                  <li>请确保摄像头工作正常，光线充足</li>
                  <li>穿着运动服装，确保动作不受限制</li>
                  <li>保持安全距离，避免碰撞周围物品</li>
                  <li>如有身体不适，请立即停止训练</li>
                </ul>
              </template>
            </el-alert>
          </div>
        </div>
      </el-card>

      <!-- 运动记录快捷入口 -->
      <el-card class="history-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><DataAnalysis /></el-icon>
            <span class="header-title">运动记录</span>
          </div>
        </template>

        <div class="history-content">
          <div v-if="recentWorkouts.length > 0" class="recent-workouts">
            <h4>最近的训练</h4>
            <div class="recent-list">
              <div
                v-for="workout in recentWorkouts.slice(0, 3)"
                :key="workout._id"
                class="recent-item"
              >
                <div class="recent-icon">
                  <span>{{ getWorkoutIcon(workout.workoutType) }}</span>
                </div>
                <div class="recent-info">
                  <span class="recent-name">{{ workout.workoutName }}</span>
                  <span class="recent-stats">{{ workout.totalReps }} 次 · {{ formatDuration(workout.actualDuration) }}</span>
                </div>
                <div class="recent-date">
                  {{ formatDate(workout.createdAt) }}
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="no-history">
            <el-icon class="no-history-icon"><DocumentCopy /></el-icon>
            <p>还没有运动记录</p>
            <p class="no-history-tip">完成首次训练后，这里将显示您的运动历史</p>
          </div>
          
          <el-button @click="viewAllHistory" link class="view-all-btn">
            查看全部记录
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Trophy,
  Timer,
  VideoPlay,
  DataAnalysis,
  Check,
  DocumentCopy,
  ArrowRight
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, apiRequest } = useAuth()

// 响应式数据
const workoutConfig = reactive({
  workout: '',
  duration: ''
})

const recentWorkouts = ref<any[]>([])

// 运动类型配置
const workoutTypes = [
  {
    type: 'push-up',
    name: '俯卧撑',
    icon: '💪',
    description: '锻炼胸肌、肩膀和三头肌的经典动作',
    tags: ['胸肌', '肩膀', '上肢']
  },
  {
    type: 'squat',
    name: '深蹲',
    icon: '🦵',
    description: '全身性复合动作，主要锻炼腿部肌群',
    tags: ['腿部', '臀部', '核心']
  }
]

// 训练时长配置
const durationOptions = [
  {
    value: '1分钟',
    label: '1 分钟',
    description: '快速热身，适合初学者',
    expectedReps: 15,
    calories: 8
  },
  {
    value: '3分钟',
    label: '3 分钟',
    description: '标准训练，适合日常锻炼',
    expectedReps: 45,
    calories: 25
  },
  {
    value: '5分钟',
    label: '5 分钟',
    description: '进阶训练，提升运动强度',
    expectedReps: 75,
    calories: 40
  },
  {
    value: '7分钟',
    label: '7 分钟',
    description: '高强度训练，挑战极限',
    expectedReps: 105,
    calories: 60
  }
]

// 计算属性
const canStart = computed(() => {
  return workoutConfig.workout && workoutConfig.duration
})

// 方法
const selectWorkout = (type: string) => {
  workoutConfig.workout = type
}

const selectDuration = (duration: string) => {
  workoutConfig.duration = duration
}

const startWorkout = () => {
  if (!canStart.value) {
    ElMessage.warning('请选择运动类型和训练时长')
    return
  }

  // 跳转到运动界面，传递配置参数
  router.push({
    name: 'WorkoutInterface',
    query: {
      workout: workoutConfig.workout,
      duration: workoutConfig.duration
    }
  })
}

const viewAllHistory = () => {
  router.push('/workout/history')
}

const getWorkoutIcon = (type: string) => {
  const workout = workoutTypes.find(w => w.type === type)
  return workout?.icon || '🏃'
}

const formatDuration = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}秒`
  } else {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}分钟`
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

// 加载最近运动记录
const loadRecentWorkouts = async () => {
  if (!user?.value) return
  
  try {
    const response = await apiRequest('/workouts?limit=5&sortBy=createdAt&sortOrder=desc')
    if (response.status === 'success') {
      recentWorkouts.value = response.data.workouts || []
    }
  } catch (error) {
    console.warn('加载最近运动记录失败:', error)
  }
}

// 生命周期
onMounted(() => {
  // 检查是否从计划页面跳转而来
  const workoutInfo = localStorage.getItem('currentWorkoutInfo')
  if (workoutInfo) {
    try {
      const info = JSON.parse(workoutInfo)
      console.log('从计划获取运动信息:', info)
      
      if (info.fromPlan) {
        // 自动设置运动类型和时长
        workoutConfig.workout = info.workoutType
        workoutConfig.duration = `${info.duration}分钟`
        
        // 显示计划信息
        ElMessage.success(`开始${info.workoutName}训练 - 目标${info.targetReps}次`)
        
        // 可选：自动开始训练
        setTimeout(() => {
          if (canStart.value) {
            startWorkout()
          }
        }, 1500) // 1.5秒后自动开始
        
        // 清除localStorage中的信息，避免重复使用
        localStorage.removeItem('currentWorkoutInfo')
      }
    } catch (error) {
      console.warn('解析运动信息失败:', error)
    }
  } else {
    // 从路由参数获取预设配置（原有逻辑）
    const query = router.currentRoute.value.query
    if (query.type) {
      workoutConfig.workout = query.type as string
    }
  }
  
  // 加载最近运动记录
  if (user?.value) {
    loadRecentWorkouts()
  }
})
</script>

<style scoped>
.workout-page {
  min-height: calc(100vh - 140px);
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
}

.workout-container {
  max-width: 1000px;
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

/* 选择卡片 */
.selection-card {
  border-radius: 20px;
  border: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
}

.header-icon {
  font-size: 1.5rem;
  color: #667eea;
}

.workout-form {
  padding: 20px 0;
}

.form-item {
  margin-bottom: 40px;
}

.form-item :deep(.el-form-item__label) {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 20px;
}

/* 运动类型选择 */
.workout-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.workout-type-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.workout-type-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
}

.workout-type-card.active {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
}

.workout-icon {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
}

.icon-emoji {
  font-size: 2rem;
}

.workout-info {
  flex: 1;
}

.workout-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.workout-desc {
  color: #718096;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.workout-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.selection-indicator {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
}

.workout-type-card.active .selection-indicator {
  opacity: 1;
  transform: scale(1);
}

/* 时长选择 */
.duration-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.duration-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  gap: 16px;
  align-items: center;
}

.duration-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
}

.duration-card.active {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.15);
}

.duration-icon {
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

.duration-info {
  flex: 1;
}

.duration-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 6px 0;
}

.duration-desc {
  color: #718096;
  font-size: 0.9rem;
  margin: 0 0 8px 0;
}

.duration-stats {
  display: flex;
  gap: 12px;
}

.stat {
  font-size: 0.8rem;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
}

.duration-card .selection-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
}

/* 开始按钮区域 */
.action-section {
  margin-top: 40px;
  text-align: center;
}

.start-button {
  width: 200px;
  height: 56px;
  font-size: 1.2rem;
  font-weight: 600;
  border-radius: 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  margin-bottom: 32px;
  transition: all 0.3s ease;
}

.start-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(102, 126, 234, 0.3);
}

.start-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tips {
  max-width: 600px;
  margin: 0 auto;
}

.tip-list {
  margin: 0;
  padding-left: 20px;
  color: #4a5568;
}

.tip-list li {
  margin-bottom: 8px;
  line-height: 1.4;
}

/* 运动记录卡片 */
.history-card {
  border-radius: 20px;
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.history-content {
  padding: 20px 0;
}

.recent-workouts h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 20px 0;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.recent-item:hover {
  background: #e2e8f0;
}

.recent-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.recent-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-name {
  font-weight: 500;
  color: #2d3748;
}

.recent-stats {
  font-size: 0.9rem;
  color: #718096;
}

.recent-date {
  font-size: 0.85rem;
  color: #a0aec0;
  flex-shrink: 0;
}

.no-history {
  text-align: center;
  padding: 40px 20px;
  color: #718096;
}

.no-history-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-history p {
  margin: 0 0 8px 0;
}

.no-history-tip {
  font-size: 0.9rem;
  opacity: 0.8;
}

.view-all-btn {
  margin-top: 16px;
  color: #667eea;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .workout-page {
    padding: 20px 15px;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .workout-types {
    grid-template-columns: 1fr;
  }
  
  .duration-options {
    grid-template-columns: 1fr;
  }
  
  .start-button {
    width: 100%;
    max-width: 300px;
  }
  
  .recent-item {
    padding: 12px;
  }
  
  .recent-date {
    display: none;
  }
}

/* Element Plus 样式覆盖 */
:deep(.el-card__header) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
}

:deep(.el-alert--info) {
  background: rgba(102, 126, 234, 0.05);
  border: 1px solid rgba(102, 126, 234, 0.1);
}

:deep(.el-alert__icon) {
  color: #667eea;
}

:deep(.el-tag--info) {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border: none;
}
</style>