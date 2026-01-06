<template>
  <div class="workout-interface">
    <!-- 顶部工具栏 -->
    <el-header class="workout-header">
      <div class="header-left">
        <el-tag type="primary" size="large">{{ workoutTitle }}</el-tag>
        <el-tag v-if="aiDetection.isDetectorLoaded.value" type="success">AI已就绪</el-tag>
        <el-tag v-else type="danger">AI未就绪</el-tag>
      </div>
      
      <div class="header-right">
        <el-button-group>
          <el-button @click="showHelp = true" :icon="QuestionFilled">帮助</el-button>
          <el-button @click="showScores = true" :icon="TrophyBase">成绩</el-button>
          <el-button @click="showSettings = true" :icon="Setting">设置</el-button>
        </el-button-group>
      </div>
    </el-header>
    
    <!-- 主要内容区域 -->
    <el-container class="workout-content">
      <!-- 左侧面板 -->
      <el-aside width="200px" class="workout-sidebar">
        <!-- 计时器 -->
        <el-card class="timer-card">
          <div class="timer-display">{{ formattedTime }}</div>
          <el-text size="small">剩余时间</el-text>
        </el-card>
        
        <!-- 计数器 -->
        <el-card class="counter-card">
          <div class="counter-display">{{ count }}</div>
          <el-text size="small">完成次数</el-text>
        </el-card>
        
        <!-- 置信度 -->
        <el-card class="confidence-card">
              <el-progress 
            type="circle" 
                :percentage="Math.round(confidence * 100)"
                :color="confidenceColor"
            :width="80"
          >
            <span class="confidence-text">{{ Math.round(confidence * 100) }}%</span>
          </el-progress>
          <el-text size="small">AI置信度</el-text>
        </el-card>
        
        <!-- 动作质量 -->
        <el-card class="quality-card">
          <el-progress 
            type="circle" 
            :percentage="Math.round(movementQuality)"
            :color="qualityColor"
            :width="80"
          >
            <span class="quality-text">{{ Math.round(movementQuality) }}%</span>
          </el-progress>
          <el-text size="small">动作质量</el-text>
        </el-card>
        
        <!-- 好友进度 -->
        <el-card class="friend-progress-card" v-if="invitationSession">
          <template #header>
            <div class="friend-header">
              <el-icon><User /></el-icon>
              <span>{{ invitationSession.friendName }}</span>
            </div>
          </template>
          <div class="friend-progress">
            <div class="friend-reps">
              <span class="friend-count">{{ friendProgress.completedReps || 0 }}</span>
              <el-text size="small">完成次数</el-text>
            </div>
            <div class="friend-status">
              <el-tag 
                :type="friendProgress.isCompleted ? 'success' : 'info'" 
                size="small"
              >
                {{ friendProgress.isCompleted ? '已完成' : '进行中' }}
              </el-tag>
            </div>
          </div>
        </el-card>
        
        <!-- AI状态 -->
        <el-card class="status-card" v-if="settings.isDeveloperMode">
          <template #header>
            <span>AI状态</span>
          </template>
          <el-descriptions :column="1" size="small">
            <el-descriptions-item label="FPS">{{ fps }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ currentClass || '无' }}</el-descriptions-item>
            <el-descriptions-item label="阶段">{{ currentStage || '无' }}</el-descriptions-item>
            <el-descriptions-item label="日志">
              <el-button size="small" @click="showLogs = true">查看 ({{ logs.length }})</el-button>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-aside>
      
      <!-- 中间视频区域 -->
      <el-main class="video-container">
        <div class="video-wrapper" ref="parentWebcamBox">
          <!-- 倒计时覆盖层 -->
          <div v-if="delayCount > 0" class="countdown-overlay">
            <div class="countdown-number">{{ delayCount }}</div>
          </div>
          
          <!-- 视频元素 -->
          <video
            ref="webcamBox"
            autoplay
            muted
            playsinline
            class="workout-video"
            :style="{ transform: settings.isFlipCamera ? '' : 'scaleX(-1)' }"
          ></video>
          
          <!-- 姿势检测画布 -->
          <canvas
            ref="cnvPoseBox"
            class="pose-canvas"
            :width="canvasDimensions.width"
            :height="canvasDimensions.height"
          ></canvas>
          
          <!-- 建议提示 -->
          <div v-if="showAdvice && adviceText" class="advice-overlay">
            <el-alert
              :title="adviceText.replace(/<[^>]*>/g, '')"
              type="info"
              :closable="false"
              show-icon
            />
          </div>
        </div>
      </el-main>
      
      <!-- 右侧控制面板 -->
      <el-aside width="150px" class="control-sidebar">
        <!-- 控制按钮 -->
        <div class="control-buttons">
          <el-button
            v-if="showResumeBtn"
            type="primary"
            size="large"
            circle
            @click="resume"
            :icon="VideoPlay"
            class="control-btn-large"
          />
          
          <el-button
            v-if="showPauseBtn"
            type="warning"
            size="large"
            circle
            @click="pause"
            :icon="VideoPause"
            class="control-btn-large"
          />
          
          <el-button
            v-if="showRestartBtn"
            type="info"
            size="default"
            circle
            @click="restart"
            :icon="RefreshRight"
            class="control-btn-small"
          />
        </div>

        <!-- 视频来源选择 -->
        <el-card class="source-card" shadow="never">
          <template #header>
            <div class="source-header">
              <el-icon><VideoPlay /></el-icon>
              <span>视频来源</span>
            </div>
          </template>

          <div class="source-options">
            <el-radio-group v-model="sourceMode" size="small">
              <el-radio-button label="camera">摄像头</el-radio-button>
              <el-radio-button label="upload">上传视频</el-radio-button>
            </el-radio-group>
          </div>

          <div v-if="sourceMode === 'upload'" class="upload-block">
            <el-upload
              :show-file-list="false"
              :auto-upload="false"
              accept="video/*"
              :before-upload="beforeUploadVideo"
            >
              <el-button type="primary" size="small" plain>选择健身视频</el-button>
            </el-upload>
            <p class="upload-hint">
              {{ uploadedVideoName || '本地播放并检测，不会上传到服务器' }}
            </p>
            <el-tag
              v-if="uploadedVideoName"
              size="small"
              type="info"
            >
              已选择：{{ uploadedVideoName }}
            </el-tag>
          </div>

          <div v-else class="source-status">
            <el-tag type="success" size="small">实时摄像头</el-tag>
          </div>

          <div class="source-footnote">
            <el-icon class="inline-icon"><Timer /></el-icon>
            <span>{{ videoStatusText }}</span>
          </div>
        </el-card>
      </el-aside>
    </el-container>
    
    <!-- 结果对话框 -->
    <el-dialog v-model="showResult" title="训练结果" width="400px" :close-on-click-modal="false">
      <div class="result-content">
        <el-result icon="success" :title="`完成 ${finalReps} 次重复`" :sub-title="workoutTitle">
          <template #extra>
            <el-button type="primary" @click="handleResultOK">确定</el-button>
          </template>
        </el-result>
      </div>
    </el-dialog>
    
    <!-- 设置对话框 -->
    <el-dialog v-model="showSettings" title="设置" width="500px">
      <el-tabs v-model="settingsTab">
        <el-tab-pane label="运动设置" name="workout">
          <el-form :model="tempSettings" label-width="100px">
            <el-form-item label="运动类型">
              <el-select v-model="tempSettings.currWorkout" style="width: 100%">
                <el-option 
                  v-for="(workout, idx) in workoutOptions.names"
                  :key="workout"
                  :label="workout"
                  :value="workoutOptions.slugs[idx]"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="训练时长">
              <el-select v-model="tempSettings.currDuration" style="width: 100%">
                <el-option 
                  v-for="duration in workoutOptions.durations"
                  :key="duration"
                  :label="duration"
                  :value="duration"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="高级设置" name="advance">
          <el-form :model="tempSettings" label-width="120px">
            <el-form-item label="音效提示">
              <el-switch v-model="tempSettings.isAudioEffect"/>
            </el-form-item>
            <el-form-item label="全屏模式">
              <el-switch v-model="tempSettings.isFullscreen"/>
            </el-form-item>
            <el-form-item label="翻转摄像头">
              <el-switch v-model="tempSettings.isFlipCamera"/>
            </el-form-item>
            <el-form-item label="方向指示">
              <el-switch v-model="tempSettings.isDirectionSign"/>
            </el-form-item>
            <el-form-item label="开发者模式">
              <el-switch v-model="tempSettings.isDeveloperMode"/>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      
      <template #footer>
        <el-button @click="showSettings = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>
    
    <!-- 成绩对话框 -->
    <el-dialog v-model="showScores" title="训练成绩" width="600px">
      <el-tabs v-model="scoresTab">
        <el-tab-pane label="训练历程" name="journey">
          <el-empty v-if="scores.length === 0" description="还没有训练记录"/>
          <el-table v-else :data="scores.slice().reverse()" stripe>
            <el-table-column prop="workout" label="运动类型" width="120"/>
            <el-table-column prop="duration" label="时长" width="100"/>
            <el-table-column prop="repetition" label="次数" width="80"/>
            <el-table-column prop="date" label="日期" />
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="最佳成绩" name="best">
          <div v-for="(workoutScores, workoutName) in bestScores" :key="workoutName">
            <el-divider>{{ workoutName }}</el-divider>
            <el-row :gutter="20">
              <el-col 
                v-for="(score, duration) in workoutScores" 
                :key="duration"
                :span="6"
              >
                <el-card>
                  <div class="best-score-item">
                    <div class="duration">{{ duration }}</div>
                    <div class="score">{{ score }} 次</div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
    
    <!-- 帮助对话框 -->
    <el-dialog v-model="showHelp" title="使用帮助" width="600px">
      <el-tabs v-model="helpTab">
        <el-tab-pane label="使用说明" name="howto">
          <el-steps direction="vertical" :active="3">
            <el-step title="选择运动类型和时长" description="根据您的需求选择俯卧撑或深蹲，以及训练时长"/>
            <el-step title="点击开始按钮" description="点击播放按钮开始3秒倒计时"/>
            <el-step title="开始运动" description="AI会自动检测您的动作并计数，尽情享受健身吧！"/>
          </el-steps>
        </el-tab-pane>
        
        <el-tab-pane label="关于应用" name="about">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="应用名称">AI Workout Assistant</el-descriptions-item>
            <el-descriptions-item label="技术栈">Vue 3 + Element Plus + TensorFlow.js</el-descriptions-item>
            <el-descriptions-item label="AI模型">MoveNet + 自定义分类器</el-descriptions-item>
            <el-descriptions-item label="隐私保护">所有AI处理都在本地完成，不上传任何数据</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
    
    <!-- 日志对话框 -->
    <el-dialog v-model="showLogs" title="AI检测日志" width="800px">
      <div class="logs-container">
        <div v-if="logs.length === 0" class="no-logs">
          <el-empty description="暂无日志信息"/>
        </div>
        <div v-else class="logs-content">
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="log-item"
            :class="{
              'log-success': log.includes('[SUCCESS]'),
              'log-error': log.includes('[ERROR]'),
              'log-warning': log.includes('[WARNING]'),
              'log-info': log.includes('[INFO]')
            }"
          >
            {{ log }}
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="aiDetection.logs.value = []" type="danger">清空日志</el-button>
        <el-button @click="showLogs = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { onBeforeRouteLeave } from 'vue-router'
import { 
  QuestionFilled,
  TrophyBase,
  Setting,
  VideoPlay,
  VideoPause,
  RefreshRight,
  User,
  Timer
} from '@element-plus/icons-vue'
import { useAIDetection } from '@/composables/useAIDetection'
import { useAudio } from '@/composables/useAudio'
import { useAuth } from '@/composables/useAuth'

const props = defineProps<{
  workout: string
  duration: string
}>()

// AI Detection composable
const aiDetection = useAIDetection()

// Audio composable
const {
  isAudioEnabled,
  initWorkoutAudios,
  playCountdownAudio,
  playActionAudio,
  playCountAudio,
  playDoneAudio,
  playStageAudio,
  toggleAudio
} = useAudio()

// Auth composable
const { user, apiRequest } = useAuth()

// 更新运动计划状态
const updatePlanWorkoutStatus = async (planId: string, workoutId: string) => {
  try {
    const workoutInfo = localStorage.getItem('currentWorkoutInfo')
    if (!workoutInfo) return
    
    const planWorkout = JSON.parse(workoutInfo)
    const today = new Date()
    
    // 计算当前周和天
    let currentWeek = 1
    let currentDay = today.getDay() || 7 // 周日为7，其他保持不变
    
    if (planWorkout.startDate) {
      const startDate = new Date(planWorkout.startDate)
      const diffTime = today.getTime() - startDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      currentWeek = Math.ceil(diffDays / 7)
    }
    
    // 使用新的进度更新API
    const progressData = {
      weekNumber: currentWeek,
      dayNumber: currentDay,
      workoutType: planWorkout.workoutType || 'push-up',
      actualReps: finalReps.value,
      actualSets: 1
    }
    
    const response = await apiRequest(`/plans/${planId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(progressData)
    })
    
    if (response.status === 'success') {
      aiDetection.addLog(`运动计划进度已更新：完成 ${finalReps.value} 个${planWorkout.workoutName || '运动'}`, 'success')
      
      // 清理localStorage中的运动信息
      localStorage.removeItem('currentWorkoutInfo')
      return true
    }
    return false
  } catch (error) {
    console.error('更新运动计划进度失败:', error)
    aiDetection.addLog(`运动计划进度更新失败: ${error}`, 'error')
    return false
  }
}

const loadUploadedVideo = async (fileUrl: string, fileName?: string) => {
  if (!webcamBox.value) throw new Error('视频元素未准备好')

  stopCameraTracks()
  videoReady.value = false
  sourceMode.value = 'upload'
  uploadedVideoName.value = fileName || uploadedVideoName.value

  webcamBox.value.srcObject = null
  webcamBox.value.src = fileUrl
  webcamBox.value.loop = false
  webcamBox.value.muted = true
  webcamBox.value.autoplay = true
  webcamBox.value.playsInline = true

  return new Promise<void>((resolve, reject) => {
    const video = webcamBox.value!

    const onLoadedData = () => {
      video.removeEventListener('loadeddata', onLoadedData)
      video.removeEventListener('error', onError)
      aiDetection.addLog(`已加载本地视频: ${uploadedVideoName.value || '自定义视频'}`, 'success')
      syncVideoMetadata()
      resolve()
    }

    const onError = (e: Event) => {
      video.removeEventListener('loadeddata', onLoadedData)
      video.removeEventListener('error', onError)
      reject(new Error('本地视频加载失败'))
    }

    video.addEventListener('loadeddata', onLoadedData)
    video.addEventListener('error', onError)

    if (video.readyState >= 2) {
      onLoadedData()
    }
  })
}

const beforeUploadVideo = async (file: File) => {
  try {
    if (uploadedVideoUrl.value) URL.revokeObjectURL(uploadedVideoUrl.value)
    uploadedVideoUrl.value = URL.createObjectURL(file)
    await loadUploadedVideo(uploadedVideoUrl.value, file.name)
    ElMessage.success('已切换至上传视频，准备开始检测')
  } catch (error) {
    aiDetection.addLog(`上传视频处理失败: ${error}`, 'error')
    ElMessage.error('上传视频加载失败，请重试')
  }
  return false
}

const reloadUploadedVideo = async () => {
  if (sourceMode.value !== 'upload') return
  if (!uploadedVideoUrl.value) {
    videoReady.value = false
    aiDetection.addLog('请先选择健身视频', 'warning')
    return
  }
  await loadUploadedVideo(uploadedVideoUrl.value, uploadedVideoName.value)
}

// 更新邀请会话进度
const updateInvitationProgress = async (invitationId: string, progressData: any) => {
  try {
    const response = await apiRequest(`/invitations/${invitationId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(progressData)
    })
    
    if (response.status === 'success') {
      aiDetection.addLog(`邀请会话进度已更新：完成 ${progressData.completedReps} 次`, 'success')
      
      // 检查是否两人都完成了
      const invitation = response.data.invitation
      if (invitation.status === 'completed') {
        aiDetection.addLog('🎉 邀请会话已完成！双方都完成了运动', 'success')
        ElMessage.success('恭喜！你和好友都完成了运动挑战！')
      } else {
        // 显示对方的进度
        const isSender = invitation.sender._id === user.value?._id
        const myProgress = isSender ? invitation.workoutSession.senderProgress : invitation.workoutSession.receiverProgress
        const friendProgress = isSender ? invitation.workoutSession.receiverProgress : invitation.workoutSession.senderProgress
        const friendName = isSender ? invitation.receiver.profile?.nickname || invitation.receiver.username : invitation.sender.profile?.nickname || invitation.sender.username
        
        if (friendProgress.isCompleted) {
          aiDetection.addLog(`${friendName} 已完成 ${friendProgress.completedReps} 次`, 'info')
        } else {
          aiDetection.addLog(`等待 ${friendName} 完成运动...`, 'info')
        }
      }
      
      // 清理localStorage中的邀请信息
      localStorage.removeItem('currentInvitationSession')
      return true
    }
    return false
  } catch (error) {
    console.error('更新邀请会话进度失败:', error)
    aiDetection.addLog(`邀请会话进度更新失败: ${error}`, 'error')
    return false
  }
}

// 好友进度更新定时器
let friendProgressInterval: number | null = null

// 开始好友进度更新
const startFriendProgressUpdates = () => {
  if (!invitationSession.value?.invitationId) return
  
  // 立即更新一次
  updateFriendProgress()
  
  // 每5秒更新一次好友进度
  friendProgressInterval = window.setInterval(() => {
    updateFriendProgress()
  }, 5000)
}

// 更新好友进度
const updateFriendProgress = async () => {
  if (!invitationSession.value?.invitationId) return
  
  try {
    const response = await apiRequest(`/invitations/${invitationSession.value.invitationId}`)
    if (response.status === 'success') {
      const invitation = response.data.invitation
      
      // 判断我是发送者还是接收者
      const isSender = invitation.sender._id === user.value?._id
      const otherProgress = isSender ? invitation.workoutSession?.receiverProgress : invitation.workoutSession?.senderProgress
      
      if (otherProgress) {
        friendProgress.value = { ...otherProgress }
        
        // 如果好友完成了运动，显示通知
        if (otherProgress.isCompleted && !friendProgress.value.notified) {
          aiDetection.addLog(`🎉 ${invitationSession.value.friendName} 完成了 ${otherProgress.completedReps} 次！`, 'success')
          friendProgress.value.notified = true
        }
      }
      
      // 如果会话已完成，停止更新
      if (invitation.status === 'completed') {
        if (friendProgressInterval) {
          clearInterval(friendProgressInterval)
          friendProgressInterval = null
        }
      }
    }
  } catch (error) {
    console.warn('更新好友进度失败:', error)
  }
}

// Modal states
const showSettings = ref(false)
const showScores = ref(false)
const showHelp = ref(false)
const showResult = ref(false)
const showLogs = ref(false)

// 邀请会话相关
const invitationSession = ref<any>(null)
const friendProgress = ref<any>({
  completedReps: 0,
  completedSets: 0,
  averageStandardLevel: 0,
  isCompleted: false
})

// Tab states
const settingsTab = ref('workout')
const scoresTab = ref('journey')
const helpTab = ref('howto')

// Button states
const showResumeBtn = ref(true)
const showPauseBtn = ref(false)
const showRestartBtn = ref(false)

// Workout state
const isRunning = ref(false)
const isPaused = ref(false)
const delayCount = ref(0)
const timeLeft = ref(180)
const finalReps = ref(0)

// Camera & 视频源状态
const cameraStream = ref<MediaStream | null>(null)
const sourceMode = ref<'camera' | 'upload'>('camera')
const uploadedVideoName = ref('')
const uploadedVideoUrl = ref<string | null>(null)
const videoDurationSeconds = ref<number | null>(null)
const videoReady = ref(false)

const videoStatusText = computed(() => {
  if (!videoReady.value) return '视频源未就绪'
  if (sourceMode.value === 'upload') {
    const durationText = videoDurationSeconds.value ? `${videoDurationSeconds.value}s` : '准备中'
    return `${uploadedVideoName.value || '本地视频'} · ${durationText}`
  }
  return '摄像头已连接'
})

// AI state from composable
const count = computed(() => aiDetection.count.value)
const fps = computed(() => aiDetection.fps.value)
const confidence = computed(() => aiDetection.confidence.value)
const currentClass = computed(() => aiDetection.currentClass.value)
const currentStage = computed(() => aiDetection.currentStage.value)
const nextStage = computed(() => aiDetection.nextStage.value)
const movementQuality = computed(() => aiDetection.currentMovementQuality.value)
const logs = computed(() => aiDetection.logs.value)

// 监听计数变化，播放计数音频
let lastCount = 0
watch(count, async (newCount) => {
  if (newCount > lastCount && isRunning.value) {
    try {
      await playCountAudio()
      aiDetection.addLog(`播放计数音效: ${newCount}`, 'info')
    } catch (error) {
      aiDetection.addLog(`计数音效播放失败: ${error}`, 'warning')
    }
  }
  lastCount = newCount
})

// 监听阶段变化，播放动作指导音频
watch(currentStage, async (newStage, oldStage) => {
  if (newStage && newStage !== oldStage && isRunning.value) {
    try {
      await playStageAudio(newStage)
      aiDetection.addLog(`播放阶段音效: ${newStage}`, 'info')
    } catch (error) {
      aiDetection.addLog(`阶段音效播放失败: ${error}`, 'warning')
    }
  }
})

watch(sourceMode, async (mode) => {
  aiDetection.stopDetection()
  isRunning.value = false
  isPaused.value = false

  if (mode === 'camera') {
    await initCamera()
  } else {
    await reloadUploadedVideo()
  }
})

const adviceText = computed(() => {
  if (nextStage.value) {
    return `请移动到: ${nextStage.value}`
  }
  return ''
})
const showAdvice = ref(true)

// 置信度颜色
const confidenceColor = computed(() => {
  const conf = confidence.value * 100
  if (conf >= 80) return '#67c23a'
  if (conf >= 60) return '#e6a23c'
  return '#f56c6c'
})

// 动作质量颜色
const qualityColor = computed(() => {
  const quality = movementQuality.value
  if (quality >= 80) return '#67c23a'
  if (quality >= 60) return '#e6a23c'
  if (quality >= 40) return '#f56c6c'
  return '#909399'
})

// Settings
const settings = ref({
  currWorkout: props.workout,
  currDuration: props.duration,
  isAudioEffect: true,
  isFullscreen: false,
  isFlipCamera: false,
  isDirectionSign: true,
  isDeveloperMode: true // 默认开启开发者模式以便调试
})

const tempSettings = ref({ ...settings.value })

// Workout options
const workoutOptions = ref({
  names: ['俯卧撑', '深蹲', '弯腰'],
  slugs: ['push-up', 'squat', 'bend'],
  durations: ['1分钟', '3分钟', '5分钟', '7分钟']
})

// Scores data
const scores = ref<Array<{
  id: number
  workout: string
  duration: string
  repetition: number
  date: string
}>>([])

// Template refs
const webcamBox = ref<HTMLVideoElement>()
const cnvPoseBox = ref<HTMLCanvasElement>()
const parentWebcamBox = ref<HTMLDivElement>()

// Canvas dimensions
const canvasDimensions = ref({
  width: 640,
  height: 360
})

// Computed properties
const workoutTitle = computed(() => {
  const workoutNames: Record<string, string> = {
    'push-up': '俯卧撑',
    'squat': '深蹲',
    'bend': '弯腰'
  }
  const durationMap: Record<string, string> = {
    '1 Minutes': '1分钟',
    '3 Minutes': '3分钟', 
    '5 Minutes': '5分钟',
    '7 Minutes': '7分钟'
  }
  return `${workoutNames[props.workout] || props.workout} - ${durationMap[props.duration] || props.duration}`
})

const formattedTime = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60)
  const seconds = timeLeft.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const bestScores = computed(() => {
  const best: Record<string, Record<string, number>> = {
    '俯卧撑': {},
    '深蹲': {},
    '弯腰': {}
  }

  workoutOptions.value.durations.forEach(duration => {
    best['俯卧撑'][duration] = 0
    best['深蹲'][duration] = 0
    best['弯腰'][duration] = 0
  })
  
  scores.value.forEach(score => {
    if (best[score.workout] && best[score.workout][score.duration] !== undefined) {
      if (score.repetition > best[score.workout][score.duration]) {
        best[score.workout][score.duration] = score.repetition
      }
    }
  })
  
  return best
})

// Timer
let timerInterval: number | null = null

const stopCameraTracks = () => {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(track => track.stop())
    cameraStream.value = null
    aiDetection.addLog('摄像头已关闭', 'info')
  }
}

const handleVideoEnded = () => {
  if (!isRunning.value || showResult.value) return
  aiDetection.addLog('视频播放结束，自动结束训练并保存记录', 'info')
  finishWorkout()
}

const syncVideoMetadata = () => {
  if (!webcamBox.value || !cnvPoseBox.value) return

  const video = webcamBox.value
  canvasDimensions.value = {
    width: video.videoWidth || 640,
    height: video.videoHeight || 360
  }

  if (Number.isFinite(video.duration) && video.duration > 0) {
    videoDurationSeconds.value = Math.ceil(video.duration)
    if (sourceMode.value === 'upload') {
      timeLeft.value = Math.max(1, videoDurationSeconds.value)
    }
  } else {
    videoDurationSeconds.value = null
  }

  aiDetection.setupElements(video, cnvPoseBox.value)
  video.removeEventListener('ended', handleVideoEnded)
  video.addEventListener('ended', handleVideoEnded)
  videoReady.value = true
}

const ensureVideoPlaying = async () => {
  if (webcamBox.value && webcamBox.value.paused) {
    try {
      await webcamBox.value.play()
    } catch (error) {
      aiDetection.addLog(`视频播放失败: ${error}`, 'warning')
    }
  }
}

// Camera and AI initialization
const initCamera = async () => {
  try {
    videoReady.value = false
    aiDetection.addLog('正在初始化摄像头...', 'info')
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 360 }
      } 
    })

    // 保存摄像头流的引用
    cameraStream.value = stream

    // 切换为摄像头模式
    sourceMode.value = 'camera'

    if (webcamBox.value) {
      webcamBox.value.srcObject = stream

      // 等待视频元素完全加载
      return new Promise<void>((resolve, reject) => {
        const video = webcamBox.value!
        
        const onLoadedData = () => {
          video.removeEventListener('loadeddata', onLoadedData)
          video.removeEventListener('error', onError)
          aiDetection.addLog(`摄像头加载完成！尺寸: ${video.videoWidth}x${video.videoHeight}`, 'success')
          syncVideoMetadata()
          resolve()
        }
        
        const onError = (e: Event) => {
          video.removeEventListener('loadeddata', onLoadedData)
          video.removeEventListener('error', onError)
          reject(new Error('视频加载失败'))
        }
        
        video.addEventListener('loadeddata', onLoadedData)
        video.addEventListener('error', onError)
        
        // 如果视频已经加载完成
        if (video.readyState >= 2) {
          onLoadedData()
        }
      })
    }
  } catch (error) {
    aiDetection.addLog(`摄像头初始化失败，切换到测试视频: ${error}`, 'warning')
    ElMessage.warning('摄像头不可用，自动使用测试视频文件')
    
    // 摄像头不可用时，根据运动类型选择对应的模拟视频文件
    if (webcamBox.value) {
      const mockVideoFile = props.workout === 'push-up' ? 'push-up-mock.mp4' : 'mock-video.mp4'
      webcamBox.value.src = `${window.location.origin}/mock/${mockVideoFile}`
      webcamBox.value.loop = true
      webcamBox.value.muted = true
      webcamBox.value.autoplay = true
      webcamBox.value.playsInline = true
      videoReady.value = false

      return new Promise<void>((resolve, reject) => {
        const video = webcamBox.value!
        
        const onLoadedData = () => {
          video.removeEventListener('loadeddata', onLoadedData)
          video.removeEventListener('error', onError)
          aiDetection.addLog(`测试视频加载完成！尺寸: ${video.videoWidth}x${video.videoHeight}`, 'success')
          syncVideoMetadata()
          resolve()
        }
        
        const onError = (e: Event) => {
          video.removeEventListener('loadeddata', onLoadedData)
          video.removeEventListener('error', onError)
          aiDetection.addLog('测试视频加载失败', 'error')
          reject(new Error('测试视频加载失败'))
        }
        
        video.addEventListener('loadeddata', onLoadedData)
        video.addEventListener('error', onError)
        
        // 如果视频已经加载完成
        if (video.readyState >= 2) {
          onLoadedData()
        }
      })
    }
  }
}

const initAI = async () => {
  try {
    // 首先根据来源准备视频
    if (sourceMode.value === 'upload') {
      await reloadUploadedVideo()
      if (!videoReady.value) {
        throw new Error('请先选择需要检测的健身视频')
      }
    } else {
      await initCamera()
    }

    if (!webcamBox.value || !cnvPoseBox.value) {
      throw new Error('视频或画布元素未准备好')
    }
    
    // 验证视频元素状态
    if (webcamBox.value.videoWidth === 0 || webcamBox.value.videoHeight === 0) {
      aiDetection.addLog('警告：视频尺寸信息暂未获取到，但继续初始化', 'warning')
    } else {
      aiDetection.addLog(`视频尺寸: ${webcamBox.value.videoWidth}x${webcamBox.value.videoHeight}`, 'info')
    }
    
    // 设置AI检测元素，并定期更新引用
    aiDetection.setupElements(webcamBox.value, cnvPoseBox.value)
    
    // 设置定期检查和更新视频元素引用
    const updateElementsInterval = setInterval(() => {
      if (webcamBox.value && cnvPoseBox.value) {
        aiDetection.setupElements(webcamBox.value, cnvPoseBox.value)
      }
    }, 2000) // 每2秒检查一次
    
    // 清理定时器
    onUnmounted(() => {
      clearInterval(updateElementsInterval)
    })
    
    // 初始化AI系统
    await aiDetection.initializeAI()
    
    // 设置当前运动
    await aiDetection.setupWorkout(props.workout)
    
    ElMessage.success('AI系统已就绪！')
    
  } catch (error) {
    aiDetection.addLog(`AI初始化失败: ${error}`, 'error')
    ElMessage.warning('AI初始化中，请稍候再试或继续使用')
  }
}

// Control functions
const resume = async () => {
  if (!isRunning.value) {
    if (!aiDetection.isDetectorLoaded.value) {
      ElMessage.warning('AI模型尚未加载完成，请稍候')
      return
    }

    if (!videoReady.value) {
      ElMessage.warning('视频源未就绪，请检查摄像头或上传视频')
      return
    }

    isRunning.value = true
    delayCount.value = 3
    aiDetection.addLog('开始倒计时...', 'info')
    
    const countdown = async () => {
      if (delayCount.value > 0) {
        // 播放倒计时音效
        await playCountdownAudio(delayCount.value)
        
        setTimeout(() => {
          delayCount.value--
          if (delayCount.value > 0) {
            countdown()
          } else {
            startWorkout()
          }
        }, 1000)
      }
    }
    countdown()
  } else {
    isPaused.value = false
    aiDetection.addLog('恢复训练', 'info')
    await ensureVideoPlaying()
    await aiDetection.startDetection()
  }
  
  showResumeBtn.value = false
  showPauseBtn.value = true
  showRestartBtn.value = false
}

const startWorkout = async () => {
  // 播放开始音效
  await playCountdownAudio(0)

  if (!videoReady.value) {
    ElMessage.warning('视频源未就绪，请检查摄像头或上传视频')
    return
  }

  aiDetection.addLog('开始正式训练！', 'success')
  ElMessage.success('开始训练！')
  await ensureVideoPlaying()
  startTimer()
  await aiDetection.startDetection()
}

const pause = () => {
  isPaused.value = true
  aiDetection.addLog('暂停训练', 'warning')
  aiDetection.stopDetection()
  ElMessage.info('训练已暂停')
  
  showResumeBtn.value = true
  showPauseBtn.value = false
  showRestartBtn.value = true
}

const restart = () => {
  isRunning.value = false
  isPaused.value = false
  delayCount.value = 0
  
  // Reset timer
  const durationText = props.duration.replace(/[^\d]/g, '') // 提取数字
  const durationMinutes = parseInt(durationText)
  timeLeft.value = durationMinutes * 60
  
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  
  // Reset AI detection
  aiDetection.stopDetection()
  aiDetection.resetCount()
  aiDetection.addLog('重新开始训练', 'info')
  ElMessage.info('已重置训练')

  // 如果是上传视频，重置播放进度
  if (sourceMode.value === 'upload' && webcamBox.value) {
    webcamBox.value.currentTime = 0
    videoReady.value = true
  }

  showResumeBtn.value = true
  showPauseBtn.value = false
  showRestartBtn.value = false
}

const startTimer = () => {
  timerInterval = window.setInterval(() => {
    if (!isPaused.value && timeLeft.value > 0) {
      timeLeft.value--
      if (timeLeft.value <= 0) {
        finishWorkout()
      }
    }
  }, 1000)
}

const finishWorkout = async () => {
  isRunning.value = false
  finalReps.value = count.value
  showResult.value = true
  
  aiDetection.stopDetection()
  aiDetection.addLog(`训练结束！完成 ${finalReps.value} 次重复`, 'success')
  
  // 播放完成音效
  await playDoneAudio()
  
  ElMessage.success(`训练完成！共完成 ${finalReps.value} 次`)
  
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  
  // 计算实际运动时长
  const durationText = props.duration.replace(/[^\d]/g, '')
  const plannedDuration = parseInt(durationText) * 60
  const actualDuration = plannedDuration - timeLeft.value
  
  // 计算卡路里消耗 (简单估算：俯卧撑约0.5kcal/次，深蹲约0.3kcal/次，弯腰约0.25kcal/次)
  const caloriesPerRepMap: Record<string, number> = {
    'push-up': 0.5,
    'squat': 0.3,
    'bend': 0.25
  }
  const caloriesPerRep = caloriesPerRepMap[props.workout] || 0.3
  const caloriesBurned = Math.round(finalReps.value * caloriesPerRep)
  
  // 计算平均标准程度 (基于AI检测的置信度)
  const averageStandardLevel = Math.round(confidence.value * 100)
  
  // Save score locally
  const newScore = {
    id: Date.now(),
    workout: workoutTitle.value.split(' - ')[0],
    duration: props.duration,
    repetition: finalReps.value,
    date: new Date().toLocaleString()
  }
  scores.value.push(newScore)
  localStorage.setItem('workout-scores', JSON.stringify(scores.value))
  
  // Save to backend if user is logged in
  if (user?.value) {
    try {
      // 运动名称映射
      const workoutNames: Record<string, string> = {
        'push-up': '俯卧撑',
        'squat': '深蹲',
        'bend': '弯腰'
      }
      
      // 时长格式转换
      const durationMap: Record<string, string> = {
        '1 Minutes': '1分钟',
        '3 Minutes': '3分钟',
        '5 Minutes': '5分钟',
        '7 Minutes': '7分钟'
      }
      
      const workoutData = {
        workoutType: props.workout,
        workoutName: workoutNames[props.workout] || props.workout,
        plannedDuration: durationMap[props.duration] || props.duration,
        plannedDurationSeconds: plannedDuration,
        actualDuration: actualDuration,
        totalReps: finalReps.value,
        caloriesBurned: caloriesBurned,
        averageStandardLevel: averageStandardLevel,
        aiData: {
          averageConfidence: confidence.value,
          detectionAccuracy: Math.round(confidence.value * 100),
          frameCount: Math.max(1, Math.round(actualDuration * fps.value)), // 确保至少为1
          averageFPS: Math.max(1, Math.round(fps.value)), // 确保至少为1
          poseQualityScore: averageStandardLevel
        },
        userFeedback: {
          difficulty: 3, // 默认难度3/5
          satisfaction: 4, // 默认满意度4/5
          aiAccuracy: Math.round(confidence.value * 5), // AI准确度基于置信度
          comments: ''
        },
        notes: `通过AI检测完成的${workoutTitle.value}训练`
      }
      
      const response = await apiRequest('/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workoutData)
      })
      
      if (response.status === 'success') {
        aiDetection.addLog('运动数据已保存到服务器', 'success')
        
        // 检查是否来自运动计划
        const workoutInfo = localStorage.getItem('currentWorkoutInfo')
        if (workoutInfo) {
          try {
            const planWorkout = JSON.parse(workoutInfo)
            if (planWorkout.fromPlan && planWorkout.planId) {
              // 更新运动计划状态
              await updatePlanWorkoutStatus(planWorkout.planId, response.data.workout._id)
              aiDetection.addLog('运动计划状态已更新', 'success')
            }
          } catch (error) {
            aiDetection.addLog(`运动计划状态更新失败: ${error}`, 'warning')
          }
        }
        
        // 检查是否来自邀请会话
        const invitationInfo = localStorage.getItem('currentInvitationSession')
        if (invitationInfo) {
          try {
            const invitationSession = JSON.parse(invitationInfo)
            if (invitationSession.invitationId) {
              // 更新邀请会话进度
              await updateInvitationProgress(invitationSession.invitationId, {
                completedReps: finalReps.value,
                completedSets: Math.ceil(finalReps.value / 10), // 假设每10次为一组
                averageStandardLevel: averageStandardLevel,
                isCompleted: true
              })
              aiDetection.addLog('邀请会话进度已更新', 'success')
            }
          } catch (error) {
            aiDetection.addLog(`邀请会话进度更新失败: ${error}`, 'warning')
          }
        }
        
        ElMessage.success('运动记录已保存！')
      } else {
        throw new Error(response.message || '保存失败')
      }
    } catch (error) {
      aiDetection.addLog(`保存运动数据失败: ${error}`, 'error')
      ElMessage.warning('运动数据保存失败，但本地记录已保存')
      console.error('保存运动数据失败:', error)
    }
  } else {
    aiDetection.addLog('未登录，仅保存本地记录', 'warning')
  }
}

const handleResultOK = () => {
  showResult.value = false
  restart()
}

// Settings functions
const saveSettings = () => {
  settings.value = { ...tempSettings.value }
  showSettings.value = false
  
  // Apply settings
  if (settings.value.isFullscreen && !document.fullscreenElement) {
    document.documentElement.requestFullscreen?.()
  } else if (!settings.value.isFullscreen && document.fullscreenElement) {
    document.exitFullscreen?.()
  }
  
  // Update video transform
  if (webcamBox.value) {
    webcamBox.value.style.transform = settings.value.isFlipCamera ? '' : 'scaleX(-1)'
  }
  
  // 同步音频设置
  toggleAudio(settings.value.isAudioEffect)
  
  // Save to localStorage
  localStorage.setItem('workout-settings', JSON.stringify(settings.value))
  aiDetection.addLog('设置已保存', 'info')
  ElMessage.success('设置已保存')
}

// Lifecycle
onMounted(async () => {
  // 初始化音频系统
  initWorkoutAudios()
  
  // Load scores from localStorage
  const savedScores = localStorage.getItem('workout-scores')
  if (savedScores) {
    scores.value = JSON.parse(savedScores)
  }
  
  // Load settings from localStorage
  const savedSettings = localStorage.getItem('workout-settings')
  if (savedSettings) {
    const loaded = JSON.parse(savedSettings)
    settings.value = { ...settings.value, ...loaded }
    tempSettings.value = { ...settings.value }
  }
  
  // Set duration
  const durationText = props.duration.replace(/[^\d]/g, '')
  const durationMinutes = parseInt(durationText)
  timeLeft.value = durationMinutes * 60
  
  // 检查是否有邀请会话
  const invitationInfo = localStorage.getItem('currentInvitationSession')
  if (invitationInfo) {
    try {
      invitationSession.value = JSON.parse(invitationInfo)
      aiDetection.addLog(`开始与 ${invitationSession.value.friendName} 的运动会话`, 'info')
      
      // 开始定期更新好友进度
      startFriendProgressUpdates()
    } catch (error) {
      console.error('解析邀请会话信息失败:', error)
    }
  }
  
  // Initialize everything
  await nextTick()
  
  try {
    await initAI()
  } catch (error) {
    console.error('Initialization failed:', error)
  }
})

// 清理函数
const cleanup = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
  
  // 清理好友进度更新定时器
  if (friendProgressInterval) {
    clearInterval(friendProgressInterval)
    friendProgressInterval = null
  }
  
  // 停止AI检测
  aiDetection.stopDetection()

  // 停止摄像头流
  stopCameraTracks()

  // 释放本地视频URL
  if (uploadedVideoUrl.value) {
    URL.revokeObjectURL(uploadedVideoUrl.value)
    uploadedVideoUrl.value = null
  }
}

// 路由守卫：离开页面前清理资源
onBeforeRouteLeave(() => {
  cleanup()
  return true
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.workout-interface {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.workout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.header-left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.workout-content {
  flex: 1;
  padding: 20px;
  gap: 20px;
}

.workout-sidebar, .control-sidebar {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.timer-card, .counter-card, .confidence-card, .quality-card, .status-card {
  text-align: center;
}

.timer-display {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.counter-display {
  font-size: 48px;
  font-weight: bold;
  color: #67c23a;
  margin-bottom: 8px;
}

.confidence-text, .quality-text {
  font-size: 12px;
  font-weight: bold;
}

.video-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
}

.video-wrapper {
  position: relative;
  width: 80vw;
  height: 70vh;
  max-width: 1200px;
  max-height: 800px;
  min-width: 640px;
  min-height: 480px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 48px rgba(0,0,0,0.4);
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.workout-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pose-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.countdown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.countdown-number {
  font-size: 15vw;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 50px rgba(255, 255, 255, 0.8);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.advice-overlay {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
}

.control-sidebar {
  justify-content: center;
  align-items: center;
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
}

.control-btn-large {
  width: 80px;
  height: 80px;
  font-size: 32px;
}

.control-btn-small {
  width: 50px;
  height: 50px;
  font-size: 20px;
}

.source-card {
  width: 100%;
}

.source-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.source-options {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.upload-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.upload-hint {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.source-status {
  text-align: center;
  margin: 8px 0;
}

.source-footnote {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
  margin-top: 8px;
}

.inline-icon {
  font-size: 14px;
}

.result-content {
  text-align: center;
  padding: 20px;
}

.logs-container {
  max-height: 400px;
  overflow-y: auto;
}

.logs-content {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.log-item {
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.log-success {
  background-color: #f0f9ff;
  color: #059669;
  border-left: 4px solid #10b981;
}

.log-error {
  background-color: #fef2f2;
  color: #dc2626;
  border-left: 4px solid #ef4444;
}

.log-warning {
  background-color: #fffbeb;
  color: #d97706;
  border-left: 4px solid #f59e0b;
}

.log-info {
  background-color: #eff6ff;
  color: #2563eb;
  border-left: 4px solid #3b82f6;
}

.best-score-item {
  text-align: center;
}

.duration {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.score {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

/* 好友进度卡片样式 */
.friend-progress-card {
  margin-bottom: 20px;
}

.friend-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}

.friend-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.friend-reps {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.friend-count {
  font-size: 32px;
  font-weight: bold;
  color: #67c23a;
  line-height: 1;
}

.friend-status {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>