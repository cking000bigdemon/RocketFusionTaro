<template>
  <div class="home-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      :title="`欢迎，${userStore.getDisplayName()}`"
      left-text="返回"
      right-text="设置"
      left-arrow
      @click-left="goBack"
      @click-right="goToSettings"
    />

    <!-- 用户信息卡片 -->
    <div class="user-info-card">
      <van-card>
        <template #thumb>
          <div class="avatar">
            <van-icon name="user-o" size="40" />
          </div>
        </template>
        <template #title>
          <div class="user-name">{{ userStore.username }}</div>
        </template>
        <template #desc>
          <div class="user-role">
            <van-tag :type="userStore.isAdmin ? 'danger' : 'primary'">
              {{ userStore.isAdmin ? '管理员' : '普通用户' }}
            </van-tag>
          </div>
        </template>
        <template #footer>
          <div class="user-actions">
            <van-button size="mini" type="primary" @click="viewProfile">
              个人资料
            </van-button>
            <van-button size="mini" plain @click="logout">
              退出登录
            </van-button>
          </div>
        </template>
      </van-card>
    </div>

    <!-- 功能菜单 -->
    <div class="function-menu">
      <van-grid :column-num="2" :gutter="10">
        <van-grid-item
          v-for="item in menuItems"
          :key="item.id"
          :icon="item.icon"
          :text="item.text"
          @click="handleMenuClick(item)"
        />
      </van-grid>
    </div>

    <!-- 用户数据概览 -->
    <div class="data-overview">
      <van-cell-group :title="`我的数据 (${userDataList.length})`">
        <van-cell 
          v-for="data in displayUserData"
          :key="data.id"
          :title="data.name"
          :label="data.description || '暂无描述'"
          :value="formatDate(data.created_at)"
          is-link
          @click="viewUserData(data)"
        >
          <template #right-icon>
            <van-tag size="mini" :type="getDataTypeColor(data.data_type)">
              {{ data.data_type }}
            </van-tag>
          </template>
        </van-cell>
        
        <van-cell 
          v-if="userDataList.length === 0"
          title="暂无数据"
          label="点击上方菜单添加您的第一条数据"
          center
        />
        
        <van-cell 
          v-if="userDataList.length > 3"
          title="查看全部"
          :label="`还有 ${userDataList.length - 3} 条数据`"
          is-link
          @click="viewAllUserData"
        />
      </van-cell-group>
    </div>

    <!-- 系统状态 -->
    <div class="system-status">
      <van-cell-group title="系统信息">
        <NetworkStatus />
        
        <van-cell 
          title="应用版本" 
          :value="appVersion"
          label="点击检查更新"
          is-link
          @click="checkUpdate"
        />
      </van-cell-group>
    </div>

    <!-- 悬浮操作按钮 -->
    <van-floating-bubble
      axis="xy"
      icon="plus"
      magnetic="x"
      @click="showAddDataDialog"
    />

    <!-- 添加数据弹窗 -->
    <van-dialog
      v-model:show="showAddDialog"
      title="添加数据"
      show-cancel-button
      @confirm="addUserData"
    >
      <van-form ref="addForm">
        <van-field
          v-model="newDataForm.name"
          label="名称"
          placeholder="请输入数据名称"
          :rules="[{ required: true, message: '请填写数据名称' }]"
        />
        <van-field
          v-model="newDataForm.description"
          label="描述"
          placeholder="请输入数据描述（可选）"
        />
        <van-field
          v-model="newDataForm.data_type"
          label="类型"
          placeholder="请输入数据类型"
          :rules="[{ required: true, message: '请选择数据类型' }]"
        />
        <van-field
          v-model="newDataForm.content"
          type="textarea"
          label="内容"
          placeholder="请输入数据内容"
          :rules="[{ required: true, message: '请填写数据内容' }]"
          rows="3"
        />
      </van-form>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '../stores/user.js'
import { useAppStore } from '../stores/app.js'
import apiClient from '@shared/api/ApiClient.js'
import { getRouterHandler } from '../utils/RouterHandler.js'
import { formatDate } from '@shared/utils/index.js'
import NetworkStatus from '../components/NetworkStatus.vue'

// Store
const userStore = useUserStore()
const appStore = useAppStore()

// RouterHandler
const routerHandler = getRouterHandler()

// 响应式数据
const userDataList = ref([])
const isLoading = ref(false)
const showAddDialog = ref(false)
const addForm = ref(null)

// 新增数据表单
const newDataForm = reactive({
  name: '',
  description: '',
  data_type: '',
  content: ''
})

// 应用版本
const appVersion = ref('1.0.0')

// 计算属性
const displayUserData = computed(() => {
  return userDataList.value.slice(0, 3) // 只显示前3条
})


// 功能菜单配置
const menuItems = ref([
  {
    id: 'user-data',
    icon: 'records',
    text: '我的数据',
    action: 'viewAllUserData'
  },
  {
    id: 'add-data',
    icon: 'add-o',
    text: '添加数据',
    action: 'showAddDataDialog'
  },
  {
    id: 'profile',
    icon: 'contact',
    text: '个人资料',
    action: 'viewProfile'
  },
  {
    id: 'settings',
    icon: 'setting-o',
    text: '设置',
    action: 'goToSettings'
  }
])

/**
 * 处理菜单点击
 */
function handleMenuClick(item) {
  const action = item.action
  if (typeof window[action] === 'function') {
    window[action]()
  } else if (typeof this[action] === 'function') {
    this[action]()
  } else {
    // 通过方法名调用对应函数
    switch (action) {
      case 'viewAllUserData':
        viewAllUserData()
        break
      case 'showAddDataDialog':
        showAddDataDialog()
        break
      case 'viewProfile':
        viewProfile()
        break
      case 'goToSettings':
        goToSettings()
        break
      default:
        console.warn('Unknown menu action:', action)
    }
  }
}

/**
 * 返回上一页
 */
function goBack() {
  routerHandler.platformAdapter.goBack()
}

/**
 * 前往设置页面
 */
function goToSettings() {
  // 这里通常会调用API，后端返回路由指令
  routerHandler.smartNavigate('/settings')
}

/**
 * 查看个人资料
 */
function viewProfile() {
  routerHandler.smartNavigate('/profile')
}

/**
 * 退出登录
 */
async function logout() {
  // 检查是否已经在登出过程中
  if (!userStore.isLoggedIn) {
    console.log('User already logged out')
    await routerHandler.smartNavigate('/login', { replace: true })
    return
  }

  const result = await routerHandler.platformAdapter.showConfirm(
    '确认退出',
    '确定要退出登录吗？',
    '取消',
    '确定'
  )
  
  if (result.confirm) {
    try {
      // 调用登出API - 后端会发送路由指令
      await apiClient.mobileLogout()
    } catch (error) {
      console.error('Logout failed:', error)
      // 检查是否是401错误（已经登出）
      if (error.message && error.message.includes('401')) {
        console.log('Already logged out on server side')
      }
      // 即使API失败，也清除本地状态
      userStore.clearUser()
      await routerHandler.smartNavigate('/login', { replace: true })
    }
  }
}

/**
 * 加载用户数据列表
 */
async function loadUserData() {
  try {
    isLoading.value = true
    const response = await apiClient.mobileGetUserData()
    
    if (response.data && Array.isArray(response.data)) {
      userDataList.value = response.data
    }
  } catch (error) {
    console.error('Failed to load user data:', error)
    await routerHandler.platformAdapter.showToast('加载数据失败', 'error')
  } finally {
    isLoading.value = false
  }
}

/**
 * 查看所有用户数据
 */
function viewAllUserData() {
  routerHandler.smartNavigate('/user-data')
}

/**
 * 查看特定用户数据
 */
function viewUserData(data) {
  routerHandler.smartNavigate('/user-data', {
    query: { id: data.id }
  })
}

/**
 * 显示添加数据对话框
 */
function showAddDataDialog() {
  showAddDialog.value = true
  // 重置表单
  Object.assign(newDataForm, {
    name: '',
    description: '',
    data_type: '',
    content: ''
  })
}

/**
 * 添加用户数据
 */
async function addUserData() {
  try {
    // 表单验证
    if (!newDataForm.name || !newDataForm.data_type || !newDataForm.content) {
      await routerHandler.platformAdapter.showToast('请填写完整信息', 'error')
      return
    }

    // 调用API添加数据
    const response = await apiClient.mobileAddUserData({
      name: newDataForm.name.trim(),
      description: newDataForm.description.trim(),
      data_type: newDataForm.data_type.trim(),
      content: newDataForm.content.trim(),
      is_public: false
    })

    // 添加成功后重新加载数据
    await loadUserData()
    showAddDialog.value = false
    
    await routerHandler.platformAdapter.showToast('添加成功', 'success')

  } catch (error) {
    console.error('Failed to add user data:', error)
    const errorMessage = error.response?.data?.message || '添加失败'
    await routerHandler.platformAdapter.showToast(errorMessage, 'error')
  }
}

/**
 * 获取数据类型对应的颜色
 */
function getDataTypeColor(dataType) {
  const colorMap = {
    text: 'primary',
    json: 'success',
    image: 'warning',
    file: 'default'
  }
  return colorMap[dataType] || 'default'
}

/**
 * 检查更新
 */
async function checkUpdate() {
  await routerHandler.platformAdapter.showToast('已是最新版本', 'success')
}

/**
 * 初始化页面
 */
onMounted(async () => {
  // 获取应用信息
  const appInfo = appStore.getAppInfo()
  appVersion.value = appInfo.version

  // 加载用户数据
  await loadUserData()

  // 设置页面标题
  await routerHandler.platformAdapter.setPageTitle(`首页 - ${userStore.getDisplayName()}`)
})

/**
 * 页面销毁时的清理
 */
onUnmounted(() => {
  // 清理定时器或事件监听器（如果有）
})
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background-color: #f8f8f8;
}

.user-info-card {
  margin: 16px;
  border-radius: 12px;
  overflow: hidden;
  
  :deep(.van-card) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    .van-card__header,
    .van-card__content {
      background: transparent;
    }
  }

  .avatar {
    width: 60px;
    height: 60px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
  }

  .user-name {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .user-role {
    margin-bottom: 12px;
  }

  .user-actions {
    display: flex;
    gap: 8px;
    
    :deep(.van-button) {
      flex: 1;
      border-color: rgba(255, 255, 255, 0.3);
      color: white;
      
      &.van-button--primary {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
      }
      
      &.van-button--default.van-button--plain {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.5);
        color: white;
        
        &:active {
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }
  }
}

.function-menu {
  margin: 16px;
  
  :deep(.van-grid-item) {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    &:active {
      background-color: #f2f3f5;
    }
  }
  
  :deep(.van-grid-item__content) {
    padding: 20px 10px;
  }
  
  :deep(.van-grid-item__icon) {
    font-size: 28px;
    color: #1989fa;
  }
  
  :deep(.van-grid-item__text) {
    font-size: 14px;
    color: #323233;
    margin-top: 8px;
  }
}

.data-overview {
  margin: 16px;
  
  :deep(.van-cell-group) {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  :deep(.van-cell) {
    &:not(:last-child)::after {
      left: 16px;
      right: 16px;
    }
  }
}

.system-status {
  margin: 16px;
  
  :deep(.van-cell-group) {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

// 悬浮按钮样式调整
:deep(.van-floating-bubble) {
  --van-floating-bubble-size: 56px;
  --van-floating-bubble-initial-gap: 24px;
  --van-floating-bubble-icon-size: 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

// 对话框样式
:deep(.van-dialog) {
  .van-dialog__header {
    font-weight: 600;
  }
  
  .van-field {
    &:not(:last-child) {
      border-bottom: 1px solid #ebedf0;
    }
  }
}

// 加载状态
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  
  .van-loading {
    color: #1989fa;
  }
}

// 空状态
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #969799;
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  .empty-text {
    font-size: 16px;
    line-height: 1.4;
  }
}

// 响应式设计
@media (max-width: 375px) {
  .user-info-card,
  .function-menu,
  .data-overview,
  .system-status {
    margin: 12px;
  }
  
  :deep(.van-grid-item__content) {
    padding: 16px 8px;
  }
}

// 深色主题支持
:global(.theme-dark) {
  .home-page {
    background-color: #1a1a1a;
  }
  
  .function-menu :deep(.van-grid-item) {
    background: #2a2a2a;
  }
  
  .data-overview :deep(.van-cell-group),
  .system-status :deep(.van-cell-group) {
    background: #2a2a2a;
  }
}</style>