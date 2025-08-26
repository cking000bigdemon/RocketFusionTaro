<template>
  <div id="app" :class="themeClass">
    <!-- 路由视图 -->
    <router-view />
    
    <!-- 全局加载指示器 -->
    <van-overlay :show="appStore.isLoading" class="loading-overlay">
      <div class="loading-wrapper">
        <van-loading type="spinner" size="24px" color="#fff">
          加载中...
        </van-loading>
      </div>
    </van-overlay>
    
    <!-- 网络状态提示 -->
    <van-notify 
      v-model:show="showNetworkNotify"
      type="warning" 
      message="网络连接已断开，请检查网络设置"
      :duration="0"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from './stores/app.js'
import { useUserStore } from './stores/user.js'
import { getRouterHandler } from './utils/RouterHandler.js'

// Store
const appStore = useAppStore()
const userStore = useUserStore()

// 路由
const route = useRoute()

// RouterHandler
const routerHandler = getRouterHandler()

// 响应式数据
const showNetworkNotify = ref(false)

// 计算属性
const themeClass = computed(() => {
  return `theme-${appStore.settings.theme}`
})

// 监听网络状态变化
watch(() => appStore.isOnline, (isOnline) => {
  showNetworkNotify.value = !isOnline
  
  if (isOnline) {
    // 网络恢复后可以做一些操作
    console.log('Network restored')
  }
})

// 监听路由变化
watch(() => route.path, (newPath, oldPath) => {
  if (routerHandler.debugMode) {
    console.log(`Route changed: ${oldPath} → ${newPath}`)
  }
})

/**
 * 处理页面可见性变化
 */
function handleVisibilityChange() {
  if (document.hidden) {
    // 页面不可见时暂停一些操作
    console.log('Page hidden')
  } else {
    // 页面可见时恢复操作
    console.log('Page visible')
  }
}

/**
 * 处理页面尺寸变化
 */
function handleResize() {
  const platformAdapter = routerHandler.platformAdapter
  if (platformAdapter) {
    const info = platformAdapter.getPlatformInfo()
    console.log('Screen size changed:', info.screenSize)
  }
}

/**
 * 处理应用进入后台
 */
function handleBeforeUnload(event) {
  // 如果有未保存的数据，可以在这里提醒用户
  if (hasUnsavedData()) {
    event.preventDefault()
    event.returnValue = '您有未保存的数据，确定要离开吗？'
  }
}

/**
 * 检查是否有未保存的数据
 */
function hasUnsavedData() {
  // 这里可以检查表单或其他未保存的状态
  return false
}

/**
 * 初始化应用
 */
function initializeApp() {
  // 设置根元素的字体大小（用于rem适配）
  setRootFontSize()
  
  // 监听设备方向变化
  window.addEventListener('orientationchange', () => {
    setTimeout(setRootFontSize, 100)
  })
  
  // 初始化主题
  document.documentElement.classList.add(themeClass.value)
  
  // 设置viewport meta标签（如果需要）
  updateViewportMeta()
}

/**
 * 设置根元素字体大小（rem适配）
 */
function setRootFontSize() {
  const baseSize = 16 // 基础字体大小
  const scale = Math.min(window.innerWidth / 375, 2) // 最大2倍缩放
  document.documentElement.style.fontSize = baseSize * scale + 'px'
}

/**
 * 更新viewport meta标签
 */
function updateViewportMeta() {
  const viewport = document.querySelector('meta[name="viewport"]')
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width,initial-scale=1.0,maximum-scale=1.0,minimum-scale=1.0,user-scalable=no,viewport-fit=cover'
    )
  }
}

/**
 * 生命周期钩子
 */
onMounted(() => {
  // 初始化应用
  initializeApp()
  
  // 添加事件监听器
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('resize', handleResize)
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  // 监听键盘显示/隐藏（移动端）
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const isKeyboardVisible = window.visualViewport.height < window.innerHeight
      document.documentElement.style.setProperty(
        '--keyboard-height', 
        isKeyboardVisible ? `${window.innerHeight - window.visualViewport.height}px` : '0px'
      )
    })
  }
  
  console.log('📱 Mobile H5 App initialized')
})

onUnmounted(() => {
  // 清理事件监听器
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', () => {})
  }
})
</script>

<style lang="scss">
// 全局样式
@import './styles/variables.scss';

// 重置样式
* {
  box-sizing: border-box;
}

html {
  font-size: 16px; // 基础字体大小，会被JS动态调整
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

body {
  margin: 0;
  padding: 0;
  font-family: $font-family-base;
  font-size: $font-size-base;
  line-height: $line-height-normal;
  color: $color-text-primary;
  background-color: $color-background;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
  position: relative;
  
  // 处理安全区域
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

// 滚动条样式
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  
  &:hover {
    background: rgba(0, 0, 0, 0.3);
  }
}

// 全局加载覆盖层
.loading-overlay {
  z-index: $z-index-modal;
  
  .loading-wrapper {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    
    .van-loading {
      color: white;
    }
  }
}

// 页面过渡动画
.page-enter-active,
.page-leave-active {
  transition: all $transition-duration-base $transition-timing-function;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

// 主题相关样式
.theme-light {
  // 浅色主题已在变量中定义
}

.theme-dark {
  background-color: $color-dark-background;
  color: $color-dark-text-primary;
  
  // 覆盖一些组件样式
  .van-nav-bar {
    background-color: $color-dark-surface;
    
    .van-nav-bar__title {
      color: $color-dark-text-primary;
    }
  }
  
  .van-tabbar {
    background-color: $color-dark-surface;
    border-top-color: $color-dark-border;
  }
  
  .van-cell {
    background-color: $color-dark-surface;
    color: $color-dark-text-primary;
    
    &::after {
      border-bottom-color: $color-dark-border;
    }
  }
  
  .van-field {
    background-color: $color-dark-surface;
    color: $color-dark-text-primary;
    
    .van-field__label {
      color: $color-dark-text-secondary;
    }
    
    .van-field__control {
      color: $color-dark-text-primary;
      
      &::placeholder {
        color: $color-dark-text-tertiary;
      }
    }
  }
  
  .van-button--default {
    background-color: $color-dark-surface;
    border-color: $color-dark-border;
    color: $color-dark-text-primary;
  }
  
  .van-dialog {
    background-color: $color-dark-surface;
    
    .van-dialog__header {
      color: $color-dark-text-primary;
    }
    
    .van-dialog__message {
      color: $color-dark-text-secondary;
    }
  }
}

// 键盘适配
@supports (height: 100dvh) {
  #app {
    min-height: 100dvh;
  }
}

// 处理刘海屏
@supports (padding: max(0px)) {
  #app {
    padding-top: max(env(safe-area-inset-top), 0px);
    padding-bottom: max(env(safe-area-inset-bottom), 0px);
    padding-left: max(env(safe-area-inset-left), 0px);
    padding-right: max(env(safe-area-inset-right), 0px);
  }
}

// 响应式设计
@media (max-width: 375px) {
  html {
    font-size: 14px;
  }
}

@media (min-width: 414px) {
  html {
    font-size: 18px;
  }
}

// 高分辨率屏幕优化
@media (-webkit-min-device-pixel-ratio: 2) {
  .van-hairline,
  .van-hairline--top,
  .van-hairline--bottom,
  .van-hairline--left,
  .van-hairline--right {
    &::after {
      transform-origin: center;
    }
  }
}

// 禁止选择文本（可选）
.no-select {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

// 工具类
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.flex { display: flex; }
.flex-center { @include flex-center; }
.flex-column { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }
.align-center { align-items: center; }
.align-start { align-items: flex-start; }
.align-end { align-items: flex-end; }

.w-full { width: 100%; }
.h-full { height: 100%; }

.p-0 { padding: 0; }
.p-1 { padding: $spacing-xs; }
.p-2 { padding: $spacing-sm; }
.p-3 { padding: $spacing-base; }
.p-4 { padding: $spacing-md; }

.m-0 { margin: 0; }
.m-1 { margin: $spacing-xs; }
.m-2 { margin: $spacing-sm; }
.m-3 { margin: $spacing-base; }
.m-4 { margin: $spacing-md; }

.rounded { border-radius: $border-radius-base; }
.rounded-lg { border-radius: $border-radius-md; }
.rounded-full { border-radius: $border-radius-full; }

.shadow { box-shadow: $box-shadow-base; }
.shadow-lg { box-shadow: $box-shadow-lg; }
</style>