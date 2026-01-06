<template>
  <div class="workout-selector-overlay">
    <div class="workout-selector-container">
      <form @submit.prevent="handleSubmit" class="workout-form">
        <div class="form-content">
          <!-- 标题区域 -->
          <div class="header-section">
            <h1 class="main-title">AI 健身助手</h1>
            <p class="subtitle">选择您的训练项目</p>
          </div>

          <!-- 插图区域 -->
          <div class="illustration-section">
            <img
              src="/img/undraw_workout_gcgu.svg"
              alt="健身插图"
              class="workout-illustration"
            />
            <button 
              type="button"
              @click="showHelp"
              class="help-button"
            >
              <i class="help-icon">?</i>
              帮助
            </button>
          </div>

          <!-- 运动类型选择 -->
          <div class="selection-section">
            <h3 class="section-title">选择运动类型</h3>
            <div class="workout-options">
              <label
                v-for="(workout, idx) in workoutOptions.names"
                :key="workout"
                :for="`workout-${idx}`"
                class="workout-card"
                :class="{ 'selected': selectedWorkout === workoutOptions.slugs[idx] }"
              >
                <input
                  :id="`workout-${idx}`"
                  type="radio"
                  :value="workoutOptions.slugs[idx]"
                  v-model="selectedWorkout"
                  name="workoutType"
                  class="workout-radio"
                  required
                />
                <div class="workout-content">
                  <div class="workout-icon">{{ getWorkoutIcon(workoutOptions.slugs[idx]) }}</div>
                  <span class="workout-name">{{ workout }}</span>
                </div>
              </label>
            </div>
          </div>

          <!-- 时长选择 -->
          <div class="selection-section">
            <h3 class="section-title">选择训练时长</h3>
            <div class="duration-options">
              <label
                v-for="(duration, idx) in workoutOptions.durations"
                :key="duration"
                :for="`duration-${idx}`"
                class="duration-card"
                :class="{ 'selected': selectedDuration === duration }"
              >
                <input
                  :id="`duration-${idx}`"
                  type="radio"
                  :value="duration"
                  v-model="selectedDuration"
                  name="workoutDuration"
                  class="duration-radio"
                  required
                />
                <span class="duration-text">{{ duration.replace('Minutes', '分钟') }}</span>
              </label>
            </div>
          </div>
        </div>
        
        <button
          type="submit"
          class="start-button"
          :disabled="!selectedWorkout || !selectedDuration"
        >
          开始训练
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const emit = defineEmits<{
  workoutSelected: [workout: string, duration: string]
}>()

const selectedWorkout = ref<string>('')
const selectedDuration = ref<string>('')

// 运动选项（新增弯腰动作）
const workoutOptions = reactive({
  names: ["俯卧撑", "深蹲", "弯腰"],
  slugs: ["push-up", "squat", "bend"],
  durations: ["1 Minutes", "3 Minutes", "5 Minutes", "7 Minutes"]
})

// 运动类型图标映射
const workoutIcons: Record<string, string> = {
  'push-up': '💪',
  'squat': '🦵',
  'bend': '🙇'
}

const getWorkoutIcon = (type: string) => {
  return workoutIcons[type] || '🏃'
}

const handleSubmit = () => {
  if (selectedWorkout.value && selectedDuration.value) {
    emit('workoutSelected', selectedWorkout.value, selectedDuration.value)
  }
}

const showHelp = () => {
  alert(`AI 健身助手使用说明：
  
1. 选择运动类型：俯卧撑、深蹲或弯腰
2. 选择训练时长：1-7分钟
3. 点击"开始训练"按钮
4. AI 将实时检测您的动作并计数

请确保摄像头可以清楚地看到您的全身动作。`)
}
</script>

<style scoped>
.workout-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

.workout-selector-container {
  width: 100%;
  max-width: 500px;
  margin: 20px;
}

.workout-form {
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 标题区域 */
.header-section {
  text-align: center;
}

.main-title {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #718096;
  font-size: 1rem;
  margin: 0;
}

/* 插图区域 */
.illustration-section {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 16px 0;
}

.workout-illustration {
  width: 120px;
  height: 120px;
  object-fit: contain;
}

.help-button {
  position: absolute;
  top: 0;
  right: 0;
  background: #fbbf24;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
}

.help-button:hover {
  background: #f59e0b;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(251, 191, 36, 0.4);
}

.help-icon {
  width: 16px;
  height: 16px;
  background: white;
  color: #fbbf24;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

/* 选择区域 */
.selection-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
  text-align: center;
}

/* 运动类型选择 */
.workout-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.workout-card {
  position: relative;
  display: flex;
  align-items: center;
  padding: 20px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.workout-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
  transform: translateY(-2px);
}

.workout-card.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.workout-radio {
  display: none;
}

.workout-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.workout-icon {
  font-size: 2rem;
  line-height: 1;
}

.workout-name {
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
}

/* 时长选择 */
.duration-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.duration-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.duration-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
  transform: translateY(-2px);
}

.duration-card.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.duration-radio {
  display: none;
}

.duration-text {
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
}

/* 开始按钮 */
.start-button {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 16px;
  padding: 16px 24px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.start-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
}

.start-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .workout-selector-container {
    margin: 15px;
  }
  
  .workout-form {
    padding: 24px;
  }
  
  .main-title {
    font-size: 1.5rem;
  }
  
  .workout-options,
  .duration-options {
    grid-template-columns: 1fr;
  }
  
  .workout-card,
  .duration-card {
    padding: 16px;
  }
}
</style>
