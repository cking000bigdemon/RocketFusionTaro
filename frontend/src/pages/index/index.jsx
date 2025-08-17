import { View, Text, Button } from '@tarojs/components'
import { useState } from 'react'
import { useStore } from '../../stores/app'
import './index.css'

export default function Index() {
  const [count, setCount] = useState(0)
  const { user, fetchUser } = useStore()

  return (
    <View className='index'>
      <Text className='title'>Welcome to Rocket + Taro!</Text>
      <Text className='subtitle'>Count: {count}</Text>
      <Button 
        className='button'
        onClick={() => setCount(count + 1)}
      >
        Click me
      </Button>
      
      <View className='api-section'>
        <Text className='section-title'>API Integration</Text>
        <Button 
          className='button'
          onClick={fetchUser}
        >
          Fetch User Data
        </Button>
        {user && (
          <Text className='user-info'>
            User: {user.name}
          </Text>
        )}
      </View>
    </View>
  )
}