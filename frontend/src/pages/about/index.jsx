import { View, Text } from '@tarojs/components'
import './index.css'

export default function About() {
  return (
    <View className='about'>
      <Text className='title'>About Rocket Taro App</Text>
      <Text className='description'>
        This is a Taro-based frontend application integrated with Rocket backend.
        Built with React and Zustand for state management.
      </Text>
    </View>
  )
}