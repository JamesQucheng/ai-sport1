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
          <div class="welcome-text">
            <h2>加入我们</h2>
            <p>开启您的智能健身之旅，让 AI 成为您的私人教练</p>
          </div>
          <div class="benefits">
            <div class="benefit-item">
              <el-icon class="benefit-icon"><Trophy /></el-icon>
              <span>免费使用 AI 运动检测</span>
            </div>
            <div class="benefit-item">
              <el-icon class="benefit-icon"><DataAnalysis /></el-icon>
              <span>个人运动数据分析</span>
            </div>
            <div class="benefit-item">
              <el-icon class="benefit-icon"><Calendar /></el-icon>
              <span>专属训练计划制定</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧注册表单 -->
      <div class="auth-form-container">
        <div class="auth-form">
          <div class="form-header">
            <h2>创建账户</h2>
            <p>填写您的信息，开始您的健身之旅</p>
          </div>

          <el-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="registerRules"
            @submit.prevent="handleRegister"
            class="register-form"
            size="large"
          >
            <el-form-item prop="email">
              <el-input
                v-model="registerForm.email"
                type="email"
                placeholder="请输入邮箱地址"
                :prefix-icon="Message"
                clearable
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="请输入密码（至少6位）"
                :prefix-icon="Lock"
                show-password
                clearable
              />
            </el-form-item>

            <el-form-item prop="confirmPassword">
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="请确认密码"
                :prefix-icon="Lock"
                show-password
                clearable
              />
            </el-form-item>

            <el-form-item prop="role" label="选择角色">
              <el-radio-group v-model="registerForm.role" class="role-group-compact">
                <el-radio value="user" class="role-radio-compact">
                  <div class="role-content-compact">
                    <el-icon class="role-icon-small"><User /></el-icon>
                    <span class="role-title-small">普通用户</span>
                  </div>
                </el-radio>
                <el-radio value="admin" class="role-radio-compact">
                  <div class="role-content-compact">
                    <el-icon class="role-icon-small"><Setting /></el-icon>
                    <span class="role-title-small">管理员</span>
                  </div>
                </el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item prop="agreeTerms">
              <el-checkbox v-model="agreeTerms">
                我已阅读并同意
                <el-link type="primary" href="#" @click.prevent>《服务条款》</el-link>
                和
                <el-link type="primary" href="#" @click.prevent>《隐私政策》</el-link>
              </el-checkbox>
            </el-form-item>

            <el-button
              type="primary"
              size="large"
              :loading="isLoading"
              :disabled="!agreeTerms"
              @click="handleRegister"
              class="register-button"
            >
              {{ isLoading ? '注册中...' : '创建账户' }}
            </el-button>
          </el-form>

          <div class="form-footer">
            <span>已有账户？</span>
            <router-link to="/login" class="login-link">立即登录</router-link>
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
  Trophy,
  DataAnalysis,
  Calendar,
  Message,
  Lock,
  User,
  Setting
} from '@element-plus/icons-vue'
import { useAuth, type RegisterForm } from '@/composables/useAuth'

const router = useRouter()
const { register } = useAuth()

const registerFormRef = ref<InstanceType<typeof ElForm>>()
const isLoading = ref(false)
const agreeTerms = ref(false)

// 表单数据
const registerForm = reactive<RegisterForm>({
  email: '',
  password: '',
  confirmPassword: '',
  role: 'user'
})

// 自定义验证器
const validateConfirmPassword = (rule: any, value: string, callback: Function) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// 表单验证规则
const registerRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email' as const, message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' },
    { max: 50, message: '密码长度不能超过50位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

// 注册处理
const handleRegister = async () => {
  if (!registerFormRef.value) return

  try {
    await registerFormRef.value.validate()
    
    if (!agreeTerms.value) {
      ElMessage.warning('请同意服务条款和隐私政策')
      return
    }

    isLoading.value = true

    const success = await register(registerForm)
    if (success) {
      // 根据用户角色跳转
      if (registerForm.role === 'admin') {
        await router.push('/admin')
      } else {
        await router.push('/')
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '注册失败')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
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
  max-width: 1100px;
  width: 100%;
  min-height: 700px;
}

/* 左侧装饰区域 */
.auth-decoration {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
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
  margin-bottom: 40px;
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

.welcome-text {
  text-align: center;
  margin-bottom: 40px;
}

.welcome-text h2 {
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.welcome-text p {
  font-size: 1.1rem;
  opacity: 0.9;
  line-height: 1.5;
  margin: 0;
}

.benefits {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 1.1rem;
}

.benefit-icon {
  font-size: 1.5rem;
  color: #ffeaa7;
  flex-shrink: 0;
}

/* 右侧表单区域 */
.auth-form-container {
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-height: 100vh;
  overflow-y: auto;
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

.register-form {
  margin-bottom: 32px;
}

/* 角色选择样式 */
.role-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.role-radio {
  width: 100%;
  margin: 0;
  padding: 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
  background: #fafafa;
}

.role-radio:hover {
  border-color: #00b894;
  background: #f0fdf9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 184, 148, 0.1);
}

.role-radio.is-checked {
  border-color: #00b894;
  background: linear-gradient(135deg, rgba(0, 184, 148, 0.1) 0%, rgba(0, 206, 201, 0.1) 100%);
  box-shadow: 0 4px 12px rgba(0, 184, 148, 0.2);
}

.role-content {
  width: 100%;
}

.role-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.role-icon {
  font-size: 1.25rem;
  color: #00b894;
}

.role-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
}

.role-desc {
  color: #718096;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

/* 紧凑版角色选择样式 */
.role-group-compact {
  display: flex;
  gap: 12px;
  width: 100%;
}

.role-radio-compact {
  margin: 0;
  flex: 1;
}

.role-radio-compact .el-radio__input {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
}

.role-content-compact {
  width: 100%;
  padding: 12px 12px 12px 32px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
}

.role-radio-compact:hover .role-content-compact {
  border-color: #00b894;
  background: #f0fdf9;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 184, 148, 0.1);
}

.role-radio-compact.is-checked .role-content-compact {
  border-color: #00b894;
  background: linear-gradient(135deg, rgba(0, 184, 148, 0.1) 0%, rgba(0, 206, 201, 0.1) 100%);
  box-shadow: 0 2px 8px rgba(0, 184, 148, 0.2);
}

.role-icon-small {
  font-size: 16px;
  color: #00b894;
}

.role-title-small {
  font-size: 14px;
  font-weight: 500;
  color: #2d3748;
}

.register-button {
  width: 100%;
  height: 48px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  border: none;
  transition: all 0.3s ease;
}

.register-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 184, 148, 0.3);
}

.register-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-footer {
  text-align: center;
  margin-top: 32px;
  color: #718096;
}

.login-link {
  color: #00b894;
  text-decoration: none;
  font-weight: 500;
  margin-left: 8px;
}

.login-link:hover {
  color: #00a085;
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
  border-color: #00b894;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #00b894;
  box-shadow: 0 0 0 3px rgba(0, 184, 148, 0.1);
}

:deep(.el-form-item) {
  margin-bottom: 24px;
}

:deep(.el-form-item__label) {
  color: #2d3748;
  font-weight: 500;
  margin-bottom: 8px;
}

:deep(.el-checkbox) {
  color: #4a5568;
  line-height: 1.5;
}

:deep(.el-checkbox.is-checked .el-checkbox__inner) {
  background-color: #00b894;
  border-color: #00b894;
}

:deep(.el-link.el-link--primary) {
  color: #00b894;
}

:deep(.el-radio__input.is-checked .el-radio__inner) {
  background-color: #00b894;
  border-color: #00b894;
}

:deep(.el-radio__input.is-checked + .el-radio__label) {
  color: #00b894;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .auth-container {
    grid-template-columns: 1fr;
    border-radius: 16px;
    margin: 10px;
    max-height: 95vh;
    overflow-y: auto;
  }
  
  .auth-decoration {
    padding: 40px 30px;
    text-align: center;
  }
  
  .brand-name {
    font-size: 2rem;
  }
  
  .welcome-text h2 {
    font-size: 1.75rem;
  }
  
  .benefits {
    gap: 20px;
  }
  
  .benefit-item {
    justify-content: center;
  }
  
  .auth-form-container {
    padding: 40px 30px;
    max-height: none;
  }
  
  .form-header h2 {
    font-size: 1.75rem;
  }
  
  .role-radio {
    padding: 16px;
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
  
  .role-group {
    gap: 12px;
  }
  
  .role-radio {
    padding: 12px;
  }
}
</style>