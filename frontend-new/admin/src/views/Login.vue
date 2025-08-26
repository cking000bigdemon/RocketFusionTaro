<template>
  <div class="login-page">
    <div class="login-container">
      <!-- 左侧装饰区域 -->
      <div class="login-decoration">
        <div class="decoration-content">
          <div class="logo-section">
            <div class="logo-icon">🚀</div>
            <h1 class="logo-title">Rocket Admin</h1>
            <p class="logo-subtitle">现代化管理后台系统</p>
          </div>
          
          <div class="features">
            <div class="feature-item">
              <el-icon><Monitor /></el-icon>
              <span>多平台管理</span>
            </div>
            <div class="feature-item">
              <el-icon><DataAnalysis /></el-icon>
              <span>数据分析</span>
            </div>
            <div class="feature-item">
              <el-icon><User /></el-icon>
              <span>用户管理</span>
            </div>
            <div class="feature-item">
              <el-icon><Setting /></el-icon>
              <span>系统配置</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧登录表单 -->
      <div class="login-form-container">
        <div class="form-wrapper">
          <div class="form-header">
            <h2 class="form-title">管理员登录</h2>
            <p class="form-subtitle">请登录您的管理员账户</p>
          </div>
          
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            class="login-form"
            size="large"
            @submit.native.prevent="handleSubmit"
          >
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入用户名"
                :prefix-icon="User"
                clearable
                @keyup.enter="handleSubmit"
              />
            </el-form-item>
            
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                :prefix-icon="Lock"
                show-password
                clearable
                @keyup.enter="handleSubmit"
              />
            </el-form-item>
            
            <el-form-item>
              <div class="form-options">
                <el-checkbox v-model="loginForm.remember_me">
                  记住登录状态
                </el-checkbox>
              </div>
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                class="login-button"
                :loading="authStore.loading"
                @click="handleSubmit"
              >
                <span v-if="!authStore.loading">登录</span>
                <span v-else>登录中...</span>
              </el-button>
            </el-form-item>
          </el-form>
          
          <!-- 快速登录 -->
          <div class="quick-login">
            <el-divider>
              <span class="divider-text">快速登录</span>
            </el-divider>
            
            <div class="quick-buttons">
              <el-button
                type="info"
                plain
                size="default"
                :disabled="authStore.loading"
                @click="quickLogin('admin')"
              >
                管理员账号
              </el-button>
              <el-button
                type="success"
                plain
                size="default"
                :disabled="authStore.loading"
                @click="quickLogin('test')"
              >
                测试账号
              </el-button>
            </div>
          </div>
        </div>
        
        <!-- 系统信息 -->
        <div class="system-info">
          <div class="info-item">
            <span class="info-label">系统版本:</span>
            <span class="info-value">{{ systemVersion }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">环境:</span>
            <span class="info-value">{{ systemEnvironment }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { User, Lock, Monitor, DataAnalysis, Setting } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const authStore = useAuthStore()
const appStore = useAppStore()

// 表单引用
const loginFormRef = ref<FormInstance>()

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: '',
  remember_me: false
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3-20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度在6-50个字符', trigger: 'blur' }
  ]
}

// 系统信息
const systemVersion = computed(() => appStore.systemConfig?.version || '1.0.0')
const systemEnvironment = computed(() => appStore.systemConfig?.environment || 'Development')

// 处理登录提交
const handleSubmit = async () => {
  if (!loginFormRef.value) return
  
  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return
    
    const result = await authStore.login(loginForm)
    if (!result.success) {
      // 错误已经在store中处理
      return
    }
    
  } catch (error) {
    console.error('Login form validation failed:', error)
  }
}

// 快速登录
const quickLogin = async (type: 'admin' | 'test') => {
  const credentials = {
    admin: { username: 'admin', password: 'password' },
    test: { username: 'test', password: 'password' }
  }
  
  const credential = credentials[type]
  loginForm.username = credential.username
  loginForm.password = credential.password
  loginForm.remember_me = false
  
  // 延迟一点让用户看到表单变化
  setTimeout(() => {
    handleSubmit()
  }, 300)
}
</script>

<style lang="scss" scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
    opacity: 0.3;
  }
}

.login-container {
  display: flex;
  width: 900px;
  height: 600px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.login-decoration {
  flex: 1;
  background: linear-gradient(135deg, #4A90E2 0%, #5ba3f5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    animation: float 6s ease-in-out infinite;
  }
}

.decoration-content {
  text-align: center;
  color: white;
  z-index: 1;
  position: relative;
}

.logo-section {
  margin-bottom: 40px;
}

.logo-icon {
  font-size: 80px;
  margin-bottom: 20px;
  animation: bounce 2s ease-in-out infinite;
}

.logo-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.logo-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

.features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  max-width: 280px;
  margin: 0 auto;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  opacity: 0.9;
  
  .el-icon {
    font-size: 16px;
  }
}

.login-form-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px;
}

.form-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.form-header {
  text-align: center;
  margin-bottom: 40px;
}

.form-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.form-subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 24px;
  }
  
  :deep(.el-input__wrapper) {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    
    &:hover,
    &.is-focus {
      box-shadow: 0 4px 12px rgba(74, 144, 226, 0.15);
    }
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.login-button {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #4A90E2 0%, #5ba3f5 100%);
  border: none;
  
  &:hover {
    background: linear-gradient(135deg, #3a7bc8 0%, #4b93e8 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(74, 144, 226, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.quick-login {
  margin-top: 32px;
}

.divider-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.quick-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  
  .el-button {
    flex: 1;
    border-radius: 6px;
  }
}

.system-info {
  display: flex;
  gap: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.info-label {
  font-weight: 500;
}

.info-value {
  color: var(--el-text-color-primary);
}

// 动画
@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

// 响应式
@media (max-width: 1024px) {
  .login-container {
    width: 80vw;
    height: 80vh;
    max-width: 800px;
  }
}

@media (max-width: 768px) {
  .login-container {
    width: 95vw;
    height: 90vh;
    flex-direction: column;
  }
  
  .login-decoration {
    flex: 0 0 200px;
  }
  
  .decoration-content {
    .features {
      display: none;
    }
  }
  
  .logo-icon {
    font-size: 60px;
  }
  
  .logo-title {
    font-size: 24px;
  }
  
  .login-form-container {
    padding: 24px;
  }
  
  .system-info {
    flex-direction: column;
    gap: 8px;
  }
}
</style>