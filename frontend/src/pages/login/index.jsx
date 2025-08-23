import { View, Text, Input, Button } from '@tarojs/components'
import { useState } from 'react'
import { useStore } from '../../stores/app'
import Taro from '@tarojs/taro'
import './index.css'

export default function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  
  const { login, loading } = useStore()

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    // 验证表单
    if (!formData.username || !formData.password) {
      Taro.showToast({
        title: '请填写完整信息',
        icon: 'error',
        duration: 2000
      })
      return
    }

    if (formData.username.length < 3) {
      Taro.showToast({
        title: '用户名至少3个字符',
        icon: 'error',
        duration: 2000
      })
      return
    }

    if (formData.password.length < 6) {
      Taro.showToast({
        title: '密码至少6个字符',
        icon: 'error',
        duration: 2000
      })
      return
    }

    try {
      await login(formData)
      // 登录成功后的跳转由路由指令处理，这里不需要手动跳转
      // 登录请求已发送
    } catch (error) {
      // 错误处理已在store中完成，这里只记录日志
      console.error('Login failed:', error)
    }
  }

  const handleQuickLogin = (username, password) => {
    setFormData({ username, password })
  }

  return (
    <View className='login-container'>
      {/* 背景装饰 */}
      <View className='login-bg'>
        <View className='bg-circle bg-circle-1'></View>
        <View className='bg-circle bg-circle-2'></View>
        <View className='bg-circle bg-circle-3'></View>
      </View>

      {/* 登录表单 */}
      <View className='login-content'>
        {/* 头部 */}
        <View className='login-header'>
          <Text className='login-title'>欢迎回来</Text>
          <Text className='login-subtitle'>请登录您的账户</Text>
        </View>

        {/* 表单区域 */}
        <View className='login-form'>
          <View className='form-group'>
            <View className='input-wrapper'>
              <Text className='input-label'>用户名</Text>
              <Input
                className='form-input'
                type='text'
                placeholder='请输入用户名'
                value={formData.username}
                onInput={(e) => handleInputChange('username', e.detail.value)}
                disabled={loading}
              />
            </View>
          </View>

          <View className='form-group'>
            <View className='input-wrapper'>
              <Text className='input-label'>密码</Text>
              <Input
                className='form-input'
                type='password'
                placeholder='请输入密码'
                value={formData.password}
                onInput={(e) => handleInputChange('password', e.detail.value)}
                disabled={loading}
              />
            </View>
          </View>

          <Button 
            className={`login-button ${loading ? 'loading' : ''}`}
            onClick={handleSubmit}
            loading={loading}
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </Button>
        </View>

        {/* 快速登录 */}
        <View className='quick-login'>
          <Text className='quick-login-title'>快速登录</Text>
          <View className='quick-login-buttons'>
            <Button 
              className='quick-btn admin-btn'
              size='mini'
              onClick={() => handleQuickLogin('admin', 'password')}
              disabled={loading}
            >
              管理员账户
            </Button>
            <Button 
              className='quick-btn user-btn'
              size='mini'
              onClick={() => handleQuickLogin('test', 'password')}
              disabled={loading}
            >
              测试账户
            </Button>
          </View>
        </View>

        {/* 底部说明 */}
        <View className='login-footer'>
          <Text className='footer-text'>Rocket + Taro 后端驱动路由系统</Text>
          <Text className='footer-subtext'>演示项目 - 体验新一代前后端交互</Text>
        </View>
      </View>
    </View>
  )
}