<template>
  <div class="auth-page">
    <div class="auth-container">
      <!-- 左侧装饰区域 -->
      <div class="auth-decoration">
        <div class="decoration-content">
          <div class="brand">
            <el-icon class="brand-icon"><TrendCharts /></el-icon>
            <h1 class="brand-name">AI 运动平台</h1>
          </div>
          <div class="features">
            <div class="feature-item">
              <el-icon class="feature-icon"><Star /></el-icon>
              <div class="feature-text">
                <h3>智能识别</h3>
                <p>AI 实时检测运动姿态</p>
              </div>
            </div>
            <div class="feature-item">
              <el-icon class="feature-icon"><View /></el-icon>
              <div class="feature-text">
                <h3>实时反馈</h3>
                <p>即时纠正不规范动作</p>
              </div>
            </div>
            <div class="feature-item">
              <el-icon class="feature-icon"><PieChart /></el-icon>
              <div class="feature-text">
                <h3>数据分析</h3>
                <p>详细的运动统计分析</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="auth-form-container">
        <div class="auth-form">
          <div class="form-header">
            <h2>欢迎回来</h2>
            <p>登录您的账户，继续您的健身之旅</p>
          </div>

          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            @submit.prevent="handleLogin"
            class="login-form"
            size="large"
          >
            <el-form-item prop="email">
              <el-input
                v-model="loginForm.email"
                type="email"
                placeholder="请输入邮箱地址"
                :prefix-icon="Message"
                clearable
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                :prefix-icon="Lock"
                show-password
                clearable
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <div class="form-options">
              <el-checkbox v-model="rememberMe">记住我</el-checkbox>
              <el-link type="primary" href="#" @click.prevent>忘记密码？</el-link>
            </div>

            <el-button
              type="primary"
              size="large"
              :loading="isLoading"
              @click="handleLogin"
              class="login-button"
            >
              {{ isLoading ? '登录中...' : '登录' }}
            </el-button>
          </el-form>

          <div class="form-divider">
            <span>或者</span>
          </div>

          <el-button
            size="large"
            class="demo-button"
            @click="quickLogin"
          >
            <el-icon><User /></el-icon>
            管理员快速体验
          </el-button>

          <div class="form-footer">
            <span>还没有账户？</span>
            <router-link to="/register" class="register-link">立即注册</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElForm, ElMessage } from 'element-plus'
import {
  TrendCharts,
  Star,
  View,
  PieChart,
  Message,
  Lock,
  User
} from '@element-plus/icons-vue'
import { useAuth, type LoginForm } from '@/composables/useAuth'

const router = useRouter()
const { login } = useAuth()

const loginFormRef = ref<InstanceType<typeof ElForm>>()
const isLoading = ref(false)
const rememberMe = ref(false)

// 表单数据
const loginForm = reactive<LoginForm>({
  email: '',
  password: ''
})

// 表单验证规则
const loginRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email' as const, message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    await loginFormRef.value.validate()
    isLoading.value = true

    const success = await login(loginForm)
    if (success) {
      // 根据用户角色跳转
      const { user } = useAuth()
      const redirect = router.currentRoute.value.query.redirect as string

      if (redirect && redirect !== '/workout') {
        // 只有当重定向不是 /workout 时才使用重定向
        await router.push(redirect)
      } else if (user?.value?.role === 'admin') {
        await router.push('/admin')
      } else {
        // 普通用户始终跳转到首页
        await router.replace('/') // 使用 replace 替代 push，避免历史记录问题
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    isLoading.value = false
  }
}

// 快速登录
const quickLogin = async () => {
  loginForm.email = 'admin@aisport.com'
  loginForm.password = 'admin123456'

  ElMessage.info('正在使用管理员账户登录...')
  await handleLogin()
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-container {
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 1000px;
  width: 100%;
  min-height: 600px;
}

/* 左侧装饰区域 */
.auth-decoration {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.auth-decoration::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>') repeat;
}

.decoration-content {
  position: relative;
  z-index: 1;
}

.brand {
  text-align: center;
  margin-bottom: 60px;
}

.brand-icon {
  font-size: 4rem;
  color: #ffeaa7;
  margin-bottom: 20px;
}

.brand-name {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 20px;
}

.feature-icon {
  font-size: 2rem;
  color: #ffeaa7;
  flex-shrink: 0;
}

.feature-text h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.feature-text p {
  margin: 0;
  opacity: 0.9;
  line-height: 1.4;
}

/* 右侧表单区域 */
.auth-form-container {
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.auth-form {
  max-width: 400px;
  width: 100%;
  margin: 0 auto;
}

.form-header {
  text-align: center;
  margin-bottom: 40px;
}

.form-header h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 12px 0;
}

.form-header p {
  color: #718096;
  margin: 0;
  line-height: 1.5;
}

.login-form {
  margin-bottom: 32px;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.form-divider {
  text-align: center;
  margin: 32px 0;
  position: relative;
  color: #718096;
}

.form-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e2e8f0;
  z-index: 0;
}

.form-divider span {
  background: white;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}

.demo-button {
  width: 100%;
  height: 48px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  color: #4a5568;
  font-weight: 500;
  transition: all 0.3s ease;
}

.demo-button:hover {
  border-color: #667eea;
  color: #667eea;
  transform: translateY(-1px);
}

.form-footer {
  text-align: center;
  margin-top: 32px;
  color: #718096;
}

.register-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  margin-left: 8px;
}

.register-link:hover {
  color: #5a67d8;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-input__wrapper) {
  border-radius: 12px;
  height: 48px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  border-color: #667eea;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

:deep(.el-form-item) {
  margin-bottom: 24px;
}

:deep(.el-checkbox) {
  color: #4a5568;
}

:deep(.el-checkbox.is-checked .el-checkbox__inner) {
  background-color: #667eea;
  border-color: #667eea;
}

:deep(.el-link.el-link--primary) {
  color: #667eea;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .auth-container {
    grid-template-columns: 1fr;
    border-radius: 16px;
    margin: 10px;
  }

  .auth-decoration {
    padding: 40px 30px;
    text-align: center;
  }

  .brand-name {
    font-size: 2rem;
  }

  .features {
    gap: 24px;
  }

  .feature-item {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .auth-form-container {
    padding: 40px 30px;
  }

  .form-header h2 {
    font-size: 1.75rem;
  }
}

@media (max-width: 480px) {
  .auth-page {
    padding: 10px;
  }

  .auth-decoration {
    padding: 30px 20px;
  }

  .auth-form-container {
    padding: 30px 20px;
  }
}
</style>

