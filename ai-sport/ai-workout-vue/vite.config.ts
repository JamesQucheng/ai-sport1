import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    // 确保仅加载单个 TensorFlow.js 实例，避免 backend 读取 undefined
    dedupe: [
      '@tensorflow/tfjs-core',
      '@tensorflow/tfjs-converter',
      '@tensorflow/tfjs-backend-webgl',
      '@tensorflow/tfjs-backend-cpu',
      '@tensorflow-models/pose-detection'
    ]
  },
  server: {
    port: 8080,
    open: true,
    host: true,
    // WebSocket配置
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      clientPort: 8080,
      overlay: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    },
    // 为音频文件添加特殊处理
    middlewareMode: false,
    fs: {
      strict: false
    },
    headers: {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Type'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'tensorflow': ['@tensorflow/tfjs-core', '@tensorflow/tfjs-backend-webgl', '@tensorflow/tfjs-backend-cpu', '@tensorflow-models/pose-detection'],
          'vendor': ['vue', 'pinia']
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs-core',
      '@tensorflow/tfjs-backend-webgl',
      '@tensorflow/tfjs-backend-cpu', 
      '@tensorflow-models/pose-detection',
      '@tensorflow/tfjs-converter',
      '@tensorflow/tfjs-layers',
      '@mediapipe/pose'
    ]
  },
  define: {
    global: 'globalThis'
  }
})
