<template>
  <el-container class="main-layout">
    <!-- 顶部导航 -->
    <el-header class="main-header">
      <div class="header-content">
        <!-- Logo -->
        <div class="logo-section">
          <router-link to="/" class="logo">
            <el-icon class="logo-icon"><TrendCharts /></el-icon>
            <span class="logo-text">AI 运动平台</span>
          </router-link>
        </div>

        <!-- 导航菜单 -->
        <el-menu
          v-if="user"
          mode="horizontal"
          :default-active="activeMenu"
          class="main-menu"
          router
        >
          <el-menu-item index="/">
            <el-icon><House /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/workout">
            <el-icon><VideoPlay /></el-icon>
            <span>开始运动</span>
          </el-menu-item>
          <el-menu-item index="/workout/history">
            <el-icon><DataAnalysis /></el-icon>
            <span>运动记录</span>
          </el-menu-item>
          <el-menu-item index="/profile">
            <el-icon><User /></el-icon>
            <span>个人资料</span>
          </el-menu-item>
          <el-menu-item v-if="user.role === 'admin'" index="/admin">
            <el-icon><Setting /></el-icon>
            <span>管理后台</span>
          </el-menu-item>
        </el-menu>

        <!-- 用户操作区 -->
        <div class="user-section">
          <template v-if="user">
            <!-- 用户信息 -->
            <el-dropdown @command="handleUserCommand">
              <div class="user-avatar">
                <el-avatar :size="40" :src="getAvatarUrl(user.profile?.avatar)">
                  {{ user.profile?.nickname?.[0] || user.username?.[0] || 'U' }}
                </el-avatar>
                <span class="user-name">{{ user.profile?.nickname || user.username }}</span>
                <el-icon><ArrowDown /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">
                    <el-icon><User /></el-icon>
                    个人资料
                  </el-dropdown-item>
                  <el-dropdown-item command="settings">
                    <el-icon><Setting /></el-icon>
                    设置
                  </el-dropdown-item>
                  <el-dropdown-item divided command="logout">
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>

          <template v-else>
            <div class="auth-buttons">
              <el-button @click="$router.push('/login')">登录</el-button>
              <el-button type="primary" @click="$router.push('/register')">注册</el-button>
            </div>
          </template>
        </div>
      </div>
    </el-header>

    <!-- 主要内容区域 -->
    <el-main class="main-content">
      <router-view />
    </el-main>

    <!-- 底部 -->
    <el-footer class="main-footer">
      <div class="footer-content">
        <div class="footer-info">
          <p>&copy; 2025 AI 运动平台. 让健身更智能，让运动更有趣。</p>
        </div>
        <div class="footer-links">
          <a href="#" class="footer-link">关于我们</a>
          <a href="#" class="footer-link">隐私政策</a>
          <a href="#" class="footer-link">服务条款</a>
          <a href="#" class="footer-link">帮助中心</a>
        </div>
      </div>
    </el-footer>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  TrendCharts,
  House,
  VideoPlay,
  DataAnalysis,
  User,
  Setting,
  ArrowDown,
  SwitchButton,
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()

// 当前激活的菜单
const activeMenu = computed(() => {
  return route.path
})

// 头像URL处理
const getAvatarUrl = (avatar?: string): string => {
  if (!avatar) return ''
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
  const baseUrl = API_BASE_URL.replace('/api', '')
  
  // 如果avatar已经是完整URL，直接返回
  if (avatar.startsWith('http')) {
    return avatar
  }
  
  // 如果avatar不以/开头，添加/
  const avatarPath = avatar.startsWith('/') ? avatar : `/${avatar}`
  
  return `${baseUrl}${avatarPath}`
}

// 用户下拉菜单命令处理
const handleUserCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'settings':
      ElMessage.info('设置功能开发中...')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm(
          '确定要退出登录吗？',
          '确认退出',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        await logout()
        ElMessage.success('已退出登录')
        router.push('/login')
      } catch (error) {
        // 用户取消
      }
      break
  }
}
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 头部样式 */
.main-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0;
  height: 70px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 20px;
}

.logo-section {
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
  gap: 12px;
}

.logo-icon {
  font-size: 32px;
  color: #667eea;
}

.logo-text {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 菜单样式 */
.main-menu {
  flex: 1;
  justify-content: center;
  border-bottom: none;
  background: transparent;
}

.main-menu .el-menu-item {
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  margin: 0 10px;
  font-weight: 500;
}

.main-menu .el-menu-item:hover {
  background: rgba(102, 126, 234, 0.1);
  border-bottom-color: #667eea;
}

.main-menu .el-menu-item.is-active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

/* 用户区域样式 */
.user-section {
  flex-shrink: 0;
}

.user-avatar {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 25px;
  transition: all 0.3s ease;
}

.user-avatar:hover {
  background: rgba(102, 126, 234, 0.1);
}

.user-name {
  font-weight: 500;
  color: #333;
}

.auth-buttons {
  display: flex;
  gap: 12px;
}

/* 主要内容区域 */
.main-content {
  padding: 0;
  background: transparent;
  overflow: visible;
}

/* 底部样式 */
.main-footer {
  background: rgba(0, 0, 0, 0.8);
  color: rgba(255, 255, 255, 0.8);
  padding: 20px 0;
  height: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.footer-links {
  display: flex;
  gap: 20px;
}

.footer-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: #667eea;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 15px;
  }

  .main-menu {
    display: none;
  }

  .logo-text {
    font-size: 20px;
  }

  .user-name {
    display: none;
  }

  .footer-content {
    flex-direction: column;
    gap: 15px;
    text-align: center;
    padding: 0 15px;
  }

  .footer-links {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* 修复全屏时的布局问题 */
@media (max-height: 600px) {
  .main-footer {
    display: none;
  }
}

/* 运动训练页面特殊样式 */
.workout-page {
  .main-header,
  .main-footer {
    display: none;
  }
  
  .main-content {
    height: 100vh;
  }
}

/* Element Plus 组件样式覆盖 */
:deep(.el-button) {
  border-radius: 20px;
  font-weight: 500;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
</style>

