<template>
  <el-dialog
    v-model="visible"
    title="运动邀请"
    width="600px"
    :before-close="handleClose"
    class="invitation-modal"
  >
    <!-- 邀请内容 -->
    <div class="invitation-content">
      <div class="invitation-header">
        <el-avatar :size="60" :src="invitation.inviter?.avatar">
          {{ invitation.inviter?.username?.charAt(0) }}
        </el-avatar>
        <div class="invitation-info">
          <h3>{{ invitation.inviter?.username }} 邀请你一起运动</h3>
          <p class="invitation-time">{{ formatTime(invitation.scheduledTime) }}</p>
        </div>
      </div>

      <div class="workout-details">
        <div class="workout-type">
          <el-icon class="workout-icon"><Trophy /></el-icon>
          <span>{{ getWorkoutTypeName(invitation.workoutType) }}</span>
        </div>
        <div class="target-reps">
          <el-icon class="target-icon"><Trophy /></el-icon>
          <span>目标次数：{{ invitation.targetReps }} 次</span>
        </div>
        <div class="invitation-message" v-if="invitation.message">
          <el-icon class="message-icon"><ChatDotRound /></el-icon>
          <span>{{ invitation.message }}</span>
        </div>
      </div>

      <!-- 接受邀请后的实时状态 -->
      <div v-if="invitation.status === 'accepted'" class="workout-progress">
        <h4>实时运动状态</h4>
        <div class="progress-grid">
          <div class="progress-card">
            <div class="progress-header">
              <el-avatar :size="40" :src="invitation.inviter?.avatar">
                {{ invitation.inviter?.username?.charAt(0) }}
              </el-avatar>
              <span>{{ invitation.inviter?.username }}</span>
            </div>
            <div class="progress-stats">
              <div class="stat">
                <span class="label">已完成</span>
                <span class="value">{{ invitation.inviterResult?.completedReps || 0 }}</span>
              </div>
              <div class="stat">
                <span class="label">目标</span>
                <span class="value">{{ invitation.targetReps }}</span>
              </div>
              <div class="progress-bar">
                <el-progress 
                  :percentage="getProgressPercentage(invitation.inviterResult?.completedReps, invitation.targetReps)"
                  :stroke-width="8"
                  :color="progressColor"
                />
              </div>
            </div>
          </div>

          <div class="progress-card">
            <div class="progress-header">
              <el-avatar :size="40" :src="user.avatar">
                {{ user.username?.charAt(0) }}
              </el-avatar>
              <span>{{ user.username }}</span>
            </div>
            <div class="progress-stats">
              <div class="stat">
                <span class="label">已完成</span>
                <span class="value">{{ invitation.inviteeResult?.completedReps || 0 }}</span>
              </div>
              <div class="stat">
                <span class="label">目标</span>
                <span class="value">{{ invitation.targetReps }}</span>
              </div>
              <div class="progress-bar">
                <el-progress 
                  :percentage="getProgressPercentage(invitation.inviteeResult?.completedReps, invitation.targetReps)"
                  :stroke-width="8"
                  :color="progressColor"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 实时更新按钮 -->
        <div class="action-buttons" v-if="invitation.status === 'accepted'">
          <el-button type="primary" @click="startWorkout" :loading="starting">
            开始运动
          </el-button>
          <el-button @click="updateProgress" :loading="updating">
            更新进度
          </el-button>
        </div>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <template v-if="invitation.status === 'pending'">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="danger" @click="rejectInvitation" :loading="rejecting">
            拒绝
          </el-button>
          <el-button type="primary" @click="acceptInvitation" :loading="accepting">
            接受邀请
          </el-button>
        </template>
        <template v-else-if="invitation.status === 'accepted'">
          <el-button @click="handleClose">关闭</el-button>
          <el-button type="success" @click="completeWorkout" :loading="completing">
            完成运动
          </el-button>
        </template>
        <template v-else>
          <el-button @click="handleClose">关闭</el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Trophy, ChatDotRound } from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'

interface InvitationProps {
  invitation: any
  visible: boolean
}

interface InvitationEmits {
  (e: 'update:visible', value: boolean): void
  (e: 'invitation-updated'): void
}

const props = defineProps<InvitationProps>()
const emit = defineEmits<InvitationEmits>()

const { user, apiRequest } = useAuth()

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const accepting = ref(false)
const rejecting = ref(false)
const starting = ref(false)
const updating = ref(false)
const completing = ref(false)

const progressColor = computed(() => {
  return [
    { color: '#f56c6c', percentage: 20 },
    { color: '#e6a23c', percentage: 40 },
    { color: '#5cb87a', percentage: 60 },
    { color: '#1989fa', percentage: 80 },
    { color: '#6f7ad3', percentage: 100 },
  ]
})

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getWorkoutTypeName = (type: string) => {
  const types: Record<string, string> = {
    'push-up': '俯卧撑',
    'squat': '深蹲',
    'sit-up': '仰卧起坐',
    'jumping-jack': '开合跳'
  }
  return types[type] || type
}

const getProgressPercentage = (completed: number, target: number) => {
  if (!completed || !target) return 0
  return Math.min(Math.round((completed / target) * 100), 100)
}

const acceptInvitation = async () => {
  accepting.value = true
  try {
    await apiRequest('/api/invitations/' + props.invitation._id + '/respond', {
      method: 'PUT',
      body: JSON.stringify({ response: 'accepted' })
    })
    ElMessage.success('已接受运动邀请')
    emit('invitation-updated')
  } catch (error) {
    ElMessage.error('接受邀请失败：' + error.message)
  } finally {
    accepting.value = false
  }
}

const rejectInvitation = async () => {
  rejecting.value = true
  try {
    await apiRequest('/api/invitations/' + props.invitation._id + '/respond', {
      method: 'PUT',
      body: JSON.stringify({ response: 'rejected' })
    })
    ElMessage.success('已拒绝运动邀请')
    emit('invitation-updated')
    handleClose()
  } catch (error) {
    ElMessage.error('拒绝邀请失败：' + error.message)
  } finally {
    rejecting.value = false
  }
}

const startWorkout = async () => {
  starting.value = true
  try {
    await apiRequest('/api/invitations/' + props.invitation._id + '/start', {
      method: 'PUT'
    })
    ElMessage.success('运动已开始，可以实时更新进度')
    emit('invitation-updated')
  } catch (error) {
    ElMessage.error('开始运动失败：' + error.message)
  } finally {
    starting.value = false
  }
}

const updateProgress = async () => {
  // 这里可以打开运动训练界面，或者手动输入进度
  // 暂时使用简单的输入框
  const reps = prompt('请输入当前完成的次数:')
  if (reps && !isNaN(Number(reps))) {
    updating.value = true
    try {
      await apiRequest('/api/invitations/' + props.invitation._id + '/update-progress', {
        method: 'PUT',
        body: JSON.stringify({ completedReps: Number(reps) })
      })
      ElMessage.success('进度更新成功')
      emit('invitation-updated')
    } catch (error) {
      ElMessage.error('更新进度失败：' + error.message)
    } finally {
      updating.value = false
    }
  }
}

const completeWorkout = async () => {
  completing.value = true
  try {
    await apiRequest('/api/invitations/' + props.invitation._id + '/complete', {
      method: 'PUT',
      body: JSON.stringify({
        completedReps: props.invitation.inviteeResult?.completedReps || 0,
        duration: Date.now() - new Date(props.invitation.startedAt).getTime()
      })
    })
    ElMessage.success('运动已完成')
    emit('invitation-updated')
    handleClose()
  } catch (error) {
    ElMessage.error('完成运动失败：' + error.message)
  } finally {
    completing.value = false
  }
}

const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
.invitation-modal {
  border-radius: 16px;
}

.invitation-content {
  padding: 16px 0;
}

.invitation-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
}

.invitation-info h3 {
  margin: 0 0 8px 0;
  color: #1e293b;
  font-size: 18px;
  font-weight: 600;
}

.invitation-time {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.workout-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.workout-type,
.target-reps,
.invitation-message {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workout-icon,
.target-icon,
.message-icon {
  font-size: 18px;
  color: #4f46e5;
}

.workout-progress {
  margin-top: 24px;
}

.workout-progress h4 {
  margin: 0 0 16px 0;
  color: #1e293b;
  font-size: 16px;
  font-weight: 600;
}

.progress-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.progress-card {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.progress-header span {
  font-weight: 600;
  color: #1e293b;
}

.progress-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat .label {
  color: #64748b;
  font-size: 14px;
}

.stat .value {
  color: #1e293b;
  font-weight: 600;
  font-size: 16px;
}

.progress-bar {
  margin-top: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
