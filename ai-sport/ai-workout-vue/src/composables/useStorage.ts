import { ref, watch } from 'vue'

export interface ScoreData {
  id: number
  nameWorkout: string
  duration: string
  repetition: number
  date: string
}

export interface SettingsData {
  currWorkout: string
  currDuration: string
  isAudioEffect: boolean
  isFullscreen: boolean
  isFlipCamera: boolean
  isDirectionSign: boolean
  isDeveloperMode: boolean
}

const defaultSettings: SettingsData = {
  currWorkout: 'push-up',
  currDuration: '3 Minutes',
  isAudioEffect: true,
  isFullscreen: false,
  isFlipCamera: false,
  isDirectionSign: true,
  isDeveloperMode: false
}

export function useScoreStorage() {
  const scores = ref<ScoreData[]>([])

  const loadScores = () => {
    try {
      const saved = localStorage.getItem('DBWOScore')
      scores.value = saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Error loading scores:', error)
      scores.value = []
    }
  }

  const saveScores = () => {
    try {
      localStorage.setItem('DBWOScore', JSON.stringify(scores.value))
    } catch (error) {
      console.error('Error saving scores:', error)
    }
  }

  const addScore = (score: Omit<ScoreData, 'id'>) => {
    const newScore: ScoreData = {
      ...score,
      id: Date.now()
    }
    scores.value.push(newScore)
    saveScores()
  }

  const clearScores = () => {
    scores.value = []
    saveScores()
  }

  // 初始化加载
  loadScores()

  return {
    scores,
    loadScores,
    saveScores,
    addScore,
    clearScores
  }
}

export function useSettingsStorage() {
  const settings = ref<SettingsData>({ ...defaultSettings })
  const isGetPrevSettings = ref(false)

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('DBWOSettings')
      if (saved) {
        const parsedSettings = JSON.parse(saved)
        settings.value = { ...defaultSettings, ...parsedSettings }
        isGetPrevSettings.value = true
      } else {
        settings.value = { ...defaultSettings }
        isGetPrevSettings.value = false
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      settings.value = { ...defaultSettings }
      isGetPrevSettings.value = false
    }
  }

  const saveSettings = () => {
    try {
      localStorage.setItem('DBWOSettings', JSON.stringify(settings.value))
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const updateSettings = (newSettings: Partial<SettingsData>) => {
    settings.value = { ...settings.value, ...newSettings }
    saveSettings()
  }

  const resetSettings = () => {
    settings.value = { ...defaultSettings }
    saveSettings()
  }

  // 监听设置变化自动保存
  watch(settings, saveSettings, { deep: true })

  // 初始化加载
  loadSettings()

  return {
    settings,
    isGetPrevSettings,
    loadSettings,
    saveSettings,
    updateSettings,
    resetSettings
  }
}