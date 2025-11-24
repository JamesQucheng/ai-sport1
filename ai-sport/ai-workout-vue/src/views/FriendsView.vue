<template>
  <div class="friends-page">
    <div class="friends-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">好友圈</h1>
        <p class="page-subtitle">与好友一起运动，让健身更有动力</p>
      </div>

      <div class="friends-grid">
        <!-- 左侧：好友功能区 -->
        <div class="friends-main">
          <!-- 功能导航 -->
          <el-card class="nav-card" shadow="never">
            <div class="nav-tabs">
              <div 
                v-for="tab in tabs" 
                :key="tab.key"
                class="nav-tab"
                :class="{ active: activeTab === tab.key }"
                @click="activeTab = tab.key"
              >
                <el-icon><component :is="tab.icon" /></el-icon>
                <span>{{ tab.label }}</span>
                <el-badge 
                  v-if="tab.key === 'requests' && pendingRequestsCount > 0" 
                  :value="pendingRequestsCount" 
                  class="nav-badge"
                />
              </div>
            </div>
          </el-card>

          <!-- 好友列表 -->
          <el-card v-if="activeTab === 'list'" class="content-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><User /></el-icon>
                <span class="header-title">我的好友 ({{ friends.length }})</span>
                <el-button type="primary" @click="showAddFriendDialog = true" :icon="Plus">
                  添加好友
                </el-button>
              </div>
            </template>

            <div v-if="friends.length === 0" class="empty-state">
              <el-empty description="还没有好友，快去添加吧！">
                <el-button type="primary" @click="showAddFriendDialog = true">
                  添加好友
                </el-button>
              </el-empty>
            </div>

            <div v-else class="friends-list">
              <div v-for="friend in friends" :key="friend.friendshipId" class="friend-item">
                <div class="friend-avatar">
                  <el-avatar :size="50" :src="friend.friend.avatar" :alt="friend.friend.username">
                    {{ friend.friend.username.charAt(0).toUpperCase() }}
                  </el-avatar>
                  <div v-if="friend.isActiveToday" class="activity-indicator">
                    <el-icon><Check /></el-icon>
                  </div>
                </div>

                <div class="friend-info">
                  <div class="friend-basic">
                    <h4 class="friend-name">{{ friend.friend.username }}</h4>
                    <div class="friend-stats">
                      <span class="stat-item">
                        <el-icon><Trophy /></el-icon>
                        {{ friend.workoutStats.totalWorkouts }} 次运动
                      </span>
                      <span class="stat-item">
                        <el-icon><Timer /></el-icon>
                        连续 {{ friend.currentStreak }} 天
                      </span>
                    </div>
                  </div>
                  
                  <div class="friend-status">
                    <el-tag v-if="friend.isActiveToday" type="success" size="small" :icon="Check">
                      今日已运动
                    </el-tag>
                    <el-tag v-else type="info" size="small" :icon="Clock">
                      今日未运动
                    </el-tag>
                  </div>
                </div>

                <div class="friend-actions">
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="inviteFriend(friend)"
                    :icon="VideoPlay"
                  >
                    邀请运动
                  </el-button>
                  <el-dropdown @command="(cmd: string) => handleFriendAction(cmd, friend)">
                    <el-button size="small" :icon="More" />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="view">查看详情</el-dropdown-item>
                        <el-dropdown-item command="delete" divided>删除好友</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 好友请求 -->
          <el-card v-if="activeTab === 'requests'" class="content-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Bell /></el-icon>
                <span class="header-title">好友请求</span>
              </div>
            </template>

            <el-tabs v-model="requestTab" class="request-tabs">
              <el-tab-pane label="收到的请求" name="received">
                <div v-if="pendingRequests.length === 0" class="empty-state">
                  <el-empty description="暂无新的好友请求" />
                </div>
                <div v-else class="request-list">
                  <div v-for="request in pendingRequests" :key="request._id" class="request-item">
                    <el-avatar :size="40" :src="request.requester.avatar">
                      {{ request.requester.username.charAt(0).toUpperCase() }}
                    </el-avatar>
                    <div class="request-info">
                      <h5>{{ request.requester.username }}</h5>
                      <p v-if="request.message">{{ request.message }}</p>
                      <span class="request-time">{{ formatTime(request.requestedAt) }}</span>
                    </div>
                    <div class="request-actions">
                      <el-button 
                        type="primary" 
                        size="small" 
                        @click="handleRequest(request._id, 'accept')"
                        :loading="processingRequests.includes(request._id)"
                      >
                        接受
                      </el-button>
                      <el-button 
                        size="small" 
                        @click="handleRequest(request._id, 'reject')"
                        :loading="processingRequests.includes(request._id)"
                      >
                        拒绝
                      </el-button>
                    </div>
                  </div>
                </div>
              </el-tab-pane>
              
              <el-tab-pane label="发送的请求" name="sent">
                <div v-if="sentRequests.length === 0" class="empty-state">
                  <el-empty description="暂无发送的请求" />
                </div>
                <div v-else class="request-list">
                  <div v-for="request in sentRequests" :key="request._id" class="request-item">
                    <el-avatar :size="40" :src="request.recipient.avatar">
                      {{ request.recipient.username.charAt(0).toUpperCase() }}
                    </el-avatar>
                    <div class="request-info">
                      <h5>{{ request.recipient.username }}</h5>
                      <p v-if="request.message">{{ request.message }}</p>
                      <span class="request-time">{{ formatTime(request.requestedAt) }}</span>
                    </div>
                    <div class="request-status">
                      <el-tag type="warning" size="small">等待回应</el-tag>
                    </div>
                  </div>
                </div>
              </el-tab-pane>
            </el-tabs>
          </el-card>

          <!-- 排行榜 -->
          <el-card v-if="activeTab === 'ranking'" class="content-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><TrendCharts /></el-icon>
                <span class="header-title">好友排行榜</span>
                <el-select v-model="rankingPeriod" @change="loadRanking" style="width: 120px;">
                  <el-option label="本周" value="week" />
                  <el-option label="本月" value="month" />
                  <el-option label="全部" value="all" />
                </el-select>
              </div>
            </template>

            <div class="ranking-list">
              <div 
                v-for="(item, index) in rankings" 
                :key="item.user._id" 
                class="ranking-item"
                :class="{ 'current-user': item.isCurrentUser }"
              >
                <div class="rank-number">
                  <span v-if="index < 3" class="medal">
                    {{ ['🥇', '🥈', '🥉'][index] }}
                  </span>
                  <span v-else class="rank">{{ item.rank }}</span>
                </div>
                
                <el-avatar :size="40" :src="item.user.avatar">
                  {{ item.user.username.charAt(0).toUpperCase() }}
                </el-avatar>
                
                <div class="ranking-info">
                  <h5>{{ item.user.username }}</h5>
                  <div class="ranking-stats">
                    <span>{{ item.totalReps }} 次</span>
                    <span>{{ item.totalWorkouts }} 天</span>
                  </div>
                </div>
                
                <div v-if="item.isCurrentUser" class="current-user-badge">
                  <el-tag type="primary" size="small">我</el-tag>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 右侧：侧边栏 -->
        <div class="friends-sidebar">
          <!-- 快速邀请 -->
          <el-card class="quick-invite-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><VideoPlay /></el-icon>
                <span class="header-title">快速邀请</span>
              </div>
            </template>
            
            <div class="quick-invite-content">
              <p>邀请好友一起运动，让健身更有趣！</p>
              <el-button 
                type="primary" 
                @click="showInviteDialog = true"
                style="width: 100%;"
                :icon="Plus"
              >
                创建运动邀请
              </el-button>
            </div>
          </el-card>

          <!-- 运动邀请 -->
          <el-card class="invitations-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Calendar /></el-icon>
                <span class="header-title">运动邀请</span>
              </div>
            </template>

            <div v-if="recentInvitations.length === 0" class="empty-state">
              <el-empty description="暂无运动邀请" />
            </div>
            <div v-else class="invitation-list">
              <div 
                v-for="invitation in recentInvitations" 
                :key="invitation._id" 
                class="invitation-item"
                @click="openInvitationModal(invitation)"
              >
                <div class="invitation-info">
                  <div class="invitation-header">
                    <el-avatar 
                      :size="32" 
                      :src="getAvatarUrl(getInviterInfo(invitation).avatar)"
                    >
                      {{ getInviterInfo(invitation).nickname?.charAt(0) || getInviterInfo(invitation).username?.charAt(0) }}
                    </el-avatar>
                    <div class="invitation-details">
                      <h6>{{ getWorkoutTypeName(invitation.workoutInfo?.workoutType) }}</h6>
                      <p>{{ getInviterInfo(invitation).nickname || getInviterInfo(invitation).username }} 邀请你</p>
                    </div>
                  </div>
                  <div class="invitation-meta">
                    <p class="invitation-time">{{ formatTime(invitation.scheduledTime) }}</p>
                    <el-tag :type="getInvitationTagType(invitation.status)" size="small">
                      {{ getInvitationStatusText(invitation.status) }}
                    </el-tag>
                  </div>
                </div>
                <div class="invitation-actions" v-if="invitation.status === 'pending'">
                  <el-button size="small" type="danger" @click.stop="quickReject(invitation)">
                    拒绝
                  </el-button>
                  <el-button size="small" type="primary" @click.stop="quickAccept(invitation)">
                    接受
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 活跃运动会话 -->
          <el-card class="active-sessions-card" shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><VideoPlay /></el-icon>
                <span class="header-title">活跃会话</span>
                <el-badge 
                  v-if="activeSessions.length > 0" 
                  :value="activeSessions.length" 
                  type="primary"
                  class="session-badge"
                />
              </div>
            </template>

            <div v-if="activeSessions.length === 0" class="empty-state">
              <el-empty description="暂无活跃运动会话">
                <template #description>
                  <p>暂无活跃运动会话</p>
                  <p class="empty-tip">💡 接受好友的运动邀请后，会话将显示在这里</p>
                </template>
              </el-empty>
            </div>
            <div v-else class="session-list">
              <div 
                v-for="session in activeSessions" 
                :key="session._id" 
                class="session-item"
              >
                <div class="session-info">
                  <div class="session-header">
                    <el-avatar 
                      :size="32" 
                      :src="getAvatarUrl(getFriendInfo(session).avatar)"
                    >
                      {{ getFriendInfo(session).nickname?.charAt(0) || getFriendInfo(session).username?.charAt(0) }}
                    </el-avatar>
                    <div class="session-details">
                      <h5>{{ getFriendInfo(session).nickname || getFriendInfo(session).username }}</h5>
                      <p class="session-workout">{{ session.workoutInfo.workoutType === 'push-up' ? '俯卧撑' : '深蹲' }} - {{ session.workoutInfo.targetReps }}次</p>
                    </div>
                  </div>
                  
                  <div class="session-progress">
                    <div class="progress-item">
                      <span class="progress-label">我的进度:</span>
                      <span class="progress-value">{{ getMyProgress(session).completedReps || 0 }}/{{ session.workoutInfo.targetReps }}</span>
                      <el-tag 
                        :type="getMyProgress(session).isCompleted ? 'success' : 'info'" 
                        size="small"
                      >
                        {{ getMyProgress(session).isCompleted ? '已完成' : '进行中' }}
                      </el-tag>
                    </div>
                    <div class="progress-item">
                      <span class="progress-label">好友进度:</span>
                      <span class="progress-value">{{ getFriendProgress(session).completedReps || 0 }}/{{ session.workoutInfo.targetReps }}</span>
                      <el-tag 
                        :type="getFriendProgress(session).isCompleted ? 'success' : 'info'" 
                        size="small"
                      >
                        {{ getFriendProgress(session).isCompleted ? '已完成' : '进行中' }}
                      </el-tag>
                    </div>
                  </div>
                </div>
                
                <div class="session-actions">
                  <el-button 
                    v-if="!getMyProgress(session).isCompleted"
                    type="primary" 
                    size="small"
                    @click="continueWorkoutSession(session)"
                  >
                    继续运动
                  </el-button>
                  <el-button 
                    v-else
                    type="success" 
                    size="small"
                    disabled
                  >
                    已完成
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 运动邀请详情弹窗 -->
    <WorkoutInvitationModal
      v-model:visible="invitationModalVisible"
      :invitation="selectedInvitation"
      @invitation-updated="loadInvitations"
    />

    <!-- 添加好友对话框 -->
    <el-dialog v-model="showAddFriendDialog" title="添加好友" width="500px">
      <el-form :model="addFriendForm" ref="addFriendFormRef" :rules="addFriendRules">
        <el-form-item label="搜索用户" prop="username">
          <el-input 
            v-model="addFriendForm.username" 
            placeholder="输入用户名搜索"
            @input="searchUsers"
            :loading="searchLoading"
          />
        </el-form-item>
        
        <div v-if="searchResults.length > 0" class="search-results">
          <div v-for="user in searchResults" :key="user._id" class="search-result-item">
            <el-avatar :size="35" :src="user.avatar">
              {{ user.username.charAt(0).toUpperCase() }}
            </el-avatar>
            <div class="user-info">
              <span class="username">{{ user.username }}</span>
              <span class="join-date">加入于 {{ formatTime(user.createdAt) }}</span>
            </div>
            <el-button 
              v-if="user.relationStatus === 'none'"
              type="primary" 
              size="small" 
              @click="selectUser(user)"
            >
              选择
            </el-button>
            <el-tag v-else-if="user.relationStatus === 'friend'" type="success" size="small">
              已是好友
            </el-tag>
            <el-tag v-else-if="user.relationStatus === 'sent_request'" type="warning" size="small">
              已发送请求
            </el-tag>
            <el-tag v-else-if="user.relationStatus === 'received_request'" type="info" size="small">
              待处理请求
            </el-tag>
          </div>
        </div>

        <el-form-item v-if="selectedUser" label="好友申请消息" prop="message">
          <el-input 
            v-model="addFriendForm.message" 
            type="textarea" 
            placeholder="写一段话介绍自己（可选）"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddFriendDialog = false">取消</el-button>
        <el-button 
          v-if="selectedUser"
          type="primary" 
          @click="sendFriendRequest"
          :loading="sendingRequest"
        >
          发送好友请求
        </el-button>
      </template>
    </el-dialog>

    <!-- 运动邀请对话框 -->
    <el-dialog v-model="showInviteDialog" title="邀请好友运动" width="600px">
      <el-form :model="inviteForm" ref="inviteFormRef" :rules="inviteRules" label-width="100px">
        <el-form-item label="选择好友" prop="inviteeId">
          <el-select v-model="inviteForm.inviteeId" placeholder="选择要邀请的好友" style="width: 100%;">
            <el-option 
              v-for="friend in friends" 
              :key="friend.friend._id"
              :label="friend.friend.username"
              :value="friend.friend._id"
            >
              <div class="friend-option">
                <el-avatar :size="20" :src="friend.friend.avatar">
                  {{ friend.friend.username.charAt(0).toUpperCase() }}
                </el-avatar>
                <span>{{ friend.friend.username }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="运动类型" prop="workoutType">
          <el-select v-model="inviteForm.workoutType" @change="updateWorkoutName">
            <el-option label="俯卧撑" value="push-up" />
            <el-option label="深蹲" value="squat" />
          </el-select>
        </el-form-item>

        <el-form-item label="运动时间" prop="scheduledTime">
          <el-date-picker
            v-model="inviteForm.scheduledTime"
            type="datetime"
            placeholder="选择运动时间"
            :disabled-date="disabledDate"
            style="width: 100%;"
          />
        </el-form-item>

        <el-form-item label="运动时长" prop="duration">
          <el-input-number
            v-model="inviteForm.duration"
            :min="1"
            :max="120"
            placeholder="分钟"
            style="width: 100%;"
          />
        </el-form-item>

        <el-form-item label="目标次数" prop="targetReps">
          <el-input-number
            v-model="inviteForm.targetReps"
            :min="1"
            placeholder="次数"
            style="width: 100%;"
          />
        </el-form-item>

        <el-form-item label="邀请消息" prop="message">
          <el-input 
            v-model="inviteForm.message" 
            type="textarea" 
            placeholder="一起运动吧！"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showInviteDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="sendInvitation"
          :loading="sendingInvitation"
        >
          发送邀请
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  Plus,
  Bell,
  TrendCharts,
  VideoPlay,
  Calendar,
  Check,
  Clock,
  Trophy,
  Timer,
  More
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import WorkoutInvitationModal from '@/components/WorkoutInvitationModal.vue'

const { user, apiRequest } = useAuth()
const router = useRouter()

// 响应式数据
const activeTab = ref('list')
const requestTab = ref('received')
const rankingPeriod = ref('week')

const showAddFriendDialog = ref(false)
const showInviteDialog = ref(false)
const searchLoading = ref(false)
const sendingRequest = ref(false)
const sendingInvitation = ref(false)

const friends = ref<any[]>([])
const pendingRequests = ref<any[]>([])
const sentRequests = ref<any[]>([])
const rankings = ref<any[]>([])
const recentInvitations = ref<any[]>([])
const activeSessions = ref<any[]>([])
const searchResults = ref<any[]>([])
const selectedUser = ref<any>(null)
const processingRequests = ref<string[]>([])

// 邀请弹窗相关
const invitationModalVisible = ref(false)
const selectedInvitation = ref<any>(null)

// 表单数据
const addFriendForm = reactive({
  username: '',
  message: '',
  recipientId: ''
})

const inviteForm = reactive({
  inviteeId: '',
  workoutType: 'push-up',
  workoutName: '俯卧撑',
  scheduledTime: null as Date | null,
  duration: 30,
  targetReps: 20,
  message: '一起运动吧！'
})

// 表单引用
const addFriendFormRef = ref()
const inviteFormRef = ref()

// 导航标签
const tabs = [
  { key: 'list', label: '好友列表', icon: 'User' },
  { key: 'requests', label: '好友请求', icon: 'Bell' },
  { key: 'ranking', label: '排行榜', icon: 'TrendCharts' }
]

// 计算属性
const pendingRequestsCount = computed(() => pendingRequests.value.length)

// 验证规则
const addFriendRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ]
}

const inviteRules = {
  inviteeId: [
    { required: true, message: '请选择要邀请的好友', trigger: 'change' }
  ],
  workoutType: [
    { required: true, message: '请选择运动类型', trigger: 'change' }
  ],
  scheduledTime: [
    { required: true, message: '请选择运动时间', trigger: 'change' }
  ],
  duration: [
    { required: true, message: '请输入运动时长', trigger: 'blur' }
  ],
  targetReps: [
    { required: true, message: '请输入目标次数', trigger: 'blur' }
  ]
}

// 方法
const loadFriends = async () => {
  try {
    const response = await apiRequest('/friends/list')
    if (response.status === 'success') {
      friends.value = response.data.friends
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载好友列表失败')
  }
}

const loadPendingRequests = async () => {
  try {
    const response = await apiRequest('/friends/requests/pending')
    if (response.status === 'success') {
      pendingRequests.value = response.data.requests
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载好友请求失败')
  }
}

const loadSentRequests = async () => {
  try {
    const response = await apiRequest('/friends/requests/sent')
    if (response.status === 'success') {
      sentRequests.value = response.data.requests
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载已发送请求失败')
  }
}

const loadRanking = async () => {
  try {
    const response = await apiRequest(`/friends/ranking?period=${rankingPeriod.value}`)
    if (response.status === 'success') {
      rankings.value = response.data.rankings
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载排行榜失败')
  }
}

const loadRecentInvitations = async () => {
  try {
    // 加载接收到的邀请
    const receivedResponse = await apiRequest('/invitations?type=received&status=pending')
    let allInvitations = []
    
    if (receivedResponse.status === 'success') {
      allInvitations = [...receivedResponse.data.invitations]
    }
    
    // 加载发送的邀请
    const sentResponse = await apiRequest('/invitations?type=sent&status=pending')
    if (sentResponse.status === 'success') {
      allInvitations = [...allInvitations, ...sentResponse.data.invitations]
    }
    
    // 按时间排序，取最近的5条
    recentInvitations.value = allInvitations
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      
  } catch (error: any) {
    console.warn('加载运动邀请失败:', error)
  }
}

// 加载活跃运动会话
const loadActiveSessions = async () => {
  try {
    const response = await apiRequest('/invitations/sessions/active')
    if (response.status === 'success') {
      activeSessions.value = response.data.sessions
    }
  } catch (error: any) {
    console.warn('加载活跃会话失败:', error)
  }
}

const searchUsers = async () => {
  if (!addFriendForm.username || addFriendForm.username.length < 2) {
    searchResults.value = []
    return
  }

  searchLoading.value = true
  try {
    const response = await apiRequest(`/friends/search?username=${encodeURIComponent(addFriendForm.username)}`)
    if (response.status === 'success') {
      searchResults.value = response.data.users
    }
  } catch (error: any) {
    ElMessage.error(error.message || '搜索用户失败')
  } finally {
    searchLoading.value = false
  }
}

const selectUser = (user: any) => {
  selectedUser.value = user
  addFriendForm.recipientId = user._id
}

const sendFriendRequest = async () => {
  if (!addFriendFormRef.value || !selectedUser.value) return

  try {
    const valid = await addFriendFormRef.value.validate()
    if (!valid) return

    sendingRequest.value = true
    const response = await apiRequest('/friends/request', {
      method: 'POST',
      body: JSON.stringify({
        recipientId: addFriendForm.recipientId,
        message: addFriendForm.message
      })
    })

    if (response.status === 'success') {
      ElMessage.success('好友请求已发送')
      showAddFriendDialog.value = false
      resetAddFriendForm()
      loadSentRequests()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '发送好友请求失败')
  } finally {
    sendingRequest.value = false
  }
}

const handleRequest = async (requestId: string, action: string) => {
  processingRequests.value.push(requestId)
  try {
    const response = await apiRequest(`/friends/request/${requestId}/${action}`, {
      method: 'PUT'
    })

    if (response.status === 'success') {
      ElMessage.success(action === 'accept' ? '已接受好友请求' : '已拒绝好友请求')
      loadPendingRequests()
      if (action === 'accept') {
        loadFriends()
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    processingRequests.value = processingRequests.value.filter(id => id !== requestId)
  }
}

const inviteFriend = (friend: any) => {
  inviteForm.inviteeId = friend.friend._id
  showInviteDialog.value = true
}

const updateWorkoutName = () => {
  const workoutNames: Record<string, string> = {
    'push-up': '俯卧撑',
    'squat': '深蹲'
  }
  inviteForm.workoutName = workoutNames[inviteForm.workoutType] || '运动'
}

const disabledDate = (time: Date) => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000
}

const sendInvitation = async () => {
  if (!inviteFormRef.value) return

  try {
    const valid = await inviteFormRef.value.validate()
    if (!valid) return

    sendingInvitation.value = true
    const response = await apiRequest('/invitations', {
      method: 'POST',
      body: JSON.stringify({
        ...inviteForm,
        scheduledTime: inviteForm.scheduledTime?.toISOString()
      })
    })

    if (response.status === 'success') {
      ElMessage.success('运动邀请已发送')
      showInviteDialog.value = false
      resetInviteForm()
      loadRecentInvitations()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '发送邀请失败')
  } finally {
    sendingInvitation.value = false
  }
}

const handleFriendAction = async (action: string, friend: any) => {
  if (action === 'delete') {
    try {
      await ElMessageBox.confirm('确定要删除这个好友吗？', '确认删除', {
        type: 'warning'
      })

      const response = await apiRequest(`/friends/${friend.friendshipId}`, {
        method: 'DELETE'
      })

      if (response.status === 'success') {
        ElMessage.success('已删除好友')
        loadFriends()
      }
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '删除好友失败')
      }
    }
  }
}

const resetAddFriendForm = () => {
  addFriendForm.username = ''
  addFriendForm.message = ''
  addFriendForm.recipientId = ''
  selectedUser.value = null
  searchResults.value = []
}

const resetInviteForm = () => {
  inviteForm.inviteeId = ''
  inviteForm.workoutType = 'push-up'
  inviteForm.workoutName = '俯卧撑'
  inviteForm.scheduledTime = null
  inviteForm.duration = 30
  inviteForm.targetReps = 20
  inviteForm.message = '一起运动吧！'
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getInvitationTagType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    accepted: 'success',
    rejected: 'danger',
    expired: 'info',
    completed: 'success'
  }
  return types[status] || 'info'
}

const getInvitationStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '待回应',
    accepted: '已接受',
    rejected: '已拒绝',
    expired: '已过期',
    completed: '已完成'
  }
  return texts[status] || status
}

const getWorkoutTypeName = (type: string) => {
  const types: Record<string, string> = {
    'push-up': '俯卧撑',
    'squat': '深蹲'
  }
  return types[type] || type
}

// 打开邀请详情弹窗
const openInvitationModal = (invitation: any) => {
  selectedInvitation.value = invitation
  invitationModalVisible.value = true
}

// 快速接受邀请
const quickAccept = async (invitation: any) => {
  try {
    const response = await apiRequest(`/invitations/${invitation._id}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ response: 'accepted' })
    })
    
    if (response.status === 'success') {
      ElMessage.success('已接受运动邀请')
      loadInvitations()
      loadActiveSessions() // 刷新活跃会话列表
      
      // 询问是否立即开始运动
      ElMessageBox.confirm(
        `邀请已接受！是否立即开始${invitation.workoutInfo?.workoutType === 'push-up' ? '俯卧撑' : '深蹲'}运动？`,
        '开始运动',
        {
          confirmButtonText: '立即开始',
          cancelButtonText: '稍后开始',
          type: 'info'
        }
      ).then(() => {
        startInvitationWorkout(response.data.invitation)
      }).catch(() => {
        ElMessage({
          message: '你可以在右侧的"活跃会话"卡片中查看和继续运动',
          type: 'info',
          duration: 5000
        })
        // 高亮显示活跃会话卡片
        setTimeout(() => {
          const sessionCard = document.querySelector('.active-sessions-card')
          if (sessionCard) {
            sessionCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
            sessionCard.classList.add('highlight-card')
            setTimeout(() => {
              sessionCard.classList.remove('highlight-card')
            }, 3000)
          }
        }, 1000)
      })
    }
  } catch (error: any) {
    ElMessage.error('接受邀请失败：' + error.message)
  }
}

// 快速拒绝邀请
const quickReject = async (invitation: any) => {
  try {
    await apiRequest(`/invitations/${invitation._id}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ response: 'rejected' })
    })
    ElMessage.success('已拒绝运动邀请')
    loadInvitations()
  } catch (error: any) {
    ElMessage.error('拒绝邀请失败：' + error.message)
  }
}

// 重新加载邀请列表
const loadInvitations = () => {
  loadRecentInvitations()
}

// 开始邀请运动会话
const startInvitationWorkout = (invitation: any) => {
  try {
    // 存储邀请会话信息到localStorage
    const invitationSession = {
      invitationId: invitation._id,
      sessionId: invitation.workoutSession?.sessionId,
      workoutType: invitation.workoutInfo.workoutType,
      targetReps: invitation.workoutInfo.targetReps,
      duration: invitation.workoutInfo.duration || 5,
      friendName: invitation.sender._id === user.value?._id 
        ? (invitation.receiver.profile?.nickname || invitation.receiver.username)
        : (invitation.sender.profile?.nickname || invitation.sender.username)
    }
    
    localStorage.setItem('currentInvitationSession', JSON.stringify(invitationSession))
    
    // 跳转到运动界面
    router.push({
      path: '/workout/interface',
      query: {
        workout: invitation.workoutInfo.workoutType,
        duration: `${invitation.workoutInfo.duration || 5} Minutes`
      }
    })
    
    ElMessage.success(`开始与好友一起${invitation.workoutInfo.workoutType === 'push-up' ? '俯卧撑' : '深蹲'}！`)
    
  } catch (error) {
    console.error('启动邀请运动失败:', error)
    ElMessage.error('启动运动失败，请重试')
  }
}

// 获取好友信息
const getFriendInfo = (session: any) => {
  const isSender = session.sender._id === user.value?._id
  return isSender ? session.receiver : session.sender
}

// 获取我的进度
const getMyProgress = (session: any) => {
  const isSender = session.sender._id === user.value?._id
  return isSender ? session.workoutSession?.senderProgress : session.workoutSession?.receiverProgress
}

// 获取好友进度
const getFriendProgress = (session: any) => {
  const isSender = session.sender._id === user.value?._id
  return isSender ? session.workoutSession?.receiverProgress : session.workoutSession?.senderProgress
}

// 获取邀请人信息
const getInviterInfo = (invitation: any) => {
  // 如果我是接收者，返回发送者信息；如果我是发送者，返回接收者信息
  const isReceiver = invitation.receiver?._id === user.value?._id
  return isReceiver ? invitation.sender : invitation.receiver
}

// 获取头像URL
const getAvatarUrl = (avatar?: string): string => {
  if (!avatar) return ''
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
  const baseUrl = API_BASE_URL.replace('/api', '')
  
  // 如果avatar已经是完整URL，直接返回
  if (avatar.startsWith('http')) {
    return avatar
  }
  
  // 如果avatar以/uploads开头，直接拼接baseUrl
  if (avatar.startsWith('/uploads')) {
    return `${baseUrl}${avatar}`
  }
  
  // 否则假设是相对路径，拼接完整路径
  return `${baseUrl}/uploads/${avatar}`
}

// 继续运动会话
const continueWorkoutSession = (session: any) => {
  try {
    // 存储邀请会话信息到localStorage
    const invitationSession = {
      invitationId: session._id,
      sessionId: session.workoutSession?.sessionId,
      workoutType: session.workoutInfo.workoutType,
      targetReps: session.workoutInfo.targetReps,
      duration: session.workoutInfo.duration || 5,
      friendName: getFriendInfo(session).profile?.nickname || getFriendInfo(session).username
    }
    
    localStorage.setItem('currentInvitationSession', JSON.stringify(invitationSession))
    
    // 跳转到运动界面
    router.push({
      path: '/workout/interface',
      query: {
        workout: session.workoutInfo.workoutType,
        duration: `${session.workoutInfo.duration || 5} Minutes`
      }
    })
    
    ElMessage.success('继续运动会话')
    
  } catch (error) {
    console.error('继续运动会话失败:', error)
    ElMessage.error('启动运动失败，请重试')
  }
}

// 生命周期
onMounted(() => {
  if (user.value) {
    loadFriends()
    loadPendingRequests()
    loadSentRequests()
    loadRanking()
    loadRecentInvitations()
    loadActiveSessions()
  }
})
</script>

<style scoped>
.friends-page {
  min-height: calc(100vh - 140px);
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  padding: 40px 20px;
  position: relative;
  overflow-x: hidden;
}

.friends-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60vh;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%);
  border-radius: 0 0 50px 50px;
  z-index: 0;
}

.friends-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
  position: relative;
  z-index: 1;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 3rem;
  font-weight: 800;
  color: white;
  margin: 0 0 16px 0;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.5;
  font-weight: 300;
}

/* 卡片通用样式 */
.el-card {
  border-radius: 20px;
  border: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.el-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}

.friends-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
}

.friends-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.friends-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 导航标签 */
.nav-tabs {
  display: flex;
  gap: 8px;
}

.nav-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8fafc;
  color: #64748b;
  font-weight: 500;
  position: relative;
}

.nav-tab:hover {
  background: #e2e8f0;
  color: #334155;
}

.nav-tab.active {
  background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
}

.nav-badge {
  position: absolute;
  top: -5px;
  right: -5px;
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #2d3748;
}

.header-icon {
  color: #06b6d4;
  font-size: 1.2rem;
}

.header-title {
  flex: 1;
}

/* 好友列表 */
.friends-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  transition: all 0.3s ease;
}

.friend-item:hover {
  background: #e2e8f0;
}

.friend-avatar {
  position: relative;
}

.activity-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  background: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

.activity-indicator .el-icon {
  color: white;
  font-size: 12px;
}

.friend-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.friend-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
}

.friend-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
  color: #64748b;
}

.friend-actions {
  display: flex;
  gap: 8px;
}

/* 请求列表 */
.request-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.request-info {
  flex: 1;
}

.request-info h5 {
  margin: 0 0 4px 0;
  font-weight: 600;
  color: #2d3748;
}

.request-info p {
  margin: 0 0 4px 0;
  color: #64748b;
  font-size: 0.9rem;
}

.request-time {
  font-size: 0.8rem;
  color: #94a3b8;
}

.request-actions {
  display: flex;
  gap: 8px;
}

/* 排行榜 */
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  transition: all 0.3s ease;
}

.ranking-item.current-user {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border: 2px solid rgba(102, 126, 234, 0.2);
}

.rank-number {
  width: 40px;
  text-align: center;
}

.medal {
  font-size: 1.5rem;
}

.rank {
  font-weight: 600;
  color: #64748b;
}

.ranking-info {
  flex: 1;
}

.ranking-info h5 {
  margin: 0 0 4px 0;
  font-weight: 600;
  color: #2d3748;
}

.ranking-stats {
  display: flex;
  gap: 12px;
  font-size: 0.9rem;
  color: #64748b;
}

/* 搜索结果 */
.search-results {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-top: 8px;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.search-result-item:last-child {
  border-bottom: none;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.username {
  font-weight: 600;
  color: #2d3748;
}

.join-date {
  font-size: 0.8rem;
  color: #94a3b8;
}

/* 好友选择选项 */
.friend-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
  line-height: 1.4;
}

/* 活跃会话样式 */
.active-sessions-card {
  margin-bottom: 20px;
  position: relative;
}

.active-sessions-card.highlight-card {
  animation: highlightPulse 3s ease-in-out;
  border: 2px solid #409eff !important;
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.3) !important;
}

@keyframes highlightPulse {
  0% { 
    transform: scale(1);
    box-shadow: 0 0 0 rgba(64, 158, 255, 0.7);
  }
  50% { 
    transform: scale(1.02);
    box-shadow: 0 0 20px rgba(64, 158, 255, 0.7);
  }
  100% { 
    transform: scale(1);
    box-shadow: 0 0 0 rgba(64, 158, 255, 0.7);
  }
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.session-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.session-info {
  flex: 1;
}

.session-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.session-details h5 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
}

.session-workout {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.session-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.progress-label {
  color: #64748b;
  min-width: 60px;
}

.progress-value {
  font-weight: 600;
  color: #2d3748;
  min-width: 40px;
}

.session-actions {
  flex-shrink: 0;
  margin-left: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .friends-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .friends-sidebar {
    order: -1;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .nav-tabs {
    flex-direction: column;
  }
  
  .friend-item {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .friend-stats {
    justify-content: center;
  }
}

/* 运动邀请样式 */
.invitation-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.invitation-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.invitation-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invitation-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.invitation-details h6 {
  margin: 0 0 4px 0;
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.invitation-details p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.invitation-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.invitation-time {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.invitation-actions {
  display: flex;
  gap: 8px;
  margin-left: 16px;
}
</style>
