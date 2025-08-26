<template>
  <div class="settings-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">系统设置</h1>
        <p class="page-subtitle">配置系统参数和功能选项</p>
      </div>
    </div>
    
    <el-row :gutter="20">
      <!-- 左侧设置菜单 -->
      <el-col :xs="24" :lg="6">
        <el-card class="settings-menu" shadow="never">
          <el-menu
            :default-active="activeSettingTab"
            class="settings-menu-list"
            @select="handleMenuSelect"
          >
            <el-menu-item index="basic">
              <el-icon><Setting /></el-icon>
              <span>基本设置</span>
            </el-menu-item>
            
            <el-menu-item index="security">
              <el-icon><Lock /></el-icon>
              <span>安全设置</span>
            </el-menu-item>
            
            <el-menu-item index="notification">
              <el-icon><Bell /></el-icon>
              <span>通知设置</span>
            </el-menu-item>
            
            <el-menu-item index="database">
              <el-icon><Database /></el-icon>
              <span>数据库设置</span>
            </el-menu-item>
            
            <el-menu-item index="backup">
              <el-icon><FolderOpened /></el-icon>
              <span>备份设置</span>
            </el-menu-item>
            
            <el-menu-item index="logs">
              <el-icon><Document /></el-icon>
              <span>日志设置</span>
            </el-menu-item>
          </el-menu>
        </el-card>
      </el-col>
      
      <!-- 右侧设置内容 -->
      <el-col :xs="24" :lg="18">
        <!-- 基本设置 -->
        <el-card v-show="activeSettingTab === 'basic'" class="setting-content" shadow="never">
          <template #header>
            <div class="content-header">
              <el-icon><Setting /></el-icon>
              <span>基本设置</span>
            </div>
          </template>
          
          <el-form
            ref="basicFormRef"
            :model="basicSettings"
            :rules="basicRules"
            label-width="120px"
            class="setting-form"
          >
            <el-form-item label="应用名称" prop="app_name">
              <el-input
                v-model="basicSettings.app_name"
                placeholder="请输入应用名称"
                maxlength="50"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="应用描述" prop="app_description">
              <el-input
                v-model="basicSettings.app_description"
                type="textarea"
                :rows="3"
                placeholder="请输入应用描述"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="默认语言">
              <el-select v-model="basicSettings.default_language" placeholder="选择默认语言">
                <el-option label="简体中文" value="zh-CN" />
                <el-option label="English" value="en-US" />
                <el-option label="繁体中文" value="zh-TW" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="时区设置">
              <el-select v-model="basicSettings.timezone" placeholder="选择时区">
                <el-option label="Asia/Shanghai (+08:00)" value="Asia/Shanghai" />
                <el-option label="UTC (+00:00)" value="UTC" />
                <el-option label="America/New_York (-05:00)" value="America/New_York" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="维护模式">
              <el-switch
                v-model="basicSettings.maintenance_mode"
                active-text="开启"
                inactive-text="关闭"
              />
              <div class="form-tip">开启后，普通用户将无法访问系统</div>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveBasicSettings" :loading="saving">
                保存基本设置
              </el-button>
              <el-button @click="resetBasicSettings">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 安全设置 -->
        <el-card v-show="activeSettingTab === 'security'" class="setting-content" shadow="never">
          <template #header>
            <div class="content-header">
              <el-icon><Lock /></el-icon>
              <span>安全设置</span>
            </div>
          </template>
          
          <el-form
            ref="securityFormRef"
            :model="securitySettings"
            label-width="140px"
            class="setting-form"
          >
            <el-form-item label="密码复杂度要求">
              <el-checkbox-group v-model="securitySettings.password_requirements">
                <el-checkbox label="uppercase">至少包含一个大写字母</el-checkbox>
                <el-checkbox label="lowercase">至少包含一个小写字母</el-checkbox>
                <el-checkbox label="numbers">至少包含一个数字</el-checkbox>
                <el-checkbox label="symbols">至少包含一个特殊字符</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            
            <el-form-item label="最小密码长度">
              <el-input-number
                v-model="securitySettings.min_password_length"
                :min="6"
                :max="50"
                controls-position="right"
              />
            </el-form-item>
            
            <el-form-item label="Session超时时间">
              <el-input-number
                v-model="securitySettings.session_timeout"
                :min="15"
                :max="1440"
                controls-position="right"
              />
              <span class="form-unit">分钟</span>
            </el-form-item>
            
            <el-form-item label="登录失败限制">
              <el-input-number
                v-model="securitySettings.max_login_attempts"
                :min="3"
                :max="10"
                controls-position="right"
              />
              <span class="form-unit">次</span>
              <div class="form-tip">超过限制次数后将锁定账户</div>
            </el-form-item>
            
            <el-form-item label="启用双因子认证">
              <el-switch
                v-model="securitySettings.two_factor_auth"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>
            
            <el-form-item label="IP白名单">
              <el-input
                v-model="securitySettings.ip_whitelist"
                type="textarea"
                :rows="3"
                placeholder="每行一个IP地址，支持CIDR格式&#10;例如：192.168.1.1&#10;例如：10.0.0.0/24"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveSecuritySettings" :loading="saving">
                保存安全设置
              </el-button>
              <el-button @click="resetSecuritySettings">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 通知设置 -->
        <el-card v-show="activeSettingTab === 'notification'" class="setting-content" shadow="never">
          <template #header>
            <div class="content-header">
              <el-icon><Bell /></el-icon>
              <span>通知设置</span>
            </div>
          </template>
          
          <el-form
            ref="notificationFormRef"
            :model="notificationSettings"
            label-width="120px"
            class="setting-form"
          >
            <el-form-item label="邮件通知">
              <el-switch
                v-model="notificationSettings.email_enabled"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>
            
            <template v-if="notificationSettings.email_enabled">
              <el-form-item label="SMTP服务器">
                <el-input
                  v-model="notificationSettings.smtp_host"
                  placeholder="例如：smtp.gmail.com"
                />
              </el-form-item>
              
              <el-form-item label="SMTP端口">
                <el-input-number
                  v-model="notificationSettings.smtp_port"
                  :min="1"
                  :max="65535"
                  controls-position="right"
                />
              </el-form-item>
              
              <el-form-item label="发件人邮箱">
                <el-input
                  v-model="notificationSettings.smtp_username"
                  placeholder="发件人邮箱地址"
                />
              </el-form-item>
              
              <el-form-item label="邮箱密码">
                <el-input
                  v-model="notificationSettings.smtp_password"
                  type="password"
                  placeholder="邮箱密码或授权码"
                  show-password
                />
              </el-form-item>
            </template>
            
            <el-form-item label="系统通知">
              <el-checkbox-group v-model="notificationSettings.system_notifications">
                <el-checkbox label="user_login">用户登录</el-checkbox>
                <el-checkbox label="user_register">用户注册</el-checkbox>
                <el-checkbox label="system_error">系统错误</el-checkbox>
                <el-checkbox label="data_backup">数据备份</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveNotificationSettings" :loading="saving">
                保存通知设置
              </el-button>
              <el-button @click="testEmailNotification" :loading="testing">
                测试邮件发送
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 数据库设置 -->
        <el-card v-show="activeSettingTab === 'database'" class="setting-content" shadow="never">
          <template #header>
            <div class="content-header">
              <el-icon><Database /></el-icon>
              <span>数据库设置</span>
            </div>
          </template>
          
          <div class="database-status">
            <el-descriptions title="数据库连接状态" :column="2" border>
              <el-descriptions-item label="连接状态">
                <el-tag :type="appStore.systemConfig?.database_status === 'connected' ? 'success' : 'danger'">
                  {{ appStore.systemConfig?.database_status === 'connected' ? '已连接' : '断开连接' }}
                </el-tag>
              </el-descriptions-item>
              
              <el-descriptions-item label="Redis状态">
                <el-tag :type="appStore.systemConfig?.redis_status === 'connected' ? 'success' : 'danger'">
                  {{ appStore.systemConfig?.redis_status === 'connected' ? '已连接' : '断开连接' }}
                </el-tag>
              </el-descriptions-item>
              
              <el-descriptions-item label="内存使用">
                {{ appStore.systemStats?.memory_usage || 0 }}%
              </el-descriptions-item>
              
              <el-descriptions-item label="CPU使用">
                {{ appStore.systemStats?.cpu_usage || 0 }}%
              </el-descriptions-item>
            </el-descriptions>
          </div>
          
          <div class="database-actions">
            <el-button type="primary" @click="testDatabaseConnection" :loading="testing">
              <el-icon><Connection /></el-icon>
              测试连接
            </el-button>
            <el-button @click="optimizeDatabase" :loading="optimizing">
              <el-icon><Tools /></el-icon>
              优化数据库
            </el-button>
            <el-button type="warning" @click="showMaintenanceDialog">
              <el-icon><Warning /></el-icon>
              维护模式
            </el-button>
          </div>
        </el-card>
        
        <!-- 备份设置 -->
        <el-card v-show="activeSettingTab === 'backup'" class="setting-content" shadow="never">
          <template #header>
            <div class="content-header">
              <el-icon><FolderOpened /></el-icon>
              <span>备份设置</span>
            </div>
          </template>
          
          <el-form
            ref="backupFormRef"
            :model="backupSettings"
            label-width="120px"
            class="setting-form"
          >
            <el-form-item label="自动备份">
              <el-switch
                v-model="backupSettings.auto_backup"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>
            
            <template v-if="backupSettings.auto_backup">
              <el-form-item label="备份频率">
                <el-select v-model="backupSettings.backup_frequency" placeholder="选择备份频率">
                  <el-option label="每日" value="daily" />
                  <el-option label="每周" value="weekly" />
                  <el-option label="每月" value="monthly" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="备份时间">
                <el-time-picker
                  v-model="backupSettings.backup_time"
                  format="HH:mm"
                  value-format="HH:mm"
                  placeholder="选择备份时间"
                />
              </el-form-item>
            </template>
            
            <el-form-item label="保留备份数量">
              <el-input-number
                v-model="backupSettings.retention_count"
                :min="1"
                :max="30"
                controls-position="right"
              />
              <span class="form-unit">个</span>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveBackupSettings" :loading="saving">
                保存备份设置
              </el-button>
              <el-button type="success" @click="createBackupNow" :loading="backing">
                立即备份
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 日志设置 -->
        <el-card v-show="activeSettingTab === 'logs'" class="setting-content" shadow="never">
          <template #header>
            <div class="content-header">
              <el-icon><Document /></el-icon>
              <span>日志设置</span>
            </div>
          </template>
          
          <el-form
            ref="logsFormRef"
            :model="logsSettings"
            label-width="120px"
            class="setting-form"
          >
            <el-form-item label="日志级别">
              <el-select v-model="logsSettings.log_level" placeholder="选择日志级别">
                <el-option label="DEBUG" value="debug" />
                <el-option label="INFO" value="info" />
                <el-option label="WARN" value="warn" />
                <el-option label="ERROR" value="error" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="日志保留天数">
              <el-input-number
                v-model="logsSettings.retention_days"
                :min="1"
                :max="365"
                controls-position="right"
              />
              <span class="form-unit">天</span>
            </el-form-item>
            
            <el-form-item label="启用访问日志">
              <el-switch
                v-model="logsSettings.access_log_enabled"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>
            
            <el-form-item label="启用错误日志">
              <el-switch
                v-model="logsSettings.error_log_enabled"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveLogsSettings" :loading="saving">
                保存日志设置
              </el-button>
              <el-button @click="clearLogs" :loading="clearing">
                清空日志
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

// 状态变量
const activeSettingTab = ref('basic')
const saving = ref(false)
const testing = ref(false)
const optimizing = ref(false)
const backing = ref(false)
const clearing = ref(false)

// 表单引用
const basicFormRef = ref<FormInstance>()
const securityFormRef = ref<FormInstance>()
const notificationFormRef = ref<FormInstance>()
const backupFormRef = ref<FormInstance>()
const logsFormRef = ref<FormInstance>()

// 基本设置
const basicSettings = reactive({
  app_name: 'Rocket Admin',
  app_description: '现代化管理后台系统',
  default_language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  maintenance_mode: false
})

// 安全设置
const securitySettings = reactive({
  password_requirements: ['lowercase', 'numbers'],
  min_password_length: 8,
  session_timeout: 60,
  max_login_attempts: 5,
  two_factor_auth: false,
  ip_whitelist: ''
})

// 通知设置
const notificationSettings = reactive({
  email_enabled: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  system_notifications: ['system_error']
})

// 备份设置
const backupSettings = reactive({
  auto_backup: true,
  backup_frequency: 'daily',
  backup_time: '02:00',
  retention_count: 7
})

// 日志设置
const logsSettings = reactive({
  log_level: 'info',
  retention_days: 30,
  access_log_enabled: true,
  error_log_enabled: true
})

// 表单验证规则
const basicRules = {
  app_name: [
    { required: true, message: '请输入应用名称', trigger: 'blur' }
  ]
}

// 菜单选择处理
const handleMenuSelect = (key: string) => {
  activeSettingTab.value = key
}

// 保存基本设置
const saveBasicSettings = async () => {
  if (!basicFormRef.value) return
  
  try {
    const valid = await basicFormRef.value.validate()
    if (!valid) return
    
    saving.value = true
    
    // TODO: 调用保存设置的API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('基本设置已保存')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 重置基本设置
const resetBasicSettings = () => {
  Object.assign(basicSettings, {
    app_name: 'Rocket Admin',
    app_description: '现代化管理后台系统',
    default_language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    maintenance_mode: false
  })
}

// 保存安全设置
const saveSecuritySettings = async () => {
  saving.value = true
  try {
    // TODO: 调用保存安全设置的API
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('安全设置已保存')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 重置安全设置
const resetSecuritySettings = () => {
  Object.assign(securitySettings, {
    password_requirements: ['lowercase', 'numbers'],
    min_password_length: 8,
    session_timeout: 60,
    max_login_attempts: 5,
    two_factor_auth: false,
    ip_whitelist: ''
  })
}

// 保存通知设置
const saveNotificationSettings = async () => {
  saving.value = true
  try {
    // TODO: 调用保存通知设置的API
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('通知设置已保存')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 测试邮件通知
const testEmailNotification = async () => {
  testing.value = true
  try {
    // TODO: 调用测试邮件发送的API
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success('测试邮件已发送')
  } catch (error) {
    ElMessage.error('邮件发送失败')
  } finally {
    testing.value = false
  }
}

// 测试数据库连接
const testDatabaseConnection = async () => {
  testing.value = true
  try {
    await appStore.refreshSystemData()
    ElMessage.success('数据库连接正常')
  } catch (error) {
    ElMessage.error('数据库连接测试失败')
  } finally {
    testing.value = false
  }
}

// 优化数据库
const optimizeDatabase = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要优化数据库吗？此操作可能需要一些时间。',
      '确认优化',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    optimizing.value = true
    
    // TODO: 调用数据库优化API
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    ElMessage.success('数据库优化完成')
  } catch (error) {
    // 用户取消操作
  } finally {
    optimizing.value = false
  }
}

// 显示维护模式对话框
const showMaintenanceDialog = () => {
  ElMessageBox.alert(
    '维护模式功能开发中，敬请期待！',
    '功能提示',
    {
      confirmButtonText: '确定',
      type: 'info'
    }
  )
}

// 保存备份设置
const saveBackupSettings = async () => {
  saving.value = true
  try {
    // TODO: 调用保存备份设置的API
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('备份设置已保存')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 立即创建备份
const createBackupNow = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要立即创建系统备份吗？',
      '确认备份',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    backing.value = true
    
    // TODO: 调用立即备份API
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    ElMessage.success('备份创建成功')
  } catch (error) {
    // 用户取消操作
  } finally {
    backing.value = false
  }
}

// 保存日志设置
const saveLogsSettings = async () => {
  saving.value = true
  try {
    // TODO: 调用保存日志设置的API
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('日志设置已保存')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 清空日志
const clearLogs = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有日志文件吗？此操作不可撤销。',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    clearing.value = true
    
    // TODO: 调用清空日志API
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('日志已清空')
  } catch (error) {
    // 用户取消操作
  } finally {
    clearing.value = false
  }
}

// 组件挂载
onMounted(() => {
  // 可以从后端加载现有设置
})
</script>

<style lang="scss" scoped>
.settings-page {
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
  
  .settings-menu {
    .settings-menu-list {
      border: none;
      
      .el-menu-item {
        border-radius: 6px;
        margin: 4px 0;
        
        &:hover {
          background-color: var(--el-fill-light);
        }
        
        &.is-active {
          background-color: var(--el-color-primary-light-9);
          color: var(--el-color-primary);
        }
      }
    }
  }
  
  .setting-content {
    .content-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 500;
    }
    
    .setting-form {
      margin-top: 20px;
      
      .form-tip {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin-top: 4px;
      }
      
      .form-unit {
        margin-left: 8px;
        color: var(--el-text-color-secondary);
        font-size: 14px;
      }
    }
    
    .database-status {
      margin-bottom: 24px;
    }
    
    .database-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  }
}

// 响应式
@media (max-width: 1024px) {
  .settings-page {
    .el-col:first-child {
      margin-bottom: 20px;
    }
  }
}

@media (max-width: 768px) {
  .settings-page {
    .settings-menu {
      .settings-menu-list {
        .el-menu-item {
          font-size: 14px;
          padding: 0 16px;
        }
      }
    }
    
    .setting-form {
      .el-form-item__label {
        font-size: 14px;
      }
      
      .database-actions {
        .el-button {
          flex: 1;
          min-width: 120px;
        }
      }
    }
  }
}
</style>