<template>
  <div class="admin-footer">
    <div class="footer-content">
      <span class="copyright">
        © {{ currentYear }} Rocket Admin. All rights reserved.
      </span>
      <span class="version" v-if="version">
        Version {{ version }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

// 当前年份
const currentYear = computed(() => new Date().getFullYear())

// 系统版本
const version = computed(() => appStore.systemConfig?.version || '1.0.0')
</script>

<style lang="scss" scoped>
.admin-footer {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--admin-header-bg);
  border-top: 1px solid var(--el-border-color-lighter);
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.copyright {
  font-weight: 400;
}

.version {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  
  &::before {
    content: '•';
    margin-right: 8px;
    color: var(--el-border-color-darker);
  }
}

// 响应式
@media (max-width: 768px) {
  .footer-content {
    gap: 12px;
    font-size: 12px;
  }
  
  .version {
    display: none;
  }
}
</style>