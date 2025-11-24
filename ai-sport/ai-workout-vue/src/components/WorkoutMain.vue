<template>
  <div class="flex flex-row bg-gray-600 w-full h-screen justify-center items-center">
    <!-- Settings Modal -->
    <SettingsModal
      :show="showSettingsModal"
      :settings="currentSettings"
      @close="showSettingsModal = false"
      @save="handleSettingsSave"
    />
    
    <!-- Scores Modal -->
    <ScoresModal
      :show="showScoresModal"
      :scores="workoutStore.scoreStorage.scores.value"
      @close="showScoresModal = false"
    />
    
    <!-- Help Modal -->
    <HelpModal
      :show="showHelpModal"
      @close="showHelpModal = false"
    />
    
    <div
      ref="parentWebcamBox"
      class="w-full bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl shadow-2xl relative overflow-hidden border-2 border-white/20"
      :style="{ 
        maxWidth: '1440px', 
        maxHeight: '810px',
        width: `${screenDimensions.width}px`,
        height: `${screenDimensions.height}px`
      }"
    >
      <!-- Video Element -->
      <video
        ref="webcamElem"
        class="bg-gray-200 z-10"
        muted
        autoplay
        :style="{
          width: `${screenDimensions.width}px`,
          height: `${screenDimensions.height}px`,
          transform: currentSettings.isFlipCamera ? '' : 'scale(-1,1)'
        }"
      ></video>
      
      <!-- Canvas for Pose Detection -->
      <canvas
        ref="cnvPoseElem"
        class="absolute inset-0 z-20"
        :width="screenDimensions.width"
        :height="screenDimensions.height"
      ></canvas>
      
      <!-- Delay Counter -->
      <div 
        v-if="delayTime > 0"
        class="absolute inset-0 w-full h-full flex flex-row justify-center items-center p-3 z-30"
      >
        <div
          class="text-9xl font-bold text-white flex flex-row justify-center items-center rounded-full"
          style="text-shadow: #000 0px 0px 20px"
        >
          {{ delayTime }}
        </div>
      </div>
      
      <!-- Result Modal -->
      <div
        v-if="showResult"
        class="absolute inset-0 w-full h-full flex flex-row justify-center items-center p-3 bg-gray-700/75 z-40"
      >
        <div class="bg-white py-3 px-4 rounded-lg flex flex-col items-center text-gray-700">
          <div class="text-lg font-bold mb-2">Result</div>
          <div class="text-sm mb-1">{{ workoutTitle }}</div>
          <div class="text-3xl font-bold mb-1">{{ finalRepetition }}</div>
          <div class="text-sm mb-2">Repetitions</div>
          <div
            @click="handleResultOK"
            class="py-1.5 px-4 bg-amber-500 rounded-lg text-white font-bold cursor-pointer"
          >
            OK
          </div>
        </div>
      </div>
      
      <!-- UI Overlay -->
      <div class="absolute inset-0 w-full h-full flex flex-row justify-between p-3 z-30">
        <!-- Left Panel -->
        <div class="flex-1 flex flex-row items-center">
          <div class="flex flex-col items-center h-full">
            <!-- Timer -->
            <div class="w-24 h-24 flex flex-row justify-center items-center rounded-full bg-white">
              <span class="font-bold text-3xl text-gray-700">
                {{ formattedTime }}
              </span>
            </div>
            
            <!-- Confidence Bar -->
            <div class="flex-1 py-2">
              <div id="progressBarBox">
                <div ref="confidenceElem" id="confidenceBox" :style="{ clipPath: `inset(${(1 - confidence) * 100}% 0 0 0)` }"></div>
              </div>
            </div>
            
            <!-- Counter -->
            <div class="w-24 h-24 flex flex-row justify-center items-center rounded-full bg-white">
              <span class="font-bold text-5xl text-gray-700">
                {{ currentCount }}
              </span>
            </div>
          </div>
          
          <!-- Direction Signs and Advice -->
          <div class="relative h-full w-full flex flex-col justify-center">
            <div ref="imgDirectionSignElem" id="imgDirectionSignBox"></div>
            <div
              ref="adviceWrapElem"
              v-show="showAdvice && adviceText"
              class="absolute bottom-0 pl-3 left-0 w-full flex flex-col items-start h-24"
            >
              <div class="bg-white w-auto text-xs py-0.5 px-2 rounded-t-lg">
                Advice
              </div>
              <div 
                class="rounded-b-lg rounded-tr-lg px-2 py-1 bg-white text-xs overflow-x-auto whitespace-nowrap max-w-full w-auto overflow-y-auto max-h-14 h-auto"
                v-html="adviceText"
              >
              </div>
            </div>
          </div>
        </div>
        
        <!-- Right Panel -->
        <div class="flex flex-col items-end">
          <!-- Top Buttons -->
          <div class="flex flex-row mb-2">
            <div
              @click="showHelpModal = true"
              class="cursor-pointer hover:bg-gray-200 bg-white text-xl font-bold text-gray-700 py-1 px-3 rounded-lg mr-2"
            >
              Help
            </div>
            <div
              @click="showScoresModal = true"
              class="cursor-pointer hover:bg-gray-200 bg-white text-xl font-bold text-gray-700 py-1 px-3 rounded-lg mr-2"
            >
              Scores
            </div>
            <div
              @click="showSettingsModal = true"
              class="cursor-pointer hover:bg-gray-200 bg-white text-xl font-bold text-gray-700 py-1 px-3 rounded-lg"
            >
              Settings
            </div>
          </div>
          
          <!-- Workout Title -->
          <div class="bg-white text-xs font-bold text-gray-500 py-0.5 px-2 rounded-lg mb-2">
            {{ workoutTitle }}
          </div>
          
          <!-- FPS Counter -->
          <div class="bg-white text-xs font-bold text-gray-500 py-0.5 px-2 rounded-lg">
            FPS: {{ fps }}
          </div>
          
          <!-- Developer Mode -->
          <div v-if="currentSettings.isDeveloperMode" class="flex-1 overflow-y-auto h-full flex flex-col justify-center">
            <div class="flex flex-row justify-center items-center">
              <div class="flex flex-col items-end mr-1">
                <label class="cursor-pointer hover:bg-gray-200 flex flex-row items-center bg-white text-sm font-bold text-gray-500 py-0.5 px-2 rounded-lg mb-2">
                  <div>Advice</div>
                  <div class="switch dev-switch ml-1">
                    <input
                      type="checkbox"
                      v-model="showAdvice"
                    />
                    <span class="slider round dev-slider"></span>
                  </div>
                </label>
                
                <div class="cursor-pointer hover:bg-gray-200 bg-white text-sm font-bold text-gray-500 py-0.5 px-2 rounded-lg mb-2">
                  Confidence: {{ Math.round(confidence * 100) }}%
                </div>
                
                <div class="cursor-pointer hover:bg-gray-200 bg-white text-sm font-bold text-gray-500 py-0.5 px-2 rounded-lg">
                  Class: {{ currentClass }}
                </div>
              </div>
              <div
                class="text-yellow-500 font-medium"
                style="writing-mode: vertical-rl; text-shadow: #000 0px 0px 2px;"
              >
                Developer Mode
              </div>
            </div>
          </div>
          
          <div class="flex-1"></div>
          
          <!-- Control Buttons -->
          <div class="flex flex-row items-center">
            <!-- Restart Button -->
            <div
              v-if="showRestartBtn"
              @click="restartWorkout"
              class="cursor-pointer hover:bg-gray-200 w-12 h-12 mr-3 flex flex-row justify-center items-center rounded-full bg-white"
            >
              <svg height="30" viewBox="0 0 24 24" width="30" xmlns="http://www.w3.org/2000/svg">
                <path
                  class="fill-gray-700"
                  d="m12 5v-4l-5 5 5 5v-4a6 6 0 0 1 6 6 6 6 0 0 1 -6 6 6 6 0 0 1 -6-6h-2a8 8 0 0 0 8 8 8 8 0 0 0 8-8 8 8 0 0 0 -8-8z"
                />
              </svg>
            </div>
            
            <div>
              <!-- Play/Resume Button -->
              <div
                v-if="showResumeBtn"
                @click="resumeWorkout"
                class="cursor-pointer hover:bg-gray-200 w-24 h-24 flex flex-row justify-center items-center rounded-full bg-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="60" height="60">
                  <path
                    d="M19.376 12.416L8.777 19.482A.5.5 0 0 1 8 19.066V4.934a.5.5 0 0 1 .777-.416l10.599 7.066a.5.5 0 0 1 0 .832z"
                    class="fill-gray-700"
                  />
                </svg>
              </div>
              
              <!-- Pause Button -->
              <div
                v-if="showPauseBtn"
                @click="pauseWorkout"
                class="cursor-pointer hover:bg-gray-200 w-24 h-24 flex flex-row justify-center items-center rounded-full bg-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="60" height="60">
                  <path
                    d="M6 5h2v14H6V5zm10 0h2v14h-2V5z"
                    stroke-width="2"
                    class="fill-gray-700 stroke-gray-700"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useWorkoutStore } from '@/stores/counter'
import { usePoseDetection } from '@/composables/usePoseDetection'
import { useWorkoutCounter } from '@/composables/useWorkoutCounter'
import { useTimer } from '@/composables/useTimer'
import { useAudio } from '@/composables/useAudio'
import SettingsModal from './SettingsModal.vue'
import ScoresModal from './ScoresModal.vue'
import HelpModal from './HelpModal.vue'

const props = defineProps<{
  workout: string
  duration: string
}>()

// Store
const workoutStore = useWorkoutStore()

// Composables
const poseDetection = usePoseDetection()
const workoutCounter = useWorkoutCounter()
const timer = useTimer()
const audio = useAudio()

// Template refs
const parentWebcamBox = ref<HTMLDivElement>()
const webcamElem = ref<HTMLVideoElement>()
const cnvPoseElem = ref<HTMLCanvasElement>()
const confidenceElem = ref<HTMLDivElement>()
const imgDirectionSignElem = ref<HTMLDivElement>()
const adviceWrapElem = ref<HTMLDivElement>()

// Component state
const delayTime = ref<number>(0)
const showResult = ref(false)
const finalRepetition = ref(0)
const isRunning = ref(false)
const showAdvice = ref(true)
const adviceText = ref('')

// Modal states
const showSettingsModal = ref(false)
const showScoresModal = ref(false)
const showHelpModal = ref(false)

// Button states
const showResumeBtn = ref(true)
const showPauseBtn = ref(false)
const showRestartBtn = ref(false)

// Screen dimensions  
const screenDimensions = ref({
  width: 1024,
  height: 576
})

// Webcam stream
const stream = ref<MediaStream | null>(null)

// Settings state
const currentSettings = ref(workoutStore.settingsStorage.settings.value)

// Computed properties
const workoutTitle = computed(() => {
  const workoutNames: Record<string, string> = {
    'push-up': 'Push Up',
    'squat': 'Squat'
  }
  return `${workoutNames[props.workout] || props.workout} - ${props.duration}`
})

const formattedTime = computed(() => {
  const time = timer.getCurrTime()
  return `${String(time.minutes).padStart(2, '0')}:${String(time.seconds).padStart(2, '0')}`
})

const currentCount = computed(() => workoutCounter.count.value)
const fps = computed(() => poseDetection.fps.value)
const confidence = computed(() => workoutCounter.confidence.value)
const currentClass = computed(() => workoutCounter.currClass.value)

// Handle resize
const handleResize = () => {
  const ratio = { h: 9, w: 16 }
  let widthResult = Math.min(window.innerWidth * 0.85, 1440) // 增大最大宽度到1440px，占屏幕85%
  let heightResult = Math.floor(widthResult * (ratio.h / ratio.w))
  
  if (heightResult > window.innerHeight * 0.8) { // 限制高度为屏幕80%
    heightResult = Math.floor(window.innerHeight * 0.8)
    widthResult = Math.floor(heightResult * (ratio.w / ratio.h))
  }

  screenDimensions.value = {
    width: widthResult,
    height: heightResult
  }
}

// Initialize camera
const initializeCamera = async () => {
  try {
    if (!webcamElem.value) return
    
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 360 },
      audio: false
    })
    
    webcamElem.value.srcObject = stream.value
    console.log('摄像头初始化成功')
  } catch (error) {
    console.error('摄像头初始化失败，切换到mock视频:', error)
    ElMessage.warning('摄像头不可用，自动使用测试视频文件')
    
    // 摄像头不可用时，根据运动类型选择对应的模拟视频文件
    if (webcamElem.value) {
      const mockVideoFile = props.workout === 'push-up' ? 'push-up-mock.mp4' : 'mock-video.mp4'
      webcamElem.value.src = `${window.location.origin}/mock/${mockVideoFile}`
      webcamElem.value.loop = true
      webcamElem.value.muted = true
      webcamElem.value.autoplay = true
      webcamElem.value.playsInline = true
      
      // 等待视频加载
      await new Promise<void>((resolve, reject) => {
        const video = webcamElem.value!
        
        const onLoadedData = () => {
          video.removeEventListener('loadeddata', onLoadedData)
          video.removeEventListener('error', onError)
          console.log(`测试视频加载完成！尺寸: ${video.videoWidth}x${video.videoHeight}`)
          resolve()
        }
        
        const onError = (e: Event) => {
          video.removeEventListener('loadeddata', onLoadedData)
          video.removeEventListener('error', onError)
          console.error('测试视频加载失败')
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

// Initialize AI models
const initializeAI = async () => {
  try {
    if (!webcamElem.value || !cnvPoseElem.value) return
    
    // 设置姿势检测
    poseDetection.setupElements(webcamElem.value, cnvPoseElem.value)
    
    // 创建模拟的运动规则
    const mockRules = {
      nameWorkout: props.workout,
      nameStage: ['down', 'up'],
      pathImageStage: ['./img/iconmonstr-caret-down-circle-filled-64.png', './img/iconmonstr-caret-up-circle-filled-64.png'],
      pathAudioStage: [`${window.location.origin}/audio/go-down-from-google-translate.webm`, `${window.location.origin}/audio/go-up-from-google-translate.webm`],
      anglePoint: {}
    }
    
    // 设置姿势检测器
    await poseDetection.setupDetector({
      model: 'MoveNet',
      detectorConfig: {},
      estimationConfig: {}
    })
    
    // 设置运动计数器
    await workoutCounter.setupWorkout(mockRules, {}, {})
    
    console.log('AI模型初始化成功')
  } catch (error) {
    console.error('AI模型初始化失败:', error)
  }
}

// AI Detection Loop
const aiDetectionLoop = async () => {
  if (!isRunning.value || !poseDetection.isLoop.value) return
  
  try {
    const result = await poseDetection.startDetectionLoop()
    if (result) {
      await workoutCounter.detectAnglesAndStages(result.keypoints, result.xyPoints)
      
      // 更新建议文本
      if (showAdvice.value) {
        adviceText.value = workoutCounter.getAdvice()
      }
    }
  } catch (error) {
    console.error('AI检测循环错误:', error)
  }
  
  if (isRunning.value) {
    requestAnimationFrame(aiDetectionLoop)
  }
}

// Timer callbacks
const startCountdown = async () => {
  delayTime.value = 3
  
  const countdown = async (count: number) => {
    if (count <= 0) {
      delayTime.value = 0
      startMainTimer()
      return
    }
    
    delayTime.value = count
    if (currentSettings.value.isAudioEffect) {
      try {
        await audio.playCountdownAudio(count)
      } catch (error) {
        // 忽略音频错误
        console.warn('倒计时音频播放失败:', error)
      }
    }
    
    setTimeout(() => countdown(count - 1), 1000)
  }
  
  countdown(3)
}

// Start main timer
const startMainTimer = () => {
  const durationMinutes = parseInt(props.duration.split(' ')[0])
  
  timer.setup({
    interval: 1000,
    duration: durationMinutes * 60,
    type: 'DEC',
    firstDelayDuration: 0
  })
  
  timer.start(
    undefined, // no delay callback
    undefined, // no finish delay callback  
    undefined, // timer callback handled by computed
    () => finishWorkout() // finish callback
  )
}

// Control functions
const resumeWorkout = async () => {
  if (!isRunning.value) {
    isRunning.value = true
    
    // 开始AI检测
    poseDetection.startDetection()
    
    // 开始倒计时
    await startCountdown()
    
    // 开始AI检测循环
    requestAnimationFrame(aiDetectionLoop)
  } else {
    timer.resume()
  }
  
  showResumeBtn.value = false
  showPauseBtn.value = true
  showRestartBtn.value = false
}

const pauseWorkout = () => {
  timer.pause()
  
  showResumeBtn.value = true
  showPauseBtn.value = false
  showRestartBtn.value = true
}

const restartWorkout = () => {
  isRunning.value = false
  timer.reset()
  workoutCounter.resetCount()
  poseDetection.stopDetection()
  delayTime.value = 0
  adviceText.value = ''
  
  if (imgDirectionSignElem.value) {
    imgDirectionSignElem.value.style.display = 'none'
  }
  
  showResumeBtn.value = true
  showPauseBtn.value = false
  showRestartBtn.value = false
}

const finishWorkout = async () => {
  isRunning.value = false
  finalRepetition.value = workoutCounter.count.value
  showResult.value = true
  
  // 播放完成音效
  if (currentSettings.value.isAudioEffect) {
    try {
      await audio.playAudio('timer_done')
    } catch (error) {
      // 忽略音频错误
    }
  }
  
  // 保存分数
  const scoreData = {
    nameWorkout: workoutTitle.value.split(' - ')[0],
    duration: props.duration,
    repetition: finalRepetition.value,
    date: new Date().toLocaleString()
  }
  workoutStore.addScore(scoreData)
  
  poseDetection.stopDetection()
  timer.pause()
  
  showResumeBtn.value = true
  showPauseBtn.value = false
  showRestartBtn.value = false
}

const handleResultOK = () => {
  showResult.value = false
  restartWorkout()
}

// Settings handlers
const handleSettingsSave = (settings: typeof currentSettings.value) => {
  currentSettings.value = settings
  workoutStore.updateSettings(settings)
  
  // 应用设置变化
  if (webcamElem.value) {
    webcamElem.value.style.transform = settings.isFlipCamera ? '' : 'scale(-1,1)'
  }
  
  if (settings.isFullscreen && !document.fullscreenElement) {
    document.documentElement.requestFullscreen?.()
  } else if (!settings.isFullscreen && document.fullscreenElement) {
    document.exitFullscreen?.()
  }
  
  audio.toggleAudio(settings.isAudioEffect)
}

// Lifecycle
onMounted(async () => {
  handleResize()
  window.addEventListener('resize', handleResize)
  
  // 设置音频
  audio.initWorkoutAudios()
  
  await nextTick()
  await initializeCamera()
  await initializeAI()
  
  console.log(`健身模式启动: ${props.workout}, 时长: ${props.duration}`)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  
  // 停止所有服务
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
  }
  
  timer.remove()
  poseDetection.stopDetection()
  audio.stopAllAudio()
})
</script>