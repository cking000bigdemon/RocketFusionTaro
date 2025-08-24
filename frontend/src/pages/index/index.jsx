import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { 
  Button, 
  Cell,
  Space, 
  Toast,
  Loading,
  Dialog,
  Badge,
  Divider
} from '@taroify/core'
import { useState, useEffect } from 'react'
import { useStore } from '../../stores/app'
import './index.css'

export default function Index() {
  const [count, setCount] = useState(0)
  const [pageLoading, setPageLoading] = useState(true)
  const [systemStatus, setSystemStatus] = useState({
    backend: 'unknown',
    database: 'unknown',
    cache: 'unknown'
  })
  const [newUserData, setNewUserData] = useState({ name: '', email: '' })
  const [showAddDialog, setShowAddDialog] = useState(false)
  
  const { 
    user, 
    userList, 
    loading, 
    fetchUserData, 
    getCurrentUser,
    logout,
    createUserData
  } = useStore()

  useEffect(() => {
    checkLoginStatus()
    checkSystemStatus()
  }, [])

  // 检查登录状态 - 使用后端控制路由
  const checkLoginStatus = async () => {
    try {
      setPageLoading(true)
      await getCurrentUser()
      // 用户已登录，获取用户数据列表
      await fetchUserData()
    } catch (error) {
      // 用户未登录，后端控制路由将自动跳转到登录页
      console.log('User not logged in, will redirect to login')
    } finally {
      setPageLoading(false)
    }
  }

  // 检查系统状态
  const checkSystemStatus = async () => {
    try {
      // 检查后端服务状态
      const response = await Taro.request({
        url: 'http://localhost:8000/api/health',
        method: 'GET',
        header: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.statusCode === 200) {
        setSystemStatus(prev => ({ ...prev, backend: 'online' }))
        
        const data = response.data
        if (data.database) {
          setSystemStatus(prev => ({ ...prev, database: data.database ? 'online' : 'offline' }))
        }
        if (data.cache) {
          setSystemStatus(prev => ({ ...prev, cache: data.cache ? 'online' : 'offline' }))
        }
      } else {
        setSystemStatus(prev => ({ ...prev, backend: 'offline' }))
      }
    } catch (error) {
      setSystemStatus(prev => ({ ...prev, backend: 'offline' }))
      console.error('Failed to check system status:', error)
    }
  }

  // 退出登录处理
  const handleLogout = () => {
    Dialog.confirm({
      title: '确认退出',
      message: '确定要退出登录吗？',
      onConfirm: async () => {
        await logout()
        // 后端控制路由将自动处理跳转
      },
      onCancel: () => {
        // 取消操作，无需处理
      }
    })
  }

  // 添加用户数据
  const handleAddUserData = async () => {
    if (!newUserData.name || !newUserData.email) {
      Toast.open({
        message: '请填写完整信息',
        type: 'warning'
      })
      return
    }

    try {
      await createUserData(newUserData)
      setNewUserData({ name: '', email: '' })
      setShowAddDialog(false)
      Toast.open({
        message: '添加成功',
        type: 'success'
      })
      // 刷新数据列表
      await fetchUserData()
    } catch (error) {
      console.error('Failed to add user data:', error)
    }
  }

  // 刷新系统状态
  const refreshSystemStatus = () => {
    checkSystemStatus()
    Toast.open({
      message: '状态已刷新',
      type: 'success'
    })
  }

  // 获取状态显示文本和颜色
  const getStatusInfo = (status) => {
    switch (status) {
      case 'online':
        return { text: '正常', color: 'success' }
      case 'offline':
        return { text: '异常', color: 'danger' }
      default:
        return { text: '检查中', color: 'warning' }
    }
  }

  // 页面加载状态
  if (pageLoading) {
    return (
      <View className='page-index loading-container'>
        <Loading size='24px' />
        <Text className='loading-text'>正在检查登录状态...</Text>
      </View>
    )
  }

  // 未登录状态（通常不会显示，因为会自动跳转）
  if (!user) {
    return (
      <View className='page-index loading-container'>
        <Text className='loading-text'>正在跳转到登录页...</Text>
      </View>
    )
  }

  return (
    <View className='page-index'>
      {/* 头部用户信息 */}
      <View className='index-header'>
        <View className='user-avatar'>👤</View>
        <View className='user-info'>
          <Text className='user-name'>欢迎，{user.username}</Text>
          <Text className='user-role'>{user.is_admin ? '管理员' : '普通用户'}</Text>
        </View>
        <Button size='small' variant='outlined' onClick={handleLogout}>
          退出登录
        </Button>
      </View>

      {/* 功能模块区域 */}
      <View className='content-container'>
        
        {/* 计数器功能 */}
        <View className='module-group'>
          <View className='module-title'>计数器功能</View>
          <Cell>
            <View className='counter-container'>
              <Text className='counter-label'>当前计数：</Text>
              <Badge content={count} className='counter-badge'>
                <Text className='counter-value'>{count}</Text>
              </Badge>
            </View>
          </Cell>
          <Cell>
            <Space direction='horizontal' size='medium'>
              <Button 
                size='small' 
                color='primary'
                onClick={() => setCount(count + 1)}
              >
                +1
              </Button>
              <Button 
                size='small' 
                variant='outlined'
                onClick={() => setCount(Math.max(0, count - 1))}
              >
                -1
              </Button>
              <Button 
                size='small' 
                color='warning'
                onClick={() => setCount(0)}
              >
                重置
              </Button>
            </Space>
          </Cell>
        </View>

        {/* 用户数据管理 */}
        <View className='module-group'>
          <View className='module-title'>用户数据管理</View>
          <Cell 
            title='添加新数据' 
            rightIcon='add'
            clickable
            onClick={() => setShowAddDialog(true)}
          />
          <Cell title='数据列表'>
            <Text className='data-count'>共 {userList.length} 条记录</Text>
          </Cell>
          {userList.length > 0 ? (
            userList.slice(0, 3).map((item, index) => (
              <Cell key={item.id || index}>
                <View className='data-item'>
                  <Text className='data-name'>{item.name}</Text>
                  <Text className='data-email'>{item.email}</Text>
                </View>
              </Cell>
            ))
          ) : (
            <Cell>
              <Text className='no-data'>暂无数据</Text>
            </Cell>
          )}
          {userList.length > 3 && (
            <Cell>
              <Text className='more-data'>还有 {userList.length - 3} 条数据...</Text>
            </Cell>
          )}
        </View>

        {/* 系统状态监控 */}
        <View className='module-group'>
          <View className='module-title'>系统状态</View>
          <Cell title='后端服务' rightIcon='refresh' clickable onClick={refreshSystemStatus}>
            <Badge 
              content={getStatusInfo(systemStatus.backend).text} 
              color={getStatusInfo(systemStatus.backend).color}
            />
          </Cell>
          <Cell title='数据库连接'>
            <Badge 
              content={getStatusInfo(systemStatus.database).text} 
              color={getStatusInfo(systemStatus.database).color}
            />
          </Cell>
          <Cell title='缓存系统'>
            <Badge 
              content={getStatusInfo(systemStatus.cache).text} 
              color={getStatusInfo(systemStatus.cache).color}
            />
          </Cell>
        </View>

        {/* 应用信息 */}
        <View className='module-group'>
          <View className='module-title'>应用信息</View>
          <Cell title='架构模式' value='后端驱动路由 2.0' />
          <Cell title='UI 框架' value='Taro + Taroify' />
          <Cell title='后端框架' value='Rust Rocket' />
          <Cell title='数据库' value='PostgreSQL' />
        </View>

      </View>

      {/* 添加数据对话框 */}
      <Dialog 
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      >
        <Dialog.Header>添加用户数据</Dialog.Header>
        <Dialog.Content>
          <View className='add-form'>
            <View className='form-item'>
              <Text className='form-label'>姓名：</Text>
              <Input 
                className='form-input'
                type='text'
                placeholder='请输入姓名'
                value={newUserData.name}
                onInput={(e) => setNewUserData(prev => ({
                  ...prev,
                  name: e.detail.value
                }))}
              />
            </View>
            <View className='form-item'>
              <Text className='form-label'>邮箱：</Text>
              <Input 
                className='form-input'
                type='text'
                placeholder='请输入邮箱'
                value={newUserData.email}
                onInput={(e) => setNewUserData(prev => ({
                  ...prev,
                  email: e.detail.value
                }))}
              />
            </View>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            variant='outlined'
            onClick={() => setShowAddDialog(false)}
          >
            取消
          </Button>
          <Button 
            color='primary'
            loading={loading}
            onClick={handleAddUserData}
          >
            确定
          </Button>
        </Dialog.Actions>
      </Dialog>
    </View>
  )
}