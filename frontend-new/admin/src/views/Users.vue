<template>
  <div class="users-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">用户管理</h1>
        <p class="page-subtitle">管理系统用户信息和权限</p>
      </div>
      
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          新增用户
        </el-button>
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
        
        <el-form-item label="邮箱">
          <el-input
            v-model="searchForm.email"
            placeholder="请输入邮箱"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="选择状态"
            clearable
          >
            <el-option label="全部" value="" />
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
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
    
    <!-- 用户表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="users"
        class="users-table"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column prop="id" label="ID" width="80" />
        
        <el-table-column label="用户信息" min-width="200">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :size="40" class="user-avatar">
                {{ row.username.charAt(0).toUpperCase() }}
              </el-avatar>
              <div class="user-details">
                <div class="username">{{ row.username }}</div>
                <div class="email">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_admin ? 'danger' : 'primary'">
              {{ row.is_admin ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'">
              {{ row.is_active ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="last_login" label="最后登录" width="180">
          <template #default="{ row }">
            {{ row.last_login ? formatDate(row.last_login) : '-' }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                type="primary"
                size="small"
                @click="editUser(row)"
              >
                编辑
              </el-button>
              <el-button
                :type="row.is_active ? 'warning' : 'success'"
                size="small"
                @click="toggleUserStatus(row)"
              >
                {{ row.is_active ? '禁用' : '启用' }}
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="deleteUser(row)"
                :disabled="row.id === currentUserId"
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
    <div v-if="selectedUsers.length > 0" class="batch-actions">
      <el-card shadow="always">
        <div class="batch-content">
          <span class="batch-info">已选择 {{ selectedUsers.length }} 个用户</span>
          <div class="batch-buttons">
            <el-button type="warning" @click="batchToggleStatus">批量禁用/启用</el-button>
            <el-button type="danger" @click="batchDelete">批量删除</el-button>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 创建/编辑用户对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingUser ? '编辑用户' : '新增用户'"
      width="600px"
      @close="resetForm"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userFormRules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="userForm.username"
            placeholder="请输入用户名"
            :disabled="!!editingUser"
          />
        </el-form-item>
        
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="userForm.email"
            placeholder="请输入邮箱地址"
          />
        </el-form-item>
        
        <el-form-item label="密码" prop="password" v-if="!editingUser">
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="确认密码" prop="confirmPassword" v-if="!editingUser">
          <el-input
            v-model="userForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="角色">
          <el-radio-group v-model="userForm.is_admin">
            <el-radio :label="false">普通用户</el-radio>
            <el-radio :label="true">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="状态">
          <el-radio-group v-model="userForm.is_active">
            <el-radio :label="true">正常</el-radio>
            <el-radio :label="false">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingUser ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import dayjs from 'dayjs'
import { useAuthStore } from '@/stores/auth'
import { useApiClient } from '@/composables/useApiClient'

const { apiClient } = useApiClient()
const authStore = useAuthStore()

// 数据状态
const loading = ref(false)
const submitting = ref(false)
const users = ref<any[]>([])
const selectedUsers = ref<any[]>([])
const showCreateDialog = ref(false)
const editingUser = ref<any>(null)

// 表单引用
const userFormRef = ref<FormInstance>()

// 搜索表单
const searchForm = reactive({
  username: '',
  email: '',
  status: ''
})

// 用户表单
const userForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  is_admin: false,
  is_active: true
})

// 分页数据
const pagination = reactive({
  current: 1,
  size: 20,
  total: 0
})

// 当前用户ID
const currentUserId = computed(() => authStore.user?.id)

// 表单验证规则
const userFormRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email' as const, message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度在6-50个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value !== userForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 获取用户列表
const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await apiClient.adminGetUserList({
      page: pagination.current,
      size: pagination.size,
      username: searchForm.username || undefined,
      email: searchForm.email || undefined,
      status: searchForm.status || undefined
    })
    
    if (response.code === 200) {
      users.value = response.data.users || []
      pagination.total = response.data.total || 0
    } else {
      ElMessage.error(response.message || '获取用户列表失败')
    }
  } catch (error: any) {
    console.error('Failed to fetch users:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.current = 1
  fetchUsers()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    username: '',
    email: '',
    status: ''
  })
  handleSearch()
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.size = size
  fetchUsers()
}

const handleCurrentChange = (current: number) => {
  pagination.current = current
  fetchUsers()
}

// 选择处理
const handleSelectionChange = (selection: any[]) => {
  selectedUsers.value = selection
}

// 编辑用户
const editUser = (user: any) => {
  editingUser.value = user
  Object.assign(userForm, {
    username: user.username,
    email: user.email,
    password: '',
    confirmPassword: '',
    is_admin: user.is_admin,
    is_active: user.is_active
  })
  showCreateDialog.value = true
}

// 切换用户状态
const toggleUserStatus = async (user: any) => {
  try {
    const action = user.is_active ? '禁用' : '启用'
    await ElMessageBox.confirm(
      `确定要${action}用户 "${user.username}" 吗？`,
      `确认${action}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await apiClient.adminUpdateUser(user.id, {
      is_active: !user.is_active
    })
    
    if (response.code === 200) {
      ElMessage.success(`用户已${action}`)
      await fetchUsers()
    } else {
      ElMessage.error(response.message || `${action}失败`)
    }
  } catch (error) {
    // 用户取消操作
  }
}

// 删除用户
const deleteUser = async (user: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.username}" 吗？此操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await apiClient.adminDeleteUser(user.id)
    
    if (response.code === 200) {
      ElMessage.success('用户已删除')
      await fetchUsers()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    // 用户取消操作
  }
}

// 批量操作
const batchToggleStatus = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要批量切换 ${selectedUsers.value.length} 个用户的状态吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // TODO: 实现批量状态切换接口
    ElMessage.info('批量操作功能开发中...')
  } catch (error) {
    // 用户取消操作
  }
}

const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要批量删除 ${selectedUsers.value.length} 个用户吗？此操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // TODO: 实现批量删除接口
    ElMessage.info('批量删除功能开发中...')
  } catch (error) {
    // 用户取消操作
  }
}

// 表单提交
const handleSubmit = async () => {
  if (!userFormRef.value) return
  
  try {
    const valid = await userFormRef.value.validate()
    if (!valid) return
    
    submitting.value = true
    
    let response
    if (editingUser.value) {
      // 更新用户
      response = await apiClient.adminUpdateUser(editingUser.value.id, {
        email: userForm.email,
        is_admin: userForm.is_admin,
        is_active: userForm.is_active
      })
    } else {
      // 创建用户
      response = await apiClient.adminCreateUser({
        username: userForm.username,
        email: userForm.email,
        password: userForm.password,
        is_admin: userForm.is_admin,
        is_active: userForm.is_active
      })
    }
    
    if (response.code === 200) {
      ElMessage.success(editingUser.value ? '用户更新成功' : '用户创建成功')
      showCreateDialog.value = false
      await fetchUsers()
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch (error: any) {
    console.error('User operation failed:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  editingUser.value = null
  Object.assign(userForm, {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    is_admin: false,
    is_active: true
  })
  userFormRef.value?.resetFields()
}

// 格式化日期
const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 初始化数据
onMounted(() => {
  fetchUsers()
})
</script>

<style lang="scss" scoped>
.users-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
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
  
  .users-table {
    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .user-avatar {
        background-color: var(--el-color-primary);
        color: white;
        font-weight: 600;
      }
      
      .user-details {
        .username {
          font-size: 14px;
          font-weight: 500;
          color: var(--el-text-color-primary);
          margin-bottom: 4px;
        }
        
        .email {
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
      }
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
}

// 响应式
@media (max-width: 768px) {
  .users-page {
    .page-header {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
    }
    
    .search-form {
      .el-form-item {
        display: block;
        margin-bottom: 16px;
      }
    }
    
    .users-table {
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
</style>