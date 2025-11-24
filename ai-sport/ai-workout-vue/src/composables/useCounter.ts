import { ref, type Ref } from 'vue'
import { AudioHandler } from './useAudio'

export interface RulesConfig {
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

export interface Keypoint {
  x: number
  y: number
  score?: number
  name?: string
}

export interface Stage {
  idStage: number
  nameStage: string
  sum: number
  detail: Record<string, { name: string; angle: number }>
}

export interface StageInfo {
  statusStage: string
  idStage: number
  nameStage: string
}

export function useCounter(ctxPose: CanvasRenderingContext2D | null = null) {
  const count: Ref<number> = ref(0)
  const rules: Ref<RulesConfig | null> = ref(null)
  const lastStage: Ref<Partial<StageInfo>> = ref({})
  const nextStage: Ref<Partial<StageInfo>> = ref({})
  const currStage: Ref<Partial<StageInfo>> = ref({})
  const sumObsPoints: Ref<number> = ref(0)
  const obsStages: Ref<Stage[]> = ref([])
  const listAngles: Ref<Array<[number, number, number]>> = ref([])
  const isNewAssetsImgStages: Ref<boolean> = ref(false)
  const isPlayAudStage: Ref<boolean> = ref(true)
  const listAudStages: Ref<Record<string, AudioHandler>> = ref({})
  
  // Audio for counting
  const audCount = new AudioHandler({
    src: `${window.location.origin}/audio/count-from-pixabay.webm`,
  })
  audCount.setup()

  const initStage = (): void => {
    currStage.value = {}
    obsStages.value = []
    sumObsPoints.value = 0
    
    if (!rules.value) return
    
    rules.value.nameStage.forEach((stage, idx) => {
      obsStages.value.push({
        idStage: idx,
        nameStage: stage,
        sum: 0,
        detail: {},
      })
    })
    obsStages.value.push({
      idStage: -1,
      nameStage: 'None',
      sum: 0,
      detail: {},
    }) // Last stage (other)
  }

  const setup = (rulesConfig: RulesConfig): void => {
    rules.value = rulesConfig
    isNewAssetsImgStages.value = true
    initStage()
    
    // Setup audio for each stage
    rules.value.nameStage.forEach((stage, idx) => {
      listAudStages.value[stage] = new AudioHandler({
        src: rules.value!.pathAudioStage[idx],
      })
      listAudStages.value[stage].setup()
    })
  }

  const resetCount = (): void => {
    count.value = 0
  }

  const determineCurrStage = (): void => {
    if (obsStages.value.length === 0) return
    
    // Sort Observation Stages by sum / number of anglepoint each stage
    const sortObsStages = [...obsStages.value].sort((a, b) => b.sum - a.sum)
    const statusStage = sortObsStages[0].sum === sumObsPoints.value ? 'FULL' : 'PARTIAL'
    
    currStage.value = {
      statusStage,
      idStage: sortObsStages[0].idStage,
      nameStage: sortObsStages[0].nameStage,
    }
    
    if (
      statusStage === 'FULL' &&
      currStage.value.nameStage !== lastStage.value.nameStage &&
      currStage.value.idStage === (rules.value?.nameStage.length || 0) - 1
    ) {
      count.value += 1
      if (isPlayAudStage.value && audCount.isLoaded) {
        audCount.play()
      }
    }
    
    if (
      statusStage === 'FULL' &&
      sortObsStages[0].nameStage !== 'None' &&
      (Object.keys(lastStage.value).length === 0 ||
        lastStage.value.nameStage !== sortObsStages[0].nameStage)
    ) {
      lastStage.value = {
        idStage: sortObsStages[0].idStage,
        nameStage: sortObsStages[0].nameStage,
      }
      
      const nextIdStage =
        lastStage.value.idStage! + 1 !== (rules.value?.nameStage.length || 0)
          ? lastStage.value.idStage! + 1
          : 0
      
      nextStage.value = {
        idStage: nextIdStage,
        nameStage: rules.value?.nameStage[nextIdStage],
      }
    }
  }

  const getAdvice = (): string => {
    if (Object.keys(nextStage.value).length === 0 || !rules.value) return ''
    
    let advice = ''
    let counter = 1

    const listIdxTrueAngle = obsStages.value[nextStage.value.idStage!]?.detail || {}

    obsStages.value.forEach((stage) => {
      if (stage.nameStage === nextStage.value.nameStage) return
      
      Object.keys(stage.detail).forEach((idKeypoint) => {
        if (idKeypoint in listIdxTrueAngle) return

        if (counter === 1) {
          advice += `<p>To move ${nextStage.value.nameStage} :</p>`
        }

        const rangeAngle = rules.value!.anglePoint[idKeypoint]?.rangeAngle
        if (rangeAngle && nextStage.value.idStage !== undefined) {
          advice += `<p>${counter}) Angle <b>${stage.detail[idKeypoint].name
            .split('_')
            .map((name) => name.charAt(0).toUpperCase() + name.substr(1))
            .join(' ')}</b> (${stage.detail[idKeypoint].angle}°) must between ${
            rangeAngle[nextStage.value.idStage].min
          }° and ${rangeAngle[nextStage.value.idStage].max}°</p>`
        }

        counter += 1
      })
    })
    return advice
  }

  const detectAnglesAndStages = (keypoints: Keypoint[], classPredict: string): void => {
    if (!rules.value || !ctxPose || classPredict !== rules.value.nameWorkout) return
    
    keypoints.forEach((oriPoint, idx) => {
      const idxStr = idx.toString()
      if (!(idxStr in rules.value!.anglePoint)) return
      
      const { spouseIdx, rangeAngle } = rules.value!.anglePoint[idxStr]
      const spousePointA = keypoints[spouseIdx[0]]
      const spousePointB = keypoints[spouseIdx[1]]
      
      let gradientLineA = Math.atan2(
        spousePointA.y - oriPoint.y,
        spousePointA.x - oriPoint.x
      )
      let gradientLineB = Math.atan2(
        spousePointB.y - oriPoint.y,
        spousePointB.x - oriPoint.x
      )
      let degAngle =
        parseInt(
          ((gradientLineB - gradientLineA) / Math.PI) * 180 + 360 + '',
          10
        ) % 360

      ctxPose.moveTo(oriPoint.x, oriPoint.y)

      if (degAngle > 180) {
        degAngle = 360 - degAngle
        ;[gradientLineA, gradientLineB] = [gradientLineB, gradientLineA]
      }

      ctxPose.arc(
        oriPoint.x,
        oriPoint.y,
        20,
        gradientLineA,
        gradientLineB
      )
      ctxPose.fill()

      listAngles.value.push([degAngle, oriPoint.x + 5, oriPoint.y])
      
      // Check angle for classify stage
      sumObsPoints.value += 1
      let isStageNone = true
      
      rangeAngle.forEach((range, idStage) => {
        if (degAngle >= range.min && degAngle <= range.max) {
          obsStages.value[idStage].sum += 1
          obsStages.value[idStage].detail[idxStr] = {
            name: keypoints[idx].name || `point_${idx}`,
            angle: degAngle,
          }
          isStageNone = false
        }
      })
      
      if (isStageNone) {
        const lastIdx = obsStages.value.length - 1
        obsStages.value[lastIdx].sum += 1
        obsStages.value[lastIdx].detail[idxStr] = {
          name: keypoints[idx].name || `point_${idx}`,
          angle: degAngle,
        }
      }
    })
    
    determineCurrStage()
  }

  return {
    count,
    rules,
    lastStage,
    nextStage,
    currStage,
    sumObsPoints,
    obsStages,
    listAngles,
    isNewAssetsImgStages,
    isPlayAudStage,
    listAudStages,
    audCount,
    initStage,
    setup,
    resetCount,
    determineCurrStage,
    getAdvice,
    detectAnglesAndStages
  }
}
