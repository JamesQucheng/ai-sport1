// 全新的安全 TensorFlow 管理器，避免 backend 读取错误
import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-backend-cpu'

interface SafeTensorFlowStatus {
  isReady: boolean
  backend: string
  error?: string
}

class SafeTensorFlowManager {
  private static instance: SafeTensorFlowManager
  private initialized = false
  private initializationPromise: Promise<SafeTensorFlowStatus> | null = null

  private constructor() {}

  static getInstance(): SafeTensorFlowManager {
    if (!SafeTensorFlowManager.instance) {
      SafeTensorFlowManager.instance = new SafeTensorFlowManager()
    }
    return SafeTensorFlowManager.instance
  }

  async ensureReady(): Promise<SafeTensorFlowStatus> {
    if (this.initialized) {
      const backend = this.getCurrentBackend()
      return { isReady: true, backend }
    }

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.doInitialization()
    return this.initializationPromise
  }

  private async doInitialization(): Promise<SafeTensorFlowStatus> {
    try {
      console.log('[SafeTensorFlow] 开始初始化...')
      
      // 检查现有 backend
      let currentBackend = tf.getBackend()
      if (currentBackend) {
        console.log(`[SafeTensorFlow] Backend 已存在: ${currentBackend}`)
        await tf.ready()
        this.initialized = true
        return { isReady: true, backend: currentBackend }
      }

      // 首选 WebGL
      try {
        await tf.setBackend('webgl')
        await tf.ready()
        currentBackend = tf.getBackend()
        if (currentBackend === 'webgl') {
          console.log('[SafeTensorFlow] WebGL backend 就绪')
          this.initialized = true
          return { isReady: true, backend: 'webgl' }
        }
      } catch (e) {
        console.warn('[SafeTensorFlow] WebGL 失败，尝试 CPU:', e)
      }

      // 备选 CPU
      await tf.setBackend('cpu')
      await tf.ready()
      currentBackend = tf.getBackend()
      
      if (currentBackend === 'cpu') {
        console.log('[SafeTensorFlow] CPU backend 就绪')
        this.initialized = true
        return { isReady: true, backend: 'cpu' }
      }

      throw new Error('无法初始化任何 backend')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[SafeTensorFlow] 初始化失败:', message)
      return { isReady: false, backend: 'unknown', error: message }
    }
  }

  getCurrentBackend(): string {
    try {
      return tf.getBackend() || 'unknown'
    } catch {
      return 'unknown'
    }
  }

  isReady(): boolean {
    return this.initialized && !!tf.getBackend()
  }

  async reinitialize(): Promise<SafeTensorFlowStatus> {
    console.log('[SafeTensorFlow] 重新初始化...')
    this.initialized = false
    this.initializationPromise = null
    return this.ensureReady()
  }
}

export const safeTensorFlowManager = SafeTensorFlowManager.getInstance()