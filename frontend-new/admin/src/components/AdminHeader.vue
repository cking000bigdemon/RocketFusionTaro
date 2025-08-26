<template>
  <div class="admin-header">
    <!-- 左侧区域 -->
    <div class="header-left">
      <!-- 菜单折叠按钮 -->
      <el-button
        type="text"
        size="large"
        class="menu-toggle"
        @click="appStore.toggleSidebar"
      >
        <el-icon>
          <Expand v-if="appStore.sidebarCollapsed" />
          <Fold v-else />
        </el-icon>
      </el-button>
      
      <!-- 面包屑导航 -->
      <el-breadcrumb class="breadcrumb" separator="/">
        <el-breadcrumb-item 
          v-for="item in breadcrumbs" 
          :key="item.path"
          :to="item.path"
        >
          {{ item.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    
    <!-- 右侧区域 -->
    <div class="header-right">
      <!-- 系统健康状态 -->
      <div class="system-status">
        <el-tooltip
          :content="systemStatusText"
          placement="bottom"
        >
          <div class="status-indicator">
            <div 
              :class="['status-dot', systemStatusClass]"
            ></div>
            <span class="status-text">{{ systemStatusText }}</span>
          </div>
        </el-tooltip>
      </div>
      
      <!-- 刷新按钮 -->
      <el-button
        type="text"
        size="large"
        class="action-button"
        @click="handleRefresh"
        :loading="refreshing"
      >
        <el-icon>
          <Refresh />
        </el-icon>
      </el-button>
      
      <!-- 主题切换 -->
      <el-button
        type="text"
        size="large"
        class="action-button"
        @click="appStore.toggleTheme"
      >
        <el-icon>
          <Moon v-if="!appStore.isDarkTheme" />
          <Sunny v-else />
        </el-icon>
      </el-button>
      
      <!-- 全屏按钮 -->
      <el-button
        type="text"
        size="large"
        class="action-button"
        @click="toggleFullscreen"
      >
        <el-icon>
          <FullScreen />
        </el-icon>
      </el-button>
      
      <!-- 用户菜单 -->
      <el-dropdown 
        class="user-dropdown"
        @command="handleCommand"
      >
        <div class="user-info">
          <el-avatar 
            :size="36"
            class="user-avatar"
          >
            {{ userInitial }}
          </el-avatar>
          <div class="user-details" v-show="!isSmallScreen">
            <div class="username">{{ authStore.user?.username }}</div>
            <div class="user-role">管理员</div>
          </div>
          <el-icon class="dropdown-arrow">
            <ArrowDown />
          </el-icon>
        </div>
        
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>
              个人资料
            </el-dropdown-item>
            <el-dropdown-item command="settings">
              <el-icon><Setting /></el-icon>
              系统设置
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const refreshing = ref(false)
const isSmallScreen = ref(false)

// 用户名首字母
const userInitial = computed(() => {
  return authStore.user?.username?.charAt(0).toUpperCase() || 'A'
})

// 面包屑导航
const breadcrumbs = computed(() => {
  const matched = route.matched.filter(item => item.meta?.title)
  const breadcrumbs = []
  
  // 添加首页
  if (route.path !== '/dashboard') {
    breadcrumbs.push({
      title: '仪表板',
      path: '/dashboard'
    })
  }
  
  // 添加当前路由
  matched.forEach(match => {
    if (match.meta?.title) {
      breadcrumbs.push({
        title: match.meta.title as string,
        path: match.path
      })
    }
  })
  
  return breadcrumbs
})

// 系统状态
const systemStatusClass = computed(() => {
  return appStore.systemHealthy ? 'online' : 'offline'
})

const systemStatusText = computed(() => {
  return appStore.systemHealthy ? '系统正常' : '系统异常'
})

// 刷新数据
const handleRefresh = async () => {
  refreshing.value = true
  try {
    await appStore.refreshSystemData()
  } finally {
    refreshing.value = false
  }
}

// 全屏切换
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

// 用户菜单命令处理
const handleCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人资料功能开发中...')
      break
    case 'settings':
      router.push('/settings')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm(
          '确定要退出登录吗？',
          '确认退出',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        await authStore.logout()
      } catch {
        // 用户取消操作
      }
      break
  }
}

// 响应式处理
const handleResize = () => {
  isSmallScreen.value = window.innerWidth <= 768
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.admin-header {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: var(--admin-header-bg);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-toggle {
  color: var(--el-text-color-primary);
  
  &:hover {
    background-color: var(--el-fill-light);
  }
}

.breadcrumb {
  font-size: 14px;
  
  :deep(.el-breadcrumb__inner) {
    color: var(--el-text-color-regular);
    font-weight: 400;
    
    &:hover {
      color: var(--el-color-primary);
    }
  }
  
  :deep(.el-breadcrumb__inner.is-link) {
    color: var(--el-color-primary);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.system-status {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  
  &:hover {
    background-color: var(--el-fill-light);
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  
  &.online {
    background-color: var(--el-color-success);
    animation: pulse 2s infinite;
  }
  
  &.offline {
    background-color: var(--el-color-danger);
  }
}

.status-text {
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.action-button {
  color: var(--el-text-color-primary);
  
  &:hover {
    background-color: var(--el-fill-light);
  }
}

.user-dropdown {
  margin-left: 8px;
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: var(--el-fill-light);
  }
}

.user-avatar {
  background-color: var(--el-color-primary);
  color: white;
  font-weight: 600;
}

.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.2;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.user-role {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.dropdown-arrow {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

// 动画
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

// 响应式
@media (max-width: 1024px) {
  .admin-header {
    padding: 0 16px;
  }
  
  .header-left {
    gap: 12px;
  }
  
  .header-right {
    gap: 8px;
  }
  
  .status-text {
    display: none;
  }
}

@media (max-width: 768px) {
  .admin-header {
    padding: 0 12px;
  }
  
  .breadcrumb {
    display: none;
  }
  
  .system-status {
    display: none;
  }
}
</style>