<template>
  <div class="profile-page">
    <van-nav-bar
      title="个人资料"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    />

    <div class="profile-content">
      <van-cell-group inset>
        <van-cell
          title="用户名"
          :value="userStore.username"
          is-link
          @click="showEditDialog('username', '用户名', userStore.username)"
        />
        
        <van-cell
          title="邮箱"
          :value="userStore.user?.email || '未设置'"
          is-link
          @click="showEditDialog('email', '邮箱', userStore.user?.email)"
        />
        
        <van-cell
          title="用户类型"
          :value="userStore.isAdmin ? '管理员' : '普通用户'"
        >
          <template #right-icon>
            <van-tag :type="userStore.isAdmin ? 'danger' : 'primary'">
              {{ userStore.isAdmin ? '管理员' : '普通用户' }}
            </van-tag>
          </template>
        </van-cell>

        <van-cell
          title="注册时间"
          :value="formatDate(userStore.user?.created_at)"
        />
      </van-cell-group>
      
      <div class="actions">
        <van-button
          type="danger"
          block
          round
          @click="logout"
        >
          退出登录
        </van-button>
      </div>
    </div>

    <!-- 编辑对话框 -->
    <van-dialog
      v-model:show="showDialog"
      :title="dialogTitle"
      show-cancel-button
      @confirm="handleEdit"
    >
      <van-field
        v-model="editValue"
        :placeholder="`请输入${dialogTitle}`"
        :rules="getValidationRules(editField)"
      />
    </van-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '../stores/user.js'
import { getRouterHandler } from '../utils/RouterHandler.js'
import apiClient from '@shared/api/ApiClient.js'
import { formatDate, isValidEmail } from '@shared/utils/index.js'

const userStore = useUserStore()
const routerHandler = getRouterHandler()

const showDialog = ref(false)
const dialogTitle = ref('')
const editField = ref('')
const editValue = ref('')

function goBack() {
  routerHandler.platformAdapter.goBack()
}

function showEditDialog(field, title, currentValue) {
  editField.value = field
  dialogTitle.value = title
  editValue.value = currentValue || ''
  showDialog.value = true
}

function getValidationRules(field) {
  switch (field) {
    case 'email':
      return [{ validator: (value) => !value || isValidEmail(value), message: '邮箱格式不正确' }]
    default:
      return []
  }
}

async function handleEdit() {
  try {
    const updateData = {
      [editField.value]: editValue.value
    }
    
    await apiClient.mobileUpdateUserInfo(updateData)
    
    await routerHandler.platformAdapter.showToast('更新成功', 'success')
  } catch (error) {
    await routerHandler.platformAdapter.showToast('更新失败', 'error')
  }
}

async function logout() {
  const result = await routerHandler.platformAdapter.showConfirm(
    '确认退出',
    '确定要退出登录吗？'
  )
  
  if (result.confirm) {
    await apiClient.mobileLogout()
  }
}
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background-color: #f8f8f8;
}

.profile-content {
  padding: 16px;
}

.actions {
  margin-top: 32px;
}
</style>