<script setup>
import { ref, reactive, onMounted, inject } from 'vue'
import { useUserStore } from '../stores/user.js'
import { useAppStore } from '../stores/app.js'
import { getRouterHandler } from '../utils/RouterHandler.js'

// 注入API客户端实例
const apiClient = inject('apiClient')

// Store
const userStore = useUserStore()
const appStore = useAppStore()

// 响应式数据
const isLoading = ref(false)
const form = reactive({
  username: '',
  password: '',
  rememberMe: false
})

// 应用信息
const appVersion = ref('1.0.0')
const platformInfo = ref('')

// RouterHandler实例
const routerHandler = getRouterHandler()

/**
 * 处理登录表单提交
 */
async function handleLogin() {
  if (!form.username || !form.password) {
    await routerHandler.platformAdapter.showToast('请填写完整的登录信息', 'error')
    return
  }

  isLoading.value = true

  try {
    // 调用登录API - 这里会自动处理路由指令
    const response = await apiClient.mobileLogin({
      username: form.username.trim(),
      password: form.password,
      remember_me: form.rememberMe
    })

    // API调用成功，路由指令会自动执行
    // 不需要手动处理导航，后端会发送NavigateTo指令
    console.log('Login API called successfully:', response)

    // 可选：保存认证token和用户信息
    if (response.data?.session_token) {
      localStorage.setItem('auth_token', response.data.session_token)
    }
    if (response.data?.user) {
      localStorage.setItem('user_info', JSON.stringify(response.data.user))
    }
    
    console.log('✅ Auth data saved:', {
      token: !!response.data?.session_token,
      user: !!response.data?.user
    })

  } catch (error) {
    console.error('Login failed:', error)
    
    // 显示错误信息（如果后端没有通过路由指令处理）
    const errorMessage = error.response?.data?.message || '登录失败，请重试'
    await routerHandler.platformAdapter.showToast(errorMessage, 'error')
    
  } finally {
    isLoading.value = false
  }
}

/**
 * 快速登录
 * @param {string} type - 登录类型
 */
async function quickLogin(type) {
  const credentials = {
    admin: { username: 'admin', password: 'password' },
    test: { username: 'test', password: 'password' }
  }

  const credential = credentials[type]
  if (!credential) return

  // 填入表单
  form.username = credential.username
  form.password = credential.password
  
  // 执行登录
  await handleLogin()
}

/**
 * 初始化页面
 */
onMounted(async () => {
  // 获取应用信息
  const appInfo = appStore.getAppInfo()
  appVersion.value = appInfo.version
  
  // 获取平台信息
  const platform = routerHandler.platformAdapter.getPlatformInfo()
  platformInfo.value = `${platform.platform} - ${platform.screenSize.width}x${platform.screenSize.height}`

  // 检查是否有保存的用户名
  const savedUsername = localStorage.getItem('saved_username')
  if (savedUsername && appStore.settings.autoLogin) {
    form.username = savedUsername
    form.rememberMe = true
  }

  // 检查是否有要重定向的页面
  const redirectPath = sessionStorage.getItem('redirectPath')
  if (redirectPath) {
    console.log('Will redirect to:', redirectPath, 'after login')
  }

  // 如果已经登录，可能需要重定向
  if (userStore.isLoggedIn) {
    const redirectPath = sessionStorage.getItem('redirectPath')
    sessionStorage.removeItem('redirectPath')
    
    // 这里通常由后端路由指令处理，但也可以主动检查
    if (redirectPath) {
      await routerHandler.smartNavigate(redirectPath, { replace: true })
    } else {
      await routerHandler.smartNavigate('/home', { replace: true })
    }
  }
})

// 监听记住密码选项
import { watch } from 'vue'
watch(() => form.rememberMe, (remember) => {
  if (remember && form.username) {
    localStorage.setItem('saved_username', form.username)
  } else if (!remember) {
    localStorage.removeItem('saved_username')
  }
})
</script>

<template>
  <div class="login-page">
    <!-- 顶部标题区域 -->
    <div class="login-header">
      <div class="logo">
        <div class="logo-text">🚀 Rocket</div>
      </div>
      <div class="welcome-text">
        <h1>欢迎使用</h1>
        <p>请登录您的账户</p>
      </div>
    </div>

    <!-- 登录表单 -->
    <div class="login-form">
      <van-form @submit="handleLogin">
        <van-cell-group inset>
          <van-field
            v-model="form.username"
            name="username"
            label="用户名"
            placeholder="请输入用户名"
            :rules="[{ required: true, message: '请填写用户名' }]"
            left-icon="user-o"
            clearable
          />
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请填写密码' }]"
            left-icon="lock"
            clearable
          />
        </van-cell-group>

        <!-- 记住密码选项 -->
        <div class="login-options">
          <van-checkbox v-model="form.rememberMe">记住密码</van-checkbox>
        </div>

        <!-- 登录按钮 -->
        <div class="login-button">
          <van-button
            round
            block
            type="primary"
            native-type="submit"
            :loading="isLoading"
            loading-text="登录中..."
            size="large"
          >
            登录
          </van-button>
        </div>
      </van-form>

      <!-- 快速登录选项 -->
      <div class="quick-login">
        <div class="divider">
          <span>或</span>
        </div>
        <div class="quick-buttons">
          <van-button 
            plain 
            round 
            size="large" 
            @click="quickLogin('admin')"
          >
            管理员登录
          </van-button>
          <van-button 
            plain 
            round 
            size="large" 
            @click="quickLogin('test')"
          >
            测试账号登录
          </van-button>
        </div>
      </div>
    </div>

    <!-- 底部信息 -->
    <div class="login-footer">
      <p class="version">版本 v{{ appVersion }}</p>
      <p class="platform">{{ platformInfo }}</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.login-header {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: white;
  margin-bottom: 40px;

  .logo {
    margin-bottom: 30px;
    
    img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
    }
    
    .logo-text {
      font-size: 48px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }
  }

  .welcome-text {
    h1 {
      font-size: 28px;
      font-weight: 600;
      margin: 0 0 10px 0;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
    }

    p {
      font-size: 16px;
      margin: 0;
      opacity: 0.9;
    }
  }
}

.login-form {
  background: white;
  border-radius: 16px;
  padding: 30px 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);

  :deep(.van-cell-group) {
    margin-bottom: 20px;
  }

  :deep(.van-field) {
    border-radius: 8px;
    margin-bottom: 1px;
    
    &:first-child {
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
    }
    
    &:last-child {
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
    }
  }
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
  
  :deep(.van-checkbox) {
    font-size: 14px;
    color: #666;
  }
}

.login-button {
  margin: 30px 0 20px 0;
  
  :deep(.van-button) {
    height: 50px;
    font-size: 16px;
    font-weight: 600;
  }
}

.quick-login {
  .divider {
    text-align: center;
    margin: 20px 0;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #eee;
    }
    
    span {
      background: white;
      padding: 0 15px;
      color: #999;
      font-size: 14px;
    }
  }

  .quick-buttons {
    display: flex;
    gap: 10px;
    
    :deep(.van-button) {
      flex: 1;
      height: 44px;
    }
  }
}

.login-footer {
  margin-top: auto;
  padding-top: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  
  p {
    margin: 5px 0;
  }
}

// 响应式设计
@media (max-width: 375px) {
  .login-page {
    padding: 15px;
  }
  
  .login-header {
    .logo .logo-text {
      font-size: 40px;
    }
    
    .welcome-text h1 {
      font-size: 24px;
    }
  }
}

// 深色主题支持
:global(.theme-dark) .login-form {
  background: rgba(45, 45, 45, 0.95);
  color: white;
  
  :deep(.van-field) {
    background-color: rgba(60, 60, 60, 0.8);
    color: white;
    
    .van-field__label {
      color: #ccc;
    }
    
    .van-field__control {
      color: white;
      
      &::placeholder {
        color: #888;
      }
    }
  }
}</style>