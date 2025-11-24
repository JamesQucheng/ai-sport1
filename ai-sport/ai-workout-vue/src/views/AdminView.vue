<template>
  <div class="admin-layout-wrapper">
    <div class="admin-layout">
    <!-- 侧边栏 -->
    <div class="admin-sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <el-icon class="logo-icon"><Monitor /></el-icon>
          <span class="logo-text">管理控制台</span>
          </div>
        <div class="admin-info">
          <el-avatar :size="32" :src="user?.profile?.avatar">
            {{ user?.username?.charAt(0)?.toUpperCase() }}
          </el-avatar>
          <div class="admin-details">
            <span class="admin-name">{{ user?.username }}</span>
            <span class="admin-role">系统管理员</span>
          </div>
        </div>
      </div>
      
      <nav class="sidebar-nav">
        <div 
          v-for="item in navItems" 
          :key="item.key"
          class="nav-item"
          :class="{ active: activeTab === item.key }"
          @click="activeTab = item.key"
        >
          <el-icon class="nav-icon">
            <component :is="item.icon" />
          </el-icon>
          <span class="nav-text">{{ item.label }}</span>
      </div>
    </nav>

      <div class="sidebar-footer">
        <el-button 
          type="danger" 
          plain 
          @click="handleLogout"
          style="width: 100%;"
          :icon="SwitchButton"
        >
          退出登录
        </el-button>
        <el-button 
          @click="$router.push('/')"
          style="width: 100%; margin-top: 8px;"
          :icon="House"
        >
          返回前台
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="admin-main">
      <div class="main-content">
      <!-- 页面标题 -->
        <div class="page-header">
          <h1 class="page-title">{{ getCurrentTabTitle() }}</h1>
          <p class="page-subtitle">{{ getCurrentTabSubtitle() }}</p>
      </div>

        <!-- 仪表板 -->
        <div v-if="activeTab === 'dashboard'" class="tab-content">
          <!-- 顶部统计卡片 -->
          <div class="dashboard-stats">
            <div class="stat-card stat-card-users">
              <div class="stat-icon">
                <el-icon><UserFilled /></el-icon>
                    </div>
              <div class="stat-content">
                <div class="stat-value">{{ dashboardStats.totalUsers }}</div>
                <div class="stat-label">总用户数</div>
                <div class="stat-trend positive">
                  <el-icon><TrendCharts /></el-icon>
                  <span>+12%</span>
                  </div>
                </div>
              </div>
              
            <div class="stat-card stat-card-active">
              <div class="stat-icon">
                <el-icon><Trophy /></el-icon>
                    </div>
              <div class="stat-content">
                <div class="stat-value">{{ dashboardStats.activeUsers }}</div>
                <div class="stat-label">活跃用户</div>
                <div class="stat-trend positive">
                  <el-icon><TrendCharts /></el-icon>
                  <span>+8%</span>
                  </div>
              </div>
            </div>

            <div class="stat-card stat-card-workouts">
              <div class="stat-icon">
                <el-icon><VideoPlay /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ dashboardStats.totalWorkouts }}</div>
                <div class="stat-label">总运动次数</div>
                <div class="stat-trend positive">
                  <el-icon><TrendCharts /></el-icon>
                  <span>+25%</span>
                  </div>
                </div>
              </div>
              
            <div class="stat-card stat-card-duration">
              <div class="stat-icon">
                <el-icon><Timer /></el-icon>
                    </div>
              <div class="stat-content">
                <div class="stat-value">{{ formatTime(dashboardStats.totalDuration) }}</div>
                <div class="stat-label">总运动时长</div>
                <div class="stat-trend positive">
                  <el-icon><TrendCharts /></el-icon>
                  <span>+15%</span>
                  </div>
                  </div>
                </div>
              </div>
              
          <!-- 中间数据可视化区域 -->
          <div class="dashboard-charts">
            <div class="chart-card">
              <div class="chart-header">
                <h3 class="chart-title">运动趋势分析</h3>
                <el-select v-model="chartPeriod" size="small">
                  <el-option label="最近7天" value="7days" />
                  <el-option label="最近30天" value="30days" />
                  <el-option label="最近3个月" value="3months" />
                </el-select>
                    </div>
              <div class="chart-content">
                <div class="chart-placeholder">
                  <el-icon class="chart-icon"><DataLine /></el-icon>
                  <p>运动数据趋势图</p>
                  <span>{{ chartPeriod === '7days' ? '过去7天' : chartPeriod === '30days' ? '过去30天' : '过去3个月' }}运动数据统计</span>
                  </div>
                  </div>
                </div>

            <div class="chart-card">
              <div class="chart-header">
                <h3 class="chart-title">用户活跃度分布</h3>
                <el-button size="small" type="primary" plain>
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
              <div class="chart-content">
                <div class="activity-distribution">
                  <div class="activity-item">
                    <div class="activity-bar">
                      <div class="activity-progress" style="width: 85%"></div>
                    </div>
                    <div class="activity-info">
                      <span class="activity-label">高活跃用户</span>
                      <span class="activity-value">85%</span>
                    </div>
                  </div>
                  <div class="activity-item">
                    <div class="activity-bar">
                      <div class="activity-progress" style="width: 65%"></div>
                    </div>
                    <div class="activity-info">
                      <span class="activity-label">中等活跃用户</span>
                      <span class="activity-value">65%</span>
                    </div>
                  </div>
                  <div class="activity-item">
                    <div class="activity-bar">
                      <div class="activity-progress" style="width: 45%"></div>
                    </div>
                    <div class="activity-info">
                      <span class="activity-label">低活跃用户</span>
                      <span class="activity-value">45%</span>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>

          <!-- 底部数据表格和活动列表 -->
          <div class="dashboard-tables">
            <div class="table-card">
              <div class="table-header">
                <h3 class="table-title">最近活动</h3>
                <el-button size="small" type="primary" plain @click="loadRecentActivities">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
                    </div>
              <div class="table-content">
                <div v-if="recentActivities.length === 0" class="empty-state">
                  <el-empty description="暂无活动记录" />
                      </div>
                <div v-else class="activity-list">
                  <div v-for="activity in recentActivities" :key="activity.id" class="activity-item-row">
                    <el-avatar :size="40" :src="activity.avatar">
                      {{ activity.user.charAt(0).toUpperCase() }}
                    </el-avatar>
                    <div class="activity-details">
                      <div class="activity-user">{{ activity.user }}</div>
                      <div class="activity-action">{{ activity.action }}</div>
                    </div>
                    <div class="activity-time">
                      {{ formatTimeAgo(activity.timestamp) }}
                    </div>
                    </div>
                  </div>
                </div>
              </div>
              
            <div class="table-card">
              <div class="table-header">
                <h3 class="table-title">系统状态</h3>
                <el-tag type="success" size="small">
                  <el-icon><CircleCheck /></el-icon>
                  运行正常
                </el-tag>
                      </div>
              <div class="table-content">
                <div class="system-status">
                  <div class="status-item">
                    <div class="status-label">服务器状态</div>
                    <div class="status-value">
                      <el-tag type="success" size="small">正常</el-tag>
                    </div>
                  </div>
                  <div class="status-item">
                    <div class="status-label">数据库连接</div>
                    <div class="status-value">
                      <el-tag type="success" size="small">已连接</el-tag>
                </div>
              </div>
                  <div class="status-item">
                    <div class="status-label">内存使用率</div>
                    <div class="status-value">68%</div>
            </div>
                  <div class="status-item">
                    <div class="status-label">CPU使用率</div>
                    <div class="status-value">32%</div>
          </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 用户管理 -->
        <div v-if="activeTab === 'users'" class="tab-content">
          <div class="bg-white rounded-lg shadow">
            <!-- 搜索和筛选 -->
            <div class="p-6 border-b border-gray-200">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <el-input
                  v-model="userFilters.search"
                  placeholder="搜索用户..."
                  :prefix-icon="Search"
                  @input="loadUsers"
                />
                <el-select v-model="userFilters.role" placeholder="角色" clearable @change="loadUsers">
                  <el-option label="全部" value="" />
                  <el-option label="用户" value="user" />
                  <el-option label="管理员" value="admin" />
                </el-select>
                <el-select v-model="userFilters.status" placeholder="状态" clearable @change="loadUsers">
                  <el-option label="全部" value="" />
                  <el-option label="活跃" value="active" />
                  <el-option label="未验证" value="unverified" />
                </el-select>
                <el-button type="primary" @click="loadUsers" :icon="Search">
                  搜索
                </el-button>
              </div>
            </div>
            
            <!-- 用户表格 -->
            <el-table
              :data="users"
              v-loading="userLoading"
              style="width: 100%"
              :default-sort="{ prop: 'createdAt', order: 'descending' }"
            >
              <el-table-column prop="username" label="用户名" sortable />
              <el-table-column prop="email" label="邮箱" />
                <el-table-column prop="role" label="角色" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
                      {{ row.role === 'admin' ? '管理员' : '用户' }}
                    </el-tag>
                  </template>
                </el-table-column>
              <el-table-column prop="isVerified" label="状态" width="100">
                  <template #default="{ row }">
                  <el-tag :type="row.isVerified ? 'success' : 'warning'" size="small">
                    {{ row.isVerified ? '已验证' : '未验证' }}
                    </el-tag>
                  </template>
                </el-table-column>
              <el-table-column prop="createdAt" label="注册时间" sortable width="180">
                  <template #default="{ row }">
                  {{ new Date(row.createdAt).toLocaleDateString() }}
                  </template>
                </el-table-column>
              <el-table-column label="操作" width="150">
                  <template #default="{ row }">
                      <el-button size="small" @click="editUser(row)">编辑</el-button>
                  <el-button size="small" type="danger" @click="deleteUser(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <!-- 分页 -->
              <div class="p-6 border-t border-gray-200">
                <el-pagination
                  v-model:current-page="userPagination.page"
                  v-model:page-size="userPagination.limit"
                  :total="userPagination.total"
                  :page-sizes="[10, 20, 50]"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="loadUsers"
                  @current-change="loadUsers"
                />
              </div>
            </div>
          </div>


      </div>
    </div>

    <!-- 编辑用户弹窗 -->
    <el-dialog v-model="showEditUserDialog" title="编辑用户" width="500px">
      <el-form :model="editingUser" label-width="80px" v-if="editingUser">
        <el-form-item label="用户名">
          <el-input v-model="editingUser.username" disabled />
        </el-form-item>
        
        <el-form-item label="邮箱">
          <el-input v-model="editingUser.email" />
        </el-form-item>
        
        <el-form-item label="角色">
          <el-select v-model="editingUser.role" class="w-full">
            <el-option label="用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="状态">
          <el-switch 
            v-model="editingUser.isVerified"
            active-text="已验证" 
            inactive-text="未验证"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="flex justify-end space-x-2">
          <el-button @click="showEditUserDialog = false">取消</el-button>
          <el-button type="primary" @click="saveUser" :loading="userSaveLoading">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, 
  Monitor,
  DataAnalysis,
  UserFilled,
  SwitchButton,
  House,
  Trophy,
  VideoPlay,
  Timer,
  TrendCharts,
  DataLine,
  Refresh,
  CircleCheck
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'

const { user, apiRequest, logout } = useAuth()
const router = useRouter()

// 导航项配置
const navItems = [
  { key: 'dashboard', label: '仪表板', icon: 'DataAnalysis' },
  { key: 'users', label: '用户管理', icon: 'UserFilled' }
]

// 响应式数据
const activeTab = ref('dashboard')
const chartPeriod = ref('7days')

const dashboardStats = ref({
  totalUsers: 0,
  activeUsers: 0,
  totalWorkouts: 0,
  totalDuration: 0
})

const recentActivities = ref<any[]>([])
const users = ref<any[]>([])
const userLoading = ref(false)
const userSaveLoading = ref(false)
const showEditUserDialog = ref(false)
const editingUser = ref<any>(null)

const userFilters = reactive({
  search: '',
  role: '',
  status: ''
})

const userPagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 方法
const getCurrentTabTitle = () => {
  const tab = navItems.find(item => item.key === activeTab.value)
  return tab ? tab.label : '管理控制台'
}

const getCurrentTabSubtitle = () => {
  const subtitles: Record<string, string> = {
    dashboard: '系统概览和数据统计',
    users: '管理系统用户'
  }
  return subtitles[activeTab.value] || ''
}

const loadDashboard = async () => {
  try {
    const response = await apiRequest('/admin/dashboard')
    
    if (response.status === 'success') {
      dashboardStats.value = {
        totalUsers: response.data.users?.total || 0,
        activeUsers: response.data.users?.active || 0,
        totalWorkouts: response.data.workouts?.total || 0,
        totalDuration: response.data.workouts?.totalDuration || 0
      }
    }
  } catch (error: any) {
    console.warn('加载仪表板数据失败:', error)
    // 使用模拟数据
    dashboardStats.value = {
      totalUsers: 1250,
      activeUsers: 892,
      totalWorkouts: 5430,
      totalDuration: 28740
    }
  }
}

const loadRecentActivities = async () => {
  try {
    const response = await apiRequest('/admin/activities')
    
    if (response.status === 'success') {
      recentActivities.value = response.data.activities || []
    }
  } catch (error: any) {
    console.warn('加载活动数据失败:', error)
    // 使用模拟数据
    recentActivities.value = [
      { id: 1, user: '张三', action: '完成了俯卧撑训练', timestamp: new Date(), avatar: '' },
      { id: 2, user: '李四', action: '注册了账户', timestamp: new Date(Date.now() - 1000 * 60 * 30), avatar: '' },
      { id: 3, user: '王五', action: '创建了运动计划', timestamp: new Date(Date.now() - 1000 * 60 * 60), avatar: '' }
    ]
  }
}

const loadUsers = async () => {
  userLoading.value = true
  try {
    const params = new URLSearchParams({
      page: userPagination.page.toString(),
      limit: userPagination.limit.toString()
    })
    
    if (userFilters.search) params.append('search', userFilters.search)
    if (userFilters.role) params.append('role', userFilters.role)
    if (userFilters.status) params.append('status', userFilters.status)
    
    const response = await apiRequest(`/admin/users?${params.toString()}`)
    
    if (response.status === 'success') {
      users.value = response.data.users
      userPagination.total = response.data.pagination.total
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载用户数据失败')
  } finally {
    userLoading.value = false
  }
}

const editUser = (user: any) => {
  editingUser.value = { ...user }
  showEditUserDialog.value = true
}

const saveUser = async () => {
  if (!editingUser.value) return
  
  userSaveLoading.value = true
  try {
    const response = await apiRequest(`/admin/users/${editingUser.value._id}`, {
      method: 'PUT',
      body: JSON.stringify(editingUser.value)
    })
    
    if (response.status === 'success') {
      ElMessage.success('用户信息已更新')
      showEditUserDialog.value = false
      loadUsers()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存用户信息失败')
  } finally {
    userSaveLoading.value = false
  }
}

const deleteUser = async (user: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 ${user.username} 吗？`, '确认删除', {
        type: 'warning'
    })
    
    const response = await apiRequest(`/admin/users/${user._id}`, {
      method: 'DELETE'
    })
    
    if (response.status === 'success') {
      ElMessage.success('用户已删除')
      loadUsers()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除用户失败')
    }
  }
}

// 处理退出登录
const handleLogout = async () => {
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
    // 用户取消退出
    if (error !== 'cancel') {
      console.error('退出登录失败:', error)
      ElMessage.error('退出登录失败')
    }
  }
}

const formatTime = (totalMinutes: number) => {
  if (!totalMinutes) return '0分钟'
  
  if (totalMinutes < 60) {
    return `${totalMinutes}分钟`
  } else {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}小时${minutes}分钟`
  }
}

const formatTimeAgo = (timestamp: string | Date) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
  
  if (diffInSeconds < 60) return '刚刚'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`
  return `${Math.floor(diffInSeconds / 86400)}天前`
}

// 生命周期
onMounted(() => {
  if (user.value?.role === 'admin') {
  loadDashboard()
    loadRecentActivities()
  loadUsers()
  }
})
</script>

<style scoped>
/* 管理后台外层包装 */
.admin-layout-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #f8fafc;
  z-index: 9999;
  overflow: hidden;
}

/* 管理后台布局 */
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  position: fixed;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 侧边栏 */
.admin-sidebar {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  z-index: 1000;
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.logo-icon {
  font-size: 24px;
  color: white;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: white;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.admin-role {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

/* 侧边栏导航 */
.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin: 2px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
}

.nav-item:hover {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%);
  color: #1e1b4b;
  transform: translateX(4px);
}

.nav-item.active {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.nav-icon {
  font-size: 18px;
}

.nav-text {
  font-size: 14px;
}

/* 侧边栏底部 */
.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #e2e8f0;
}

/* 主内容区 */
.admin-main {
  flex: 1;
  margin-left: 280px;
  background: #f8fafc;
  min-height: 100vh;
  overflow-y: auto;
}

.main-content {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 页面标题 */
.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

/* 标签内容 */
.tab-content {
  animation: fadeIn 0.4s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 仪表板样式 */
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-card-users .stat-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.stat-card-active .stat-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stat-card-workouts .stat-icon {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.stat-card-duration .stat-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 8px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}

.stat-trend.positive {
  color: #10b981;
}

/* 图表区域 */
.dashboard-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.chart-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.chart-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.chart-content {
  padding: 24px;
}

.chart-placeholder {
  height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
  text-align: center;
}

.chart-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #4f46e5;
}

.chart-placeholder p {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.chart-placeholder span {
  font-size: 14px;
}

/* 活跃度分布 */
.activity-distribution {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.activity-bar {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.activity-progress {
  height: 100%;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.activity-info {
  display: flex;
  justify-content: space-between;
  min-width: 140px;
}

.activity-label {
  font-size: 14px;
  color: #64748b;
}

.activity-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

/* 表格区域 */
.dashboard-tables {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.table-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.table-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.table-content {
  padding: 24px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.5);
  transition: all 0.3s ease;
}

.activity-item-row:hover {
  background: rgba(241, 245, 249, 0.8);
}

.activity-details {
  flex: 1;
}

.activity-user {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.activity-action {
  font-size: 12px;
  color: #64748b;
}

.activity-time {
  font-size: 12px;
  color: #94a3b8;
}

/* 系统状态 */
.system-status {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.5);
}

.status-label {
  font-size: 14px;
  color: #64748b;
}

.status-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

/* 卡片样式优化 */
.el-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.el-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

/* 按钮样式优化 */
.el-button {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.el-button--primary {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border: none;
}

.el-button--primary:hover {
  background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

/* 表格样式优化 */
.el-table {
  border-radius: 12px;
  overflow: hidden;
}

.el-table .el-table__row:hover td {
  background-color: rgba(241, 245, 249, 0.5);
}

/* 标签样式 */
.el-tag {
  border-radius: 6px;
  font-weight: 500;
}

/* 输入框样式 */
.el-input__wrapper {
  border-radius: 8px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* Tailwind CSS 工具类 */
.text-red-600 { color: #dc2626; }
.text-green-600 { color: #059669; }
.text-gray-500 { color: #6b7280; }
.text-gray-600 { color: #4b5563; }
.text-gray-900 { color: #111827; }
.bg-gray-50 { background-color: #f9fafb; }
.border-gray-200 { border-color: #e5e7eb; }
.border-gray-300 { border-color: #d1d5db; }
.rounded-lg { border-radius: 0.5rem; }
.shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }
.p-6 { padding: 1.5rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mb-8 { margin-bottom: 2rem; }
.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.gap-6 { gap: 1.5rem; }
.gap-4 { gap: 1rem; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.space-x-2 > * + * { margin-left: 0.5rem; }
.space-x-4 > * + * { margin-left: 1rem; }
.space-y-8 > * + * { margin-top: 2rem; }
.w-full { width: 100%; }
.max-w-2xl { max-width: 42rem; }
.text-sm { font-size: 0.875rem; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.25rem; }
.text-2xl { font-size: 1.5rem; }
.text-3xl { font-size: 1.875rem; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

@media (min-width: 768px) {
  .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .admin-sidebar {
    width: 100%;
    position: relative;
    height: auto;
  }
  
  .admin-main {
    margin-left: 0;
  }
  
  .main-content {
    padding: 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .dashboard-stats {
    grid-template-columns: 1fr;
  }
  
  .dashboard-charts {
    grid-template-columns: 1fr;
  }
  
  .dashboard-tables {
    grid-template-columns: 1fr;
  }
}
</style>