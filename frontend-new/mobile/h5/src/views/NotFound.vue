<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <div class="error-icon">🔍</div>
      <h1 class="error-title">页面不存在</h1>
      <p class="error-message">抱歉，您访问的页面不存在或已被移除</p>
      
      <div class="actions">
        <van-button type="primary" round block @click="goHome">
          返回首页
        </van-button>
        <van-button plain round block @click="goBack">
          返回上页
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getRouterHandler } from '../utils/RouterHandler.js'

const routerHandler = getRouterHandler()

function goHome() {
  routerHandler.smartNavigate('/home', { replace: true })
}

function goBack() {
  routerHandler.platformAdapter.goBack()
}
</script>

<style lang="scss" scoped>
.not-found-page {
  min-height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.not-found-content {
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.error-title {
  font-size: 24px;
  font-weight: 600;
  color: #323233;
  margin: 0 0 12px 0;
}

.error-message {
  font-size: 14px;
  color: #969799;
  line-height: 1.6;
  margin: 0 0 32px 0;
}

.actions {
  .van-button + .van-button {
    margin-top: 12px;
  }
}
</style>