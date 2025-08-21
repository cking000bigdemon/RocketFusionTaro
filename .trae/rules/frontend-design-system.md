# Rocket + Taro 前端设计规范文档

## 设计系统概览

本设计规范基于Windows Metro磁贴风格，采用清爽色彩体系，为Rocket + Taro前后端集成项目提供统一的设计语言和组件标准。

## 设计原则

### 1. Metro磁贴核心原则
- **内容优先**: 去除冗余装饰，突出核心内容
- **扁平化设计**: 纯色块、简洁图标、清晰文字
- **动态磁贴**: 支持信息实时更新和交互反馈
- **触控优化**: 适合触摸操作的大尺寸点击区域

### 2. 清爽色彩体系
- **主色调**: 天空蓝系，营造清爽科技感
- **辅助色**: 薄荷绿、云朵白作为点缀
- **中性色**: 高级灰用于背景和文字
- **状态色**: 统一的反馈色彩系统

## 色彩规范

### 主色调 (Primary Colors)
```css
:root {
  /* 主品牌色 */
  --color-primary: #4A90E2;        /* 天空蓝 */
  --color-primary-light: #6BA3E8;  /* 浅天空蓝 */
  --color-primary-dark: #357ABD;   /* 深天空蓝 */
  
  /* 辅助色 */
  --color-secondary: #50C878;      /* 薄荷绿 */
  --color-secondary-light: #7DD49A;
  --color-secondary-dark: #3DA863;
  
  /* 中性色 */
  --color-white: #FFFFFF;
  --color-light-gray: #F5F7FA;     /* 云朵白 */
  --color-gray: #E1E8ED;
  --color-dark-gray: #657786;
  --color-black: #14171A;
  
  /* 状态色 */
  --color-success: #50C878;
  --color-warning: #FFAD1F;
  --color-error: #E0245E;
  --color-info: #4A90E2;
}
```

### 色彩使用规则
- **主色占比**: 60% 主色调、30% 中性色、10% 辅助色
- **对比度**: 文字与背景对比度至少 4.5:1
- **夜间模式**: 自动适配深色主题

## 组件规范

### 1. 磁贴组件 (Tile)

#### 基础磁贴
```css
.tile {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
  border-radius: 4px;
  background: var(--color-white);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: 120px;
}

.tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(74, 144, 226, 0.2);
}

.tile:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
```

#### 磁贴尺寸
- **小磁贴**: 120×120px (图标+简短文字)
- **中磁贴**: 240×120px (图标+标题+描述)
- **大磁贴**: 240×240px (图表+详细内容)
- **宽磁贴**: 480×120px (横向信息展示)

### 2. 按钮组件 (Button)

#### 主按钮
```css
.btn-primary {
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--color-primary-light);
  transform: translateY(-1px);
}

.btn-primary:active {
  background: var(--color-primary-dark);
  transform: translateY(0);
}
```

#### 按钮尺寸
- **大按钮**: 48px 高度 (主要操作)
- **中按钮**: 40px 高度 (次要操作)
- **小按钮**: 32px 高度 (辅助功能)

### 3. 卡片组件 (Card)

#### 内容卡片
```css
.card {
  background: var(--color-white);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--color-gray);
}

.card-header {
  border-bottom: 1px solid var(--color-gray);
  padding-bottom: 16px;
  margin-bottom: 16px;
}
```

## 布局规范

### 1. 网格系统
- **12列网格**: 响应式布局基础
- **间距**: 8px 基础间距单位
- **断点**:
  - 手机: < 768px
  - 平板: 768px - 1024px
  - 桌面: > 1024px

### 2. 磁贴布局示例
```css
.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  padding: 24px;
}

@media (max-width: 768px) {
  .tile-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;
  }
}
```

## 图标规范

### 1. 图标风格
- **线性图标**: 简洁的线条设计
- **填充图标**: 用于强调状态
- **彩色图标**: 用于功能区分

### 2. 图标尺寸
- **磁贴图标**: 48×48px
- **按钮图标**: 20×20px
- **状态图标**: 16×16px

## 文字规范

### 1. 字体栈
```css
:root {
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}
```

### 2. 文字层级
- **标题1**: 32px/700 (页面主标题)
- **标题2**: 28px/600 (区块标题)
- **标题3**: 24px/600 (小组件标题)
- **正文**: 16px/400 (主要内容)
- **辅助**: 14px/400 (次要信息)
- **说明**: 12px/400 (提示信息)

## 交互规范

### 1. Windows Phone 8 磁贴交互模式

#### 动态磁贴悬浮切换系统
基于WP8 Live Tile概念，实现磁贴内容的智能轮播和悬浮切换，支持以下信息层级展示：

##### 1.1 磁贴内容层级结构
```typescript
interface LiveTileContent {
  layer1: {           // 默认显示层
    appLogo: string;   // 应用图标 (48×48px)
    appName: string;   // 应用名称
  };
  layer2: {           // 悬浮显示层
    instantMessage: string;  // 即时消息/通知
    messageCount?: number;   // 消息数量角标
    timestamp?: string;      // 时间戳
  };
  layer3?: {          // 扩展信息层 (可选)
    previewImage?: string;   // 预览图
    detailText?: string;     // 详细信息
  };
}
```

##### 1.2 CSS悬浮切换动画
```css
.live-tile {
  position: relative;
  width: 240px;
  height: 120px;
  background: var(--color-white);
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.live-tile-content {
  position: absolute;
  width: 100%;
  height: 100%;
  transition: transform 0.4s ease, opacity 0.3s ease;
}

/* 默认状态 - 显示应用信息 */
.tile-layer-default {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transform: translateY(0);
}

/* 悬浮状态 - 切换到消息层 */
.live-tile:hover .tile-layer-default {
  opacity: 0;
  transform: translateY(-100%);
}

.tile-layer-message {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16px;
  opacity: 0;
  transform: translateY(100%);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  color: var(--color-white);
}

.live-tile:hover .tile-layer-message {
  opacity: 1;
  transform: translateY(0);
}

/* 消息角标样式 */
.message-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--color-error);
  color: var(--color-white);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

##### 1.3 Taro/React 实现示例
```typescript
import { useState, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'

interface LiveTileProps {
  appLogo: string
  appName: string
  instantMessage: string
  messageCount?: number
  backgroundColor?: string
}

const LiveTile: React.FC<LiveTileProps> = ({
  appLogo,
  appName,
  instantMessage,
  messageCount = 0,
  backgroundColor = '#4A90E2'
}) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <View 
      className="live-tile"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 应用信息层 */}
      <View className={`tile-layer tile-layer-default ${isHovered ? 'hidden' : ''}`}>
        <Image src={appLogo} className="tile-app-logo" />
        <Text className="tile-app-name">{appName}</Text>
        {messageCount > 0 && (
          <View className="message-badge">{messageCount}</View>
        )}
      </View>

      {/* 消息内容层 */}
      <View className={`tile-layer tile-layer-message ${isHovered ? 'visible' : ''}`}>
        <Text className="message-text">{instantMessage}</Text>
        <Text className="message-time">{new Date().toLocaleTimeString()}</Text>
      </View>
    </View>
  )
}

// 使用示例
const Dashboard = () => (
  <View className="tile-grid">
    <LiveTile
      appLogo="/icons/mail.png"
      appName="邮件"
      instantMessage="3封未读邮件"
      messageCount={3}
      backgroundColor="#4A90E2"
    />
    <LiveTile
      appLogo="/icons/calendar.png"
      appName="日历"
      instantMessage="下午2点会议提醒"
      backgroundColor="#50C878"
    />
  </View>
)
```

##### 1.4 高级交互特性
- **自动轮播**: 每5秒自动切换一次内容
- **手势支持**: 支持触摸设备的滑动切换
- **个性化**: 用户可自定义磁贴大小和内容展示方式
- **实时更新**: 通过WebSocket推送最新消息内容

```typescript
// 自动轮播逻辑
const useLiveTileRotation = (interval = 5000) => {
  const [currentLayer, setCurrentLayer] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLayer((prev) => (prev + 1) % 3)
    }, interval)

    return () => clearInterval(timer)
  }, [interval])

  return currentLayer
}
```

### 2. 状态反馈 (增强版)
- **默认状态**: 应用图标 + 名称展示
- **悬浮状态**: 平滑过渡到消息内容
- **点击状态**: 磁贴下沉 + 颜色渐变
- **加载状态**: 骨架屏占位动画
- **更新状态**: 内容切换时的淡入淡出

### 3. 动效规范 (WP8风格)
- **切换动画**: 垂直滑动 + 透明度渐变
- **响应时间**: 100ms悬停延迟触发
- **缓动函数**: cubic-bezier(0.4, 0, 0.2, 1)
- **消息通知**: 角标脉冲动画
- **加载动画**: 线性进度条 + 占位符

## Taro适配规范

### 1. 跨平台适配
```typescript
// Taro样式适配示例
const styles = {
  tile: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Taro.pxTransform(24),
    borderRadius: Taro.pxTransform(4),
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  }
}
```

### 2. 主题切换
```typescript
// 主题配置
export const lightTheme = {
  primary: '#4A90E2',
  secondary: '#50C878',
  background: '#FFFFFF',
  surface: '#F5F7FA',
  text: '#14171A',
  textSecondary: '#657786'
}

export const darkTheme = {
  primary: '#6BA3E8',
  secondary: '#7DD49A',
  background: '#14171A',
  surface: '#1A1D23',
  text: '#FFFFFF',
  textSecondary: '#AAB8C2'
}
```

## 组件库结构

```
components/
├── atoms/           # 原子组件
│   ├── Button/
│   ├── Icon/
│   └── Text/
├── molecules/       # 分子组件
│   ├── Tile/
│   ├── Card/
│   └── Form/
├── organisms/       # 有机体组件
│   ├── TileGrid/
│   ├── Navigation/
│   └── Dashboard/
└── templates/       # 页面模板
    ├── HomeLayout/
    ├── DetailLayout/
    └── FormLayout/
```

## 使用示例

### 创建Metro风格首页
```typescript
import { Tile, TileGrid } from '@/components'

const HomePage = () => {
  const tiles = [
    { title: '用户管理', icon: 'user', color: '#4A90E2' },
    { title: '数据统计', icon: 'chart', color: '#50C878' },
    { title: '系统设置', icon: 'setting', color: '#FFAD1F' },
  ]

  return (
    <TileGrid>
      {tiles.map(tile => (
        <Tile
          key={tile.title}
          title={tile.title}
          icon={tile.icon}
          backgroundColor={tile.color}
          onClick={() => navigateTo(tile.title)}
        />
      ))}
    </TileGrid>
  )
}
```

## 设计验证清单

- [ ] 色彩对比度符合WCAG 2.1标准
- [ ] 所有交互元素最小点击区域44×44px
- [ ] 响应式布局适配所有目标设备
- [ ] 深色主题完整实现
- [ ] 动画性能优化（60fps）
- [ ] 无障碍访问支持

## 更新日志

- v1.0.0: 初始版本 - Metro磁贴风格设计系统
- 基于清爽色彩体系
- 适配Taro跨平台开发
- 包含完整的组件规范