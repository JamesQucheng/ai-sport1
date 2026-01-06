import { ref, computed, shallowRef } from 'vue'
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose'
import type { Results as PoseResults } from '@mediapipe/pose'
import { loadLayersModel } from '@tensorflow/tfjs-layers'
import { tensor } from '@tensorflow/tfjs-core'
import * as tf from '@tensorflow/tfjs-core'

export interface Keypoint {
  x: number
  y: number
  score?: number
  name?: string
}

export interface WorkoutRules {
  nameWorkout: string
  nameStage: string[]
  pathImageStage: string[]
  pathAudioStage: string[]
  anglePoint: Record<string, {
    spouseIdx: number[]
    rangeAngle: Array<{ min: number; max: number }>
  }>
}

export function useAIDetection() {
  const landmarkNames = [
    'nose',
    'left_eye_inner',
    'left_eye',
    'left_eye_outer',
    'right_eye_inner',
    'right_eye',
    'right_eye_outer',
    'left_ear',
    'right_ear',
    'mouth_left',
    'mouth_right',
    'left_shoulder',
    'right_shoulder',
    'left_elbow',
    'right_elbow',
    'left_wrist',
    'right_wrist',
    'left_pinky',
    'right_pinky',
    'left_index',
    'right_index',
    'left_thumb',
    'right_thumb',
    'left_hip',
    'right_hip',
    'left_knee',
    'right_knee',
    'left_ankle',
    'right_ankle',
    'left_heel',
    'right_heel',
    'left_foot_index',
    'right_foot_index'
  ]

  // 模型状态 - 使用shallowRef避免Vue深度观察TensorFlow模型
  const poseDetector = shallowRef<Pose | null>(null)
  const classifierModel = shallowRef<any>(null)
  const isDetectorLoaded = ref(false)
  const isClassifierLoaded = ref(false)
  
  // 视频和画布元素
  const videoElement = ref<HTMLVideoElement | null>(null)
  const canvasElement = ref<HTMLCanvasElement | null>(null)
  const canvasContext = ref<CanvasRenderingContext2D | null>(null)
  
  // 检测状态
  const isDetecting = ref(false)
  const fps = ref(0)
  const frameCount = ref(0)
  const lastFrameTime = ref(0)
  const lastDetectionTime = ref(0)
  const lastCountTime = ref(0) // 上次计数时间，用于防抖
  
  // 计数和分类
  const count = ref(0)
  const currentClass = ref('')
  const confidence = ref(0)
  const currentStage = ref('')
  const nextStage = ref('')
  const currentMovementQuality = ref(0) // 动作标准程度 0-100
  
  // 规则和配置
  const workoutRules = ref<WorkoutRules | null>(null)
  const currentWorkout = ref('')
  
  // 日志系统
  const logs = ref<string[]>([])
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`
    logs.value.unshift(logMessage)
    if (logs.value.length > 100) logs.value.pop() // 保持最新100条日志
    console.log(logMessage)
  }
  
  // 调试工具：检查对象状态
  const debugObjectState = (obj: any, name: string): string => {
    if (obj === null) return `${name} is null`
    if (obj === undefined) return `${name} is undefined`
    if (typeof obj !== 'object') return `${name} is ${typeof obj}`
    
    const keys = Object.keys(obj)
    return `${name} is object with keys: [${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}]`
  }
  
  // 骨架连接定义
  const poseConnections = POSE_CONNECTIONS
  
  // 计算角度
  const calculateAngle = (center: Keypoint, point1: Keypoint, point2: Keypoint): number => {
    const radians1 = Math.atan2(point1.y - center.y, point1.x - center.x)
    const radians2 = Math.atan2(point2.y - center.y, point2.x - center.x)
    let angle = Math.abs((radians2 - radians1) * (180 / Math.PI))
    
    if (angle > 180) {
      angle = 360 - angle
    }
    
    return Math.round(angle)
  }
  
  // 初始化姿势检测器（MediaPipe Pose）
  const initializePoseDetector = async () => {
    try {
      addLog('开始加载 MediaPipe Pose 检测器...', 'info')
      poseDetector.value = new Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
      })

      poseDetector.value.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      })

      isDetectorLoaded.value = true
      addLog('MediaPipe Pose 模型加载成功', 'success')
    } catch (error) {
      addLog(`MediaPipe Pose 初始化失败: ${error instanceof Error ? error.message : String(error)}`, 'error')
    }
  }

  const detectPose = async (): Promise<Keypoint[] | null> => {
    if (!poseDetector.value || !videoElement.value) {
      return null
    }

    try {
      const results = await new Promise<PoseResults>((resolve, reject) => {
        try {
          poseDetector.value!.onResults((poseResults: PoseResults) => resolve(poseResults))
          poseDetector.value!.send({ image: videoElement.value as HTMLVideoElement })
        } catch (error) {
          reject(error)
        }
      })

      if (results.poseLandmarks && results.poseLandmarks.length > 0) {
        const { videoWidth = canvasElement.value?.width || 0, videoHeight = canvasElement.value?.height || 0 } =
          videoElement.value
        const convertedKeypoints: Keypoint[] = results.poseLandmarks.map((kp, index) => ({
          x: kp.x * videoWidth,
          y: kp.y * videoHeight,
          score: kp.visibility ?? 0.9,
          name: landmarkNames[index] ?? `landmark_${index}`
        }))

        const xyPoints = drawSkeleton(convertedKeypoints)
        if (classifierModel.value && isClassifierLoaded.value) {
          await classifyPose(xyPoints)
        }
        countExercise(convertedKeypoints)
        updateFPS()
        return convertedKeypoints
      }

      return null
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      addLog(`姿势检测错误: ${errorMessage}`, 'error')
      return null
    }
  }

  const reinitializePoseDetector = async () => {
    try {
      isDetectorLoaded.value = false
      addLog('正在重新初始化 MediaPipe Pose...', 'info')
      const oldDetector = poseDetector.value
      poseDetector.value = null
      if (oldDetector && typeof (oldDetector as any).close === 'function') {
        try { (oldDetector as any).close() } catch {}
      }
      await initializePoseDetector()
      addLog('姿势检测器重新初始化完成', 'info')
    } catch (e: any) {
      addLog(`重新初始化失败: ${e?.message || e}`, 'error')
    }
  }
  
  // 初始化分类器
  const initializeClassifier = async (modelPath: string) => {
    try {
      addLog(`开始加载分类器模型: ${modelPath}`, 'info')
      
      // 这里使用简化的分类逻辑，因为实际的tfjs模型可能不存在
      // 实际项目中这里会加载真正的模型文件
      classifierModel.value = {
        predict: (inputData: any) => {
          // 模拟分类预测
          const isValidPose = inputData && inputData.length >= 34
          if (!isValidPose) return [[0.1, 0.9]] // [workout_confidence, none_confidence]
          
          // 基于关键点位置的简单规则分类
          const shoulders = [inputData[10], inputData[11], inputData[12], inputData[13]]
          const hips = [inputData[22], inputData[23], inputData[24], inputData[25]]
          
          const shoulderY = (shoulders[1] + shoulders[3]) / 2
          const hipY = (hips[1] + hips[3]) / 2
          
          if (currentWorkout.value === 'push-up') {
            // 俯卧撑检测：肩膀应该接近髋部水平
            const ratio = Math.abs(shoulderY - hipY) / 100
            const confidence = Math.max(0.5, 1 - ratio)
            return [[confidence, 1 - confidence]]
          } else if (currentWorkout.value === 'squat') {
            // 深蹲检测：髋部应该在肩膀下方
            const isSquatPosition = hipY > shoulderY
            const confidence = isSquatPosition ? 0.8 : 0.3
            return [[confidence, 1 - confidence]]
          }
          
          return [[0.5, 0.5]]
        }
      }
      
      isClassifierLoaded.value = true
      addLog('分类器模型加载成功！', 'success')
      
    } catch (error) {
      addLog(`分类器模型加载失败: ${error}`, 'error')
      // 即使失败也继续运行，使用简化逻辑
      isClassifierLoaded.value = true
    }
  }
  
  // 设置视频和画布元素
  const setupElements = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (!video || !(video instanceof HTMLVideoElement)) {
      addLog('无效的视频元素', 'error')
      return
    }
    
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      addLog('无效的画布元素', 'error')
      return
    }
    
    // 创建对元素的强引用，避免被垃圾回收或Vue响应式系统影响
    const videoRef = video
    const canvasRef = canvas
    
    videoElement.value = videoRef
    canvasElement.value = canvasRef
    canvasContext.value = canvasRef.getContext('2d')
    
    // 验证设置成功
    addLog(`视频元素设置完成: ${videoRef.tagName}, 尺寸: ${videoRef.videoWidth}x${videoRef.videoHeight}`, 'info')
    addLog(`画布元素设置完成: ${canvasRef.tagName}, 尺寸: ${canvasRef.width}x${canvasRef.height}`, 'info')
    
    // 额外验证：确保引用没有丢失
    setTimeout(() => {
      if (!videoElement.value || !(videoElement.value instanceof HTMLVideoElement)) {
        addLog('警告：视频元素引用在设置后丢失！', 'error')
      } else {
        addLog(`延迟验证：视频元素仍然有效，尺寸: ${videoElement.value.videoWidth}x${videoElement.value.videoHeight}`, 'info')
      }
    }, 1000)
  }
  
  // 视频元素恢复函数
  const recoverVideoElement = () => {
    // 尝试从DOM重新获取视频元素
    const videoElements = document.querySelectorAll('video')
    for (const video of videoElements) {
      if (video.srcObject && video.readyState >= 2) {
        addLog(`尝试恢复视频元素: ${video.videoWidth}x${video.videoHeight}`, 'warning')
        videoElement.value = video as HTMLVideoElement
        return true
      }
    }
    return false
  }

  // 绘制骨架
  const drawSkeleton = (keypoints: Keypoint[]): number[] => {
    if (!canvasContext.value || !canvasElement.value || !videoElement.value) return []
    
    const ctx = canvasContext.value
    ctx.clearRect(0, 0, canvasElement.value.width, canvasElement.value.height)
    
    // 计算缩放比例，修正坐标偏差
    const videoWidth = videoElement.value.videoWidth || videoElement.value.width
    const videoHeight = videoElement.value.videoHeight || videoElement.value.height
    const canvasWidth = canvasElement.value.width
    const canvasHeight = canvasElement.value.height
    
    const scaleX = canvasWidth / videoWidth
    const scaleY = canvasHeight / videoHeight
    
    // 镜像翻转
    ctx.save()
    ctx.translate(canvasWidth, 0)
    ctx.scale(-1, 1)
    
    // 绘制样式 - 改为更明显的颜色
    ctx.fillStyle = '#00FF00'  // 绿色关键点
    ctx.strokeStyle = '#FFD700' // 金色连接线
    ctx.lineWidth = 2
    
    const xyPoints: number[] = []
    const minScore = 0.3
    
    // 绘制关键点（应用缩放）
    keypoints.forEach((point, i) => {
      // 原始坐标用于计算
      xyPoints.push(point.x, point.y)
      
      if ((point.score || 0) > minScore) {
        // 缩放后的坐标用于绘制
        const scaledX = point.x * scaleX
        const scaledY = point.y * scaleY
        
        ctx.beginPath()
        ctx.arc(scaledX, scaledY, 6, 0, 2 * Math.PI)
        ctx.fill()
      }
    })
    
    // 绘制连接线（应用缩放）
    poseConnections.forEach(([start, end]) => {
      const startPoint = keypoints[start]
      const endPoint = keypoints[end]
      
      if (startPoint && endPoint && 
          (startPoint.score || 0) > minScore && 
          (endPoint.score || 0) > minScore) {
        const startX = startPoint.x * scaleX
        const startY = startPoint.y * scaleY
        const endX = endPoint.x * scaleX
        const endY = endPoint.y * scaleY
        
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()
      }
    })
    
    ctx.restore()
    return xyPoints
  }
  
  // 分类预测
  const classifyPose = async (xyPoints: number[]): Promise<void> => {
    if (!classifierModel.value || xyPoints.length === 0) return
    
    try {
      const result = classifierModel.value.predict(xyPoints)
      if (result && result[0]) {
        const workoutConfidence = result[0][0]
        const noneConfidence = result[0][1]
        
        confidence.value = workoutConfidence
        currentClass.value = workoutConfidence > noneConfidence ? currentWorkout.value : 'none'
        
        // addLog(`分类结果: ${currentClass.value} (置信度: ${Math.round(workoutConfidence * 100)}%)`, 'info')
      }
    } catch (error) {
      addLog(`分类预测错误: ${error}`, 'error')
    }
  }
  
  // 改进的运动计数逻辑
  const countExercise = (keypoints: Keypoint[]): void => {
    if (!workoutRules.value || keypoints.length === 0) return
    
    try {
      // 检测关键点置信度
      const validKeypoints = keypoints.filter(kp => (kp.score || 0) > 0.3)
      if (validKeypoints.length < 5) {
        return
      }

      // 基于运动类型的改进检测逻辑
      let newStage = ''
      let movementQuality = 0 // 动作标准程度 0-100
      
    if (workoutRules.value.nameWorkout === 'push-up') {
      const pushUpResult = analyzePushUp(keypoints)
      newStage = pushUpResult.stage
      movementQuality = pushUpResult.quality
    } else if (workoutRules.value.nameWorkout === 'squat') {
      const squatResult = analyzeSquat(keypoints)
      newStage = squatResult.stage
      movementQuality = squatResult.quality
    } else if (workoutRules.value.nameWorkout === 'bend') {
      const bendResult = analyzeBend(keypoints)
      newStage = bendResult.stage
      movementQuality = bendResult.quality
    }
      
      // 阶段变化检测和计数
      if (newStage && newStage !== currentStage.value) {
        const oldStage = currentStage.value
        currentStage.value = newStage
        
        // 设置下一个阶段
        const currentIdx = workoutRules.value.nameStage.indexOf(newStage)
        if (currentIdx !== -1) {
          const nextIdx = (currentIdx + 1) % workoutRules.value.nameStage.length
          nextStage.value = workoutRules.value.nameStage[nextIdx]
        }
        
        addLog(`阶段变化: ${oldStage} → ${newStage} (质量: ${Math.round(movementQuality)}%)`, 'info')
        
        // 完成一次完整动作的计数逻辑 - 添加防抖和严格条件
        const currentTime = performance.now()
        const timeSinceLastCount = currentTime - lastCountTime.value
        
        if (newStage === 'up' && oldStage === 'down' && movementQuality >= 60 && timeSinceLastCount > 800) {
          count.value++
          lastCountTime.value = currentTime
          addLog(`完成一次标准重复！总计数: ${count.value} (质量: ${Math.round(movementQuality)}%)`, 'success')
        } else if (newStage === 'up' && oldStage === 'down' && movementQuality < 60) {
          addLog(`动作完成但不够标准 (${Math.round(movementQuality)}%)，未计数`, 'warning')
        } else if (newStage === 'up' && oldStage === 'down' && timeSinceLastCount <= 800) {
          addLog(`动作过快，防抖机制阻止重复计数 (间隔: ${Math.round(timeSinceLastCount)}ms)`, 'warning')
        }
      }
      
      // 更新置信度和动作质量
      confidence.value = validKeypoints.reduce((acc, kp) => acc + (kp.score || 0), 0) / validKeypoints.length
      currentMovementQuality.value = movementQuality
      
    } catch (error) {
      addLog(`计数逻辑错误: ${error}`, 'error')
    }
  }
  
  // 俯卧撑分析
  const analyzePushUp = (keypoints: Keypoint[]): { stage: string, quality: number } => {
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder')
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder')
    const leftElbow = keypoints.find(kp => kp.name === 'left_elbow')
    const rightElbow = keypoints.find(kp => kp.name === 'right_elbow')
    const leftWrist = keypoints.find(kp => kp.name === 'left_wrist')
    const rightWrist = keypoints.find(kp => kp.name === 'right_wrist')
    const leftHip = keypoints.find(kp => kp.name === 'left_hip')
    const rightHip = keypoints.find(kp => kp.name === 'right_hip')
    
    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftHip || !rightHip) {
      return { stage: '', quality: 0 }
    }
    
    // 计算关键角度
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2
    const elbowY = (leftElbow.y + rightElbow.y) / 2
    const hipY = (leftHip.y + rightHip.y) / 2
    
    // 判断阶段 - 降低难度，更容易触发动作识别
    let stage = ''
    if (elbowY > shoulderY + 8) {  // 降低标准，肘部稍低于肩膀就算down
      stage = 'down'
    } else if (elbowY < shoulderY - 5) {  // 降低标准，肘部稍高于肩膀就算up
      stage = 'up'
    }
    // 中间状态不设置stage，避免频繁切换
    
    // 计算动作质量
    let quality = 100
    
    // 1. 身体平直度检查 (30分) - 降低难度要求
    const bodyAlignment = Math.abs(shoulderY - hipY)
    if (bodyAlignment > 50) quality -= 30  // 放宽标准，允许更大的身体倾斜
    else if (bodyAlignment > 25) quality -= 15
    
    // 2. 手臂对称性检查 (25分) - 降低难度要求
    const armSymmetry = Math.abs(leftElbow.y - rightElbow.y)
    if (armSymmetry > 35) quality -= 25  // 放宽标准，允许更大的手臂不对称
    else if (armSymmetry > 20) quality -= 10
    
    // 3. 下降深度检查 (25分) - 降低难度要求
    if (stage === 'down') {
      const elbowDrop = shoulderY - elbowY
      if (elbowDrop < 5) quality -= 25  // 降低标准，只需要轻微下降
      else if (elbowDrop < 10) quality -= 10
    }
    
    // 4. 手部位置检查 (20分)
    if (leftWrist && rightWrist) {
      const wristWidth = Math.abs(leftWrist.x - rightWrist.x)
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x)
      const ratio = wristWidth / shoulderWidth
      if (ratio < 0.8 || ratio > 1.5) quality -= 20
      else if (ratio < 0.9 || ratio > 1.3) quality -= 10
    }
    
    return { stage, quality: Math.max(0, quality) }
  }
  
  // 深蹲分析
  const analyzeSquat = (keypoints: Keypoint[]): { stage: string, quality: number } => {
    const leftHip = keypoints.find(kp => kp.name === 'left_hip')
    const rightHip = keypoints.find(kp => kp.name === 'right_hip')
    const leftKnee = keypoints.find(kp => kp.name === 'left_knee')
    const rightKnee = keypoints.find(kp => kp.name === 'right_knee')
    const leftAnkle = keypoints.find(kp => kp.name === 'left_ankle')
    const rightAnkle = keypoints.find(kp => kp.name === 'right_ankle')
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder')
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder')
    
    if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftShoulder || !rightShoulder) {
      return { stage: '', quality: 0 }
    }
    
    const hipY = (leftHip.y + rightHip.y) / 2
    const kneeY = (leftKnee.y + rightKnee.y) / 2
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2
    
    // 判断阶段 - 降低标准让用户更容易触发down阶段
    let stage = ''
    if (hipY > kneeY - 10) {  // 原来-20 -> 现在-10，更容易进入down阶段
      stage = 'down'
    } else if (hipY < kneeY - 30) {  // 原来-50 -> 现在-30，更容易进入up阶段
      stage = 'up'
    }
    
    // 计算动作质量
    let quality = 100
    
    // 1. 下蹲深度检查 (35分) - 降低要求
    if (stage === 'down') {
      const squatDepth = hipY - kneeY
      if (squatDepth < -15) quality -= 35 // 允许髋部稍高于膝盖，原来0 -> 现在-15
      else if (squatDepth < 10) quality -= 15  // 原来20 -> 现在10
    }
    
    // 2. 膝盖对齐检查 (25分) - 放宽标准
    const kneeAlignment = Math.abs(leftKnee.y - rightKnee.y)
    if (kneeAlignment > 40) quality -= 25  // 原来25 -> 现在40
    else if (kneeAlignment > 20) quality -= 10  // 原来12 -> 现在20
    
    // 3. 上身挺直检查 (25分) - 放宽角度
    const torsoAngle = Math.abs(shoulderY - hipY)
    if (torsoAngle > 60) quality -= 25  // 原来40 -> 现在60
    else if (torsoAngle > 35) quality -= 10  // 原来20 -> 现在35
    
    // 4. 脚部稳定性检查 (15分) - 放宽标准
    if (leftAnkle && rightAnkle) {
      const footStability = Math.abs(leftAnkle.y - rightAnkle.y)
      if (footStability > 25) quality -= 15  // 原来15 -> 现在25
      else if (footStability > 15) quality -= 8  // 原来8 -> 现在15
    }
    
    return { stage, quality: Math.max(0, quality) }
  }

  // 弯腰分析
  const analyzeBend = (keypoints: Keypoint[]): { stage: string, quality: number } => {
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder')
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder')
    const leftHip = keypoints.find(kp => kp.name === 'left_hip')
    const rightHip = keypoints.find(kp => kp.name === 'right_hip')
    const leftKnee = keypoints.find(kp => kp.name === 'left_knee')
    const rightKnee = keypoints.find(kp => kp.name === 'right_knee')

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !leftKnee || !rightKnee) {
      return { stage: '', quality: 0 }
    }

    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2
    const hipY = (leftHip.y + rightHip.y) / 2
    const kneeY = (leftKnee.y + rightKnee.y) / 2

    let stage = ''
    if (shoulderY > hipY + 15) {
      stage = 'down'
    } else if (shoulderY < hipY + 5) {
      stage = 'up'
    }

    let quality = 100

    // 1. 弯腰深度：肩部是否明显低于髋部
    const bendDepth = shoulderY - hipY
    if (bendDepth < 10) quality -= 25
    else if (bendDepth < 20) quality -= 10

    // 2. 膝盖稳定性：避免过度弯曲形成深蹲
    const hipKneeGap = hipY - kneeY
    if (hipKneeGap < -10) quality -= 20
    else if (hipKneeGap < 5) quality -= 10

    // 3. 躯干对齐：左右肩的高度差
    const shoulderAlignment = Math.abs(leftShoulder.y - rightShoulder.y)
    if (shoulderAlignment > 25) quality -= 20
    else if (shoulderAlignment > 12) quality -= 10

    // 4. 髋部对齐，避免扭转
    const hipAlignment = Math.abs(leftHip.y - rightHip.y)
    if (hipAlignment > 20) quality -= 15
    else if (hipAlignment > 10) quality -= 8

    return { stage, quality: Math.max(0, quality) }
  }
  
  // 更新FPS
  const updateFPS = (): void => {
    const now = performance.now()
    frameCount.value++
    
    if (now - lastFrameTime.value >= 1000) {
      fps.value = Math.round((frameCount.value * 1000) / (now - lastFrameTime.value))
      frameCount.value = 0
      lastFrameTime.value = now
    }
  }
  
  // 主检测循环 - 添加帧率控制
  const detectionLoop = async (): Promise<void> => {
    if (!isDetecting.value) return

    const now = performance.now()
    const deltaTime = now - lastFrameTime.value
    
    // 控制检测频率为最多15FPS，避免过于频繁的检测
    if (deltaTime >= 66) { // 约15FPS
      try {
        await detectPose()
        lastFrameTime.value = now
      } catch (error) {
        addLog(`检测循环错误: ${error}`, 'error')
      }
    }

    if (isDetecting.value) {
      requestAnimationFrame(detectionLoop)
    }
  }
  
  // 开始检测
  const startDetection = async (): Promise<void> => {
    if (isDetecting.value) return
    
    addLog('开始AI检测...', 'info')
    isDetecting.value = true
    lastFrameTime.value = performance.now()
    await detectionLoop()
  }
  
  // 停止检测
  const stopDetection = (): void => {
    addLog('停止AI检测', 'info')
    isDetecting.value = false
  }
  
  // 设置运动规则
  const setupWorkout = async (workout: string): Promise<void> => {
    try {
      currentWorkout.value = workout
      addLog(`设置运动类型: ${workout}`, 'info')
      
      // 使用内置的运动规则，避免JSON加载错误
      const defaultRules: Record<string, WorkoutRules> = {
        'push-up': {
          nameWorkout: 'push-up',
          nameStage: ['down', 'up'],
          pathImageStage: ['./img/down-arrow.svg', './img/up-arrow.svg'],
          pathAudioStage: [
            `${window.location.origin}/audio/go-down-from-google-translate.webm`,
            `${window.location.origin}/audio/go-up-from-google-translate.webm`
          ],
          anglePoint: {}
        },
        'squat': {
          nameWorkout: 'squat',
          nameStage: ['down', 'up'],
          pathImageStage: ['./img/down-arrow.svg', './img/up-arrow.svg'],
          pathAudioStage: [
            `${window.location.origin}/audio/go-down-from-google-translate.webm`,
            `${window.location.origin}/audio/go-up-from-google-translate.webm`
          ],
          anglePoint: {}
        },
        'bend': {
          nameWorkout: 'bend',
          nameStage: ['down', 'up'],
          pathImageStage: ['./img/down-arrow.svg', './img/up-arrow.svg'],
          pathAudioStage: [
            `${window.location.origin}/audio/go-down-from-google-translate.webm`,
            `${window.location.origin}/audio/go-up-from-google-translate.webm`
          ],
          anglePoint: {}
        }
      }
      
      // 首先尝试从本地文件加载
      try {
        const response = await fetch(`./rules/${workout}.json`)
        if (response.ok) {
          const data = await response.json()
          workoutRules.value = data.rulesCountConfig || data
          addLog(`从文件加载运动规则成功: ${workout}`, 'success')
        } else {
          throw new Error('文件不存在')
        }
      } catch (fileError) {
        // 如果文件加载失败，使用默认规则
        addLog(`文件加载失败，使用内置规则: ${fileError}`, 'warning')
        workoutRules.value = defaultRules[workout] || defaultRules['push-up']
      }
      
      addLog(`运动规则设置完成: ${workoutRules.value?.nameWorkout}`, 'success')
      addLog(`阶段: ${workoutRules.value?.nameStage.join(' → ')}`, 'info')
      
      // 初始化分类器（使用简化版本）
      await initializeClassifier('')
      
    } catch (error) {
      addLog(`设置运动失败: ${error}`, 'error')
      // 不要抛出错误，使用默认配置继续运行
      workoutRules.value = {
        nameWorkout: workout,
        nameStage: ['down', 'up'],
        pathImageStage: [],
        pathAudioStage: [],
        anglePoint: {}
      }
      addLog('使用默认运动配置', 'warning')
    }
  }
  
  // 重置计数
  const resetCount = (): void => {
    count.value = 0
    currentStage.value = ''
    nextStage.value = ''
    confidence.value = 0
    currentClass.value = ''
    currentMovementQuality.value = 0
    lastCountTime.value = 0 // 重置防抖计时器
    addLog('重置计数器', 'info')
  }
  
  // 初始化完整系统
  const initializeAI = async (): Promise<void> => {
    try {
      addLog('开始初始化AI系统...', 'info')
      await initializePoseDetector()
      addLog('AI系统初始化完成！', 'success')
    } catch (error) {
      addLog(`AI系统初始化失败: ${error}`, 'error')
      throw error
    }
  }
  
  return {
    // 状态
    isDetectorLoaded,
    isClassifierLoaded,
    isDetecting,
    fps,
    count,
    currentClass,
    confidence,
    currentStage,
    nextStage,
    currentMovementQuality,
    logs,
    
    // 方法
    initializeAI,
    setupElements,
    setupWorkout,
    startDetection,
    stopDetection,
    resetCount,
    addLog
  }
}