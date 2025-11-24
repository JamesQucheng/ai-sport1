import { ref } from 'vue'

export interface TimerConfig {
  interval: number
  duration: number
  type: 'INC' | 'DEC'
  firstDelayDuration: number
}

export function useTimer() {
  const currTime = ref(0)
  const totalTime = ref(0)
  const isRunning = ref(false)
  const isPaused = ref(false)
  const intervalId = ref<number | null>(null)
  const config = ref<TimerConfig | null>(null)

  const setup = (timerConfig: TimerConfig) => {
    config.value = timerConfig
    totalTime.value = timerConfig.duration
    currTime.value = timerConfig.type === 'DEC' ? timerConfig.duration : 0
  }

  const start = (
    delayCallback?: () => void,
    finishDelayCallback?: () => void,
    timerCallback?: () => void,
    finishCallback?: () => void
  ) => {
    if (!config.value) return

    isRunning.value = true
    isPaused.value = false

    // 开始主计时器
    intervalId.value = window.setInterval(() => {
      if (isPaused.value) return

      if (config.value!.type === 'DEC') {
        currTime.value -= 1
        if (currTime.value <= 0) {
          currTime.value = 0
          stop()
          if (finishCallback) finishCallback()
        }
      } else {
        currTime.value += 1
        if (currTime.value >= config.value!.duration) {
          currTime.value = config.value!.duration
          stop()
          if (finishCallback) finishCallback()
        }
      }

      if (timerCallback) timerCallback()
    }, config.value.interval)
  }

  const pause = () => {
    isPaused.value = true
  }

  const resume = () => {
    isPaused.value = false
  }

  const stop = () => {
    isRunning.value = false
    isPaused.value = false
    if (intervalId.value) {
      clearInterval(intervalId.value)
      intervalId.value = null
    }
  }

  const reset = () => {
    stop()
    if (config.value) {
      currTime.value = config.value.type === 'DEC' ? config.value.duration : 0
    }
  }

  const remove = () => {
    stop()
    config.value = null
    currTime.value = 0
    totalTime.value = 0
  }

  const getCurrTime = () => {
    const minutes = Math.floor(currTime.value / 60)
    const seconds = currTime.value % 60
    return { minutes, seconds }
  }

  const getCurrTimeInSec = () => currTime.value

  return {
    currTime,
    totalTime,
    isRunning,
    isPaused,
    config,
    setup,
    start,
    pause,
    resume,
    stop,
    reset,
    remove,
    getCurrTime,
    getCurrTimeInSec
  }
}