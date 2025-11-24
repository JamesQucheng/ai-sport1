import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-backend-cpu'

export interface TensorFlowStatus {
  isInitialized: boolean
  backend: string | null
  error: string | null
}

class TensorFlowManager {
  private static instance: TensorFlowManager
  private status: TensorFlowStatus = {
    isInitialized: false,
    backend: null,
    error: null
  }
  private initPromise: Promise<void> | null = null
  private callbacks: Array<(status: TensorFlowStatus) => void> = []

  private constructor() {}

  static getInstance(): TensorFlowManager {
    if (!TensorFlowManager.instance) {
      TensorFlowManager.instance = new TensorFlowManager()
    }
    return TensorFlowManager.instance
  }

  /**
   * 初始化 TensorFlow.js
   */
  async initialize(): Promise<TensorFlowStatus> {
    if (this.initPromise) {
      await this.initPromise
      return this.status
    }

    this.initPromise = this.doInitialization()
    await this.initPromise
    return this.status
  }

  private async doInitialization(): Promise<void> {
    try {
      console.log('[TensorFlow] 开始初始化...')
      
      // 检查是否已经有backend
      let currentBackend = tf.getBackend()
      if (currentBackend) {
        console.log(`[TensorFlow] Backend 已存在: ${currentBackend}`)
        // 确保 backend 已经完全就绪
        try {
          await tf.ready()
        } catch (readyErr) {
          console.warn('[TensorFlow] tf.ready() 抛出警告:', readyErr)
        }
        this.updateStatus(true, currentBackend, null)
        return
      }

      // 尝试设置 WebGL backend
      try {
        await tf.setBackend('webgl')
        await tf.ready()
        currentBackend = tf.getBackend()
        
        if (currentBackend === 'webgl') {
          console.log('[TensorFlow] WebGL backend 初始化成功')
          this.updateStatus(true, 'webgl', null)
          return
        }
      } catch (webglError) {
        console.warn('[TensorFlow] WebGL backend 初始化失败:', webglError)
      }

      // 如果 WebGL 失败，尝试 CPU backend
      try {
        console.log('[TensorFlow] 尝试使用 CPU backend...')
        await tf.setBackend('cpu')
        await tf.ready()
        currentBackend = tf.getBackend()
        
        if (currentBackend === 'cpu') {
          console.log('[TensorFlow] CPU backend 初始化成功')
          this.updateStatus(true, 'cpu', null)
          return
        }
      } catch (cpuError) {
        console.error('[TensorFlow] CPU backend 初始化失败:', cpuError)
      }

      // 如果两个backend都失败了
      throw new Error('无法初始化任何 TensorFlow.js backend')
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[TensorFlow] 初始化失败:', errorMessage)
      this.updateStatus(false, null, errorMessage)
    }
  }

  private updateStatus(isInitialized: boolean, backend: string | null, error: string | null): void {
    this.status = { isInitialized, backend, error }
    this.notifyCallbacks()
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.status)
      } catch (error) {
        console.error('[TensorFlow] Callback 执行错误:', error)
      }
    })
  }

  /**
   * 获取当前状态
   */
  getStatus(): TensorFlowStatus {
    return { ...this.status }
  }

  /**
   * 等待初始化完成
   */
  async waitForInitialization(): Promise<TensorFlowStatus> {
    if (this.status.isInitialized) {
      // 确保返回的状态包含backend信息
      return {
        ...this.status,
        backend: this.status.backend || this.getCurrentBackend()
      }
    }

    if (this.initPromise) {
      await this.initPromise
      return {
        ...this.status,
        backend: this.status.backend || this.getCurrentBackend()
      }
    }

    const result = await this.initialize()
    return {
      ...result,
      backend: result.backend || this.getCurrentBackend()
    }
  }

  /**
   * 检查是否已准备就绪
   */
  isReady(): boolean {
    return this.status.isInitialized && this.status.backend !== null
  }

  /**
   * 获取当前backend
   */
  getCurrentBackend(): string | null {
    // 如果状态中没有backend，尝试从tf直接获取
    if (!this.status.backend && typeof tf !== 'undefined' && tf.getBackend) {
      try {
        return tf.getBackend() || null
      } catch (error) {
        return null
      }
    }
    return this.status.backend
  }

  /**
   * 注册状态变化回调
   */
  onStatusChange(callback: (status: TensorFlowStatus) => void): () => void {
    this.callbacks.push(callback)
    
    // 立即调用一次
    callback(this.status)
    
    // 返回取消订阅函数
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  /**
   * 重新初始化
   */
  async reinitialize(): Promise<TensorFlowStatus> {
    console.log('[TensorFlow] 重新初始化...')
    this.initPromise = null
    this.updateStatus(false, null, null)
    return this.initialize()
  }
}

// 导出单例实例
export const tensorflowManager = TensorFlowManager.getInstance()

// 导出便捷函数
export const initializeTensorFlow = () => tensorflowManager.initialize()
export const waitForTensorFlow = () => tensorflowManager.waitForInitialization()
export const isTensorFlowReady = () => tensorflowManager.isReady()
export const getTensorFlowBackend = () => tensorflowManager.getCurrentBackend()
