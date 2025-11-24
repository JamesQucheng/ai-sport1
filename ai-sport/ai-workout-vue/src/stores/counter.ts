import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useScoreStorage, useSettingsStorage } from '@/composables/useStorage'

export const useWorkoutStore = defineStore('workout', () => {
  // Storage composables
  const scoreStorage = useScoreStorage()
  const settingsStorage = useSettingsStorage()

  // App state
  const isLoading = ref(false)
  const currentView = ref<'choose' | 'access-cam' | 'camera'>('choose')
  const isFirstPlay = ref(true)
  const isWebcamSecPlay = ref(false)
  
  // Workout configuration
  const workoutConfig = ref<any>(null)
  const currentWorkout = ref('')
  const currentDuration = ref('')
  const currentRepetition = ref(0)
  
  // Screen dimensions
  const screenDimensions = ref({
    width: 640,
    height: 360
  })

  // Actions
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setCurrentView = (view: typeof currentView.value) => {
    currentView.value = view
  }

  const setWorkoutConfig = (config: any) => {
    workoutConfig.value = config
  }

  const updateWorkout = (workout: string, duration: string) => {
    currentWorkout.value = workout
    currentDuration.value = duration
    
    // 同时更新设置
    settingsStorage.updateSettings({
      currWorkout: workout,
      currDuration: duration
    })
  }

  const addScore = (scoreData: any) => {
    scoreStorage.addScore(scoreData)
  }

  const updateSettings = (newSettings: any) => {
    settingsStorage.updateSettings(newSettings)
  }

  const updateScreenDimensions = (dimensions: { width: number; height: number }) => {
    screenDimensions.value = dimensions
  }

  // Computed properties
  const hasWorkoutConfig = computed(() => workoutConfig.value !== null)
  
  const currentWorkoutTitle = computed(() => {
    if (!currentWorkout.value || !currentDuration.value) return ''
    const workoutNames: Record<string, string> = {
      'push-up': 'Push Up',
      'squat': 'Squat'
    }
    return `${workoutNames[currentWorkout.value] || currentWorkout.value} - ${currentDuration.value}`
  })

  return {
    // Storage composables
    scoreStorage,
    settingsStorage,
    
    // State
    isLoading,
    currentView,
    isFirstPlay,
    isWebcamSecPlay,
    workoutConfig,
    currentWorkout,
    currentDuration,
    currentRepetition,
    screenDimensions,
    
    // Actions
    setLoading,
    setCurrentView,
    setWorkoutConfig,
    updateWorkout,
    addScore,
    updateSettings,
    updateScreenDimensions,
    
    // Computed
    hasWorkoutConfig,
    currentWorkoutTitle
  }
})