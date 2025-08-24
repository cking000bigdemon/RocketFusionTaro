import { View, Text } from '@tarojs/components'
import { Button, Field, Cell, Space, Toast } from '@taroify/core'
import { useState, useEffect } from 'react'
import { useStore } from '../../stores/app'
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

  const validateForm = () => {
    if (!formData.username || !formData.password) {
      Toast.open({
        message: '请填写完整信息',
        type: 'warning',
        duration: 2000
      })
      return false
    }

    if (formData.username.length < 3) {
      Toast.open({
        message: '用户名至少3个字符',
        type: 'warning',
        duration: 2000
      })
      return false
    }

    if (formData.password.length < 6) {
      Toast.open({
        message: '密码至少6个字符',
        type: 'warning',
        duration: 2000
      })
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      // 调用登录接口，后端控制路由将自动处理跳转
      await login(formData)
    } catch (error) {
      // 错误处理已在store和全局拦截器中完成
      console.error('Login failed:', error)
    }
  }

  const handleQuickLogin = (username, password) => {
    setFormData({ username, password })
  }

  // 自动填充演示
  useEffect(() => {
    // 开发环境下可以预填充测试账号
    if (process.env.NODE_ENV === 'development') {
      // 可选：预填充admin账号
      // setFormData({ username: 'admin', password: 'password' })
    }
  }, [])

  return (
    <View className='page-login'>
      {/* 头部区域 */}
      <View className='login-header'>
        <View className='logo-container'>
          <View className='logo-icon'>🚀</View>
          <Text className='app-title'>Rocket Taro</Text>
          <Text className='app-subtitle'>后端驱动路由系统</Text>
        </View>
      </View>

      {/* 登录表单 */}
      <View className='login-form-container'>
        <View className='form-title'>
          <Text className='title-main'>欢迎回来</Text>
          <Text className='title-sub'>请登录您的账户</Text>
        </View>

        <View className='login-form'>
          <Cell>
            <Field
              label='用户名'
              placeholder='请输入用户名'
              value={formData.username}
              onChange={(value) => handleInputChange('username', value)}
              disabled={loading}
            />
          </Cell>
          <Cell>
            <Field
              label='密码'
              type='password'
              placeholder='请输入密码'
              value={formData.password}
              onChange={(value) => handleInputChange('password', value)}
              disabled={loading}
            />
          </Cell>
        </View>

        <View className='login-actions'>
          <Button
            className='login-button'
            color='primary'
            size='large'
            loading={loading}
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? '登录中...' : '登录'}
          </Button>
        </View>

        {/* 快速登录 */}
        <View className='quick-login'>
          <Text className='quick-login-title'>快速登录</Text>
          <Space direction='horizontal' size='medium'>
            <Button
              size='small'
              variant='outlined'
              onClick={() => handleQuickLogin('admin', 'password')}
              disabled={loading}
            >
              管理员账户
            </Button>
            <Button
              size='small'
              variant='outlined'
              onClick={() => handleQuickLogin('test', 'password')}
              disabled={loading}
            >
              测试账户
            </Button>
          </Space>
        </View>
      </View>

      {/* 底部信息 */}
      <View className='login-footer'>
        <Text className='footer-text'>基于 Rocket + Taro 构建</Text>
        <Text className='footer-subtext'>体验新一代前后端交互架构</Text>
      </View>
    </View>
  )
}