import { ref, shallowRef } from 'vue'
import * as poseDetection from '@tensorflow-models/pose-detection'
import { tensorflowManager, waitForTensorFlow } from '@/utils/tensorflowManager'

export interface Keypoint {
  x: number
  y: number
  score?: number
  name?: string
}

export interface PoseDetectorConfig {
  model: string
  detectorConfig: any
  estimationConfig: any
}

export function usePoseDetection() {
  const detector = shallowRef<poseDetection.PoseDetector | null>(null)
  const isModelLoaded = ref(false)
  const webcamElem = ref<HTMLVideoElement | null>(null)
  const canvasElem = ref<HTMLCanvasElement | null>(null)
  const ctx = ref<CanvasRenderingContext2D | null>(null)
  const isLoop = ref(false)
  const fps = ref(0)
  const frameCount = ref(0)
  const times = ref<number[]>([])

  // 骨架连接定义
  const connections = [
    [0, 1], [0, 2], [1, 3], [2, 4], // 头部
    [5, 7], [7, 9], [6, 8], [8, 10], // 手臂
    [5, 6], [5, 11], [6, 12], // 躯干
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16] // 腿部
  ]

  // 检查本地模型文件是否存在
  const checkLocalModelExists = async (): Promise<boolean> => {
    try {
      console.log('正在检查本地模型文件是否存在...')
      const response = await fetch('/tfjs-model/movenet/lightning/model.json', { method: 'HEAD' })
      console.log('本地模型检查响应:', response.status, response.ok)
      return response.ok
    } catch (error) {
      console.log('本地模型检查失败:', error)
      return false
    }
  }

  const setupDetector = async (config: PoseDetectorConfig) => {
    try {
      // 等待 TensorFlow.js 初始化完成
      const tfStatus = await waitForTensorFlow()
      
      if (!tfStatus.isInitialized) {
        throw new Error(`TensorFlow.js 未初始化: ${tfStatus.error || '未知错误'}`)
      }
      
      console.log(`TensorFlow.js 已准备，backend: ${tfStatus.backend}`)
      
      const model = poseDetection.SupportedModels.MoveNet
      const modelOptions: any = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
      }
      
      // 自动检测本地模型是否存在
      const hasLocalModel = await checkLocalModelExists()
      console.log('本地模型检测结果:', hasLocalModel)
      
      if (hasLocalModel) {
        modelOptions.modelUrl = '/tfjs-model/movenet/lightning/model.json'
        console.log('检测到本地MoveNet模型，使用本地模型，modelUrl:', modelOptions.modelUrl)
      } else {
        console.log('未检测到本地模型，使用远程MoveNet模型')
      }
      
      console.log('开始创建检测器，配置:', modelOptions)
      detector.value = await poseDetection.createDetector(model, modelOptions)
      isModelLoaded.value = true
      console.log('姿势检测模型加载成功')
    } catch (error) {
      console.error('姿势检测模型加载失败:', error)
      // 如果本地模型加载失败，尝试使用远程模型
      if (error.message && error.message.includes('model.json')) {
        console.log('本地模型加载失败，回退到远程模型')
        try {
          const model = poseDetection.SupportedModels.MoveNet
          detector.value = await poseDetection.createDetector(model, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
          })
          isModelLoaded.value = true
          console.log('远程模型加载成功')
        } catch (fallbackError) {
          console.error('远程模型也加载失败:', fallbackError)
        }
      }
    }
  }

  const setupElements = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    webcamElem.value = video
    canvasElem.value = canvas
    ctx.value = canvas.getContext('2d')
  }

  const detectPose = async (): Promise<Keypoint[]> => {
    if (!detector.value || !webcamElem.value || !isModelLoaded.value) {
      return []
    }

    try {
      // 检查 TensorFlow.js 状态
      if (!tensorflowManager.isReady()) {
        console.warn('TensorFlow.js 未准备就绪，跳过此帧')
        return []
      }
      
      const poses = await detector.value.estimatePoses(webcamElem.value)
      if (poses && poses.length > 0) {
        return poses[0].keypoints as Keypoint[]
      }
      return []
    } catch (error) {
      console.error('姿势检测错误:', error)
      return []
    }
  }

  const drawSkeleton = (keypoints: Keypoint[]): number[] => {
    if (!ctx.value || !canvasElem.value) return []

    ctx.value.clearRect(0, 0, canvasElem.value.width, canvasElem.value.height)
    
    // 翻转画布
    ctx.value.save()
    ctx.value.translate(canvasElem.value.width, 0)
    ctx.value.scale(-1, 1)

    // 绘制关键点和连接线
    ctx.value.fillStyle = '#00FFFF'
    ctx.value.strokeStyle = '#00FFFF'
    ctx.value.lineWidth = 3

    const xyPoints: number[] = []
    
    keypoints.forEach((point, i) => {
      xyPoints.push(point.x, point.y)
      
      if ((point.score || 0) > 0.3) {
        // 绘制关键点
        ctx.value!.beginPath()
        ctx.value!.arc(point.x, point.y, 5, 0, 2 * Math.PI)
        ctx.value!.fill()
      }
    })

    // 绘制连接线
    connections.forEach(([start, end]) => {
      const startPoint = keypoints[start]
      const endPoint = keypoints[end]
      
      if (startPoint && endPoint && 
          (startPoint.score || 0) > 0.3 && 
          (endPoint.score || 0) > 0.3) {
        ctx.value!.beginPath()
        ctx.value!.moveTo(startPoint.x, startPoint.y)
        ctx.value!.lineTo(endPoint.x, endPoint.y)
        ctx.value!.stroke()
      }
    })

    ctx.value.restore()
    return xyPoints
  }

  const updateFPS = () => {
    const now = performance.now()
    while (times.value.length > 0 && times.value[0] <= now - 1000) {
      times.value.shift()
    }
    times.value.push(now)
    fps.value = times.value.length
    frameCount.value++
  }

  const startDetectionLoop = async () => {
    if (!isLoop.value) return

    try {
      const keypoints = await detectPose()
      if (keypoints.length > 0) {
        const xyPoints = drawSkeleton(keypoints)
        updateFPS()
        return { keypoints, xyPoints }
      }
    } catch (error) {
      console.error('检测循环错误:', error)
    }

    if (isLoop.value) {
      requestAnimationFrame(startDetectionLoop)
    }
  }

  const startDetection = () => {
    isLoop.value = true
    startDetectionLoop()
  }

  const stopDetection = () => {
    isLoop.value = false
  }

  return {
    detector,
    isModelLoaded,
    webcamElem,
    canvasElem,
    ctx,
    isLoop,
    fps,
    frameCount,
    times,
    connections,
    setupDetector,
    setupElements,
    detectPose,
    drawSkeleton,
    updateFPS,
    startDetection,
    stopDetection,
    startDetectionLoop
  }
}