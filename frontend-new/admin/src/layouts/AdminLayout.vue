<template>
  <div class="admin-layout">
    <el-container class="layout-container">
      <!-- 侧边栏 -->
      <el-aside 
        :width="sidebarWidth"
        class="layout-sidebar"
      >
        <AdminSidebar />
      </el-aside>
      
      <!-- 主内容区 -->
      <el-container class="main-container">
        <!-- 顶部导航 -->
        <el-header 
          :height="headerHeight"
          class="layout-header"
        >
          <AdminHeader />
        </el-header>
        
        <!-- 主要内容 -->
        <el-main class="layout-main">
          <div class="main-content">
            <router-view v-slot="{ Component, route }">
              <transition name="fade" mode="out-in">
                <keep-alive>
                  <component :is="Component" :key="route.path" />
                </keep-alive>
              </transition>
            </router-view>
          </div>
        </el-main>
        
        <!-- 页脚 -->
        <el-footer 
          height="50px"
          class="layout-footer"
        >
          <AdminFooter />
        </el-footer>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import AdminSidebar from '@/components/AdminSidebar.vue'
import AdminHeader from '@/components/AdminHeader.vue'
import AdminFooter from '@/components/AdminFooter.vue'

const appStore = useAppStore()

// 计算侧边栏宽度
const sidebarWidth = computed(() => {
  return appStore.sidebarCollapsed ? '64px' : '260px'
})

const headerHeight = '60px'
</script>

<style lang="scss" scoped>
.admin-layout {
  height: 100vh;
  background-color: var(--admin-bg-page);
}

.layout-container {
  height: 100%;
}

.layout-sidebar {
  border-right: 1px solid var(--el-border-color);
  background-color: var(--admin-sidebar-bg);
  transition: width 0.3s ease;
  overflow: hidden;
}

.main-container {
  min-width: 0; // 防止flex收缩问题
}

.layout-header {
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--admin-header-bg);
  padding: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.layout-main {
  padding: 20px;
  background-color: var(--admin-bg-page);
  overflow-y: auto;
}

.main-content {
  min-height: calc(100vh - 130px); // header + footer + padding
}

.layout-footer {
  border-top: 1px solid var(--el-border-color);
  background-color: var(--admin-header-bg);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

// 页面切换动画
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

// 响应式布局
@media (max-width: 768px) {
  .layout-main {
    padding: 16px;
  }
  
  .main-content {
    min-height: calc(100vh - 122px);
  }
}

@media (max-width: 480px) {
  .layout-main {
    padding: 12px;
  }
}
</style>