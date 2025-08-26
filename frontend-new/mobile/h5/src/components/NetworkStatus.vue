<template>
  <div class="network-status">
    <!-- 简要状态显示 -->
    <van-cell 
      :title="statusText.status" 
      :label="statusText.detail"
      :value="lastUpdateText"
      clickable
      @click="showDetail = !showDetail"
    >
      <template #icon>
        <van-icon 
          :name="statusIcon" 
          :color="statusColor"
          class="status-icon"
        />
      </template>
      <template #right-icon>
        <van-loading v-if="isRefreshing" size="16" />
        <van-icon v-else name="arrow-down" :class="{ 'detail-arrow': true, 'detail-arrow-up': showDetail }" />
      </template>
    </van-cell>

    <!-- 详细状态显示 -->
    <div v-if="showDetail" class="detail-panel">
      <div class="status-details">
        <!-- 浏览器网络状态 -->
        <div class="status-section">
          <div class="section-header">
            <van-icon name="phone" size="16" />
            <span class="section-title">浏览器网络</span>
          </div>
          <div class="status-item">
            <span class="status-label">连接状态:</span>
            <span :class="['status-value', networkStatus.browser.online ? 'status-success' : 'status-error']">
              {{ networkStatus.browser.online ? '在线' : '离线' }}
            </span>
          </div>
          <div v-if="networkStatus.browser.type !== 'unknown'" class="status-item">
            <span class="status-label">网络类型:</span>
            <span class="status-value">{{ getNetworkTypeText(networkStatus.browser.type) }}</span>
          </div>
          <div v-if="networkStatus.browser.downlink" class="status-item">
            <span class="status-label">下行速度:</span>
            <span class="status-value">{{ networkStatus.browser.downlink }}Mbps</span>
          </div>
        </div>

        <!-- 后端服务状态 -->
        <div class="status-section">
          <div class="section-header">
            <van-icon name="laptop" size="16" />
            <span class="section-title">Rocket后端服务</span>
          </div>
          <div class="status-item">
            <span class="status-label">连接状态:</span>
            <span :class="['status-value', networkStatus.backend.connected ? 'status-success' : 'status-error']">
              {{ networkStatus.backend.connected ? '已连接' : '连接失败' }}
            </span>
          </div>
          <div v-if="networkStatus.backend.responseTime" class="status-item">
            <span class="status-label">响应时间:</span>
            <span class="status-value">{{ networkStatus.backend.responseTime }}ms</span>
          </div>
          <div v-if="networkStatus.backend.error" class="status-item">
            <span class="status-label">错误信息:</span>
            <span class="status-value status-error">{{ networkStatus.backend.error }}</span>
          </div>
        </div>

        <!-- 系统组件状态 -->
        <div v-if="networkStatus.system.overall !== 'unknown'" class="status-section">
          <div class="section-header">
            <van-icon name="setting" size="16" />
            <span class="section-title">系统组件状态</span>
          </div>
          
          <!-- 数据库状态 -->
          <div class="status-subsection">
            <div class="subsection-title">
              <van-icon name="records" size="14" />
              数据库 (PostgreSQL)
            </div>
            <div class="status-item">
              <span class="status-label">状态:</span>
              <span :class="['status-value', getStatusClass(networkStatus.system.database?.status)]">
                {{ getStatusText(networkStatus.system.database?.status) }}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">地址:</span>
              <span class="status-value">{{ networkStatus.system.database?.host }}:{{ networkStatus.system.database?.port }}</span>
            </div>
            <div v-if="networkStatus.system.database?.responseTime" class="status-item">
              <span class="status-label">响应时间:</span>
              <span class="status-value">{{ networkStatus.system.database.responseTime }}ms</span>
            </div>
            <div v-if="networkStatus.system.database?.error" class="status-item">
              <span class="status-label">错误:</span>
              <span class="status-value status-error">{{ networkStatus.system.database.error }}</span>
            </div>
          </div>

          <!-- Redis状态 -->
          <div class="status-subsection">
            <div class="subsection-title">
              <van-icon name="fire" size="14" />
              缓存 (Redis)
            </div>
            <div class="status-item">
              <span class="status-label">状态:</span>
              <span :class="['status-value', getStatusClass(networkStatus.system.cache?.status)]">
                {{ getStatusText(networkStatus.system.cache?.status) }}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">地址:</span>
              <span class="status-value">{{ networkStatus.system.cache?.host }}:{{ networkStatus.system.cache?.port }}</span>
            </div>
            <div v-if="networkStatus.system.cache?.responseTime" class="status-item">
              <span class="status-label">响应时间:</span>
              <span class="status-value">{{ networkStatus.system.cache.responseTime }}ms</span>
            </div>
            <div v-if="networkStatus.system.cache?.error" class="status-item">
              <span class="status-label">错误:</span>
              <span class="status-value status-error">{{ networkStatus.system.cache.error }}</span>
            </div>
          </div>

          <!-- 系统信息 -->
          <div v-if="networkStatus.system.version" class="status-item">
            <span class="status-label">版本:</span>
            <span class="status-value">{{ networkStatus.system.version }}</span>
          </div>
          <div v-if="networkStatus.system.timestamp" class="status-item">
            <span class="status-label">更新时间:</span>
            <span class="status-value">{{ formatTimestamp(networkStatus.system.timestamp) }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="status-actions">
          <van-button 
            type="primary" 
            size="small" 
            :loading="isRefreshing"
            @click="handleRefresh"
          >
            刷新状态
          </van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import networkStatusService from '../services/NetworkStatusService.js';
import { formatDate } from '@shared/utils/index.js';

const showDetail = ref(false);
const isRefreshing = ref(false);
const networkStatus = ref(networkStatusService.getStatus());

// 计算属性
const statusText = computed(() => {
  return networkStatusService.getStatusText();
});

const statusIcon = computed(() => {
  const overall = networkStatusService.getOverallStatus();
  switch (overall) {
    case 'online': return 'success';
    case 'degraded': return 'warning';
    case 'offline': return 'fail';
    default: return 'question';
  }
});

const statusColor = computed(() => {
  const overall = networkStatusService.getOverallStatus();
  switch (overall) {
    case 'online': return '#07c160';
    case 'degraded': return '#ff976a';
    case 'offline': return '#ee0a24';
    default: return '#969799';
  }
});

const lastUpdateText = computed(() => {
  if (networkStatus.value.backend.lastCheck) {
    const time = new Date(networkStatus.value.backend.lastCheck);
    return time.toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  return '未检测';
});

// 监听器
let unsubscribe = null;

// 方法
function getNetworkTypeText(type) {
  const typeMap = {
    'slow-2g': '2G慢速',
    '2g': '2G',
    '3g': '3G', 
    '4g': '4G',
    '5g': '5G',
    'wifi': 'WiFi'
  };
  return typeMap[type] || type.toUpperCase();
}

function getStatusClass(status) {
  switch (status) {
    case 'healthy': return 'status-success';
    case 'unhealthy': return 'status-error';
    case 'degraded': return 'status-warning';
    default: return 'status-default';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'healthy': return '正常';
    case 'unhealthy': return '异常';
    case 'degraded': return '降级';
    default: return '未知';
  }
}

function formatTimestamp(timestamp) {
  return formatDate(new Date(timestamp));
}

async function handleRefresh() {
  isRefreshing.value = true;
  try {
    await networkStatusService.refresh();
  } finally {
    isRefreshing.value = false;
  }
}

// 生命周期
onMounted(() => {
  // 添加状态变化监听器
  unsubscribe = networkStatusService.addListener((status) => {
    networkStatus.value = status;
  });
  
  // 开始定期检测
  networkStatusService.startPeriodicCheck();
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});
</script>

<style lang="scss" scoped>
.network-status {
  .status-icon {
    margin-right: 8px;
  }

  .detail-arrow {
    transition: transform 0.3s ease;
    
    &.detail-arrow-up {
      transform: rotate(180deg);
    }
  }
}

.detail-panel {
  border-top: 1px solid #ebedf0;
  overflow: hidden;
}

.status-details {
  padding: 16px;
  background: #f8f9fa;
}

.status-section {
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .section-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 600;
    color: #323233;
    
    .section-title {
      margin-left: 6px;
      font-size: 15px;
    }
  }
}

.status-subsection {
  margin: 12px 0;
  padding-left: 12px;
  border-left: 2px solid #e5e5e5;
  
  .subsection-title {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #646566;
    
    .van-icon {
      margin-right: 4px;
    }
  }
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .status-label {
    color: #646566;
    min-width: 70px;
  }
  
  .status-value {
    color: #323233;
    text-align: right;
    flex: 1;
    
    &.status-success {
      color: #07c160;
    }
    
    &.status-warning {
      color: #ff976a;
    }
    
    &.status-error {
      color: #ee0a24;
    }
    
    &.status-default {
      color: #969799;
    }
  }
}

.status-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebedf0;
  text-align: center;
}

// 深色模式支持
:global(.theme-dark) {
  .status-details {
    background: #2a2a2a;
  }
  
  .status-section .section-header .section-title {
    color: #e5e5e5;
  }
  
  .status-subsection .subsection-title {
    color: #a8a8a8;
  }
  
  .status-item .status-label {
    color: #a8a8a8;
  }
  
  .status-item .status-value {
    color: #e5e5e5;
  }
}
</style>