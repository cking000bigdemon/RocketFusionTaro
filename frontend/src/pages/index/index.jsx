import { View, Text, Button } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { useStore } from '../../stores/app'
import Taro from '@tarojs/taro'
import './index.css'

export default function Index() {
  const [count, setCount] = useState(0)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const { 
    user, 
    userList, 
    loading, 
    fetchUserData, 
    getCurrentUser,
    logout,
    getRouterHandler
  } = useStore()

  useEffect(() => {
    // 页面加载时检查用户登录状态
    checkLoginStatus()
  }, [])

  // 检查登录状态 - 使用后端驱动路由
  const checkLoginStatus = async () => {
    try {
      setPageLoading(true)
      setError(null)
      await getCurrentUser()
      // 用户已登录
      // 获取用户数据列表
      await fetchUserData()
      setPageLoading(false)
    } catch (error) {
      // 用户未登录，跳转到登录页
      setError('用户未登录')
      // 使用后端驱动路由跳转到登录页面
      try {
        const routerHandler = getRouterHandler()
        await routerHandler.execute({
          type: 'NavigateTo',
          payload: {
            path: '/pages/login/index',
            replace: true
          }
        })
      } catch (routeError) {
        console.error('Route failed:', routeError)
        setPageLoading(false)
      }
    }
  }

  // 手动触发路由指令演示
  const demoRouteCommands = async () => {
    const routerHandler = getRouterHandler()
    
    Taro.showActionSheet({
      itemList: ['演示页面跳转', '演示弹窗提示', '演示数据更新', '演示序列指令'],
      success: async (res) => {
        switch (res.tapIndex) {
          case 0:
            // 演示页面跳转
            await routerHandler.execute({
              type: 'NavigateTo',
              payload: {
                path: '/pages/about/index',
                params: { from: 'demo' }
              }
            })
            break
          
          case 1:
            // 演示弹窗提示
            await routerHandler.execute({
              type: 'ShowDialog',
              payload: {
                dialog_type: 'Confirm',
                title: '路由指令演示',
                content: '这是一个由路由指令触发的确认对话框',
                actions: [
                  {
                    text: '取消',
                    action: {
                      type: 'ShowDialog',
                      payload: {
                        dialog_type: 'Toast',
                        title: '',
                        content: '你选择了取消'
                      }
                    }
                  },
                  {
                    text: '确定',
                    action: {
                      type: 'ShowDialog',
                      payload: {
                        dialog_type: 'Toast',
                        title: '',
                        content: '你选择了确定'
                      }
                    }
                  }
                ]
              }
            })
            break
          
          case 2:
            // 演示数据更新
            await routerHandler.execute({
              type: 'ProcessData',
              payload: {
                data_type: 'user',
                data: {
                  ...user,
                  demo_timestamp: new Date().toISOString()
                },
                merge: true
              }
            })
            Taro.showToast({
              title: '用户数据已更新',
              icon: 'success'
            })
            break
          
          case 3:
            // 演示序列指令
            await routerHandler.execute({
              type: 'Sequence',
              payload: {
                commands: [
                  {
                    type: 'ShowDialog',
                    payload: {
                      dialog_type: 'Toast',
                      title: '',
                      content: '步骤 1: 开始执行序列指令'
                    }
                  },
                  {
                    type: 'ProcessData',
                    payload: {
                      data_type: 'user',
                      data: {
                        demo_step: 1
                      },
                      merge: true
                    }
                  },
                  {
                    type: 'ShowDialog',
                    payload: {
                      dialog_type: 'Toast',
                      title: '',
                      content: '步骤 2: 数据已更新'
                    }
                  },
                  {
                    type: 'ShowDialog',
                    payload: {
                      dialog_type: 'Alert',
                      title: '序列指令演示',
                      content: '所有步骤已完成！这展示了后端如何控制复杂的前端操作流程。'
                    }
                  }
                ]
              }
            })
            break
        }
      }
    })
  }

  const handleLogout = async () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          await logout()
        }
      }
    })
  }

  // 页面加载状态
  if (pageLoading) {
    return (
      <View className='index'>
        <View className='loading-container'>
          <Text className='loading-text'>正在检查登录状态...</Text>
        </View>
      </View>
    )
  }

  // 错误状态
  if (error) {
    return (
      <View className='index'>
        <View className='error-container'>
          <Text className='error-text'>{error}</Text>
          <Text className='error-hint'>即将跳转到登录页...</Text>
        </View>
      </View>
    )
  }

  // 未登录状态
  if (!user) {
    return (
      <View className='index'>
        <View className='loading-container'>
          <Text className='loading-text'>正在跳转到登录页...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='index'>
      <Text className='title'>后端驱动路由系统</Text>
      <Text className='subtitle'>Rocket + Taro 演示项目</Text>
      
      {/* 用户信息区域 */}
      <View className='section user-section'>
        <Text className='section-title'>当前用户</Text>
        <View className='user-info'>
          <Text className='user-name'>{user.username}</Text>
          <Text className='user-email'>{user.email}</Text>
          <Text className='user-role'>{user.is_admin ? '管理员' : '普通用户'}</Text>
          {user.demo_timestamp && (
            <Text className='user-demo'>
              演示时间: {new Date(user.demo_timestamp).toLocaleTimeString()}
            </Text>
          )}
          {user.demo_step && (
            <Text className='user-demo'>演示步骤: {user.demo_step}</Text>
          )}
        </View>
        <Button 
          className='logout-button'
          onClick={handleLogout}
          size='mini'
        >
          退出登录
        </Button>
      </View>

      {/* 功能演示区域 */}
      <View className='section demo-section'>
        <Text className='section-title'>功能演示</Text>
        <Text className='demo-description'>
          体验后端驱动路由系统的强大功能
        </Text>
        
        <Button 
          className='demo-button'
          onClick={demoRouteCommands}
          disabled={loading}
        >
          🎯 路由指令演示
        </Button>

        <View className='demo-features'>
          <View className='feature-item'>
            <Text className='feature-title'>🚀 页面导航</Text>
            <Text className='feature-desc'>后端控制页面跳转和参数传递</Text>
          </View>
          <View className='feature-item'>
            <Text className='feature-title'>💬 对话框控制</Text>
            <Text className='feature-desc'>动态显示各种类型的用户提示</Text>
          </View>
          <View className='feature-item'>
            <Text className='feature-title'>📊 数据同步</Text>
            <Text className='feature-desc'>实时更新前端状态和用户数据</Text>
          </View>
          <View className='feature-item'>
            <Text className='feature-title'>🔄 序列执行</Text>
            <Text className='feature-desc'>按顺序执行复杂的操作流程</Text>
          </View>
        </View>
      </View>

      {/* 计数器演示 */}
      <View className='section counter-section'>
        <Text className='section-title'>传统功能演示</Text>
        <Text className='counter-text'>计数器: {count}</Text>
        <Button 
          className='counter-button'
          onClick={() => setCount(count + 1)}
        >
          点击计数
        </Button>
      </View>

      {/* 数据列表 */}
      <View className='section data-section'>
        <Text className='section-title'>用户数据列表 ({userList.length})</Text>
        {userList.length > 0 ? (
          userList.slice(0, 3).map((item, index) => (
            <View key={item.id || index} className='data-item'>
              <Text className='data-name'>{item.name}</Text>
              <Text className='data-email'>{item.email}</Text>
            </View>
          ))
        ) : (
          <Text className='no-data'>暂无数据</Text>
        )}
      </View>

      {/* 项目信息 */}
      <View className='section info-section'>
        <Text className='info-title'>项目特色</Text>
        <View className='info-list'>
          <Text className='info-item'>✨ 后端驱动的用户体验流程</Text>
          <Text className='info-item'>🎯 统一的多端业务逻辑</Text>
          <Text className='info-item'>🚀 现代化的前后端架构</Text>
          <Text className='info-item'>💡 可扩展的路由指令系统</Text>
        </View>
      </View>
    </View>
  )
}