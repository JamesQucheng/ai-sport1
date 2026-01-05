import { ref, shallowRef } from 'vue'

export interface AudioConfig {
  src: string
  volume?: number
}

export class AudioHandler {
  private audio: HTMLAudioElement
  public isLoaded: boolean = false
  public src: string

  constructor(config: AudioConfig) {
    this.src = config.src
    this.audio = new Audio()
    this.audio.preload = 'auto'
    this.audio.volume = config.volume || 0.7
  }

  setup(): void {
    this.audio.src = this.src
    this.audio.addEventListener('canplaythrough', () => {
      this.isLoaded = true
    })
    this.audio.addEventListener('error', () => {
      // 忽略音频加载错误，继续运行
      this.isLoaded = false
    })
  }

  async play(): Promise<void> {
    try {
      if (this.audio) {
        this.audio.currentTime = 0
        await this.audio.play()
      }
    } catch (error) {
      // 忽略播放错误
      console.warn('Audio play failed:', this.src)
    }
  }

  stop(): void {
    try {
      if (this.audio) {
        this.audio.pause()
        this.audio.currentTime = 0
      }
    } catch (error) {
      // 忽略停止错误
    }
  }
}

export function useAudio() {
  const audioInstances = shallowRef<Map<string, AudioHandler>>(new Map())
  const isAudioEnabled = ref(true)
  
  const createAudio = (key: string, config: AudioConfig): AudioHandler => {
    if (audioInstances.value.has(key)) {
      return audioInstances.value.get(key)!
    }
    
    const audioHandler = new AudioHandler(config)
    audioHandler.setup()
    audioInstances.value.set(key, audioHandler)
    return audioHandler
  }
  
  const playAudio = async (key: string): Promise<void> => {
    if (!isAudioEnabled.value) return
    
    const audio = audioInstances.value.get(key)
    if (audio) {
      await audio.play()
    }
  }
  
  const stopAudio = (key: string): void => {
    const audio = audioInstances.value.get(key)
    if (audio) {
      audio.stop()
    }
  }
  
  const stopAllAudio = (): void => {
    audioInstances.value.forEach(audio => audio.stop())
  }
  
  const toggleAudio = (enabled?: boolean): void => {
    isAudioEnabled.value = enabled !== undefined ? enabled : !isAudioEnabled.value
    if (!isAudioEnabled.value) {
      stopAllAudio()
    }
  }
  
  // 初始化所有运动音效
  const initWorkoutAudios = (): void => {
    console.log('正在初始化运动音频文件...')
    
    // 获取当前服务器的基础URL
    const baseUrl = window.location.origin
    
    const audioConfigs = [
      // 倒计时音效
      { key: 'count-3', src: `${baseUrl}/audio/three-from-google-translate.webm`, volume: 0.8 },
      { key: 'count-2', src: `${baseUrl}/audio/two-from-google-translate.webm`, volume: 0.8 },
      { key: 'count-1', src: `${baseUrl}/audio/one-from-google-translate.webm`, volume: 0.8 },
      { key: 'start', src: `${baseUrl}/audio/start-from-google-translate.webm`, volume: 0.8 },
      
      // 动作指导音效
      { key: 'go-up', src: `${baseUrl}/audio/go-up-from-google-translate.webm`, volume: 0.7 },
      { key: 'go-down', src: `${baseUrl}/audio/go-down-from-google-translate.webm`, volume: 0.7 },
      { key: 'up', src: `${baseUrl}/audio/go-up-from-google-translate.webm`, volume: 0.7 },
      { key: 'down', src: `${baseUrl}/audio/go-down-from-google-translate.webm`, volume: 0.7 },
      
      // 计数和提示音效
      { key: 'count', src: `${baseUrl}/audio/count-from-pixabay.webm`, volume: 0.6 },
      { key: 'done', src: `${baseUrl}/audio/done-from-freesound.webm`, volume: 0.8 },
      { key: 'timer_done', src: `${baseUrl}/audio/done-from-freesound.webm`, volume: 0.8 },
      
      // 阶段指导音效
      { key: 'stage_down', src: `${baseUrl}/audio/go-down-from-google-translate.webm`, volume: 0.7 },
      { key: 'stage_up', src: `${baseUrl}/audio/go-up-from-google-translate.webm`, volume: 0.7 },
    ]
    
    // 创建所有音频实例
    audioConfigs.forEach(config => {
      createAudio(config.key, { src: config.src, volume: config.volume })
    })
    
    console.log('音频文件初始化完成。')
  }
  
  // 播放倒计时音频
  const playCountdownAudio = async (count: number): Promise<void> => {
    if (!isAudioEnabled.value) return
    
    const keyMap: { [key: number]: string } = {
      3: 'count-3',
      2: 'count-2',
      1: 'count-1',
      0: 'start'
    }
    
    if (keyMap[count]) {
      await playAudio(keyMap[count])
    }
  }
  
  // 播放动作指导音频
  const playActionAudio = async (action: 'up' | 'down'): Promise<void> => {
    if (!isAudioEnabled.value) return
    await playAudio(action === 'up' ? 'go-up' : 'go-down')
  }
  
  // 播放计数音频
  const playCountAudio = async (): Promise<void> => {
    if (!isAudioEnabled.value) return
    await playAudio('count')
  }
  
  // 播放完成音频
  const playDoneAudio = async (): Promise<void> => {
    if (!isAudioEnabled.value) return
    await playAudio('done')
  }
  
  // 播放阶段指导音频
  const playStageAudio = async (stage: string): Promise<void> => {
    if (!isAudioEnabled.value) return
    await playAudio(`stage_${stage}`)
  }
  
  return {
    audioInstances,
    isAudioEnabled,
    createAudio,
    playAudio,
    stopAudio,
    stopAllAudio,
    toggleAudio,
    initWorkoutAudios,
    playCountdownAudio,
    playActionAudio,
    playCountAudio,
    playDoneAudio,
    playStageAudio
  }
}