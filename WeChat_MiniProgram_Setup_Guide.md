# 微信小程序开发者工具设置指南

## 🚀 服务启动状态

### 后端服务
- **Rocket Backend**: http://localhost:8000
- **状态**: 启动中...

### 前端服务  
- **移动端H5**: http://localhost:3000 (开发模式)
- **PC管理端**: http://localhost:3001 (开发模式)
- **状态**: 启动中...

### 微信小程序
- **项目路径**: `F:\rust-project\Rocket\frontend-new\mobile\mini-program\`
- **AppID**: `wx2078fa60851884ca`

## 📱 微信开发者工具设置步骤

### 1. 打开微信开发者工具
- 启动微信开发者工具
- 选择"小程序"项目类型

### 2. 导入项目
- 点击"导入项目"或"新建项目"
- **项目目录**: `F:\rust-project\Rocket\frontend-new\mobile\mini-program`
- **AppID**: `wx2078fa60851884ca`
- **项目名称**: Rocket微信小程序

### 3. 项目配置检查
确认以下文件配置正确：

#### app.json (主配置文件)
```json
{
  "pages": [
    "pages/login/login",
    "pages/home/home", 
    "pages/profile/profile",
    "pages/user-data/user-data"
  ],
  "window": {
    "navigationBarTitleText": "🚀 Rocket"
  },
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/home/home",
        "text": "首页"
      },
      {
        "pagePath": "pages/user-data/user-data", 
        "text": "数据"
      },
      {
        "pagePath": "pages/profile/profile",
        "text": "我的"
      }
    ]
  }
}
```

#### project.config.json (开发工具配置)
- AppID已设置为: `wx2078fa60851884ca`
- 开发设置已优化

### 4. 本地调试设置
在微信开发者工具中：

1. **开启调试模式**
   - 右上角"详情" → "项目配置" 
   - 勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"
   - 勾选"开启调试模式"

2. **配置后端API地址**
   - 小程序中的API请求会指向: `http://localhost:8000`
   - 确保后端服务已启动

3. **编译预览**
   - 点击"编译"按钮
   - 在模拟器中查看效果
   - 可以在"Console"查看日志

## 🔧 重构效果验证

### 登录流程测试
1. **打开小程序** → 自动跳转到登录页面
2. **测试快速登录**:
   - 点击"管理员登录" (用户名: admin, 密码: password)
   - 点击"测试账号登录" (用户名: test, 密码: password)
3. **验证后端驱动路由**:
   - 登录成功后应自动导航到相应页面
   - 管理员 → 跳转到管理页面
   - 普通用户 → 跳转到首页

### 核心功能验证
1. **API通信**: 检查与后端 `http://localhost:8000` 的数据交互
2. **路由指令处理**: 验证后端发送的导航指令是否正确执行
3. **用户状态管理**: 验证登录状态在小程序中的保持
4. **数据同步**: 检查用户数据的获取和显示

## 🎯 重构对比

### 重构前 (Taro框架)
- 使用Taro编译到小程序
- 复杂的跨平台兼容性问题
- 路由处理逻辑分散

### 重构后 (原生小程序)
- **原生小程序代码**: 更好的性能和兼容性
- **后端驱动路由**: 业务逻辑集中在后端
- **平台特定优化**: 针对小程序平台的最佳实践
- **统一API层**: 与H5、管理端共享API客户端逻辑

## 🔍 调试技巧

### 1. 查看网络请求
- 微信开发者工具 → "Network"面板
- 查看API请求是否正确发送到 `localhost:8000`

### 2. 查看控制台输出  
- 微信开发者工具 → "Console"面板
- 查看路由指令执行日志

### 3. 存储数据检查
- 微信开发者工具 → "Storage"面板  
- 查看用户登录token和数据存储

### 4. 页面结构检查
- 微信开发者工具 → "Wxml"面板
- 查看页面DOM结构和样式

## ⚡ 常见问题

### Q: 小程序无法连接后端API
**A**: 
1. 确认后端服务 `http://localhost:8000` 已启动
2. 在开发者工具中开启"不校验合法域名"
3. 检查防火墙是否阻止连接

### Q: 登录后没有跳转
**A**:
1. 检查Console是否有路由指令执行日志
2. 验证后端返回的route_command格式
3. 确认RouterHandler初始化正常

### Q: 页面样式异常
**A**:
1. 检查WXSS文件是否正确加载
2. 验证rpx单位适配是否正确
3. 查看微信小程序的样式限制

---

🎉 **享受重构后的开发体验吧！**