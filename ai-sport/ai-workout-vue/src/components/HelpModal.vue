<template>
  <div v-if="show" class="flex flex-row justify-center h-screen items-center bg-gray-700/50 absolute w-full z-40">
    <div class="flex flex-col items-center w-full max-h-96 h-full max-w-xs bg-white rounded-lg shadow-md overflow-hidden text-gray-600 max-h-screen">
      <!-- Tab Header -->
      <div class="flex flex-row items-center w-full font-bold">
        <div
          @click="activeTab = 'howto'"
          :class="[
            'w-1/2 text-center p-2 cursor-pointer',
            activeTab === 'howto' 
              ? 'bg-amber-300 text-gray-600' 
              : 'bg-amber-200 text-gray-400 hover:bg-amber-300 hover:text-gray-600'
          ]"
        >
          How to Use
        </div>
        <div
          @click="activeTab = 'about'"
          :class="[
            'w-1/2 text-center p-2 cursor-pointer',
            activeTab === 'about' 
              ? 'bg-amber-300 text-gray-600' 
              : 'bg-amber-200 text-gray-400 hover:bg-amber-300 hover:text-gray-600'
          ]"
        >
          About
        </div>
      </div>

      <!-- How to Use -->
      <div v-if="activeTab === 'howto'" class="w-full p-3 flex-1 overflow-y-auto h-full text-sm font-medium flex flex-col items-center text-justify text-gray-600">
        <p class="mb-3">
          Choose the type of workout and duration, you can change these later via the settings menu.
        </p>
        
        <!-- Choose Illustration -->
        <div class="w-1/3 mb-3">
          <svg width="80" height="60" viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="10" width="60" height="40" fill="#fef3c7" stroke="#f59e0b" stroke-width="2" rx="5"/>
            <circle cx="25" cy="25" r="3" fill="#f59e0b"/>
            <circle cx="35" cy="25" r="3" fill="#d1d5db"/>
            <text x="40" y="20" fill="#374151" font-size="8">Push Up</text>
            <text x="40" y="30" fill="#374151" font-size="8">3 Minutes</text>
            <text x="40" y="45" fill="#f59e0b" font-size="6">Choose Workout</text>
          </svg>
        </div>
        
        <p class="mb-3">
          Press start button to start, and immediately prepare yourself to do the workout.
        </p>
        
        <!-- Play Illustration -->
        <div class="w-1/3 mb-3">
          <svg width="80" height="60" viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="30" r="20" fill="#10b981" stroke="#059669" stroke-width="2"/>
            <polygon points="35,20 35,40 50,30" fill="white"/>
            <text x="40" y="50" text-anchor="middle" fill="#374151" font-size="6">Press Start</text>
          </svg>
        </div>
        
        <p class="mb-3">
          Try to get optimal score (repetition) with proper technique and enjoy!
        </p>
        
        <!-- Workout Illustration -->
        <div class="w-1/3 mb-2">
          <svg width="80" height="60" viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="15" r="6" fill="#fbbf24"/>
            <rect x="34" y="21" width="12" height="16" fill="#34d399" rx="2"/>
            <rect x="28" y="37" width="6" height="12" fill="#34d399" rx="1"/>
            <rect x="46" y="37" width="6" height="12" fill="#34d399" rx="1"/>
            <rect x="22" y="25" width="6" height="8" fill="#34d399" rx="1"/>
            <rect x="52" y="25" width="6" height="8" fill="#34d399" rx="1"/>
            <text x="40" y="55" text-anchor="middle" fill="#374151" font-size="6">Doing Workout</text>
          </svg>
        </div>
      </div>

      <!-- About -->
      <div v-if="activeTab === 'about'" class="w-full p-3 flex-1 overflow-y-auto h-full text-xs font-medium flex flex-col items-center text-justify text-gray-600">
        <h1 class="text-sm mb-1.5">AI Workout Assistant</h1>
        <p class="mb-3">
          An web application to help everyone do workout wherever and whenever. Supported by the pose detector feature to analyze every pose and auto count the number of repetitions made. So, let's create a healthy life by do workout every day!
        </p>
        
        <h1 class="text-sm mb-1.5">How it Work?</h1>
        <p class="mb-3">
          Image data which is obtained from video or webcam will be processed by pose detector using the MoveNet model to generate keypoints. Keypoints are used for repetition calculations and input for classifying workout types with Dense Neural Network (DNN) model.
        </p>
        
        <h1 class="text-sm mb-1.5">Privacy Protection</h1>
        <p class="mb-3">
          Pose Detector and Classification in the AI Workout Assistant application fully runs on the Client side, so no image data comes out of the user's device. Videos or images processed by the program will be automatically deleted.
        </p>
        
        <h1 class="text-sm mb-1.5">Tech Stack</h1>
        <p class="mb-3">
          This Vue 3 version is powered by modern web technologies: Vue 3 + Vite + TypeScript + TensorFlow.js + Tailwind CSS. All AI processing happens locally in your browser for maximum privacy and performance.
        </p>
        
        <h1 class="text-sm mb-1.5">Learn More</h1>
        <p class="mb-3 text-left w-full">
          Open Source:
          <a
            href="https://github.com/reevald/ai-workout-assistant/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-amber-600 underline"
          >
            https://github.com/reevald/ai-workout-assistant/
          </a>
        </p>
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
import { ref } from 'vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const activeTab = ref<'howto' | 'about'>('howto')

const closeModal = () => {
  emit('close')
}
</script>
