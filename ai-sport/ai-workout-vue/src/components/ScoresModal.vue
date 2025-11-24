<template>
  <div v-if="show" class="flex flex-row justify-center h-screen items-center bg-gray-700/50 absolute w-full z-40">
    <div class="flex flex-col items-center w-full max-h-96 h-full max-w-xs bg-white rounded-lg shadow-md overflow-hidden text-gray-600 max-h-screen">
      <!-- Tab Header -->
      <div class="flex flex-row items-center w-full font-bold">
        <div
          @click="activeTab = 'journey'"
          :class="[
            'w-1/2 text-center p-2 cursor-pointer',
            activeTab === 'journey' 
              ? 'bg-amber-300 text-gray-600' 
              : 'bg-amber-200 text-gray-400 hover:bg-amber-300 hover:text-gray-600'
          ]"
        >
          Journey
        </div>
        <div
          @click="activeTab = 'best'"
          :class="[
            'w-1/2 text-center p-2 cursor-pointer',
            activeTab === 'best' 
              ? 'bg-amber-300 text-gray-600' 
              : 'bg-amber-200 text-gray-400 hover:bg-amber-300 hover:text-gray-600'
          ]"
        >
          Best
        </div>
      </div>

      <!-- Journey Scores -->
      <div v-if="activeTab === 'journey'" class="w-full pt-3 flex-1 overflow-y-auto h-full bg-gray-100">
        <div v-if="journeyScores.length === 0" class="flex flex-row w-full h-full justify-center items-center">
          <div class="flex flex-col items-center">
            <div class="w-1/2 mb-4">
              <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="30" r="8" fill="#d1d5db"/>
                <rect x="42" y="38" width="16" height="20" fill="#d1d5db" rx="2"/>
                <rect x="38" y="58" width="6" height="15" fill="#d1d5db" rx="1"/>
                <rect x="56" y="58" width="6" height="15" fill="#d1d5db" rx="1"/>
                <rect x="30" y="45" width="6" height="10" fill="#d1d5db" rx="1"/>
                <rect x="64" y="45" width="6" height="10" fill="#d1d5db" rx="1"/>
                <text x="50" y="85" text-anchor="middle" fill="#9ca3af" font-size="8">No Data</text>
              </svg>
            </div>
            <div class="p-3 text-sm text-gray-600 text-center">
              There are no Journey Scores. Let's do Workout to change that!
            </div>
          </div>
        </div>
        
        <div v-else class="px-3">
          <div
            v-for="score in sortedJourneyScores"
            :key="score.id"
            class="mb-3 w-full border-t-2 border-yellow-200 bg-white flex flex-row justify-between px-3 py-1.5"
          >
            <div class="flex flex-col items-start justify-between">
              <div class="flex flex-row items-center">
                <div class="text-md text-gray-600 font-semibold mr-2">
                  {{ score.nameWorkout }}
                </div>
                <div class="text-xs px-1 py-0.5 bg-gray-200 rounded-lg text-gray-600 font-semibold">
                  {{ score.duration }}
                </div>
              </div>
              <div class="text-xs">{{ formatDate(score.date) }}</div>
            </div>
            <div class="flex flex-col items-center justify-between">
              <div class="text-xl font-semibold text-gray-600">{{ score.repetition }}</div>
              <div class="text-xs">Reps</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Best Scores -->
      <div v-if="activeTab === 'best'" class="w-full pt-3 px-3 flex-1 overflow-y-auto h-full bg-gray-100">
        <div v-for="(workoutScores, workoutName) in bestScores" :key="workoutName">
          <div class="mb-3 text-gray-500 font-bold border-t-2 pt-1">
            {{ workoutName }}
          </div>
          <div class="mb-3 grid grid-cols-2 gap-3 w-full">
            <div
              v-for="(score, duration) in workoutScores"
              :key="duration"
              class="flex flex-col w-full bg-white rounded-lg overflow-hidden shadow-sm"
            >
              <div class="p-1 bg-yellow-400 text-center font-medium text-sm text-gray-500">
                {{ duration }}
              </div>
              <div class="p-1 text-center text-gray-500 font-medium text-lg">
                {{ score }}<span class="text-xs"> Reps</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- OK Button -->
      <div class="flex flex-row justify-center items-center border-t-2 py-2 w-full">
        <div
          @click="closeModal"
          class="bg-yellow-500 text-white py-1.5 px-3 text-xl font-bold rounded-lg hover:bg-amber-500 cursor-pointer mr-2"
        >
          OK
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface ScoreRecord {
  id: number
  nameWorkout: string
  duration: string
  repetition: number
  date: string
}

const props = defineProps<{
  show: boolean
  scores: ScoreRecord[]
}>()

const emit = defineEmits<{
  close: []
}>()

const activeTab = ref<'journey' | 'best'>('journey')

// 计算属性
const journeyScores = computed(() => props.scores || [])

const sortedJourneyScores = computed(() => {
  return [...journeyScores.value].sort((a, b) => b.id - a.id)
})

const bestScores = computed(() => {
  const scores: Record<string, Record<string, number>> = {}
  
  // 初始化结构
  const workouts = ['Push Up', 'Squat']
  const durations = ['1 Minutes', '3 Minutes', '5 Minutes', '7 Minutes']
  
  workouts.forEach(workout => {
    scores[workout] = {}
    durations.forEach(duration => {
      scores[workout][duration] = 0
    })
  })
  
  // 计算最佳分数
  journeyScores.value.forEach(score => {
    const current = scores[score.nameWorkout]?.[score.duration]
    if (current !== undefined && (current === 0 || score.repetition > current)) {
      scores[score.nameWorkout][score.duration] = score.repetition
    }
  })
  
  return scores
})

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

const closeModal = () => {
  emit('close')
}
</script>
