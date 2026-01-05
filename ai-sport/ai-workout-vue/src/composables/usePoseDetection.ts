import { ref, shallowRef } from 'vue'
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose'
import type { Results as PoseResults } from '@mediapipe/pose'

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
  const detector = shallowRef<Pose | null>(null)
  const isModelLoaded = ref(false)
  const webcamElem = ref<HTMLVideoElement | null>(null)
  const canvasElem = ref<HTMLCanvasElement | null>(null)
  const ctx = ref<CanvasRenderingContext2D | null>(null)
  const isLoop = ref(false)
  const fps = ref(0)
  const frameCount = ref(0)
  const times = ref<number[]>([])

  // 骨架连接定义
  const connections = POSE_CONNECTIONS

  const setupDetector = async (_config: PoseDetectorConfig) => {
    try {
      detector.value = new Pose({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
      })

      detector.value.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      })

      isModelLoaded.value = true
      console.log('MediaPipe Pose 模型加载成功')
    } catch (error) {
      console.error('MediaPipe Pose 模型加载失败:', error)
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
      const poseResult = await new Promise<PoseResults>((resolve, reject) => {
        try {
          detector.value!.onResults((results: PoseResults) => resolve(results))
          detector.value!.send({ image: webcamElem.value as HTMLVideoElement })
        } catch (error) {
          reject(error)
        }
      })

      if (poseResult.poseLandmarks && poseResult.poseLandmarks.length > 0) {
        const { videoWidth = canvasElem.value?.width || 0, videoHeight = canvasElem.value?.height || 0 } = webcamElem.value
        return poseResult.poseLandmarks.map((landmark, index) => ({
          x: landmark.x * videoWidth,
          y: landmark.y * videoHeight,
          score: landmark.visibility ?? 0.9,
          name: `landmark_${index}`
        }))
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