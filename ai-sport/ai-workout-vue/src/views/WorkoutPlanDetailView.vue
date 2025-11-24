<template>
  <div class="plan-detail-page">
    <div class="plan-container">
      <!-- 返回按钮 -->
      <div class="back-section">
        <el-button @click="goBack" :icon="ArrowLeft" plain>
          返回计划列表
        </el-button>
      </div>

      <!-- 计划信息卡片 -->
      <el-card v-if="plan" class="plan-info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <el-icon class="header-icon"><DocumentCopy /></el-icon>
              <span class="header-title">{{ plan.title }}</span>
            </div>
            <el-tag :type="getStatusType(plan.status)" size="default">
              {{ getStatusText(plan.status) }}
            </el-tag>
          </div>
        </template>

        <div class="plan-overview">
          <div class="plan-description">
            <p>{{ plan.description }}</p>
          </div>
          
          <div class="plan-meta">
            <div class="meta-grid">
              <div class="meta-item">
                <el-icon><Calendar /></el-icon>
                <span>{{ plan.durationWeeks }} 周计划</span>
              </div>
              <div class="meta-item">
                <el-icon><Star /></el-icon>
                <span>{{ getDifficultyText(plan.difficulty) }}</span>
              </div>
              <div class="meta-item">
                <el-icon><Clock /></el-icon>
                <span>每周 {{ plan.weeklyFrequency }} 次</span>
              </div>
              <div class="meta-item">
                <el-icon><TrendCharts /></el-icon>
                <span>{{ plan.progress.completionRate }}% 完成</span>
              </div>
            </div>
          </div>

          <div class="plan-progress">
            <div class="progress-header">
              <span class="progress-label">整体进度</span>
              <span class="progress-value">{{ plan.progress.completedWorkouts }} / {{ plan.progress.totalWorkouts }}</span>
            </div>
            <el-progress 
              :percentage="plan.progress.completionRate" 
              :stroke-width="10"
              :show-text="false"
            />
          </div>

          <div class="plan-actions">
            <el-button 
              v-if="plan.status === 'active'" 
              type="primary" 
              size="large"
              @click="viewTodaysPlan"
              :icon="VideoPlay"
            >
              今日训练
            </el-button>
            <el-button 
              v-if="plan.status === 'draft'" 
              type="primary" 
              size="large"
              @click="startPlan"
              :icon="VideoPlay"
            >
              启动计划
            </el-button>
            <el-button 
              v-if="plan.status === 'paused'" 
              type="success" 
              size="large"
              @click="resumePlan"
              :icon="VideoPlay"
            >
              继续计划
            </el-button>
            <el-button 
              v-if="plan.status === 'active'" 
              type="warning" 
              size="large"
              @click="pausePlan"
              :icon="VideoPause"
            >
              暂停计划
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 计划内容 -->
      <el-card v-if="plan" class="plan-content-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><Calendar /></el-icon>
            <span class="header-title">训练计划</span>
          </div>
        </template>

        <div class="weeks-container">
          <div
            v-for="week in plan.weeks"
            :key="week.weekNumber"
            class="week-section"
            :class="{ 
              active: week.weekNumber === plan.progress.currentWeek,
              completed: week.weekNumber < plan.progress.currentWeek
            }"
          >
            <div class="week-header">
              <h3 class="week-title">第 {{ week.weekNumber }} 周</h3>
              <div class="week-status">
                <el-icon v-if="week.weekNumber < plan.progress.currentWeek"><Check /></el-icon>
                <el-icon v-else-if="week.weekNumber === plan.progress.currentWeek"><VideoPlay /></el-icon>
                <el-icon v-else><Clock /></el-icon>
              </div>
            </div>

            <div class="days-grid">
              <div
                v-for="day in week.days"
                :key="`${week.weekNumber}-${day.dayNumber}`"
                class="day-card"
                :class="{ 
                  'rest-day': day.isRestDay,
                  'current-day': week.weekNumber === plan.progress.currentWeek && day.dayNumber === plan.progress.currentDay,
                  'completed-day': getDayCompletionRate(day) === 100,
                  'in-progress-day': getDayCompletionRate(day) > 0 && getDayCompletionRate(day) < 100,
                  'over-achieved-day': hasOverAchievedDay(day)
                }"
              >
                <div class="day-header">
                  <span class="day-name">{{ getDayName(day.dayName) }}</span>
                  <span class="day-number">第{{ day.dayNumber }}天</span>
                  <!-- 完成度指示器 -->
                  <div v-if="!day.isRestDay" class="completion-indicator">
                    <div class="completion-ring" :class="getCompletionRingClass(day)">
                      <span class="completion-percentage">{{ getDayCompletionRate(day) }}%</span>
                    </div>
                  </div>
                </div>

                <div v-if="day.isRestDay" class="rest-content">
                  <div class="rest-icon">
                    <el-icon><CircleCheck /></el-icon>
                  </div>
                  <p class="rest-text">休息日</p>
                  <p class="rest-note">{{ day.notes || '让身体得到充分恢复' }}</p>
                </div>

                <div v-else class="workouts-content">
                  <div
                    v-for="(workout, index) in day.workouts"
                    :key="index"
                    class="workout-item"
                    :class="{ completed: workout.completedAt }"
                  >
                    <div class="workout-icon">
                      <span class="emoji">{{ getWorkoutEmoji(workout.workoutType) }}</span>
                    </div>
                    <div class="workout-info">
                      <h5 class="workout-name">{{ workout.workoutName }}</h5>
                      <div class="workout-meta">
                        <span class="duration">{{ workout.duration }}</span>
                        <span class="reps">{{ workout.targetReps }} 次</span>
                        <span class="difficulty">{{ '★'.repeat(workout.difficulty) }}</span>
                      </div>
                      
                      <!-- 进度显示 -->
                      <div v-if="workout.progress && workout.progress.completedReps > 0" class="workout-progress">
                        <div class="progress-info">
                          <span class="progress-text">
                            已完成: {{ workout.progress.completedReps }}/{{ workout.targetReps }} 次
                            ({{ workout.progress.completionRate }}%)
                          </span>
                          <span v-if="workout.progress.lastCompletedDate" class="last-completed">
                            最后训练: {{ formatDate(workout.progress.lastCompletedDate) }}
                          </span>
                        </div>
                        <el-progress 
                          :percentage="workout.progress.completionRate"
                          :stroke-width="6"
                          :show-text="false"
                          :color="getProgressColor(workout.progress.completionRate)"
                        />
                      </div>
                      
                      <p v-if="workout.tips" class="workout-tips">{{ workout.tips }}</p>
                    </div>
                    <div class="workout-status">
                      <el-icon v-if="workout.progress && workout.progress.isCompleted"><Check /></el-icon>
                      <el-icon v-else-if="workout.progress && workout.progress.completedReps > 0"><VideoPlay /></el-icon>
                      <el-icon v-else><Clock /></el-icon>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-section">
        <el-skeleton :rows="5" animated />
      </div>

      <!-- 错误状态 -->
      <div v-if="error" class="error-section">
        <el-result icon="error" title="加载失败" :sub-title="error">
          <template #extra>
            <el-button type="primary" @click="loadPlanDetail">重新加载</el-button>
          </template>
        </el-result>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  DocumentCopy,
  Calendar,
  Star,
  Clock,
  TrendCharts,
  VideoPlay,
  VideoPause,
  Check,
  CircleCheck
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { apiRequest } = useAuth()

// 响应式数据
const loading = ref(true)
const error = ref('')
const plan = ref<any>(null)

// 方法
const loadPlanDetail = async () => {
  const planId = route.params.id as string
  if (!planId) {
    error.value = '计划ID无效'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = ''
    const response = await apiRequest(`/plans/${planId}`)
    
    if (response.status === 'success') {
      plan.value = response.data.plan
    } else {
      error.value = response.message || '加载计划失败'
    }
  } catch (err: any) {
    error.value = err.message || '加载计划失败'
  } finally {
    loading.value = false
  }
}

const startPlan = async () => {
  if (!plan.value) return
  
  try {
    const response = await apiRequest(`/plans/${plan.value._id}/start`, {
      method: 'PUT'
    })
    
    if (response.status === 'success') {
      ElMessage.success('计划已启动！')
      plan.value.status = 'active'
      plan.value.startDate = new Date().toISOString()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '启动计划失败')
  }
}

const pausePlan = async () => {
  if (!plan.value) return
  
  try {
    await ElMessageBox.confirm('确定要暂停这个运动计划吗？', '确认暂停', {
      confirmButtonText: '暂停',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await apiRequest(`/plans/${plan.value._id}/pause`, {
      method: 'PUT'
    })
    
    if (response.status === 'success') {
      ElMessage.success('计划已暂停')
      plan.value.status = 'paused'
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '暂停计划失败')
    }
  }
}

const resumePlan = async () => {
  await startPlan()
}

const viewTodaysPlan = async () => {
  if (!plan.value) return
  
  try {
    // 获取今日训练计划
    const response = await apiRequest('/plans/today')
    
    if (response.status === 'success' && response.data.hasActivePlan && response.data.todaysPlan) {
      const todaysPlan = response.data.todaysPlan
      
      if (todaysPlan.isRestDay) {
        ElMessage.info('今天是休息日，无需训练')
        return
      }
      
      if (todaysPlan.workouts && todaysPlan.workouts.length > 0) {
        // 找到第一个未完成的运动
        const nextWorkout = todaysPlan.workouts.find((workout: any) => !workout.completedAt)
        
        if (nextWorkout) {
          // 存储运动信息到 localStorage，供运动页面使用
          const workoutInfo = {
            fromPlan: true,
            planId: plan.value._id,
            workoutType: nextWorkout.workoutType,
            workoutName: nextWorkout.workoutName,
            targetReps: nextWorkout.targetReps,
            duration: nextWorkout.duration,
            difficulty: nextWorkout.difficulty,
            tips: nextWorkout.tips,
            currentProgress: nextWorkout.progress || { completedReps: 0, completedSets: 0 },
            startDate: plan.value.startDate
          }
          localStorage.setItem('currentWorkoutInfo', JSON.stringify(workoutInfo))
          
          // 跳转到运动界面
          router.push({
            path: '/workout/interface',
            query: {
              workout: nextWorkout.workoutType,
              duration: nextWorkout.duration
            }
          })
        } else {
          ElMessage.success('今日训练已全部完成！')
        }
      } else {
        ElMessage.info('今日无训练安排')
      }
    } else {
      ElMessage.warning('暂无今日训练计划')
    }
  } catch (error: any) {
    console.error('获取今日训练计划失败:', error)
    ElMessage.error('获取今日训练计划失败')
  }
}

const goBack = () => {
  router.push('/plans')
}

const getDifficultyText = (difficulty: string) => {
  const map: Record<string, string> = {
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级'
  }
  return map[difficulty] || difficulty
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    draft: 'info',
    active: 'success',
    completed: 'success',
    paused: 'warning',
    cancelled: 'danger'
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    active: '进行中',
    completed: '已完成',
    paused: '已暂停',
    cancelled: '已取消'
  }
  return map[status] || status
}

const getDayName = (dayName: string) => {
  const map: Record<string, string> = {
    Monday: '周一',
    Tuesday: '周二',
    Wednesday: '周三',
    Thursday: '周四',
    Friday: '周五',
    Saturday: '周六',
    Sunday: '周日'
  }
  return map[dayName] || dayName
}

const getWorkoutEmoji = (type: string) => {
  const map: Record<string, string> = {
    'push-up': '💪',
    'squat': '🦵',
    'plank': '🏋️',
    'jumping-jack': '🤸'
  }
  return map[type] || '🏃'
}

const isWorkoutDay = (weekNumber: number, dayNumber: number) => {
  return weekNumber < plan.value?.progress?.currentWeek || 
         (weekNumber === plan.value?.progress?.currentWeek && dayNumber <= plan.value?.progress?.currentDay)
}

const hasCompletedDay = (weekNumber: number, dayNumber: number) => {
  // 这里可以根据实际的完成记录来判断
  return weekNumber < plan.value?.progress?.currentWeek
}

// 获取某一天的完成率
const getDayCompletionRate = (day: any) => {
  if (day.isRestDay) return 100
  if (!day.workouts || day.workouts.length === 0) return 0
  
  const totalWorkouts = day.workouts.length
  const completedWorkouts = day.workouts.filter((workout: any) => {
    return workout.progress && workout.progress.completedReps >= workout.targetReps
  }).length
  
  return Math.round((completedWorkouts / totalWorkouts) * 100)
}

// 判断某一天是否有超额完成
const hasOverAchievedDay = (day: any) => {
  if (day.isRestDay) return false
  if (!day.workouts || day.workouts.length === 0) return false
  
  return day.workouts.some((workout: any) => {
    return workout.progress && workout.progress.completedReps > workout.targetReps
  })
}

// 获取完成度环的样式类
const getCompletionRingClass = (day: any) => {
  const rate = getDayCompletionRate(day)
  const hasOverAchieved = hasOverAchievedDay(day)
  
  if (hasOverAchieved) return 'over-achieved'
  if (rate === 100) return 'completed'
  if (rate >= 50) return 'in-progress'
  if (rate > 0) return 'started'
  return 'not-started'
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}

// 获取进度颜色
const getProgressColor = (percentage: number) => {
  if (percentage >= 100) {
    return '#67c23a' // 绿色
  } else if (percentage >= 70) {
    return '#e6a23c' // 橙色
  } else if (percentage >= 30) {
    return '#409eff' // 蓝色
  } else {
    return '#f56c6c' // 红色
  }
}

// 生命周期
onMounted(() => {
  loadPlanDetail()
})
</script>

<style scoped>
.plan-detail-page {
  min-height: calc(100vh - 140px);
  background: #f8fafc;
  padding: 40px 20px;
}

.plan-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 返回按钮 */
.back-section {
  margin-bottom: 16px;
}

/* 卡片通用样式 */
.el-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
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

/* 计划概览 */
.plan-overview {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.plan-description p {
  color: #718096;
  margin: 0;
  line-height: 1.6;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  color: #4a5568;
}

.meta-item .el-icon {
  color: #667eea;
}

.plan-progress {
  background: #f8fafc;
  padding: 20px;
  border-radius: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-label {
  font-weight: 500;
  color: #4a5568;
}

.progress-value {
  font-weight: 600;
  color: #667eea;
}

.plan-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 周计划 */
.weeks-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 20px 0;
}

.week-section {
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.week-section.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.02);
}

.week-section.completed {
  border-color: #48bb78;
  background: rgba(72, 187, 120, 0.02);
}

.week-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.week-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.week-status {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.week-section.active .week-status {
  background: #667eea;
  color: white;
}

.week-section.completed .week-status {
  background: #48bb78;
  color: white;
}

.week-section:not(.active):not(.completed) .week-status {
  background: #e2e8f0;
  color: #a0aec0;
}

/* 天数网格 */
.days-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.day-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
}

.day-card.current-day {
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.15);
}

.day-card.completed-day {
  border-color: #48bb78;
  background: rgba(72, 187, 120, 0.05);
}

.day-card.rest-day {
  background: #f8fafc;
  border-style: dashed;
}

.day-card.in-progress-day {
  border-color: #f6ad55;
  background: rgba(246, 173, 85, 0.05);
}

.day-card.over-achieved-day {
  border-color: #9f7aea;
  background: rgba(159, 122, 234, 0.05);
  position: relative;
}

.day-card.over-achieved-day::before {
  content: '🎉';
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 16px;
}

.day-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.completion-indicator {
  align-self: flex-end;
}

.completion-ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid;
  position: relative;
}

.completion-ring.not-started {
  border-color: #e2e8f0;
  background: #f7fafc;
  color: #a0aec0;
}

.completion-ring.started {
  border-color: #fbd38d;
  background: #fffaf0;
  color: #d69e2e;
}

.completion-ring.in-progress {
  border-color: #f6ad55;
  background: #fffaf0;
  color: #dd6b20;
}

.completion-ring.completed {
  border-color: #48bb78;
  background: #f0fff4;
  color: #38a169;
}

.completion-ring.over-achieved {
  border-color: #9f7aea;
  background: #faf5ff;
  color: #805ad5;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.completion-percentage {
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
}

.day-name {
  font-weight: 600;
  color: #2d3748;
}

.day-number {
  font-size: 0.875rem;
  color: #718096;
}

/* 休息日 */
.rest-content {
  text-align: center;
  padding: 20px 0;
}

.rest-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.rest-text {
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.rest-note {
  font-size: 0.875rem;
  color: #718096;
  margin: 0;
}

/* 运动内容 */
.workouts-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workout-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.workout-item.completed {
  background: rgba(72, 187, 120, 0.1);
  border-left: 3px solid #48bb78;
}

.workout-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.workout-info {
  flex: 1;
}

.workout-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 6px 0;
}

.workout-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 0.75rem;
  color: #718096;
}

.workout-progress {
  margin: 8px 0;
  padding: 6px 0;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}

.progress-text {
  font-size: 0.75rem;
  color: #4a5568;
  font-weight: 500;
}

.last-completed {
  font-size: 0.6875rem;
  color: #a0aec0;
}

.workout-tips {
  font-size: 0.75rem;
  color: #a0aec0;
  margin: 0;
  font-style: italic;
}

.workout-status {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.workout-item.completed .workout-status {
  background: #48bb78;
  color: white;
}

.workout-item:not(.completed) .workout-status {
  background: #e2e8f0;
  color: #a0aec0;
}

/* 加载和错误状态 */
.loading-section,
.error-section {
  padding: 40px 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .plan-detail-page {
    padding: 20px 15px;
  }
  
  .meta-grid {
    grid-template-columns: 1fr;
  }
  
  .days-grid {
    grid-template-columns: 1fr;
  }
  
  .plan-actions {
    flex-direction: column;
  }
  
  .plan-actions .el-button {
    width: 100%;
  }
}

/* Element Plus 样式覆盖 */
:deep(.el-card__header) {
  background: rgba(102, 126, 234, 0.02);
  border-bottom: 1px solid rgba(102, 126, 234, 0.08);
}

:deep(.el-progress-bar__outer) {
  background: rgba(102, 126, 234, 0.1);
}

:deep(.el-progress-bar__inner) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
