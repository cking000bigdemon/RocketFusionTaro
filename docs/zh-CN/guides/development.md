# 开发指南

## 开发环境设置

### 必需工具安装

#### 1. Rust 环境
```bash
# 安装 Rust（使用官方安装脚本）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows 用户使用 MSVC 工具链
rustup default stable-x86_64-pc-windows-msvc
```

#### 2. Node.js 环境
- 下载地址：https://nodejs.org/
- 推荐版本：16.x LTS 或更高
- 验证安装：
```bash
node --version
npm --version
```

#### 3. Taro CLI（可选）
```bash
# 全局安装 Taro CLI
npm install -g @tarojs/cli
```

### 项目初始化

#### 1. 克隆项目
```bash
git clone [项目地址]
cd Rocket
```

#### 2. 安装依赖
```bash
# 后端依赖（自动处理）
cd rocket-taro-server

# 前端依赖
cd ../frontend
npm install
```

## 开发工作流

### 日常开发流程

#### 1. 启动后端服务
```bash
cd rocket-taro-server

# 开发模式（带热重载）
cargo watch -x run  # 需要安装 cargo-watch

# 或标准模式
cargo run
```

#### 1.5. 后端驱动路由开发 (v2.0)

系统现在使用具有版本控制的高级后端驱动路由：

```bash
# 启用路由指令的结构化日志
export RUST_LOG=info,rocket_taro_server::use_cases=debug

# 启动带可观测性功能的服务
cargo run --features observability
```

**路由指令开发工作流：**

1. **在用例中定义业务逻辑**：
```rust
// src/use_cases/example_use_case.rs
pub async fn handle_user_action(&self, request: ActionRequest) -> UseCaseResult<RouteCommand> {
    // 业务逻辑实现
    let result = self.execute_business_logic(request).await?;
    
    // 生成适当的路由指令
    Ok(RouteCommandGenerator::generate_action_command(&result))
}
```

2. **生成支持版本的路由指令**：
```rust
// 使用 RouteCommandGenerator 生成一致的指令
RouteCommandGenerator::generate_versioned_command(
    &business_result,
    client_version,
    Some(fallback_command)
)
```

3. **在前端测试路由指令执行**：
```bash
# 前端会自动执行来自API响应的路由指令
# 在开发模式下查看浏览器控制台的执行日志
```

#### 2. 启动前端开发服务器
```bash
# 在新终端窗口
cd frontend

# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:weapp
```

**前端路由指令开发：**

前端现在具有带可观测性的高级 RouterHandler：

```javascript
// 在开发中检查 RouterHandler 执行统计
const stats = routerHandler.getExecutionStats()
console.log('路由处理器性能:', {
    successRate: stats.successRate,
    avgDuration: `${stats.avgDuration}ms`,
    commandTypes: stats.commandTypes
})

// 导出执行历史用于调试
routerHandler.exportExecutionHistory() // 下载 JSON 文件

// 测试错误处理
routerHandler.simulateError('NavigateTo') // 模拟指令执行错误
```

#### 3. 访问应用
- **Web**: http://localhost:8000
- **H5 开发**: http://localhost:3000
- **API**: http://localhost:8000/api

### 代码规范

#### Rust 代码规范
- 使用 `cargo fmt` 格式化代码
- 使用 `cargo clippy` 检查代码质量
- 遵循 Rust 官方编码规范

#### 前端代码规范
- 使用 ESLint + Prettier
- 遵循 Airbnb JavaScript 风格指南
- TypeScript 严格模式

### 调试技巧

#### 后端调试
```bash
# 启用详细日志
ROCKET_LOG=debug cargo run

# 启用路由指令调试 (v2.0)
export RUST_LOG=rocket_taro_server::use_cases=debug,rocket_taro_server::models::route_command=trace

# 启用可观测性追踪
export RUST_LOG=info,rocket_taro_server=debug,tracing=info

# 使用断点调试（VS Code）
# 安装 rust-analyzer 插件
```

#### 1.5. 路由指令调试 (v2.0)

调试路由指令生成和执行：

```bash
# 启用带执行ID的结构化日志
export RUST_LOG="rocket_taro_server::use_cases=debug,rocket_taro_server::routes=info"

# 检查路由指令生成日志
tail -f /var/log/app.log | grep "route_command"

# 监控路由指令错误指标
curl -X POST http://localhost:8000/api/metrics/health | jq '.data.components[] | select(.name == "route_handler")'
```

**调试路由指令问题：**

```rust
// 在用例中添加调试日志
#[instrument(skip_all, name = "debug_login_flow")]
pub async fn handle_login(&self, request: LoginRequest) -> UseCaseResult<RouteCommand> {
    debug!("收到用户登录请求: {}", request.username);
    
    match self.execute_login(request).await {
        Ok(login_result) => {
            let command = RouteCommandGenerator::generate_login_route_command(&login_result);
            debug!("生成路由指令: {:?}", command);
            Ok(command)
        }
        Err(e) => {
            error!("登录失败: {}", e);
            Ok(RouteCommandGenerator::generate_error_route_command(&e.to_string(), None))
        }
    }
}
```

#### 前端调试
```bash
# 开发模式带调试信息
npm run dev:h5 -- --verbose

# 使用浏览器开发者工具
# React Developer Tools 插件
```

#### 2.5. 路由指令调试 (v2.0)

调试前端路由指令执行：

```javascript
// 在开发中启用路由指令调试
if (process.env.NODE_ENV === 'development') {
    // 记录所有路由指令执行
    const originalExecute = routerHandler.execute
    routerHandler.execute = async function(command) {
        console.group(`🚀 执行路由指令: ${command.type}`)
        console.log('指令负载:', command.payload)
        console.time('执行时间')
        
        try {
            const result = await originalExecute.call(this, command)
            console.log('✅ 指令执行成功')
            return result
        } catch (error) {
            console.error('❌ 指令执行失败:', error)
            throw error
        } finally {
            console.timeEnd('执行时间')
            console.groupEnd()
        }
    }
}

// 调试路由处理器统计
console.log('📊 路由处理器统计:', routerHandler.getExecutionStats())

// 监控执行历史
setInterval(() => {
    const history = routerHandler.executionHistory
    console.log(`已执行路由指令: ${history.length}`)
    
    const recentErrors = history.filter(h => 
        h.status === 'error' && 
        Date.now() - new Date(h.timestamp).getTime() < 60000 // 最近一分钟
    )
    
    if (recentErrors.length > 0) {
        console.warn(`最近错误: ${recentErrors.length}`)
        console.table(recentErrors)
    }
}, 30000) // 每30秒
```

**调试版本兼容性问题：**

```javascript
// 检查版本兼容性
const checkCompatibility = (serverVersion) => {
    const compatible = routerHandler.checkVersionCompatibility(serverVersion)
    console.log(`版本兼容性检查:`, {
        clientVersion: routerHandler.SUPPORTED_VERSION,
        serverVersion,
        compatible
    })
    
    if (!compatible) {
        console.warn('检测到版本不兼容!')
        console.log('回退使用统计:', routerHandler.fallbackStack)
    }
}

// 测试回退机制
const testFallback = async () => {
    const versionedCommand = {
        version: 999, // 故意不支持的版本
        command: { type: 'NavigateTo', payload: { path: '/test' } },
        fallback: {
            version: 200,
            command: { type: 'NavigateTo', payload: { path: '/fallback' } }
        }
    }
    
    try {
        await routerHandler.executeVersionedCommand(versionedCommand)
        console.log('✅ 回退机制工作正常')
    } catch (error) {
        console.error('❌ 回退机制失败:', error)
    }
}
```

## 构建和测试

### 构建命令

#### 一键构建（推荐）
```bash
# Windows
scripts\build-all.bat

# 手动步骤
cd frontend && npm run build:h5
cd ../rocket-taro-server && cargo build --release
```

#### 分步构建

**前端构建**:
```bash
cd frontend
npm run build:h5        # Web 版本
npm run build:weapp    # 微信小程序
npm run build:alipay   # 支付宝小程序
```

**后端构建**:
```bash
cd rocket-taro-server
cargo build --release
```

### 测试

#### 后端测试
```bash
cd rocket-taro-server

# 运行所有测试
cargo test

# 运行特定测试
cargo test test_user_routes

# 集成测试
cargo test --test integration_tests
```

#### 路由指令测试 (v2.0)

测试路由指令生成和版本兼容性：

```rust
#[cfg(test)]
mod route_command_tests {
    use super::*;
    use crate::models::route_command::*;
    
    #[test]
    fn test_version_compatibility_checking() {
        let handler = RouterHandler::new();
        
        // 测试主版本兼容性
        assert!(handler.check_version_compatibility(200)); // v2.0.x
        assert!(!handler.check_version_compatibility(300)); // v3.0.x
    }
    
    #[tokio::test]
    async fn test_login_command_generation() {
        let use_case = AuthUseCase::new();
        let request = LoginRequest { 
            username: "test".to_string(), 
            password: "test".to_string() 
        };
        
        let command = use_case.handle_login(request).await.unwrap();
        assert!(matches!(command, RouteCommand::Sequence { .. }));
    }
    
    #[tokio::test]
    async fn test_fallback_command_execution() {
        let versioned_command = VersionedRouteCommand {
            version: 300, // 不支持的版本
            command: RouteCommand::NavigateTo {
                path: "/advanced-page".to_string(),
                params: None,
                replace: None,
            },
            fallback: Some(Box::new(VersionedRouteCommand {
                version: 200,
                command: RouteCommand::NavigateTo {
                    path: "/basic-page".to_string(),
                    params: None,
                    replace: None,
                },
                fallback: None,
                metadata: RouteCommandMetadata::default(),
            })),
            metadata: RouteCommandMetadata::default(),
        };
        
        // 应该为不支持的版本执行回退指令
        let result = handler.execute_versioned_command(versioned_command).await;
        assert!(result.is_ok());
    }
}
```

#### 前端测试
```bash
cd frontend

# 单元测试
npm test

# E2E 测试（如配置）
npm run test:e2e
```

#### 路由处理器测试 (v2.0)

测试 RouterHandler 功能和指令执行：

```javascript
import { RouterHandler } from '../utils/routerHandler'

describe('RouterHandler', () => {
  let routerHandler
  let mockStore
  
  beforeEach(() => {
    mockStore = {
      setUser: jest.fn(),
      updateUser: jest.fn(),
      setUserList: jest.fn()
    }
    routerHandler = new RouterHandler(mockStore)
  })
  
  test('执行 NavigateTo 指令', async () => {
    const command = {
      type: 'NavigateTo',
      payload: { path: '/home', params: { welcome: true }, replace: true }
    }
    
    // 模拟 Taro 导航
    const mockRedirectTo = jest.fn().mockResolvedValue(true)
    global.Taro = { redirectTo: mockRedirectTo }
    
    await routerHandler.execute(command)
    expect(mockRedirectTo).toHaveBeenCalledWith({ url: '/home?welcome=true' })
  })
  
  test('处理带合并的 ProcessData 指令', async () => {
    const command = {
      type: 'ProcessData',
      payload: { 
        data_type: 'user', 
        data: { name: 'John' }, 
        merge: true 
      }
    }
    
    await routerHandler.execute(command)
    expect(mockStore.updateUser).toHaveBeenCalledWith({ name: 'John' })
  })
  
  test('按顺序执行 Sequence 指令', async () => {
    const command = {
      type: 'Sequence',
      payload: {
        commands: [
          { type: 'ProcessData', payload: { data_type: 'user', data: { id: 1 } } },
          { type: 'NavigateTo', payload: { path: '/dashboard' } }
        ]
      }
    }
    
    const executeSpy = jest.spyOn(routerHandler, 'execute')
    await routerHandler.execute(command)
    
    expect(executeSpy).toHaveBeenCalledTimes(3) // 原始 + 2个子指令
  })
  
  test('版本兼容性检查', () => {
    // 测试版本兼容性逻辑
    expect(routerHandler.checkVersionCompatibility(200)).toBe(true)  // 相同主版本
    expect(routerHandler.checkVersionCompatibility(210)).toBe(true)  // 较新次版本
    expect(routerHandler.checkVersionCompatibility(190)).toBe(false) // 较旧次版本
    expect(routerHandler.checkVersionCompatibility(300)).toBe(false) // 不同主版本
  })
  
  test('版本不匹配时执行回退指令', async () => {
    const versionedCommand = {
      version: 300, // 不支持的版本
      command: { type: 'NavigateTo', payload: { path: '/advanced' } },
      fallback: {
        version: 200,
        command: { type: 'NavigateTo', payload: { path: '/basic' } }
      }
    }
    
    const mockNavigateTo = jest.fn().mockResolvedValue(true)
    global.Taro = { navigateTo: mockNavigateTo }
    
    await routerHandler.executeVersionedCommand(versionedCommand)
    expect(mockNavigateTo).toHaveBeenCalledWith({ url: '/basic' })
  })
  
  test('执行统计跟踪', async () => {
    // 执行一些指令
    await routerHandler.execute({ type: 'NavigateTo', payload: { path: '/test1' } })
    await routerHandler.execute({ type: 'ProcessData', payload: { data_type: 'user', data: {} } })
    
    const stats = routerHandler.getExecutionStats()
    expect(stats.total).toBe(2)
    expect(stats.successful).toBe(2)
    expect(stats.successRate).toBe('100.00%')
    expect(stats.commandTypes).toHaveProperty('NavigateTo', 1)
    expect(stats.commandTypes).toHaveProperty('ProcessData', 1)
  })
})

// 性能测试
describe('RouterHandler 性能', () => {
  test('性能测试执行', async () => {
    const routerHandler = new RouterHandler(mockStore)
    
    // 模拟成功执行
    jest.spyOn(routerHandler, 'executeCommand').mockResolvedValue(true)
    
    const results = await routerHandler.performanceTest(10)
    
    expect(results).toHaveProperty('avg')
    expect(results).toHaveProperty('min')
    expect(results).toHaveProperty('max')
    expect(results.results).toHaveLength(10)
  })
})
```

## 项目配置

### 环境变量

#### 后端配置
创建 `.env` 文件：
```bash
ROCKET_PORT=8000
ROCKET_ADDRESS=0.0.0.0
ROCKET_LOG=normal
```

#### 前端配置
修改 `frontend/config/dev.js`:
```javascript
module.exports = {
  env: {
    NODE_ENV: '"development"',
    API_URL: '"http://localhost:8000/api"',
  },
  // ... 其他配置
};
```

### 配置文件说明

#### Rocket 配置 (Rocket.toml)
```toml
[default]
address = "0.0.0.0"
port = 8000
log_level = "normal"

[default.static_files]
path = "../frontend/dist"
```

#### Taro 配置
- `frontend/config/index.js` - 基础配置
- `frontend/config/dev.js` - 开发环境
- `frontend/config/prod.js` - 生产环境

## 性能优化

### 构建优化

#### 前端优化
- 代码分割（Code Splitting）
- 懒加载（Lazy Loading）
- 压缩和混淆
- CDN 集成

#### 后端优化
- 启用压缩中间件
- 静态文件缓存
- 数据库连接池
- 响应缓存

### 开发优化

#### 热重载
```bash
# 安装 cargo-watch
cargo install cargo-watch

# 使用热重载
cd rocket-taro-server
cargo watch -x run
```

#### 并行开发
- 前后端可独立开发
- 使用代理解决跨域
- 共享 API 类型定义

## 部署指南

### 本地部署

#### 1. 完整构建
```bash
# Windows
scripts\build-all.bat

# 验证构建结果
ls rocket-taro-server/target/release/
ls frontend/dist/
```

#### 2. 启动服务
```bash
cd rocket-taro-server
cargo run --release
```

### 生产部署

#### Docker 部署（示例）
```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY rocket-taro-server ./
RUN cargo build --release

FROM debian:bullseye-slim
COPY --from=builder /app/target/release/rocket-taro-server /usr/local/bin/
COPY frontend/dist /app/static
CMD ["rocket-taro-server"]
```

#### 云部署
- **Vercel**: 前端静态部署
- **Railway**: 后端容器部署
- **阿里云**: 传统服务器部署

## 故障排查

### 开发环境常见问题

#### 1. 依赖安装失败
```bash
# 清理缓存
rm -rf ~/.cargo/registry
rm -rf frontend/node_modules

# 重新安装
cargo build
npm install
```

#### 2. 端口冲突
```bash
# 查找占用端口的进程
netstat -ano | findstr :8000

# 使用不同端口
ROCKET_PORT=8080 cargo run
```

#### 3. 构建失败
```bash
# 清理构建缓存
cargo clean
cd frontend && rm -rf dist

# 重新构建
cargo build --release
npm run build:h5
```

### 调试工具

#### 推荐工具
- **后端**: VS Code + rust-analyzer
- **前端**: VS Code + Taro 插件
- **API**: Postman / Insomnia
- **数据库**: DBeaver / DataGrip

#### 日志查看
```bash
# 后端日志
ROCKET_LOG=debug cargo run

# 前端日志
npm run dev:h5 -- --verbose
```

## 贡献指南

### 提交规范
- 使用 Conventional Commits
- 添加适当的测试
- 更新相关文档
- 通过 CI 检查

### 分支策略
- `main`: 稳定版本
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复

### 代码审查
- 创建 Pull Request
- 添加描述和测试
- 通过 CI 检查
- 代码审查后合并