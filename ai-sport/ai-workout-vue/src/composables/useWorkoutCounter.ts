import { ref } from 'vue'
import { useClassifier } from './useClassifier'
import { useAudio } from './useAudio'
import type { Keypoint } from './usePoseDetection'

export interface WorkoutRules {
  nameWorkout: string
  nameStage: string[]
  pathImageStage: string[]
  pathAudioStage: string[]
  anglePoint: Record<string, AnglePointConfig>
}

export interface AnglePointConfig {
  spouseIdx: number[]
  rangeAngle: Array<{ min: number; max: number }>
}

export function useWorkoutCounter() {
  const count = ref(0)
  const rules = ref<WorkoutRules | null>(null)
  const currClass = ref('')
  const confidence = ref(0)
  const lastStage = ref<any>({})
  const nextStage = ref<any>({})
  const currStage = ref<any>({})
  const obsStages = ref<any[]>([])
  
  const { setup: setupClassifier, predict } = useClassifier()
  const { createAudio, playAudio } = useAudio()

  const setupWorkout = async (workoutRules: WorkoutRules, classifierConfig: any, stdConfig: any) => {
    rules.value = workoutRules
    
    // 初始化阶段
    obsStages.value = []
    rules.value.nameStage.forEach((stage, idx) => {
      obsStages.value.push({
        idStage: idx,
        nameStage: stage,
        sum: 0,
        detail: {}
      })
    })
    
    // 添加"None"阶段
    obsStages.value.push({
      idStage: -1,
      nameStage: 'None',
      sum: 0,
      detail: {}
    })
    
    // 设置音频
    createAudio('count', { src: `${window.location.origin}/audio/count-from-pixabay.webm` })
    rules.value.nameStage.forEach((stage, idx) => {
      createAudio(`stage_${stage}`, {
        src: rules.value!.pathAudioStage[idx]
      })
    })
    
    // 设置分类器
    await setupClassifier(classifierConfig, stdConfig)
  }

  const resetCount = () => {
    count.value = 0
    lastStage.value = {}
    nextStage.value = {}
    currStage.value = {}
    currClass.value = ''
    confidence.value = 0
  }

  const calculateAngle = (center: Keypoint, point1: Keypoint, point2: Keypoint): number => {
    const radians1 = Math.atan2(point1.y - center.y, point1.x - center.x)
    const radians2 = Math.atan2(point2.y - center.y, point2.x - center.x)
    let angle = Math.abs((radians2 - radians1) * (180 / Math.PI))
    
    if (angle > 180) {
      angle = 360 - angle
    }
    
    return Math.round(angle)
  }

  const detectAnglesAndStages = async (keypoints: Keypoint[], xyPoints: number[]) => {
    if (!rules.value || keypoints.length === 0) return

    // 预测分类
    if (xyPoints.length > 0) {
      const result = await predict(xyPoints)
      if (result && result.length >= 2) {
        currClass.value = result[0].confidence > result[1].confidence
          ? result[0].class
          : result[1].class
        confidence.value = Math.max(result[0].confidence, result[1].confidence)
      }
    }

    // 简化的计数逻辑 - 基于分类结果和简单的阶段检测
    if (currClass.value === rules.value.nameWorkout && confidence.value > 0.7) {
      // 模拟阶段检测
      const currentStageId = Math.floor(Date.now() / 2000) % rules.value.nameStage.length
      const currentStageName = rules.value.nameStage[currentStageId]
      
      if (lastStage.value.nameStage !== currentStageName) {
        lastStage.value = {
          idStage: currentStageId,
          nameStage: currentStageName
        }
        
        // 如果是最后一个阶段，增加计数
        if (currentStageId === rules.value.nameStage.length - 1) {
          count.value += 1
          playAudio('count')
        }
        
        // 设置下一个阶段
        const nextStageId = (currentStageId + 1) % rules.value.nameStage.length
        nextStage.value = {
          idStage: nextStageId,
          nameStage: rules.value.nameStage[nextStageId]
        }
        
        // 播放阶段提示音
        playAudio(`stage_${nextStage.value.nameStage}`)
      }
    }
  }

  const getAdvice = (): string => {
    if (!nextStage.value.nameStage) return ''
    return `<p>Move to: <b>${nextStage.value.nameStage}</b></p>`
  }

  return {
    count,
    rules,
    currClass,
    confidence,
    lastStage,
    nextStage,
    currStage,
    obsStages,
    setupWorkout,
    resetCount,
    calculateAngle,
    detectAnglesAndStages,
    getAdvice
  }
}