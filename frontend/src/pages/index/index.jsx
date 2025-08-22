import { View, Text, Button, Input, Form } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { useStore } from '../../stores/app'
import Taro from '@tarojs/taro'
import './index.css'

export default function Index() {
  const [count, setCount] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  })
  
  const { 
    user, 
    userList, 
    loading, 
    fetchUser, 
    fetchUserData, 
    createUserData,
    login,
    getCurrentUser
  } = useStore()

  useEffect(() => {
    // 页面加载时获取用户数据列表
    fetchUserData()
  }, [])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      Taro.showToast({
        title: '请填写必要信息',
        icon: 'error'
      })
      return
    }

    try {
      await createUserData(formData)
      // 清空表单
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: ''
      })
    } catch (error) {
      // 错误已在store中处理
    }
  }

  const handleLogin = async () => {
    try {
      await login({
        username: 'admin',
        password: 'password'
      })
    } catch (error) {
      // 错误已在store中处理
    }
  }

  const handleGetCurrentUser = async () => {
    try {
      await getCurrentUser()
    } catch (error) {
      // 错误已在store中处理
    }
  }

  return (
    <View className='index'>
      <Text className='title'>Rocket + Taro 微信小程序</Text>
      <Text className='subtitle'>计数器: {count}</Text>
      <Button 
        className='button'
        onClick={() => setCount(count + 1)}
      >
        点击计数
      </Button>
      
      {/* 认证相关 */}
      <View className='section'>
        <Text className='section-title'>用户认证测试</Text>
        <Button 
          className='button'
          onClick={handleLogin}
          loading={loading}
        >
          登录 (admin/password)
        </Button>
        <Button 
          className='button'
          onClick={handleGetCurrentUser}
          loading={loading}
        >
          获取当前用户
        </Button>
        {user && (
          <View className='user-info'>
            <Text>用户: {user.username}</Text>
            <Text>邮箱: {user.email}</Text>
            <Text>管理员: {user.is_admin ? '是' : '否'}</Text>
          </View>
        )}
      </View>

      {/* API测试 */}
      <View className='section'>
        <Text className='section-title'>API集成测试</Text>
        <Button 
          className='button'
          onClick={fetchUser}
          loading={loading}
        >
          获取用户信息
        </Button>
        <Button 
          className='button'
          onClick={fetchUserData}
          loading={loading}
        >
          获取用户数据列表
        </Button>
      </View>

      {/* 用户数据列表 */}
      <View className='section'>
        <Text className='section-title'>用户数据列表 ({userList.length})</Text>
        {userList.map((item, index) => (
          <View key={item.id || index} className='user-item'>
            <Text>姓名: {item.name}</Text>
            <Text>邮箱: {item.email}</Text>
            {item.phone && <Text>电话: {item.phone}</Text>}
            {item.message && <Text>消息: {item.message}</Text>}
          </View>
        ))}
      </View>

      {/* 创建用户数据表单 */}
      <View className='section'>
        <Text className='section-title'>创建用户数据</Text>
        <Input
          className='input'
          placeholder='请输入姓名'
          value={formData.name}
          onInput={(e) => handleInputChange('name', e.detail.value)}
        />
        <Input
          className='input'
          placeholder='请输入邮箱'
          value={formData.email}
          onInput={(e) => handleInputChange('email', e.detail.value)}
        />
        <Input
          className='input'
          placeholder='请输入电话（可选）'
          value={formData.phone}
          onInput={(e) => handleInputChange('phone', e.detail.value)}
        />
        <Input
          className='input'
          placeholder='请输入消息（可选）'
          value={formData.message}
          onInput={(e) => handleInputChange('message', e.detail.value)}
        />
        <Button 
          className='button primary'
          onClick={handleSubmit}
          loading={loading}
        >
          提交数据
        </Button>
      </View>
    </View>
  )
}