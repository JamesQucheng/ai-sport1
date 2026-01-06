<template>
  <div v-if="show" class="flex flex-row justify-center h-screen items-center bg-gray-700/50 absolute w-full z-40">
    <div class="flex flex-col items-center w-full max-h-96 h-full max-w-xs bg-white rounded-lg shadow-md overflow-hidden text-gray-600 max-h-screen">
      <!-- Tab Header -->
      <div class="flex flex-row items-center w-full font-bold">
        <div
          @click="activeTab = 'workout'"
          :class="[
            'w-1/2 text-center p-2 cursor-pointer',
            activeTab === 'workout' 
              ? 'bg-amber-300 text-gray-600' 
              : 'bg-amber-200 text-gray-400 hover:bg-amber-300 hover:text-gray-600'
          ]"
        >
          Workout
        </div>
        <div
          @click="activeTab = 'advanced'"
          :class="[
            'w-1/2 text-center p-2 cursor-pointer',
            activeTab === 'advanced' 
              ? 'bg-amber-300 text-gray-600' 
              : 'bg-amber-200 text-gray-400 hover:bg-amber-300 hover:text-gray-600'
          ]"
        >
          Advanced
        </div>
      </div>

      <!-- Workout Settings -->
      <div v-if="activeTab === 'workout'" class="w-full p-3 flex-1 overflow-y-auto h-full">
        <div class="mb-3">What workout do you want?</div>
        
        <fieldset class="grid grid-cols-2 gap-3 w-full mb-4">
          <label
            v-for="(workout, idx) in workoutOptions.names"
            :key="workout"
            :for="`settings-workout-${idx}`"
            class="flex cursor-pointer items-center pl-4 border border-gray-200 rounded-lg"
          >
            <input
              :id="`settings-workout-${idx}`"
              type="radio"
              :value="workoutOptions.slugs[idx]"
              v-model="localSettings.currWorkout"
              name="settingsWorkout"
              class="w-4 h-4 text-yellow-600"
            />
            <span class="w-full py-4 ml-2 text-sm font-medium text-gray-600">
              {{ workout }}
            </span>
          </label>
        </fieldset>

        <div class="mb-3">How long?</div>
        
        <fieldset class="grid grid-cols-2 gap-3 w-full">
          <label
            v-for="(duration, idx) in workoutOptions.durations"
            :key="duration"
            :for="`settings-duration-${idx}`"
            class="flex cursor-pointer items-center pl-4 border border-gray-200 rounded-lg"
          >
            <input
              :id="`settings-duration-${idx}`"
              type="radio"
              :value="duration"
              v-model="localSettings.currDuration"
              name="settingsDuration"
              class="w-4 h-4 text-yellow-600"
            />
            <span class="w-full py-4 ml-2 text-sm font-medium text-gray-600">
              {{ duration }}
            </span>
          </label>
        </fieldset>
      </div>

      <!-- Advanced Settings -->
      <div v-if="activeTab === 'advanced'" class="w-full p-3 flex-1 overflow-y-auto h-full">
        <div class="space-y-3">
          <!-- Audio Effect -->
          <div class="flex flex-row justify-between items-center">
            <div>Audio Effect</div>
            <div>
              <label class="switch">
                <input
                  type="checkbox"
                  v-model="localSettings.isAudioEffect"
                />
                <span class="slider round"></span>
              </label>
            </div>
          </div>

          <!-- Full Screen -->
          <div class="flex flex-row justify-between items-center">
            <div>Full Screen</div>
            <div>
              <label class="switch">
                <input
                  type="checkbox"
                  v-model="localSettings.isFullscreen"
                />
                <span class="slider round"></span>
              </label>
            </div>
          </div>

          <!-- Flip Camera -->
          <div class="flex flex-row justify-between items-center">
            <div>Flip Camera</div>
            <div>
              <label class="switch">
                <input
                  type="checkbox"
                  v-model="localSettings.isFlipCamera"
                />
                <span class="slider round"></span>
              </label>
            </div>
          </div>

          <!-- Direction Sign -->
          <div class="flex flex-row justify-between items-center">
            <div>Direction Sign</div>
            <div>
              <label class="switch">
                <input
                  type="checkbox"
                  v-model="localSettings.isDirectionSign"
                />
                <span class="slider round"></span>
              </label>
            </div>
          </div>

          <!-- Developer Mode -->
          <div class="flex flex-row justify-between items-center">
            <div>Developer Mode</div>
            <div>
              <label class="switch">
                <input
                  type="checkbox"
                  v-model="localSettings.isDeveloperMode"
                />
                <span class="slider round"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-row justify-center items-center border-t-2 py-2 w-full">
        <div
          @click="saveSettings"
          class="bg-yellow-500 text-white py-1.5 px-3 text-xl font-bold rounded-lg hover:bg-amber-500 cursor-pointer mr-2"
        >
          Save
        </div>
        <div
          @click="closeModal"
          class="py-1.5 px-3 text-xl font-bold rounded-lg border cursor-pointer bg-gray-100 hover:bg-gray-300 text-gray-500"
        >
          Cancel
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'

const props = defineProps<{
  show: boolean
  settings: {
    currWorkout: string
    currDuration: string
    isAudioEffect: boolean
    isFullscreen: boolean
    isFlipCamera: boolean
    isDirectionSign: boolean
    isDeveloperMode: boolean
  }
}>()

const emit = defineEmits<{
  close: []
  save: [settings: typeof props.settings]
}>()

const activeTab = ref<'workout' | 'advanced'>('workout')

// 工作配置选项
const workoutOptions = reactive({
  names: ["Push Up", "Squat", "Bend"],
  slugs: ["push-up", "squat", "bend"],
  durations: ["1 Minutes", "3 Minutes", "5 Minutes", "7 Minutes"]
})

// 本地设置状态
const localSettings = reactive({
  currWorkout: '',
  currDuration: '',
  isAudioEffect: true,
  isFullscreen: false,
  isFlipCamera: false,
  isDirectionSign: true,
  isDeveloperMode: false
})

// 监听props变化，同步到本地状态
watch(() => props.settings, (newSettings) => {
  if (newSettings) {
    Object.assign(localSettings, newSettings)
  }
}, { immediate: true, deep: true })

const saveSettings = () => {
  emit('save', { ...localSettings })
  closeModal()
}

const closeModal = () => {
  emit('close')
}
</script>
