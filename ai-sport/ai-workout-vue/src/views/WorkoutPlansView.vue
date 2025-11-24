<template>
  <div class="plans-page">
    <div class="plans-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">运动计划</h1>
        <p class="page-subtitle">AI 智能生成个性化运动计划，科学指导您的健身之路</p>
      </div>

      <!-- 活跃计划卡片 -->
      <el-card v-if="activePlan" class="active-plan-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><Trophy /></el-icon>
            <span class="header-title">当前计划</span>
            <el-tag type="success" size="small">进行中</el-tag>
          </div>
        </template>

        <div class="active-plan-content">
          <div class="plan-info">
            <h3 class="plan-title">{{ activePlan.title }}</h3>
            <p class="plan-description">{{ activePlan.description }}</p>

            <div class="plan-meta">
              <div class="meta-item">
                <el-icon><Calendar /></el-icon>
                <span>第 {{ activePlan.progress.currentWeek }} / {{ activePlan.durationWeeks }} 周</span>
              </div>
              <div class="meta-item">
                <el-icon><Star /></el-icon>
                <span>{{ getDifficultyText(activePlan.difficulty) }}</span>
              </div>
              <div class="meta-item">
                <el-icon><Clock /></el-icon>
                <span>每周 {{ activePlan.weeklyFrequency }} 次</span>
              </div>
            </div>
          </div>

          <div class="plan-progress">
            <div class="progress-header">
              <span class="progress-label">完成进度</span>
              <span class="progress-value">{{ activePlan.progress.completionRate }}%</span>
            </div>
            <el-progress
              :percentage="activePlan.progress.completionRate"
              :stroke-width="8"
              :show-text="false"
            />
            <div class="progress-stats">
              <span>{{ activePlan.progress.completedWorkouts }} / {{ activePlan.progress.totalWorkouts }} 项运动</span>
            </div>
          </div>

          <div class="plan-actions">
            <el-button type="primary" @click="viewTodaysPlan" :icon="VideoPlay">
              今日训练
            </el-button>
            <el-button @click="viewPlanDetail(activePlan)" :icon="View">
              查看详情
            </el-button>
            <el-button type="warning" @click="pausePlan(activePlan._id)" :icon="VideoPause">
              暂停计划
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 今日训练计划 -->
      <el-card v-if="todaysPlan" class="today-plan-card" shadow="never">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <el-icon class="header-icon"><Calendar /></el-icon>
              <span class="header-title">今日训练</span>
              <el-tag v-if="todaysPlan.isRestDay" type="info" size="small">休息日</el-tag>
            </div>
            <div v-if="!todaysPlan.isRestDay" class="daily-stats">
              <div class="stat-item">
                <span class="stat-value">{{ getDailyCompletionRate() }}%</span>
                <span class="stat-label">完成度</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ getTotalCompletedReps() }}</span>
                <span class="stat-label">总次数</span>
              </div>
            </div>
          </div>
        </template>

        <div v-if="todaysPlan.isRestDay" class="rest-day">
          <div class="rest-icon">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <h3>今天是休息日</h3>
          <p>{{ todaysPlan.notes || '让身体得到充分休息，为明天的训练做好准备' }}</p>
        </div>

        <div v-else class="today-workouts">
          <div
            v-for="(workout, index) in todaysPlan.workouts"
            :key="index"
            class="workout-item"
            :class="{
              completed: workout.completedAt,
              'in-progress': workout.progress && workout.progress.completedReps > 0 && !workout.completedAt,
              'clickable': canStartWorkout(index)
            }"
            @click="startSpecificWorkout(workout, index)"
          >
            <div class="workout-icon">
              <span class="emoji">{{ getWorkoutEmoji(workout.workoutType) }}</span>
            </div>

            <div class="workout-info">
              <h4 class="workout-name">{{ workout.workoutName }}</h4>
              <div class="workout-details">
                <span class="duration">{{ workout.duration }} 分钟</span>
                <span class="reps">目标: {{ workout.targetReps }} 次</span>
                <span class="difficulty">难度: {{ '★'.repeat(workout.difficulty) }}</span>
              </div>

              <!-- 进度显示 -->
              <div v-if="workout.progress && workout.progress.completedReps > 0" class="workout-progress">
                <div class="progress-header">
                  <span class="progress-label">完成进度</span>
                  <span class="progress-percentage">{{ workout.progress.completionRate || Math.round((workout.progress.completedReps / workout.targetReps) * 100) }}%</span>
                </div>
                <el-progress
                  :percentage="workout.progress.completionRate || Math.round((workout.progress.completedReps / workout.targetReps) * 100)"
                  :stroke-width="8"
                  :show-text="false"
                  :color="getProgressColor(workout.progress.completionRate || Math.round((workout.progress.completedReps / workout.targetReps) * 100))"
                />
                <div class="progress-details">
                  <span class="progress-text">
                    已完成: {{ workout.progress.completedReps }}/{{ workout.targetReps }} 次
                  </span>
                  <span v-if="workout.progress.lastCompletedDate" class="last-completed">
                    最后训练: {{ formatDate(workout.progress.lastCompletedDate) }}
                  </span>
                  <span v-if="workout.progress.completedReps >= workout.targetReps" class="completed-badge">
                    <el-icon><Check /></el-icon> 已达标
                  </span>
                  <span v-else class="remaining-reps">
                    还需: {{ workout.targetReps - workout.progress.completedReps }} 次
                  </span>
                </div>
              </div>

              <!-- 未开始的运动 -->
              <div v-else-if="!workout.progress || workout.progress.completedReps === 0" class="workout-not-started">
                <el-icon class="start-icon"><VideoPlay /></el-icon>
                <span class="start-text">点击开始训练</span>
              </div>

              <p v-if="workout.tips" class="workout-tips">{{ workout.tips }}</p>
            </div>

            <div class="workout-actions">
              <el-tag v-if="isWorkoutCompleted(workout)" type="success" :icon="Check">
                {{ getCompletionText(workout) }}
              </el-tag>
              <el-tag v-else-if="!canStartWorkout(index)" type="info" :icon="Lock">等待中</el-tag>
              <el-tag v-else-if="workout.progress && workout.progress.completedReps > 0" type="warning" :icon="VideoPlay">进行中</el-tag>
              <el-tag v-else type="info" :icon="VideoPlay">待训练</el-tag>
            </div>
          </div>

          <!-- 鼓励话语 -->
          <div v-if="getEncouragementMessage()" class="encouragement-section">
            <div class="encouragement-card">
              <div class="encouragement-icon">
                <el-icon><Trophy /></el-icon>
              </div>
              <div class="encouragement-content">
                <h4 class="encouragement-title">{{ getEncouragementTitle() }}</h4>
                <p class="encouragement-message">{{ getEncouragementMessage() }}</p>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 计划列表和生成器 -->
      <div class="plans-grid">
        <!-- 左侧：计划列表 -->
        <div class="plans-main">
          <!-- 筛选器 -->
          <el-card class="filter-card" shadow="never">
            <el-form :model="filters" class="filter-form" :inline="true" size="default">
              <el-form-item label="状态">
                <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 120px">
                  <el-option label="全部" value="" />
                  <el-option label="草稿" value="draft" />
                  <el-option label="进行中" value="active" />
                  <el-option label="已完成" value="completed" />
                  <el-option label="已暂停" value="paused" />
                  <el-option label="已取消" value="cancelled" />
                </el-select>
              </el-form-item>

              <el-form-item label="难度">
                <el-select v-model="filters.difficulty" placeholder="全部难度" clearable style="width: 120px">
                  <el-option label="全部" value="" />
                  <el-option label="初级" value="beginner" />
                  <el-option label="中级" value="intermediate" />
                  <el-option label="高级" value="advanced" />
                </el-select>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="loadPlans" :icon="Search">筛选</el-button>
                <el-button @click="resetFilters" :icon="RefreshRight">重置</el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 计划列表 -->
          <el-card class="plans-list-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><DocumentCopy /></el-icon>
                <span class="header-title">我的计划</span>
                <el-tag type="info" size="small">{{ pagination.total }} 个计划</el-tag>
              </div>
            </template>

            <div v-if="loading" class="loading-section">
              <el-skeleton :rows="3" animated />
            </div>

            <div v-else-if="plans.length === 0" class="empty-section">
              <el-empty description="暂无运动计划">
                <template #image>
                  <el-icon class="empty-icon"><DocumentCopy /></el-icon>
                </template>
                <el-button type="primary" @click="showGenerateDialog = true">
                  生成第一个计划
                </el-button>
              </el-empty>
            </div>

            <div v-else class="plans-list">
              <div
                v-for="plan in plans"
                :key="plan._id"
                class="plan-item"
                @click="viewPlanDetail(plan)"
              >
                <div class="plan-main">
                  <div class="plan-icon">
                    <el-icon><DocumentCopy /></el-icon>
                  </div>

                  <div class="plan-content">
                    <div class="plan-header">
                      <h3 class="plan-title">{{ plan.title }}</h3>
                      <el-tag :type="getStatusType(plan.status)" size="small">
                        {{ getStatusText(plan.status) }}
                      </el-tag>
                    </div>

                    <p class="plan-description">{{ plan.description }}</p>

                    <div class="plan-meta">
                      <span class="meta-item">
                        <el-icon><Calendar /></el-icon>
                        {{ plan.durationWeeks }} 周
                      </span>
                      <span class="meta-item">
                        <el-icon><Star /></el-icon>
                        {{ getDifficultyText(plan.difficulty) }}
                      </span>
                      <span class="meta-item">
                        <el-icon><Clock /></el-icon>
                        每周 {{ plan.weeklyFrequency }} 次
                      </span>
                      <span class="meta-item">
                        <el-icon><TrendCharts /></el-icon>
                        {{ plan.progress.completionRate }}% 完成
                      </span>
                    </div>
                  </div>
                </div>

                <div class="plan-actions" @click.stop>
                  <el-dropdown @command="(cmd: string) => handlePlanAction(cmd, plan)" trigger="click">
                    <el-button type="text" :icon="MoreFilled" circle />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="view" :icon="View">查看详情</el-dropdown-item>
                        <el-dropdown-item v-if="plan.status === 'draft'" command="start" :icon="VideoPlay">启动计划</el-dropdown-item>
                        <el-dropdown-item v-if="plan.status === 'active'" command="pause" :icon="VideoPause">暂停计划</el-dropdown-item>
                        <el-dropdown-item v-if="plan.status === 'paused'" command="resume" :icon="VideoPlay">继续计划</el-dropdown-item>
                        <el-dropdown-item command="share" :icon="Share">分享计划</el-dropdown-item>
                        <el-dropdown-item command="delete" :icon="Delete" divided>删除计划</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
            </div>

            <!-- 分页 -->
            <div v-if="plans.length > 0" class="pagination-section">
              <el-pagination
                v-model:current-page="pagination.page"
                v-model:page-size="pagination.limit"
                :total="pagination.total"
                :page-sizes="[5, 10, 20]"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="loadPlans"
                @current-change="loadPlans"
              />
            </div>
          </el-card>
        </div>

        <!-- 右侧：计划生成器 -->
        <div class="plans-sidebar">
          <!-- 生成计划卡片 -->
          <el-card class="generate-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Star /></el-icon>
                <span class="header-title">AI 计划生成</span>
              </div>
            </template>

            <div class="generate-content">
              <p class="generate-desc">基于您的身体数据和运动目标，AI 将为您量身定制个性化运动计划</p>

              <el-button
                type="primary"
                size="large"
                @click="showGenerateDialog = true"
                :icon="Star"
                style="width: 100%;"
              >
                生成新计划
              </el-button>
            </div>
          </el-card>

          <!-- 计划模板 -->
          <el-card class="templates-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Collection /></el-icon>
                <span class="header-title">热门模板</span>
              </div>
            </template>

            <div class="templates-list">
              <div
                v-for="template in popularTemplates"
                :key="template.id"
                class="template-item"
                @click="useTemplate(template)"
              >
                <div class="template-icon">{{ template.icon }}</div>
                <div class="template-info">
                  <h4 class="template-name">{{ template.name }}</h4>
                  <p class="template-desc">{{ template.description }}</p>
                  <div class="template-meta">
                    <span>{{ template.duration }}周</span>
                    <span>{{ template.difficulty }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 生成计划对话框 -->
    <el-dialog v-model="showGenerateDialog" title="生成运动计划" width="600px" class="generate-dialog">
      <el-form :model="generateForm" :rules="generateRules" ref="generateFormRef" label-width="100px">
        <el-form-item label="健身目标" prop="goals">
          <el-checkbox-group v-model="generateForm.goals">
            <el-checkbox value="weight_loss">减重塑形</el-checkbox>
            <el-checkbox value="muscle_building">增肌训练</el-checkbox>
            <el-checkbox value="endurance">耐力提升</el-checkbox>
            <el-checkbox value="flexibility">柔韧性</el-checkbox>
            <el-checkbox value="general_fitness">一般健身</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="计划时长" prop="durationWeeks">
          <el-radio-group v-model="generateForm.durationWeeks">
            <el-radio :value="2">2周 (短期体验)</el-radio>
            <el-radio :value="4">4周 (标准计划)</el-radio>
            <el-radio :value="8">8周 (深度训练)</el-radio>
            <el-radio :value="12">12周 (系统改造)</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="运动频率" prop="weeklyFrequency">
          <el-radio-group v-model="generateForm.weeklyFrequency">
            <el-radio :value="2">每周2次 (轻松入门)</el-radio>
            <el-radio :value="3">每周3次 (标准频率)</el-radio>
            <el-radio :value="4">每周4次 (强化训练)</el-radio>
            <el-radio :value="5">每周5次 (高强度)</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="可用时间" prop="availableTime">
          <el-radio-group v-model="generateForm.availableTime">
            <el-radio :value="5">5分钟 (快速热身)</el-radio>
            <el-radio :value="10">10分钟 (短时高效)</el-radio>
            <el-radio :value="15">15分钟 (标准时长)</el-radio>
            <el-radio :value="20">20分钟 (充分训练)</el-radio>
            <el-radio :value="25">25分钟 (加强训练)</el-radio>
            <el-radio :value="30">30分钟 (深度训练)</el-radio>
            <el-radio :value="45">45分钟 (全面训练)</el-radio>
            <el-radio :value="60">60分钟 (专业训练)</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="健身水平" prop="fitnessLevel">
          <el-radio-group v-model="generateForm.fitnessLevel">
            <el-radio value="beginner">初学者</el-radio>
            <el-radio value="intermediate">有一定基础</el-radio>
            <el-radio value="advanced">进阶训练者</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showGenerateDialog = false">取消</el-button>
          <el-button type="primary" :loading="isGenerating" @click="generatePlan">
            生成计划
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Trophy,
  Calendar,
  Star,
  Clock,
  VideoPlay,
  View,
  VideoPause,
  CircleCheck,
  Check,
  Search,
  RefreshRight,
  DocumentCopy,
  MoreFilled,
  Share,
  Delete,
  Collection,
  TrendCharts,
  Lock
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, apiRequest } = useAuth()

// 响应式数据
const loading = ref(false)
const plans = ref<any[]>([])
const activePlan = ref<any>(null)
const todaysPlan = ref<any>(null)
const showGenerateDialog = ref(false)
const isGenerating = ref(false)
const generateFormRef = ref()

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const filters = reactive({
  status: '',
  difficulty: ''
})

const generateForm = reactive({
  goals: ['general_fitness'],
  durationWeeks: 4,
  weeklyFrequency: 3,
  availableTime: 15,
  fitnessLevel: 'beginner'
})

const generateRules = {
  goals: [
    { required: true, message: '请选择至少一个健身目标', trigger: 'change' }
  ],
  durationWeeks: [
    { required: true, message: '请选择计划时长', trigger: 'change' }
  ],
  weeklyFrequency: [
    { required: true, message: '请选择运动频率', trigger: 'change' }
  ],
  availableTime: [
    { required: true, message: '请选择可用时间', trigger: 'change' }
  ],
  fitnessLevel: [
    { required: true, message: '请选择健身水平', trigger: 'change' }
  ]
}

// 热门模板
const popularTemplates = [
  {
    id: 1,
    name: '减脂塑形',
    description: '4周燃脂计划，适合想要减重的用户',
    icon: '🔥',
    duration: 4,
    difficulty: '初级',
    goals: ['weight_loss'],
    weeklyFrequency: 3,
    availableTime: 20,
    fitnessLevel: 'beginner'
  },
  {
    id: 2,
    name: '力量增肌',
    description: '8周增肌计划，提升肌肉量和力量',
    icon: '💪',
    duration: 8,
    difficulty: '中级',
    goals: ['muscle_building'],
    weeklyFrequency: 4,
    availableTime: 30,
    fitnessLevel: 'intermediate'
  },
  {
    id: 3,
    name: '新手入门',
    description: '2周入门计划，帮助建立运动习惯',
    icon: '🌟',
    duration: 2,
    difficulty: '初级',
    goals: ['general_fitness'],
    weeklyFrequency: 2,
    availableTime: 10,
    fitnessLevel: 'beginner'
  },
  {
    id: 4,
    name: '快速燃脂',
    description: '高强度间歇训练，短时间高效燃脂',
    icon: '⚡',
    duration: 3,
    difficulty: '中级',
    goals: ['weight_loss', 'endurance'],
    weeklyFrequency: 5,
    availableTime: 15,
    fitnessLevel: 'intermediate'
  },
  {
    id: 5,
    name: '专业训练',
    description: '12周系统性训练，适合有经验的健身者',
    icon: '🏆',
    duration: 12,
    difficulty: '高级',
    goals: ['muscle_building', 'endurance'],
    weeklyFrequency: 5,
    availableTime: 45,
    fitnessLevel: 'advanced'
  },
  {
    id: 6,
    name: '快速入门',
    description: '每天5分钟，轻松开始健身生活',
    icon: '⏰',
    duration: 2,
    difficulty: '初级',
    goals: ['general_fitness'],
    weeklyFrequency: 7,
    availableTime: 5,
    fitnessLevel: 'beginner'
  }
]

// 方法
const loadPlans = async () => {
  if (!user.value) return

  try {
    loading.value = true
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString()
    })

    if (filters.status) params.append('status', filters.status)
    if (filters.difficulty) params.append('difficulty', filters.difficulty)

    const response = await apiRequest(`/plans?${params.toString()}`)

    if (response.status === 'success') {
      plans.value = response.data.plans
      pagination.total = response.data.pagination.total

      // 查找活跃计划
      activePlan.value = plans.value.find(plan => plan.status === 'active') || null
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载计划失败')
  } finally {
    loading.value = false
  }
}

const loadTodaysPlan = async () => {
  if (!user.value) {
    todaysPlan.value = null
    return
  }

  try {
    // 使用后端API获取今日训练计划
    const response = await apiRequest('/plans/today')

    if (response.status === 'success') {
      const data = response.data

      if (data.hasActivePlan && data.todaysPlan) {
        todaysPlan.value = data.todaysPlan
        console.log('今日训练计划:', todaysPlan.value)
      } else {
        todaysPlan.value = null
        console.log('今日无活跃训练计划')
      }
    } else {
      todaysPlan.value = null
      console.warn('获取今日训练计划失败:', response.message)
    }
  } catch (error) {
    console.error('加载今日训练计划失败:', error)
    todaysPlan.value = null
  }
}

const generatePlan = async () => {
  if (!generateFormRef.value) return

  try {
    const valid = await generateFormRef.value.validate()
    if (!valid) return

    isGenerating.value = true
    const response = await apiRequest('/plans/generate', {
      method: 'POST',
      body: JSON.stringify(generateForm)
    })

    if (response.status === 'success') {
      ElMessage.success('运动计划生成成功！')
      showGenerateDialog.value = false
      await loadPlans()
      await loadTodaysPlan()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '生成计划失败')
  } finally {
    isGenerating.value = false
  }
}

const useTemplate = (template: any) => {
  Object.assign(generateForm, {
    goals: template.goals,
    durationWeeks: template.duration,
    weeklyFrequency: template.weeklyFrequency,
    availableTime: template.availableTime,
    fitnessLevel: template.fitnessLevel
  })
  showGenerateDialog.value = true
}

const startPlan = async (planId: string) => {
  try {
    const response = await apiRequest(`/plans/${planId}/start`, {
      method: 'PUT'
    })

    if (response.status === 'success') {
      ElMessage.success('计划已启动！')
      await loadPlans()
      await loadTodaysPlan()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '启动计划失败')
  }
}

const pausePlan = async (planId: string) => {
  try {
    await ElMessageBox.confirm('确定要暂停这个运动计划吗？', '确认暂停', {
      confirmButtonText: '暂停',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await apiRequest(`/plans/${planId}/pause`, {
      method: 'PUT'
    })

    if (response.status === 'success') {
      ElMessage.success('计划已暂停')
      await loadPlans()
      await loadTodaysPlan()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '暂停计划失败')
    }
  }
}

const deletePlan = async (planId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个运动计划吗？此操作不可恢复。', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await apiRequest(`/plans/${planId}`, {
      method: 'DELETE'
    })

    if (response.status === 'success') {
      ElMessage.success('计划已删除')
      await loadPlans()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除计划失败')
    }
  }
}

const handlePlanAction = async (command: string, plan: any) => {
  switch (command) {
    case 'view':
      viewPlanDetail(plan)
      break
    case 'start':
      await startPlan(plan._id)
      break
    case 'pause':
      await pausePlan(plan._id)
      break
    case 'resume':
      await startPlan(plan._id)
      break
    case 'share':
      ElMessage.info('分享功能开发中...')
      break
    case 'delete':
      await deletePlan(plan._id)
      break
  }
}

const viewPlanDetail = (plan: any) => {
  router.push(`/plans/${plan._id}`)
}

const viewTodaysPlan = () => {
  console.log('点击今日训练按钮')
  console.log('todaysPlan.value:', todaysPlan.value)
  console.log('activePlan.value:', activePlan.value)

  if (todaysPlan.value && todaysPlan.value.workouts && todaysPlan.value.workouts.length > 0) {
    console.log('找到今日训练，运动数量:', todaysPlan.value.workouts.length)
    // 找到第一个未完成的运动
    const nextWorkout = todaysPlan.value.workouts.find((workout: any) => !workout.completedAt)
    if (nextWorkout) {
      console.log('找到未完成的运动:', nextWorkout)
      // 存储运动信息到 localStorage，供运动页面使用
      const workoutInfo = {
        fromPlan: true,
        planId: activePlan.value?._id,
        workoutType: nextWorkout.workoutType,
        workoutName: nextWorkout.workoutName,
        targetReps: nextWorkout.targetReps,
        duration: nextWorkout.duration,
        difficulty: nextWorkout.difficulty,
        tips: nextWorkout.tips
      }
      localStorage.setItem('currentWorkoutInfo', JSON.stringify(workoutInfo))

      // 直接跳转到真实的运动界面
      router.push('/workout')
    } else {
      ElMessage.success('今日训练已全部完成！')
    }
  } else if (todaysPlan.value && todaysPlan.value.isRestDay) {
    ElMessage.info('今天是休息日，无需训练')
  } else {
    console.log('没有找到今日训练计划')
    ElMessage.warning('暂无今日训练计划')
  }
}

// 启动特定的运动项目
const startSpecificWorkout = (workout: any, index: number) => {
  // 检查是否可以开始该运动
  if (!canStartWorkout(index)) {
    ElMessage.warning('请先完成前面的运动项目')
    return
  }

  // 检查是否已完成
  if (workout.completedAt) {
    ElMessage.info('该运动项目已完成')
    return
  }

  console.log('启动特定运动:', workout)

  // 存储运动信息到 localStorage，供运动页面使用
  const workoutInfo = {
    fromPlan: true,
    planId: activePlan.value?._id,
    workoutType: workout.workoutType,
    workoutName: workout.workoutName,
    targetReps: workout.targetReps,
    duration: workout.duration,
    difficulty: workout.difficulty,
    tips: workout.tips,
    currentProgress: workout.progress || { completedReps: 0, completedSets: 0 },
    startDate: activePlan.value?.startDate
  }
  localStorage.setItem('currentWorkoutInfo', JSON.stringify(workoutInfo))

  // 跳转到运动界面
  router.push({
    path: '/workout/interface',
    query: {
      workout: workout.workoutType,
      duration: workout.duration
    }
  })
}



const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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

const canStartWorkout = (workoutIndex: number) => {
  if (!todaysPlan.value || !todaysPlan.value.workouts) return false

  // 第一个运动总是可以开始
  if (workoutIndex === 0) return true

  // 检查前面的运动是否都已完成
  for (let i = 0; i < workoutIndex; i++) {
    const workout = todaysPlan.value.workouts[i]
    if (!workout.completedAt && (!workout.progress || workout.progress.completedReps < workout.targetReps)) {
      return false
    }
  }

  return true
}

// 判断运动是否已完成（包括超额完成）
const isWorkoutCompleted = (workout: any) => {
  if (workout.completedAt) return true
  if (workout.progress && workout.progress.completedReps >= workout.targetReps) return true
  return false
}

// 获取完成状态文本
const getCompletionText = (workout: any) => {
  if (workout.completedAt) return '已完成'

  if (workout.progress && workout.progress.completedReps >= workout.targetReps) {
    const completedReps = workout.progress.completedReps
    const targetReps = workout.targetReps

    if (completedReps > targetReps) {
      const excess = completedReps - targetReps
      const completionMultiple = Math.round((completedReps / targetReps) * 10) / 10 // 保留一位小数
      return `超额完成 +${excess}次 (${completionMultiple}x)`
    } else {
      return '目标达成'
    }
  }

  return '已完成'
}

// 获取今日完成率
const getDailyCompletionRate = () => {
  if (!todaysPlan.value || !todaysPlan.value.workouts) return 0

  const workouts = todaysPlan.value.workouts
  const totalWorkouts = workouts.length
  const completedWorkouts = workouts.filter((workout: any) => isWorkoutCompleted(workout)).length

  return totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0
}

// 获取今日总完成次数
const getTotalCompletedReps = () => {
  if (!todaysPlan.value || !todaysPlan.value.workouts) return 0

  return todaysPlan.value.workouts.reduce((total: number, workout: any) => {
    return total + (workout.progress?.completedReps || 0)
  }, 0)
}

// 获取今日目标次数
const getTotalTargetReps = () => {
  if (!todaysPlan.value || !todaysPlan.value.workouts) return 0

  return todaysPlan.value.workouts.reduce((total: number, workout: any) => {
    return total + (workout.targetReps || 0)
  }, 0)
}

// 获取鼓励标题
const getEncouragementTitle = () => {
  const completionRate = getDailyCompletionRate()
  const totalCompleted = getTotalCompletedReps()
  const totalTarget = getTotalTargetReps()
  const overAchievement = totalCompleted > totalTarget

  if (completionRate === 100 && overAchievement) {
    return '🎉 超额完成！'
  } else if (completionRate === 100) {
    return '🎯 目标达成！'
  } else if (completionRate >= 80) {
    return '💪 表现出色！'
  } else if (completionRate >= 50) {
    return '👍 继续加油！'
  } else {
    return '🚀 开始行动！'
  }
}

// 获取鼓励话语
const getEncouragementMessage = () => {
  if (!todaysPlan.value || !todaysPlan.value.workouts) return ''

  const completionRate = getDailyCompletionRate()
  const totalCompleted = getTotalCompletedReps()
  const totalTarget = getTotalTargetReps()
  const overAchievement = totalCompleted > totalTarget
  const excessReps = totalCompleted - totalTarget

  if (completionRate === 100 && overAchievement) {
    const completionMultiple = Math.round((totalCompleted / totalTarget) * 10) / 10
    return `太棒了！你超出目标 ${excessReps} 次，达到了 ${completionMultiple}x 的完成度！这种坚持不懈的精神值得赞扬！明天继续保持这种势头！`
  } else if (completionRate === 100) {
    return `完美！你已经完成了今天的所有训练目标。坚持就是胜利，你的努力正在一点点改变你的身体！`
  } else if (completionRate >= 80) {
    const remaining = Math.ceil((100 - completionRate) / 100 * todaysPlan.value.workouts.length)
    return `你已经完成了大部分训练，只剩下 ${remaining} 个项目就能达成今日目标了。加油，胜利就在眼前！`
  } else if (completionRate >= 50) {
    return `已经完成了一半的训练，你的坚持很棒！继续努力，每一次训练都让你更接近理想的自己。`
  } else if (completionRate > 0) {
    return `好的开始！每一步都很重要，保持这种积极的态度，逐步完成今天的训练计划。`
  } else {
    return '' // 还没开始时不显示鼓励话语
  }
}

const resetFilters = () => {
  filters.status = ''
  filters.difficulty = ''
  pagination.page = 1
  loadPlans()
}

// 临时方法：创建测试计划
const createTestPlan = async () => {
  const testPlan = {
    _id: 'test-plan-' + Date.now(),
    title: '测试计划',
    description: '用于测试的运动计划',
    status: 'active',
    durationWeeks: 1,
    weeklyFrequency: 3,
    difficulty: 'beginner',
    startDate: new Date().toISOString(),
    weeks: [
      {
        weekNumber: 1,
        days: [
          {
            dayNumber: 1, // 周一
            dayName: 'Monday',
            isRestDay: false,
            workouts: [
              {
                workoutType: 'push-up',
                workoutName: '俯卧撑',
                targetReps: 10,
                duration: 5,
                difficulty: 2,
                tips: '保持身体呈一条直线'
              },
              {
                workoutType: 'squat',
                workoutName: '深蹲',
                targetReps: 15,
                duration: 3,
                difficulty: 1,
                tips: '膝盖不要超过脚尖'
              }
            ]
          },
          {
            dayNumber: 2, // 周二
            dayName: 'Tuesday',
            isRestDay: true,
            notes: '休息日，让肌肉恢复'
          },
          {
            dayNumber: 3, // 周三
            dayName: 'Wednesday',
            isRestDay: false,
            workouts: [
              {
                workoutType: 'plank',
                workoutName: '平板支撑',
                targetReps: 3,
                duration: 2,
                difficulty: 2,
                tips: '保持核心紧张'
              }
            ]
          },
          {
            dayNumber: 4, // 周四
            dayName: 'Thursday',
            isRestDay: true
          },
          {
            dayNumber: 5, // 周五
            dayName: 'Friday',
            isRestDay: false,
            workouts: [
              {
                workoutType: 'jumping-jack',
                workoutName: '开合跳',
                targetReps: 20,
                duration: 3,
                difficulty: 1,
                tips: '保持节奏，连续进行'
              }
            ]
          },
          {
            dayNumber: 6, // 周六
            dayName: 'Saturday',
            isRestDay: true
          },
          {
            dayNumber: 7, // 周日
            dayName: 'Sunday',
            isRestDay: true
          }
        ]
      }
    ],
    progress: {
      totalWorkouts: 4,
      completedWorkouts: 0,
      completionRate: 0,
      currentWeek: 1,
      currentDay: 1
    }
  }

  activePlan.value = testPlan
  plans.value = [testPlan]
  await loadTodaysPlan()
  ElMessage.success('测试计划创建成功！')
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

const getWorkoutEmoji = (type: string) => {
  const map: Record<string, string> = {
    'push-up': '💪',
    'squat': '🦵',
    'plank': '🏋️',
    'jumping-jack': '🤸'
  }
  return map[type] || '🏃'
}

// 生命周期
onMounted(async () => {
  if (user.value) {
    await loadPlans()
    await loadTodaysPlan()
  }
})
</script>

<style scoped>
.plans-page {
  min-height: calc(100vh - 140px);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  position: relative;
  overflow-x: hidden;
}

.plans-page::before {
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

.plans-container {
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
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #2d3748;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.daily-stats {
  display: flex;
  gap: 20px;
  align-items: center;
}

.daily-stats .stat-item {
  text-align: center;
}

.daily-stats .stat-value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.daily-stats .stat-label {
  display: block;
  font-size: 12px;
  color: #909399;
}

.header-icon {
  color: #667eea;
  font-size: 1.25rem;
}

.header-title {
  flex: 1;
}

/* 活跃计划卡片 */
.active-plan-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 2px solid rgba(255, 255, 255, 0.3) !important;
  color: white;
  backdrop-filter: blur(20px);
}

.active-plan-card .plan-title,
.active-plan-card .plan-description,
.active-plan-card .meta-item,
.active-plan-card .progress-label,
.active-plan-card .progress-value,
.active-plan-card .progress-stats {
  color: white !important;
}

.active-plan-content {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  padding: 20px 0;
}

/* 今日训练卡片 */
.today-plan-card {
  background: rgba(255, 255, 255, 0.98) !important;
  border: 2px solid rgba(255, 255, 255, 0.5) !important;
  backdrop-filter: blur(15px);
}

.plan-info {
  flex: 1;
}

.plan-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.plan-description {
  color: #718096;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.plan-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
  color: #4a5568;
}

.meta-item .el-icon {
  color: #667eea;
  font-size: 1rem;
}

.plan-progress {
  flex-shrink: 0;
  width: 200px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-weight: 500;
  color: #4a5568;
}

.progress-value {
  font-weight: 600;
  color: #667eea;
}

.progress-stats {
  text-align: center;
  margin-top: 8px;
  font-size: 0.875rem;
  color: #718096;
}

.plan-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

/* 今日训练卡片 */
.rest-day {
  text-align: center;
  padding: 40px 20px;
}

.rest-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
}

.rest-day h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.rest-day p {
  color: #718096;
  margin: 0;
}

.today-workouts {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 0;
}

.workout-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.workout-item:hover {
  background: #e2e8f0;
}

.workout-item.completed {
  background: rgba(72, 187, 120, 0.1);
  border-left: 4px solid #48bb78;
}

.workout-item.in-progress {
  border-left: 4px solid #409eff;
  background: rgba(64, 158, 255, 0.05);
}

.workout-item.clickable {
  cursor: pointer;
  border: 2px solid transparent;
}

.workout-item.clickable:hover {
  border-color: #409eff;
  background: #e2e8f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

/* 鼓励话语样式 */
.encouragement-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.encouragement-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.encouragement-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-size: 24px;
}

.encouragement-content {
  flex: 1;
}

.encouragement-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.encouragement-message {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.9;
}

.workout-progress {
  margin: 12px 0;
  padding: 8px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.progress-label {
  font-size: 0.8rem;
  color: #4a5568;
  font-weight: 500;
}

.progress-percentage {
  font-size: 0.85rem;
  color: #2d3748;
  font-weight: 600;
}

.progress-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.progress-text {
  font-size: 0.8rem;
  color: #4a5568;
  font-weight: 500;
}

.last-completed {
  font-size: 0.75rem;
  color: #718096;
}

.completed-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #48bb78;
  font-weight: 600;
}

.remaining-reps {
  font-size: 0.75rem;
  color: #e53e3e;
  font-weight: 500;
}

.workout-not-started {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  padding: 12px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 8px;
  border: 1px dashed #409eff;
}

.start-icon {
  color: #409eff;
  font-size: 1.2rem;
}

.start-text {
  font-size: 0.85rem;
  color: #409eff;
  font-weight: 500;
}

.remaining-time {
  color: #909399;
}

.workout-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  flex-shrink: 0;
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

.workout-details {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: #4a5568;
}

.workout-tips {
  font-size: 0.875rem;
  color: #718096;
  margin: 0;
  font-style: italic;
}

.workout-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.workout-lock {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f5f5f5;
  color: #c0c4cc;
  font-size: 1.2rem;
}

/* 计划网格 */
.plans-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
}

.plans-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.plans-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 筛选器 */
.filter-form {
  margin: 0;
}

/* 计划列表 */
.loading-section,
.empty-section {
  padding: 40px 20px;
}

.empty-icon {
  font-size: 4rem;
  color: #e2e8f0;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.plan-item:hover {
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
  transform: translateY(-2px);
}

.plan-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.plan-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.plan-content {
  flex: 1;
}

.plan-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.plan-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.plan-description {
  color: #718096;
  margin: 0 0 12px 0;
  font-size: 0.9rem;
}

.plan-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.plan-meta .meta-item {
  font-size: 0.875rem;
}

.plan-actions {
  flex-shrink: 0;
}

/* 分页 */
.pagination-section {
  display: flex;
  justify-content: center;
  padding-top: 32px;
  border-top: 1px solid #e2e8f0;
  margin-top: 32px;
}

/* 生成器 */
.generate-content {
  padding: 20px 0;
}

.generate-desc {
  color: #718096;
  margin: 0 0 24px 0;
  line-height: 1.5;
  text-align: center;
}

/* 模板列表 */
.templates-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.template-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.template-item:hover {
  background: #e2e8f0;
  transform: translateY(-2px);
}

.template-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
}

.template-name {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.template-desc {
  font-size: 0.875rem;
  color: #718096;
  margin: 0 0 8px 0;
}

.template-meta {
  display: flex;
  gap: 12px;
  font-size: 0.75rem;
  color: #a0aec0;
}

/* 对话框 */
.generate-dialog {
  border-radius: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .plans-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .plans-sidebar {
    order: -1;
  }

  .active-plan-content {
    flex-direction: column;
    gap: 20px;
  }

  .plan-progress {
    width: 100%;
  }

  .plan-actions {
    flex-direction: row;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .plans-page {
    padding: 20px 15px;
  }

  .page-title {
    font-size: 2rem;
  }

  .filter-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .filter-form .el-form-item {
    margin-bottom: 0;
    width: 100%;
  }

  .plan-meta {
    flex-direction: column;
    gap: 8px;
  }

  .workout-item {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .workout-details {
    justify-content: center;
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

:deep(.el-dialog__header) {
  background: rgba(102, 126, 234, 0.02);
  border-bottom: 1px solid rgba(102, 126, 234, 0.08);
}
</style>
