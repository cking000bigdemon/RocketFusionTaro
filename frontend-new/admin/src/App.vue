<template>
  <div id="app" class="app-container">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useAppStore } from './stores/app'

const authStore = useAuthStore()
const appStore = useAppStore()

onMounted(async () => {
  // 初始化应用
  await appStore.initialize()
  
  // 尝试恢复登录状态
  await authStore.initializeAuth()
})
</script>

<style lang="scss">
// 全局样式重置
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  height: 100vh;
  width: 100vw;
}

.app-container {
  height: 100%;
  width: 100%;
  background-color: var(--el-bg-color-page);
}

// Element Plus 样式调整
.el-button {
  font-weight: 500;
}

.el-card {
  border-radius: 8px;
}

.el-table {
  --el-table-border-radius: 8px;
}

// 自定义滚动条样式
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--el-border-color-lighter);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: var(--el-border-color-darker);
  border-radius: 3px;
  
  &:hover {
    background: var(--el-text-color-disabled);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .app-container {
    overflow-x: auto;
  }
}

// 打印样式
@media print {
  .no-print {
    display: none !important;
  }
}
</style>