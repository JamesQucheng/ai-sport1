import { ref, computed } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'

// 用户信息接口
export interface User {
  _id: string
  username: string
  email: string
  role: 'user' | 'admin'
  isActive: boolean
  isEmailVerified: boolean
  profile: {
    nickname?: string
    avatar?: string
    gender?: 'male' | 'female' | 'other'
    age?: number
    height?: number
    weight?: number
    bio?: string
  }
  stats: {
    totalWorkouts: number
    totalDuration: number
    totalReps: number
    streak: number
    lastWorkoutDate?: string
  }
  createdAt: string
  lastLoginAt?: string
}

// 登录表单接口
export interface LoginForm {
  email: string
  password: string
}

// 注册表单接口
export interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
  role: 'user' | 'admin'
}

// API响应接口
interface ApiResponse<T = any> {
  status: 'success' | 'error'
  message: string
  data?: T
  errors?: any[]
}

// API基础URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// 认证状态管理
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const isLoading = ref(false)
  const isInitialized = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  // 设置认证信息
  const setAuth = (authToken: string, userData: User) => {
    token.value = authToken
    user.value = userData
    localStorage.setItem('token', authToken)
  }

  // 清除认证信息
  const clearAuth = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  // API请求封装
  const apiRequest = async <T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    // 开发环境下，直接返回模拟数据，跳过实际的API请求
    if (import.meta.env.DEV) {
      console.log('开发环境：直接使用模拟数据', url)
      
      // 根据不同的URL路径返回相应的模拟数据
      if (url.includes('/workouts')) {
        return {
          status: 'success',
          message: '获取成功',
          data: mockData.workouts as unknown as T
        }
      } else if (url.includes('/workout-types')) {
        return {
          status: 'success',
          message: '获取成功',
          data: mockData.workoutTypes as unknown as T
        }
      } else if (url.includes('/auth/me')) {
        // 根据token判断是返回管理员还是普通用户
        const currentToken = localStorage.getItem('token');
        const isAdminToken = currentToken && currentToken.includes('admin');
        return {
          status: 'success',
          message: '获取成功',
          data: { user: isAdminToken ? mockData.adminProfile : mockData.userProfile } as unknown as T
        }
      } else if (url.includes('/auth/profile')) {
        const currentToken = localStorage.getItem('token');
        const isAdminToken = currentToken && currentToken.includes('admin');
        return {
          status: 'success',
          message: '更新成功',
          data: { user: isAdminToken ? mockData.adminProfile : mockData.userProfile } as unknown as T
        }
      } else if (url.includes('/auth/login') && options.method === 'POST') {
        // 根据邮箱判断返回管理员还是普通用户
        const body = options.body ? JSON.parse(options.body as string) : {};
        const isAdminEmail = body.email === 'admin@aisport.com';
        return {
          status: 'success',
          message: '登录成功',
          data: { 
            user: isAdminEmail ? mockData.adminProfile : mockData.userProfile,
            token: isAdminEmail ? 'mock-jwt-token-admin' : 'mock-jwt-token' 
          } as unknown as T
        }
      } else if (url.includes('/health')) {
        return {
          status: 'success',
          message: '服务健康',
          data: { status: 'ok', timestamp: new Date().toISOString() } as unknown as T
        }
      }
      
      // 对于其他所有API，返回一个通用的成功响应
      return {
        status: 'success',
        message: '操作成功',
        data: {} as unknown as T
      }
    }
    
    // 生产环境下的正常API请求处理
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
    
    // 安全地合并options.headers，确保所有值都是字符串类型
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          headers[key] = String(value)
        }
      })
    }
    
    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`
    }

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        mode: 'cors',
        credentials: 'include',
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '请求失败' }))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('API请求错误:', error)
      throw error
    }
  }

  // 登录
  const login = async (loginForm: LoginForm): Promise<boolean> => {
    try {
      isLoading.value = true
      const response = await apiRequest<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      })

      if (response.status === 'success' && response.data) {
        setAuth(response.data.token, response.data.user)
        ElMessage.success('登录成功！')
        return true
      }

      return false
    } catch (error: any) {
      ElMessage.error(error.message || '登录失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 注册
  const register = async (registerForm: RegisterForm): Promise<boolean> => {
    try {
      isLoading.value = true
      const response = await apiRequest<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerForm),
      })

      if (response.status === 'success' && response.data) {
        setAuth(response.data.token, response.data.user)
        ElMessage.success('注册成功！')
        return true
      }

      return false
    } catch (error: any) {
      ElMessage.error(error.message || '注册失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const logout = async (): Promise<void> => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      clearAuth()
    }
  }

  // 获取当前用户信息
  const fetchUser = async (): Promise<boolean> => {
    if (!token.value) {
      return false
    }

    try {
      const response = await apiRequest<{ user: User }>('/auth/me')
      
      if (response.status === 'success' && response.data) {
        user.value = response.data.user
        return true
      }

      clearAuth()
      return false
    } catch (error) {
      console.error('获取用户信息失败:', error)
      clearAuth()
      return false
    }
  }

  // 更新用户资料
  const updateProfile = async (profileData: Partial<User['profile']>): Promise<boolean> => {
    try {
      isLoading.value = true
      const response = await apiRequest<{ user: User }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ profile: profileData }),
      })

      if (response.status === 'success' && response.data) {
        user.value = response.data.user
        ElMessage.success('资料更新成功！')
        return true
      }

      return false
    } catch (error: any) {
      ElMessage.error(error.message || '更新失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 修改密码
  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<boolean> => {
    try {
      isLoading.value = true
      const response = await apiRequest('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })

      if (response.status === 'success') {
        ElMessage.success('密码修改成功！')
        return true
      }

      return false
    } catch (error: any) {
      ElMessage.error(error.message || '密码修改失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 验证token有效性
  const verifyToken = async (): Promise<boolean> => {
    if (!token.value) {
      return false
    }

    try {
      const response = await apiRequest('/auth/verify')
      return response.status === 'success'
    } catch (error) {
      console.warn('Token验证失败:', error)
      clearAuth()
      return false
    }
  }

  // 上传头像
  const uploadAvatar = async (file: File): Promise<boolean> => {
    try {
      isLoading.value = true
      
      const formData = new FormData()
      formData.append('avatar', file)
      
      const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`
        },
        body: formData
      })
      
      const result = await response.json()
      
      if (result.status === 'success' && result.data) {
        user.value = result.data.user
        ElMessage.success('头像上传成功！')
        return true
      } else {
        ElMessage.error(result.message || '头像上传失败')
        return false
      }
    } catch (error: any) {
      ElMessage.error(error.message || '头像上传失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 初始化认证状态
  const initAuth = async (): Promise<void> => {
    if (isInitialized.value) {
      return
    }

    if (token.value && !user.value) {
      try {
        // 尝试通过验证token来获取用户信息
        const response = await apiRequest<{ user: User }>('/auth/verify')
        if (response.status === 'success' && response.data) {
          user.value = response.data.user
        } else {
          clearAuth()
        }
      } catch (error) {
        console.warn('初始化时验证认证状态失败:', error)
        clearAuth()
      }
    }

    isInitialized.value = true
  }

  return {
    // 状态
    user,
    token,
    isLoading,
    isAuthenticated,
    isAdmin,
    isInitialized,
    
    // 方法
    login,
    register,
    logout,
    fetchUser,
    updateProfile,
    changePassword,
    uploadAvatar,
    verifyToken,
    initAuth,
    apiRequest,
    setAuth,
    clearAuth,
  }
})

// 导出认证相关的组合式函数
export const useAuth = () => {
  const authStore = useAuthStore()
  
  // 使用 storeToRefs 来保持 state 和 getters 的响应性
  const { user, token, isLoading, isAuthenticated, isAdmin, isInitialized } = storeToRefs(authStore)

  // actions可以直接从 store 中解构
  const { 
    login, 
    register, 
    logout, 
    fetchUser, 
    updateProfile, 
    changePassword, 
    uploadAvatar,
    verifyToken, 
    initAuth, 
    apiRequest,
    setAuth, 
    clearAuth 
  } = authStore

  return {
    // 响应式 state 和 getters
    user,
    token,
    isLoading,
    isAuthenticated,
    isAdmin,
    isInitialized,

    // actions
    login,
    register,
    logout,
    fetchUser,
    updateProfile,
    changePassword,
    uploadAvatar,
    verifyToken,
    initAuth,
    apiRequest,
    setAuth,
    clearAuth,
  }
}

// 模拟数据，用于开发环境
const mockData = {
  workouts: [
    {
      _id: '1',
      name: '基础俯卧撑训练',
      type: 'strength',
      duration: 120,
      difficulty: 'beginner',
      caloriesBurned: 120,
      date: new Date().toISOString(),
      completed: true
    },
    {
      _id: '2',
      name: '30分钟有氧训练',
      type: 'cardio',
      duration: 1800,
      difficulty: 'intermediate',
      caloriesBurned: 300,
      date: new Date(Date.now() - 86400000).toISOString(),
      completed: true
    },
    {
      _id: '3',
      name: '核心力量训练',
      type: 'strength',
      duration: 600,
      difficulty: 'advanced',
      caloriesBurned: 200,
      date: new Date(Date.now() - 172800000).toISOString(),
      completed: true
    }
  ],
  workoutTypes: [
    { slug: 'strength', name: '力量训练', difficulty: 'beginner', category: 'strength', icon: '🏋️' },
    { slug: 'cardio', name: '有氧运动', difficulty: 'intermediate', category: 'cardio', icon: '🏃' },
    { slug: 'flexibility', name: '柔韧性训练', difficulty: 'beginner', category: 'flexibility', icon: '🧘' },
    { slug: 'balance', name: '平衡训练', difficulty: 'intermediate', category: 'balance', icon: '⚖️' }
  ],
  // 普通用户配置
  userProfile: {
    _id: 'mock-user',
    username: 'demo_user',
    email: 'demo@example.com',
    role: 'user' as const,
    isActive: true,
    isEmailVerified: true,
    profile: {
      nickname: '健身达人',
      avatar: '',
      gender: 'male' as const,
      age: 28,
      height: 175,
      weight: 70
    },
    stats: {
      totalWorkouts: 45,
      totalDuration: 36000,
      totalReps: 1200,
      streak: 7,
      lastWorkoutDate: new Date().toISOString()
    },
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    lastLoginAt: new Date().toISOString()
  },
  // 管理员用户配置
  adminProfile: {
    _id: 'mock-admin',
    username: 'admin',
    email: 'admin@aisport.com',
    role: 'admin' as const,
    isActive: true,
    isEmailVerified: true,
    profile: {
      nickname: '系统管理员',
      avatar: '',
      gender: 'male' as const,
      age: 35,
      height: 180,
      weight: 80
    },
    stats: {
      totalWorkouts: 100,
      totalDuration: 80000,
      totalReps: 3000,
      streak: 30,
      lastWorkoutDate: new Date().toISOString()
    },
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    lastLoginAt: new Date().toISOString()
  }
};


