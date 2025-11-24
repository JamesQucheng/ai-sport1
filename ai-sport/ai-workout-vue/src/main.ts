import './assets/main.css'
import 'element-plus/dist/index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import { tensorflowManager } from './utils/tensorflowManager'

import App from './App.vue'
import router from './router'

const startApp = async () => {
  // 初始化 TensorFlow.js
  const tfStatus = await tensorflowManager.initialize()
  
  if (!tfStatus.isInitialized) {
    console.error('TensorFlow.js 初始化失败，但应用将继续运行')
  }
  
  const app = createApp(App)
  
  app.use(createPinia())
  app.use(router)
  app.use(ElementPlus)
  
  app.mount('#app')
}

startApp().catch(error => {
  console.error('应用启动失败:', error)
})
