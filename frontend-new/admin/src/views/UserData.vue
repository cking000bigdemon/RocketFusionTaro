<template>
  <div class="user-data-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">用户数据管理</h1>
        <p class="page-subtitle">查看和管理用户数据记录</p>
      </div>
    </div>
    
    <!-- 搜索和筛选 -->
    <el-card class="filter-card" shadow="never">
      <el-form
        :model="searchForm"
        inline
        class="search-form"
      >
        <el-form-item label="用户名">
          <el-input
            v-model="searchForm.username"
            placeholder="请输入用户名"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        
        <el-form-item label="数据类型">
          <el-select
            v-model="searchForm.data_type"
            placeholder="选择数据类型"
            clearable
          >
            <el-option label="全部" value="" />
            <el-option label="用户信息" value="user_info" />
            <el-option label="业务数据" value="business_data" />
            <el-option label="系统配置" value="system_config" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="table-header">
          <span class="table-title">数据记录</span>
          <div class="table-actions">
            <el-button type="primary" @click="exportData" :loading="exporting">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
            <el-button @click="fetchUserData">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>
      
      <el-table
        v-loading="loading"
        :data="userDataList"
        class="data-table"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column prop="id" label="ID" width="80" />
        
        <el-table-column label="用户信息" min-width="150">
          <template #default="{ row }">
            <div class="user-info">
              <div class="username">{{ row.username }}</div>
              <div class="user-id">ID: {{ row.user_id }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="数据类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getDataTypeTagType(row.data_type)">
              {{ getDataTypeLabel(row.data_type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="数据内容" min-width="300">
          <template #default="{ row }">
            <div class="data-content">
              <div class="data-preview">
                {{ getDataPreview(row.data) }}
              </div>
              <el-button
                type="text"
                size="small"
                @click="showDataDetail(row)"
              >
                查看详情
              </el-button>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="数据大小" width="100">
          <template #default="{ row }">
            <span class="data-size">{{ formatDataSize(row.data) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="updated_at" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updated_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                type="primary"
                size="small"
                @click="showDataDetail(row)"
              >
                查看
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="deleteUserData(row)"
              >
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 批量操作 -->
    <div v-if="selectedData.length > 0" class="batch-actions">
      <el-card shadow="always">
        <div class="batch-content">
          <span class="batch-info">已选择 {{ selectedData.length }} 条数据</span>
          <div class="batch-buttons">
            <el-button type="primary" @click="batchExport">批量导出</el-button>
            <el-button type="danger" @click="batchDelete">批量删除</el-button>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 数据详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="数据详情"
      width="800px"
    >
      <div v-if="detailData" class="data-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ detailData.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ detailData.username }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ detailData.user_id }}</el-descriptions-item>
          <el-descriptions-item label="数据类型">
            <el-tag :type="getDataTypeTagType(detailData.data_type)">
              {{ getDataTypeLabel(detailData.data_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detailData.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(detailData.updated_at) }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider>数据内容</el-divider>
        
        <div class="data-json">
          <el-input
            v-model="formattedDataContent"
            type="textarea"
            :rows="20"
            readonly
            resize="none"
            class="json-textarea"
          />
        </div>
        
        <div class="detail-actions">
          <el-button type="primary" @click="copyToClipboard">
            <el-icon><DocumentCopy /></el-icon>
            复制内容
          </el-button>
          <el-button @click="downloadJson">
            <el-icon><Download /></el-icon>
            下载JSON
          </el-button>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { useApiClient } from '@/composables/useApiClient'

const { apiClient } = useApiClient()

// 数据状态
const loading = ref(false)
const exporting = ref(false)
const userDataList = ref<any[]>([])
const selectedData = ref<any[]>([])
const showDetailDialog = ref(false)
const detailData = ref<any>(null)

// 搜索表单
const searchForm = reactive({
  username: '',
  data_type: '',
  dateRange: null as [string, string] | null
})

// 分页数据
const pagination = reactive({
  current: 1,
  size: 20,
  total: 0
})

// 格式化的数据内容
const formattedDataContent = computed(() => {
  if (!detailData.value?.data) return ''
  try {
    return JSON.stringify(detailData.value.data, null, 2)
  } catch {
    return String(detailData.value.data)
  }
})

// 数据类型映射
const dataTypeMap = {
  user_info: { label: '用户信息', type: 'primary' as const },
  business_data: { label: '业务数据', type: 'success' as const },
  system_config: { label: '系统配置', type: 'warning' as const },
  default: { label: '未知类型', type: 'info' as const }
}

// 获取数据类型标签
const getDataTypeLabel = (type: string) => {
  return dataTypeMap[type as keyof typeof dataTypeMap]?.label || dataTypeMap.default.label
}

// 获取数据类型标签类型
const getDataTypeTagType = (type: string) => {
  return dataTypeMap[type as keyof typeof dataTypeMap]?.type || dataTypeMap.default.type
}

// 获取数据预览
const getDataPreview = (data: any) => {
  if (!data) return '-'
  
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data)
    return str.length > 100 ? str.substring(0, 100) + '...' : str
  } catch {
    return String(data).substring(0, 100)
  }
}

// 格式化数据大小
const formatDataSize = (data: any) => {
  if (!data) return '0 B'
  
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data)
    const bytes = new Blob([str]).size
    
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  } catch {
    return '未知'
  }
}

// 格式化日期
const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 获取用户数据列表
const fetchUserData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      size: pagination.size
    }
    
    if (searchForm.username) params.username = searchForm.username
    if (searchForm.data_type) params.data_type = searchForm.data_type
    if (searchForm.dateRange) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    
    const response = await apiClient.adminGetUserDataList(params)
    
    if (response.code === 200) {
      userDataList.value = response.data.data || []
      pagination.total = response.data.total || 0
    } else {
      ElMessage.error(response.message || '获取用户数据失败')
    }
  } catch (error: any) {
    console.error('Failed to fetch user data:', error)
    ElMessage.error('获取用户数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.current = 1
  fetchUserData()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    username: '',
    data_type: '',
    dateRange: null
  })
  handleSearch()
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.size = size
  fetchUserData()
}

const handleCurrentChange = (current: number) => {
  pagination.current = current
  fetchUserData()
}

// 选择处理
const handleSelectionChange = (selection: any[]) => {
  selectedData.value = selection
}

// 显示数据详情
const showDataDetail = (data: any) => {
  detailData.value = data
  showDetailDialog.value = true
}

// 删除用户数据
const deleteUserData = async (data: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这条数据记录吗？此操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // TODO: 实现删除用户数据接口
    ElMessage.success('数据已删除')
    await fetchUserData()
  } catch (error) {
    // 用户取消操作
  }
}

// 导出数据
const exportData = async () => {
  exporting.value = true
  try {
    // TODO: 实现数据导出
    ElMessage.info('数据导出功能开发中...')
  } catch (error) {
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

// 批量操作
const batchExport = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要导出 ${selectedData.value.length} 条数据记录吗？`,
      '确认导出',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    // TODO: 实现批量导出
    ElMessage.info('批量导出功能开发中...')
  } catch (error) {
    // 用户取消操作
  }
}

const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${selectedData.value.length} 条数据记录吗？此操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // TODO: 实现批量删除
    ElMessage.info('批量删除功能开发中...')
  } catch (error) {
    // 用户取消操作
  }
}

// 复制到剪贴板
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(formattedDataContent.value)
    ElMessage.success('内容已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 下载JSON
const downloadJson = () => {
  if (!detailData.value) return
  
  const content = formattedDataContent.value
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `user_data_${detailData.value.id}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
  ElMessage.success('下载已开始')
}

// 初始化数据
onMounted(() => {
  fetchUserData()
})
</script>

<style lang="scss" scoped>
.user-data-page {
  .page-header {
    margin-bottom: 20px;
    
    .header-content {
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
    }
  }
  
  .filter-card,
  .table-card {
    margin-bottom: 20px;
  }
  
  .search-form {
    .el-form-item {
      margin-bottom: 0;
    }
  }
  
  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .table-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
    
    .table-actions {
      display: flex;
      gap: 8px;
    }
  }
  
  .data-table {
    .user-info {
      .username {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }
      
      .user-id {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }
    
    .data-content {
      .data-preview {
        font-size: 12px;
        color: var(--el-text-color-regular);
        margin-bottom: 8px;
        line-height: 1.4;
        word-break: break-all;
      }
    }
    
    .data-size {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
  
  .pagination-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }
  
  .batch-actions {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    
    .el-card {
      min-width: 400px;
    }
    
    .batch-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      
      .batch-info {
        font-size: 14px;
        color: var(--el-text-color-primary);
      }
      
      .batch-buttons {
        display: flex;
        gap: 8px;
      }
    }
  }
  
  .data-detail {
    .data-json {
      margin: 20px 0;
      
      .json-textarea {
        :deep(.el-textarea__inner) {
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.6;
          background-color: var(--el-fill-color-light);
        }
      }
    }
    
    .detail-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 20px;
    }
  }
}

// 响应式
@media (max-width: 768px) {
  .user-data-page {
    .search-form {
      .el-form-item {
        display: block;
        margin-bottom: 16px;
      }
    }
    
    .table-header {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
      
      .table-actions {
        justify-content: center;
      }
    }
    
    .data-table {
      font-size: 12px;
      
      :deep(.el-table__body-wrapper) {
        overflow-x: auto;
      }
    }
    
    .batch-actions {
      left: 10px;
      right: 10px;
      transform: none;
      
      .el-card {
        min-width: auto;
      }
      
      .batch-content {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
        
        .batch-buttons {
          justify-content: center;
        }
      }
    }
  }
}

// 暗色模式适配
.dark {
  .data-json {
    .json-textarea {
      :deep(.el-textarea__inner) {
        background-color: var(--el-bg-color-page);
        color: var(--el-text-color-primary);
      }
    }
  }
}
</style>