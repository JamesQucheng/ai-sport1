import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from './useAuth'

interface ReminderSettings {
  enabled: boolean
  time: string
  days: string[]
  message: string
  sound: boolean
}

let reminderInterval: number | null = null

export function useReminder() {
  const { apiRequest } = useAuth()
  const reminderSettings = ref<ReminderSettings>({
    enabled: false,
    time: '',
    days: [],
    message: '该运动了！保持健康的生活习惯 💪',
    sound: true
  })

  // 检查是否应该发送提醒
  const checkReminder = async () => {
    if (!reminderSettings.value.enabled) return

    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const currentDay = getCurrentDayName()

    // 检查是否是设定的时间和日期
    if (reminderSettings.value.time === currentTime && 
        reminderSettings.value.days.includes(currentDay)) {
      
      // 检查今天是否已经签到或运动
      const hasWorkoutToday = await checkTodayWorkout()
      
      if (!hasWorkoutToday) {
        showNotification()
      }
    }
  }

  // 获取当前星期几的英文名称
  const getCurrentDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date().getDay()]
  }

  // 检查今天是否已经运动
  const checkTodayWorkout = async () => {
    try {
      const response = await apiRequest('/checkin/today')
      if (response.status === 'success') {
        return response.data.hasCheckedIn
      }
      return false
    } catch (error) {
      console.warn('检查今日运动状态失败:', error)
      return false
    }
  }

  // 显示浏览器通知
  const showNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('AI运动助手', {
        body: reminderSettings.value.message,
        icon: '/favicon.ico',
        silent: !reminderSettings.value.sound,
        tag: 'workout-reminder' // 防止重复通知
      })

      // 点击通知时跳转到应用
      notification.onclick = () => {
        window.focus()
        notification.close()
        // 如果在Service Worker环境中，可以通过postMessage通知主页面
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.postMessage({
              type: 'NOTIFICATION_CLICKED',
              action: 'OPEN_WORKOUT'
            })
          })
        }
      }

      // 5秒后自动关闭
      setTimeout(() => notification.close(), 5000)
    }
  }

  // 加载提醒设置
  const loadReminderSettings = async () => {
    try {
      const response = await apiRequest('/reminders/settings')
      if (response.status === 'success' && response.data.reminderSettings) {
        Object.assign(reminderSettings.value, response.data.reminderSettings)
      }
    } catch (error) {
      console.warn('加载提醒设置失败:', error)
    }
  }

  // 启动提醒检查
  const startReminderCheck = () => {
    if (reminderInterval) return

    // 每分钟检查一次
    reminderInterval = window.setInterval(checkReminder, 60000)
    
    // 立即检查一次
    checkReminder()
  }

  // 停止提醒检查
  const stopReminderCheck = () => {
    if (reminderInterval) {
      clearInterval(reminderInterval)
      reminderInterval = null
    }
  }

  // 请求通知权限
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }

  // 测试提醒
  const testReminder = () => {
    showNotification()
  }

  return {
    reminderSettings,
    loadReminderSettings,
    startReminderCheck,
    stopReminderCheck,
    requestNotificationPermission,
    testReminder,
    checkReminder
  }
}

// 全局提醒管理器
let globalReminderManager: ReturnType<typeof useReminder> | null = null

export function initGlobalReminder() {
  if (!globalReminderManager) {
    globalReminderManager = useReminder()
    globalReminderManager.loadReminderSettings().then(() => {
      globalReminderManager?.startReminderCheck()
    })
  }
  return globalReminderManager
}

export function destroyGlobalReminder() {
  if (globalReminderManager) {
    globalReminderManager.stopReminderCheck()
    globalReminderManager = null
  }
}
