<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1 class="page-title">仪表板</h1>
      <p class="page-subtitle">系统概览与数据统计</p>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <el-card
        v-for="stat in statsCards"
        :key="stat.key"
        class="stat-card"
        shadow="hover"
      >
        <div class="stat-content">
          <div class="stat-icon" :style="{ backgroundColor: stat.color }">
            <el-icon :size="24">
              <component :is="stat.icon" />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 用户活跃度趋势 -->
        <el-col :xs="24" :lg="16">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>用户活跃度趋势</span>
                <el-button-group size="small">
                  <el-button 
                    v-for="period in timePeriods"
                    :key="period.value"
                    :type="selectedPeriod === period.value ? 'primary' : 'default'"
                    size="small"
                    @click="selectedPeriod = period.value"
                  >
                    {{ period.label }}
                  </el-button>
                </el-button-group>
              </div>
            </template>
            
            <div class="chart-container">
              <v-chart 
                class="chart" 
                :option="lineChartOption" 
                :loading="chartsLoading"
                autoresize
              />
            </div>
          </el-card>
        </el-col>
        
        <!-- 数据分布 -->
        <el-col :xs="24" :lg="8">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <span>数据分布</span>
            </template>
            
            <div class="chart-container">
              <v-chart 
                class="chart" 
                :option="pieChartOption" 
                :loading="chartsLoading"
                autoresize
              />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    
    <!-- 系统状态 -->
    <div class="system-status-section">
      <el-row :gutter="20">
        <el-col :xs="24" :lg="12">
          <el-card class="status-card" shadow="hover">
            <template #header>
              <span>系统状态</span>
            </template>
            
            <div class="status-list">
              <div
                v-for="status in systemStatuses"
                :key="status.key"
                class="status-item"
              >
                <div class="status-info">
                  <el-icon :class="['status-icon', status.status]">
                    <component :is="status.icon" />
                  </el-icon>
                  <span class="status-label">{{ status.label }}</span>
                </div>
                <div class="status-value" :class="status.status">
                  {{ status.value }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :lg="12">
          <el-card class="activity-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>最近活动</span>
                <el-button type="text" size="small" @click="refreshData">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </template>
            
            <div class="activity-list">
              <div
                v-for="activity in recentActivities"
                :key="activity.id"
                class="activity-item"
              >
                <div class="activity-avatar">
                  <el-avatar :size="32" :style="{ backgroundColor: activity.color }">
                    {{ activity.user.charAt(0) }}
                  </el-avatar>
                </div>
                <div class="activity-content">
                  <div class="activity-text">
                    <strong>{{ activity.user }}</strong> {{ activity.action }}
                  </div>
                  <div class="activity-time">{{ activity.time }}</div>
                </div>
              </div>
              
              <div v-if="recentActivities.length === 0" class="no-activities">
                <el-empty description="暂无最近活动" :image-size="80" />
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'

import { useAppStore } from '@/stores/app'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const appStore = useAppStore()

// 数据加载状态
const loading = ref(false)
const chartsLoading = ref(false)
const selectedPeriod = ref('7d')

// 时间周期选项
const timePeriods = [
  { label: '7天', value: '7d' },
  { label: '30天', value: '30d' },
  { label: '90天', value: '90d' }
]

// 统计卡片数据
const statsCards = computed(() => [
  {
    key: 'totalUsers',
    label: '总用户数',
    value: appStore.systemStats?.total_users || 0,
    icon: 'User',
    color: '#4A90E2'
  },
  {
    key: 'activeUsers',
    label: '活跃用户',
    value: appStore.systemStats?.active_users || 0,
    icon: 'UserFilled',
    color: '#67C23A'
  },
  {
    key: 'dataEntries',
    label: '数据条目',
    value: appStore.systemStats?.total_data_entries || 0,
    icon: 'DataAnalysis',
    color: '#E6A23C'
  },
  {
    key: 'systemUptime',
    label: '系统运行时间',
    value: appStore.systemStats?.system_uptime || '-',
    icon: 'Timer',
    color: '#F56C6C'
  }
])

// 系统状态数据
const systemStatuses = computed(() => [
  {
    key: 'database',
    label: '数据库',
    value: appStore.systemConfig?.database_status === 'connected' ? '正常' : '异常',
    status: appStore.systemConfig?.database_status === 'connected' ? 'online' : 'offline',
    icon: 'Database'
  },
  {
    key: 'redis',
    label: 'Redis',
    value: appStore.systemConfig?.redis_status === 'connected' ? '正常' : '异常',
    status: appStore.systemConfig?.redis_status === 'connected' ? 'online' : 'offline',
    icon: 'Connection'
  },
  {
    key: 'memory',
    label: '内存使用率',
    value: `${appStore.systemStats?.memory_usage || 0}%`,
    status: (appStore.systemStats?.memory_usage || 0) < 80 ? 'online' : 'warning',
    icon: 'Monitor'
  },
  {
    key: 'cpu',
    label: 'CPU使用率',
    value: `${appStore.systemStats?.cpu_usage || 0}%`,
    status: (appStore.systemStats?.cpu_usage || 0) < 80 ? 'online' : 'warning',
    icon: 'Cpu'
  }
])

// 最近活动数据（模拟数据）
const recentActivities = ref([
  {
    id: 1,
    user: 'admin',
    action: '登录了系统',
    time: dayjs().subtract(5, 'minute').format('HH:mm'),
    color: '#4A90E2'
  },
  {
    id: 2,
    user: 'test',
    action: '创建了新的数据记录',
    time: dayjs().subtract(15, 'minute').format('HH:mm'),
    color: '#67C23A'
  },
  {
    id: 3,
    user: 'admin',
    action: '更新了系统配置',
    time: dayjs().subtract(30, 'minute').format('HH:mm'),
    color: '#E6A23C'
  }
])

// 折线图配置
const lineChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      label: {
        backgroundColor: '#6a7985'
      }
    }
  },
  legend: {
    data: ['活跃用户', '新用户']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: generateDateRange()
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      name: '活跃用户',
      type: 'line',
      stack: 'Total',
      areaStyle: {},
      emphasis: {
        focus: 'series'
      },
      data: generateRandomData()
    },
    {
      name: '新用户',
      type: 'line',
      stack: 'Total',
      areaStyle: {},
      emphasis: {
        focus: 'series'
      },
      data: generateRandomData()
    }
  ]
}))

// 饼图配置
const pieChartOption = computed(() => ({
  tooltip: {
    trigger: 'item'
  },
  legend: {
    orient: 'vertical',
    left: 'left'
  },
  series: [
    {
      type: 'pie',
      radius: '50%',
      data: [
        { value: 35, name: '移动端' },
        { value: 25, name: 'PC端' },
        { value: 20, name: '小程序' },
        { value: 20, name: '其他' }
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
}))

// 生成日期范围
const generateDateRange = () => {
  const days = selectedPeriod.value === '7d' ? 7 : 
               selectedPeriod.value === '30d' ? 30 : 90
  const dates = []
  for (let i = days - 1; i >= 0; i--) {
    dates.push(dayjs().subtract(i, 'day').format('MM-DD'))
  }
  return dates
}

// 生成随机数据
const generateRandomData = () => {
  const days = selectedPeriod.value === '7d' ? 7 : 
               selectedPeriod.value === '30d' ? 30 : 90
  return Array.from({ length: days }, () => Math.floor(Math.random() * 100))
}

// 刷新数据
const refreshData = async () => {
  loading.value = true
  chartsLoading.value = true
  
  try {
    await appStore.refreshSystemData()
    ElMessage.success('数据已刷新')
  } catch (error) {
    ElMessage.error('刷新失败，请重试')
  } finally {
    loading.value = false
    chartsLoading.value = false
  }
}

// 组件挂载时获取数据
onMounted(async () => {
  if (!appStore.systemStats || !appStore.systemConfig) {
    await refreshData()
  }
})
</script>

<style lang="scss" scoped>
.dashboard {
  padding: 0;
}

.dashboard-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  .stat-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .stat-icon {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }
  
  .stat-info {
    flex: 1;
  }
  
  .stat-value {
    font-size: 32px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    line-height: 1;
    margin-bottom: 4px;
  }
  
  .stat-label {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.charts-section {
  margin-bottom: 24px;
}

.chart-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .chart-container {
    height: 300px;
    
    .chart {
      height: 100%;
      width: 100%;
    }
  }
}

.system-status-section {
  .status-card {
    .status-list {
      .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid var(--el-border-color-lighter);
        
        &:last-child {
          border-bottom: none;
        }
        
        .status-info {
          display: flex;
          align-items: center;
          gap: 8px;
          
          .status-icon {
            &.online {
              color: var(--el-color-success);
            }
            
            &.warning {
              color: var(--el-color-warning);
            }
            
            &.offline {
              color: var(--el-color-danger);
            }
          }
          
          .status-label {
            font-size: 14px;
            color: var(--el-text-color-primary);
          }
        }
        
        .status-value {
          font-size: 14px;
          font-weight: 500;
          
          &.online {
            color: var(--el-color-success);
          }
          
          &.warning {
            color: var(--el-color-warning);
          }
          
          &.offline {
            color: var(--el-color-danger);
          }
        }
      }
    }
  }
  
  .activity-card {
    .activity-list {
      max-height: 300px;
      overflow-y: auto;
      
      .activity-item {
        display: flex;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid var(--el-border-color-lighter);
        
        &:last-child {
          border-bottom: none;
        }
        
        .activity-content {
          flex: 1;
          
          .activity-text {
            font-size: 14px;
            color: var(--el-text-color-primary);
            line-height: 1.4;
            margin-bottom: 4px;
          }
          
          .activity-time {
            font-size: 12px;
            color: var(--el-text-color-secondary);
          }
        }
      }
      
      .no-activities {
        padding: 40px 0;
        text-align: center;
      }
    }
  }
}

// 响应式
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .stat-card {
    .stat-icon {
      width: 48px;
      height: 48px;
    }
    
    .stat-value {
      font-size: 24px;
    }
  }
  
  .chart-card {
    .card-header {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
    
    .chart-container {
      height: 250px;
    }
  }
}
</style>