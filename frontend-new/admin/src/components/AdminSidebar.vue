<template>
  <div class="admin-sidebar">
    <!-- Logo区域 -->
    <div class="sidebar-logo">
      <div class="logo-content">
        <div class="logo-icon">🚀</div>
        <div v-show="!appStore.sidebarCollapsed" class="logo-text">
          Rocket Admin
        </div>
      </div>
    </div>
    
    <!-- 导航菜单 -->
    <el-scrollbar class="sidebar-menu-scrollbar">
      <el-menu
        :default-active="currentRoute"
        class="sidebar-menu"
        :collapse="appStore.sidebarCollapsed"
        :unique-opened="true"
        router
        @select="handleMenuSelect"
      >
        <template v-for="route in menuRoutes" :key="route.path">
          <el-menu-item
            v-if="!route.children"
            :index="route.path"
            class="menu-item"
          >
            <el-icon v-if="route.meta?.icon">
              <component :is="route.meta.icon" />
            </el-icon>
            <template #title>{{ route.meta?.title }}</template>
          </el-menu-item>
          
          <el-sub-menu
            v-else
            :index="route.path"
            class="sub-menu"
          >
            <template #title>
              <el-icon v-if="route.meta?.icon">
                <component :is="route.meta.icon" />
              </el-icon>
              <span>{{ route.meta?.title }}</span>
            </template>
            
            <el-menu-item
              v-for="child in route.children"
              :key="child.path"
              :index="child.path"
              class="menu-item"
            >
              <el-icon v-if="child.meta?.icon">
                <component :is="child.meta.icon" />
              </el-icon>
              <template #title>{{ child.meta?.title }}</template>
            </el-menu-item>
          </el-sub-menu>
        </template>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

// 当前激活的路由
const currentRoute = computed(() => route.path)

// 菜单路由（过滤掉登录页和404页）
const menuRoutes = computed(() => {
  return router.getRoutes().filter(route => {
    // 只显示有meta.title且不隐藏的路由
    return route.meta?.title && 
           !route.meta?.hideInMenu && 
           route.meta?.requiresAuth !== false &&
           route.path !== '/'
  }).map(route => {
    // 处理子路由
    if (route.children && route.children.length > 0) {
      const visibleChildren = route.children.filter(child => 
        child.meta?.title && !child.meta?.hideInMenu
      )
      if (visibleChildren.length > 0) {
        return {
          ...route,
          children: visibleChildren
        }
      }
    }
    return route
  })
})

// 菜单选择处理
const handleMenuSelect = (key: string) => {
  if (key !== route.path) {
    router.push(key)
  }
}
</script>

<style lang="scss" scoped>
.admin-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--admin-sidebar-bg);
}

.logo-content {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    opacity: 0.8;
  }
}

.logo-icon {
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-menu-scrollbar {
  flex: 1;
  
  :deep(.el-scrollbar__wrap) {
    overflow-x: hidden;
  }
}

.sidebar-menu {
  border: none;
  background-color: var(--admin-sidebar-bg);
  
  // 菜单项样式
  :deep(.el-menu-item) {
    color: var(--el-text-color-primary);
    border-radius: 6px;
    margin: 4px 8px;
    padding: 0 16px;
    
    &:hover {
      background-color: var(--el-fill-light);
      color: var(--el-color-primary);
    }
    
    &.is-active {
      background-color: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      border-right: none;
      
      &::before {
        content: '';
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 20px;
        background-color: var(--el-color-primary);
        border-radius: 2px;
      }
    }
  }
  
  // 子菜单样式
  :deep(.el-sub-menu) {
    .el-sub-menu__title {
      color: var(--el-text-color-primary);
      border-radius: 6px;
      margin: 4px 8px;
      padding: 0 16px;
      
      &:hover {
        background-color: var(--el-fill-light);
        color: var(--el-color-primary);
      }
    }
    
    .el-menu {
      background-color: transparent;
    }
  }
  
  // 折叠状态样式
  &.el-menu--collapse {
    width: 64px;
    
    :deep(.el-menu-item),
    :deep(.el-sub-menu__title) {
      padding: 0 20px;
      justify-content: center;
    }
    
    :deep(.el-menu-item.is-active::before) {
      display: none;
    }
  }
}

// 图标样式
:deep(.el-icon) {
  margin-right: 8px;
  font-size: 16px;
  
  .el-menu--collapse & {
    margin-right: 0;
  }
}

// 响应式
@media (max-width: 768px) {
  .sidebar-logo {
    padding: 0 12px;
  }
  
  .logo-icon {
    font-size: 24px;
  }
  
  .logo-text {
    font-size: 16px;
  }
}
</style>