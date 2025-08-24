# 版本兼容性指南

## 概述

后端驱动路由架构 v2.0 引入了一个全面的版本兼容性系统，确保不同客户端和服务器版本之间的无缝操作。本指南解释了版本控制机制的工作原理、如何处理兼容性问题，以及维护向后兼容性的最佳实践。

## 版本控制系统

### 版本方案

系统使用三位数格式的语义版本控制方法：`MAJOR.MINOR.PATCH`

- **MAJOR（百位数）**：需要客户端更新的破坏性更改
- **MINOR（十位数）**：向后兼容的新功能
- **PATCH（个位数）**：错误修复和小改进

#### 版本示例
```
版本 200 = v2.0.0
版本 201 = v2.0.1
版本 210 = v2.1.0
版本 300 = v3.0.0
```

### 兼容性矩阵

| 服务器版本 | 客户端版本 | 兼容性 | 行为 |
|------------|------------|--------|------|
| 2.0.x | 2.0.x | ✅ 完全兼容 | 所有功能可用 |
| 2.1.x | 2.0.x | ✅ 向后兼容 | 使用回退指令 |
| 2.0.x | 2.1.x | ⚠️ 有限兼容 | 客户端使用可用功能 |
| 3.0.x | 2.x.x | ❌ 不兼容 | 需要客户端升级 |

## 版本化路由指令

### 指令结构

```typescript
interface VersionedRouteCommand {
  version: number                    // 指令版本
  command: RouteCommand             // 实际的路由指令
  fallback?: VersionedRouteCommand  // 旧客户端的回退指令
  metadata?: RouteCommandMetadata   // 执行元数据
}

interface RouteCommandMetadata {
  timeout_ms?: number               // 指令执行超时时间
  priority?: number                 // 执行优先级 (1-10)
  execution_context?: Record<string, any> // 附加上下文数据
}
```

### 示例实现

#### 后端生成
```rust
use crate::models::route_command::{RouteCommand, VersionedRouteCommand, RouteCommandMetadata};

pub struct RouteCommandGenerator;

impl RouteCommandGenerator {
    pub fn generate_versioned_navigation(
        path: &str, 
        is_advanced_client: bool
    ) -> VersionedRouteCommand {
        if is_advanced_client {
            // 具有高级功能的最新版本
            VersionedRouteCommand {
                version: 200,
                command: RouteCommand::NavigateTo {
                    path: path.to_string(),
                    params: Some(json!({
                        "transition": "slide",
                        "preload": true,
                        "analytics": true
                    })),
                    replace: Some(false),
                },
                fallback: Some(Box::new(VersionedRouteCommand {
                    version: 100,
                    command: RouteCommand::NavigateTo {
                        path: path.to_string(),
                        params: None,
                        replace: Some(false),
                    },
                    fallback: None,
                    metadata: RouteCommandMetadata::default(),
                })),
                metadata: RouteCommandMetadata {
                    timeout_ms: Some(5000),
                    priority: Some(8),
                    execution_context: HashMap::new(),
                },
            }
        } else {
            // 旧客户端的基本版本
            VersionedRouteCommand {
                version: 100,
                command: RouteCommand::NavigateTo {
                    path: path.to_string(),
                    params: None,
                    replace: Some(false),
                },
                fallback: None,
                metadata: RouteCommandMetadata::default(),
            }
        }
    }
}
```

#### 前端处理
```javascript
class RouterHandler {
    constructor() {
        this.SUPPORTED_VERSION = 200 // 当前客户端版本
        this.fallbackStack = []      // 跟踪回退执行
    }
    
    async execute(routeCommand) {
        if (this.isVersionedCommand(routeCommand)) {
            return this.executeVersionedCommand(routeCommand)
        }
        // 处理没有版本的遗留指令
        return this.executeCommand(routeCommand)
    }
    
    isVersionedCommand(command) {
        return command && typeof command === 'object' && 'version' in command
    }
    
    async executeVersionedCommand(versionedCommand) {
        const { version, command, fallback, metadata } = versionedCommand
        
        // 检查版本兼容性
        if (!this.checkVersionCompatibility(version)) {
            console.warn(`不支持的指令版本: ${version}`)
            
            if (fallback) {
                console.log('由于版本不兼容，执行回退指令')
                this.recordFallbackUsage(version, fallback.version)
                return this.executeVersionedCommand(fallback)
            }
            
            throw new Error(`指令版本 ${version} 没有可用的兼容版本`)
        }
        
        // 如果指定了执行超时时间
        if (metadata?.timeout_ms) {
            return Promise.race([
                this.executeCommand(command),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('指令执行超时')), metadata.timeout_ms)
                )
            ])
        }
        
        return this.executeCommand(command)
    }
    
    checkVersionCompatibility(serverVersion) {
        const serverMajor = Math.floor(serverVersion / 100)
        const clientMajor = Math.floor(this.SUPPORTED_VERSION / 100)
        
        // 主版本必须匹配
        if (serverMajor !== clientMajor) {
            return false
        }
        
        // 次版本：客户端可以处理旧服务器版本
        const serverMinor = Math.floor((serverVersion % 100) / 10)
        const clientMinor = Math.floor((this.SUPPORTED_VERSION % 100) / 10)
        
        return clientMinor >= serverMinor
    }
    
    recordFallbackUsage(originalVersion, fallbackVersion) {
        const record = {
            timestamp: new Date().toISOString(),
            originalVersion,
            fallbackVersion,
            userAgent: navigator.userAgent
        }
        
        this.fallbackStack.push(record)
        
        // 为监控报告回退使用情况
        if (process.env.NODE_ENV === 'production') {
            this.reportFallbackUsage(record)
        }
    }
    
    async reportFallbackUsage(record) {
        try {
            await fetch('/api/metrics/version-fallback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            })
        } catch (error) {
            console.warn('报告回退使用情况失败:', error)
        }
    }
}
```

## 客户端版本检测

### 服务器端检测

服务器可以通过各种方法检测客户端能力：

#### 1. User Agent 分析
```rust
use rocket::request::{Request, FromRequest};

#[derive(Debug)]
pub struct ClientInfo {
    pub version: u32,
    pub platform: String,
    pub capabilities: Vec<String>,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for ClientInfo {
    type Error = ();
    
    async fn from_request(req: &'r Request<'_>) -> rocket::request::Outcome<Self, Self::Error> {
        let user_agent = req.headers().get_one("User-Agent").unwrap_or("");
        
        // 从 User-Agent 或自定义头部解析版本
        let version = extract_client_version(user_agent).unwrap_or(100);
        let platform = detect_platform(user_agent);
        let capabilities = detect_capabilities(user_agent, version);
        
        rocket::request::Outcome::Success(ClientInfo {
            version,
            platform,
            capabilities,
        })
    }
}

fn extract_client_version(user_agent: &str) -> Option<u32> {
    // 首先查找自定义版本头部
    if let Some(version_str) = user_agent.find("AppVersion/") {
        let version_part = &user_agent[version_str + 11..];
        if let Some(end) = version_part.find(' ') {
            return version_part[..end].parse().ok();
        }
    }
    
    // 回退到浏览器/平台检测
    if user_agent.contains("MicroMessenger") {
        Some(150) // 微信小程序
    } else if user_agent.contains("Mobile") {
        Some(120) // 移动端浏览器
    } else {
        Some(100) // 桌面端浏览器
    }
}
```

#### 2. 自定义头部
```javascript
// 前端在请求头中发送版本信息
const request = async (url, options = {}) => {
    const defaultHeaders = {
        'X-Client-Version': '200',
        'X-Client-Platform': 'h5',
        'X-Client-Capabilities': 'advanced-navigation,parallel-commands,retry-commands'
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    }
    
    return Taro.request(config)
}
```

#### 3. 功能协商端点
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct CapabilityNegotiation {
    pub client_version: u32,
    pub supported_features: Vec<String>,
    pub platform: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerCapabilities {
    pub server_version: u32,
    pub compatible_commands: Vec<String>,
    pub recommended_upgrade: Option<String>,
}

#[post("/api/negotiate-capabilities", data = "<negotiation>")]
pub async fn negotiate_capabilities(
    negotiation: Json<CapabilityNegotiation>,
) -> Json<ApiResponse<ServerCapabilities>> {
    let negotiation = negotiation.into_inner();
    
    let server_capabilities = ServerCapabilities {
        server_version: 200,
        compatible_commands: determine_compatible_commands(negotiation.client_version),
        recommended_upgrade: check_upgrade_recommendation(negotiation.client_version),
    };
    
    Json(ApiResponse::success(server_capabilities))
}

fn determine_compatible_commands(client_version: u32) -> Vec<String> {
    let mut commands = vec!["NavigateTo".to_string(), "ShowDialog".to_string(), "ProcessData".to_string()];
    
    if client_version >= 150 {
        commands.push("Sequence".to_string());
    }
    
    if client_version >= 200 {
        commands.extend(vec![
            "Delay".to_string(),
            "Parallel".to_string(),
            "Retry".to_string(),
            "Conditional".to_string(),
        ]);
    }
    
    commands
}
```

## 迁移策略

### 1. 渐进式推出

#### 第一阶段：双指令支持
```rust
pub fn generate_login_command(user: &User, client_version: u32) -> RouteCommand {
    if client_version >= 200 {
        // 具有增强功能的高级序列
        RouteCommand::Sequence {
            commands: vec![
                RouteCommand::ProcessData {
                    data_type: "user".to_string(),
                    data: serde_json::to_value(user).unwrap(),
                    merge: Some(false),
                },
                RouteCommand::Parallel {
                    commands: vec![
                        RouteCommand::ProcessData {
                            data_type: "preferences".to_string(),
                            data: json!(user.preferences),
                            merge: Some(true),
                        },
                        RouteCommand::ProcessData {
                            data_type: "notifications".to_string(),
                            data: json!(user.notifications),
                            merge: Some(false),
                        },
                    ],
                    wait_for_all: true,
                },
                RouteCommand::NavigateTo {
                    path: "/dashboard".to_string(),
                    params: Some(json!({"welcome": true})),
                    replace: Some(true),
                },
            ],
        }
    } else {
        // 旧客户端的简单序列
        RouteCommand::Sequence {
            commands: vec![
                RouteCommand::ProcessData {
                    data_type: "user".to_string(),
                    data: serde_json::to_value(user).unwrap(),
                    merge: Some(false),
                },
                RouteCommand::NavigateTo {
                    path: "/dashboard".to_string(),
                    params: None,
                    replace: Some(true),
                },
            ],
        }
    }
}
```

#### 第二阶段：功能标志
```rust
#[derive(Debug, Clone)]
pub struct FeatureFlags {
    pub enable_advanced_navigation: bool,
    pub enable_parallel_commands: bool,
    pub enable_retry_mechanism: bool,
    pub enable_conditional_logic: bool,
}

impl FeatureFlags {
    pub fn from_client_version(version: u32) -> Self {
        Self {
            enable_advanced_navigation: version >= 150,
            enable_parallel_commands: version >= 200,
            enable_retry_mechanism: version >= 200,
            enable_conditional_logic: version >= 200,
        }
    }
}
```

### 2. 弃用策略

#### 弃用时间表
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct DeprecationWarning {
    pub feature: String,
    pub deprecated_since: String,
    pub removal_date: String,
    pub replacement: Option<String>,
    pub migration_guide: Option<String>,
}

pub fn check_deprecated_features(command: &RouteCommand, client_version: u32) -> Vec<DeprecationWarning> {
    let mut warnings = Vec::new();
    
    // 示例：v2.0中弃用的旧参数格式
    if client_version < 200 {
        warnings.push(DeprecationWarning {
            feature: "遗留参数格式".to_string(),
            deprecated_since: "2.0.0".to_string(),
            removal_date: "3.0.0".to_string(),
            replacement: Some("带元数据的增强参数格式".to_string()),
            migration_guide: Some("https://docs.example.com/migration/v2-to-v3".to_string()),
        });
    }
    
    warnings
}
```

## 错误处理和恢复

### 版本不匹配处理

```javascript
class VersionErrorHandler {
    constructor(routerHandler) {
        this.routerHandler = routerHandler
        this.errorStrategies = new Map()
        this.initializeStrategies()
    }
    
    initializeStrategies() {
        this.errorStrategies.set('VERSION_MISMATCH', this.handleVersionMismatch.bind(this))
        this.errorStrategies.set('COMMAND_UNSUPPORTED', this.handleUnsupportedCommand.bind(this))
        this.errorStrategies.set('FALLBACK_FAILED', this.handleFallbackFailure.bind(this))
    }
    
    async handleError(error, context) {
        const strategy = this.errorStrategies.get(error.type)
        if (strategy) {
            return strategy(error, context)
        }
        
        // 默认错误处理
        return this.handleGenericError(error, context)
    }
    
    async handleVersionMismatch(error, context) {
        console.warn('检测到版本不匹配:', error)
        
        // 尝试协商兼容版本
        try {
            const negotiation = await this.negotiateCompatibility()
            if (negotiation.compatible_commands.length > 0) {
                return this.retryWithCompatibleVersion(context.command, negotiation)
            }
        } catch (negotiationError) {
            console.error('能力协商失败:', negotiationError)
        }
        
        // 回退到基本导航
        return this.routerHandler.execute({
            type: 'NavigateTo',
            payload: { path: '/compatibility-error' }
        })
    }
    
    async handleUnsupportedCommand(error, context) {
        // 记录不支持的指令以供分析
        this.logUnsupportedCommand(context.command)
        
        // 尝试找到类似的支持指令
        const alternativeCommand = this.findAlternativeCommand(context.command)
        if (alternativeCommand) {
            return this.routerHandler.execute(alternativeCommand)
        }
        
        // 显示用户友好的错误
        return this.routerHandler.execute({
            type: 'ShowDialog',
            payload: {
                dialog_type: 'Alert',
                title: '功能不可用',
                content: '此功能需要更新版本的应用程序。请更新后继续。',
                actions: []
            }
        })
    }
    
    async negotiateCompatibility() {
        const response = await fetch('/api/negotiate-capabilities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_version: this.routerHandler.SUPPORTED_VERSION,
                supported_features: this.getSupportedFeatures(),
                platform: this.getPlatform()
            })
        })
        
        return response.json()
    }
}
```

### 优雅降级

```javascript
class FeatureDegradation {
    constructor(routerHandler) {
        this.routerHandler = routerHandler
        this.degradationRules = new Map()
        this.initializeDegradationRules()
    }
    
    initializeDegradationRules() {
        // 并行指令 → 顺序执行
        this.degradationRules.set('Parallel', (command) => ({
            type: 'Sequence',
            payload: { commands: command.payload.commands }
        }))
        
        // 重试指令 → 单次尝试
        this.degradationRules.set('Retry', (command) => command.payload.command)
        
        // 条件指令 → 执行 if_true 分支
        this.degradationRules.set('Conditional', (command) => command.payload.if_true)
        
        // 延迟指令 → 立即执行
        this.degradationRules.set('Delay', (command) => command.payload.command)
    }
    
    degradeCommand(command) {
        if (!this.routerHandler.supportsCommand(command.type)) {
            const degradationRule = this.degradationRules.get(command.type)
            if (degradationRule) {
                const degradedCommand = degradationRule(command)
                console.log(`将指令 ${command.type} 降级为 ${degradedCommand.type}`)
                return degradedCommand
            }
        }
        
        return command
    }
}
```

## 监控和分析

### 版本分析

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct VersionMetric {
    pub client_version: u32,
    pub server_version: u32,
    pub compatibility_status: String,
    pub fallback_used: bool,
    pub feature_usage: Vec<String>,
    pub timestamp: DateTime<Utc>,
}

#[post("/api/metrics/version-usage", data = "<metric>")]
pub async fn record_version_metric(
    metric: Json<VersionMetric>,
) -> Json<ApiResponse<()>> {
    let metric = metric.into_inner();
    
    info!(
        client_version = %metric.client_version,
        server_version = %metric.server_version,
        compatibility = %metric.compatibility_status,
        fallback_used = %metric.fallback_used,
        "版本兼容性指标已记录"
    );
    
    // 存储指标用于分析
    // 这可以发送到 Prometheus、DataDog 等分析系统
    
    Json(ApiResponse::success(()))
}
```

### 版本分布仪表板

```javascript
// 前端分析收集
class VersionAnalytics {
    constructor() {
        this.metrics = []
        this.reportInterval = 5 * 60 * 1000 // 5 分钟
        this.startReporting()
    }
    
    recordCompatibilityEvent(event) {
        this.metrics.push({
            type: 'compatibility_event',
            client_version: ROUTE_COMMAND_VERSION,
            server_version: event.server_version,
            compatibility_status: event.status,
            fallback_used: event.fallback_used,
            command_type: event.command_type,
            timestamp: new Date().toISOString()
        })
    }
    
    recordFeatureUsage(feature, success) {
        this.metrics.push({
            type: 'feature_usage',
            feature,
            success,
            client_version: ROUTE_COMMAND_VERSION,
            timestamp: new Date().toISOString()
        })
    }
    
    startReporting() {
        setInterval(() => {
            if (this.metrics.length > 0) {
                this.reportMetrics()
            }
        }, this.reportInterval)
    }
    
    async reportMetrics() {
        try {
            await fetch('/api/metrics/version-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metrics: this.metrics,
                    session_id: this.getSessionId()
                })
            })
            
            this.metrics = [] // 成功报告后清除
        } catch (error) {
            console.warn('版本指标报告失败:', error)
        }
    }
}
```

## 最佳实践

### 1. 版本规划

- **语义版本控制**：遵循严格的语义版本控制以获得可预测的兼容性
- **功能标志**：使用功能标志逐步推出新功能
- **弃用政策**：提供清晰的弃用时间表（最少6个月通知）
- **文档**：为主版本更改维护全面的迁移指南

### 2. 测试策略

```javascript
// 版本兼容性测试框架
class CompatibilityTester {
    constructor() {
        this.testSuites = new Map()
        this.registerTestSuites()
    }
    
    registerTestSuites() {
        this.testSuites.set('v1.0', this.testV1Compatibility.bind(this))
        this.testSuites.set('v2.0', this.testV2Compatibility.bind(this))
    }
    
    async runCompatibilityTests(version) {
        const testSuite = this.testSuites.get(version)
        if (!testSuite) {
            throw new Error(`未找到版本 ${version} 的测试套件`)
        }
        
        return testSuite()
    }
    
    async testV2Compatibility() {
        const tests = [
            this.testBasicNavigation,
            this.testSequenceCommands,
            this.testParallelCommands,
            this.testRetryMechanism,
            this.testConditionalLogic,
            this.testFallbackBehavior
        ]
        
        const results = []
        for (const test of tests) {
            try {
                const result = await test()
                results.push({ test: test.name, success: true, result })
            } catch (error) {
                results.push({ test: test.name, success: false, error: error.message })
            }
        }
        
        return results
    }
}
```

### 3. 客户端更新策略

```javascript
// 更新通知和管理
class UpdateManager {
    constructor() {
        this.updateCheckInterval = 24 * 60 * 60 * 1000 // 24 小时
        this.startUpdateChecking()
    }
    
    async checkForUpdates() {
        try {
            const response = await fetch('/api/version-info')
            const serverInfo = await response.json()
            
            if (this.isUpdateRequired(serverInfo.version)) {
                this.notifyUpdateRequired(serverInfo)
            } else if (this.isUpdateRecommended(serverInfo.version)) {
                this.notifyUpdateRecommended(serverInfo)
            }
        } catch (error) {
            console.warn('更新检查失败:', error)
        }
    }
    
    isUpdateRequired(serverVersion) {
        const serverMajor = Math.floor(serverVersion / 100)
        const clientMajor = Math.floor(ROUTE_COMMAND_VERSION / 100)
        
        return serverMajor > clientMajor
    }
    
    isUpdateRecommended(serverVersion) {
        return serverVersion > ROUTE_COMMAND_VERSION
    }
    
    notifyUpdateRequired(serverInfo) {
        // 显示阻塞更新对话框
        this.routerHandler.execute({
            type: 'ShowDialog',
            payload: {
                dialog_type: 'Alert',
                title: '需要更新',
                content: `需要关键更新才能继续使用应用程序。请更新到版本 ${serverInfo.version}。`,
                actions: [{
                    text: '立即更新',
                    action: {
                        type: 'NavigateTo',
                        payload: { path: '/update' }
                    }
                }]
            }
        })
    }
}
```

## 常见问题排查

### 1. 版本不匹配错误

**问题**：客户端收到"不支持的指令版本"错误
**解决方案**：
```javascript
// 检查客户端版本支持
console.log('客户端版本:', ROUTE_COMMAND_VERSION)
console.log('服务器版本:', serverResponse.version)

// 验证兼容性
const compatible = RouterHandler.checkVersionCompatibility(serverResponse.version)
if (!compatible) {
    // 请求能力协商
    const capabilities = await negotiateCapabilities()
    console.log('可用指令:', capabilities.compatible_commands)
}
```

### 2. 回退链失败

**问题**：所有回退指令都执行失败
**解决方案**：
```javascript
// 实现终极回退
class UltimateFallbackHandler {
    static getMinimalNavigation(targetPath) {
        return {
            type: 'NavigateTo',
            payload: {
                path: targetPath || '/home',
                params: null,
                replace: true
            }
        }
    }
    
    static getErrorDialog(message) {
        return {
            type: 'ShowDialog',
            payload: {
                dialog_type: 'Alert',
                title: '系统错误',
                content: message || '发生意外错误。请刷新页面。',
                actions: []
            }
        }
    }
}
```

### 3. 功能检测问题

**问题**：服务器错误检测客户端能力
**解决方案**：
```javascript
// 显式能力报告
const reportCapabilities = async () => {
    const capabilities = {
        client_version: ROUTE_COMMAND_VERSION,
        supported_commands: [
            'NavigateTo', 'ShowDialog', 'ProcessData', 'Sequence'
        ],
        platform_features: {
            parallel_execution: true,
            retry_mechanism: true,
            conditional_logic: true,
            advanced_navigation: true
        },
        browser_info: {
            user_agent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
        }
    }
    
    await fetch('/api/client-capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(capabilities)
    })
}
```

这个全面的版本兼容性系统确保了不同客户端和服务器版本之间的平稳运行，同时在需要时提供明确的升级路径和优雅的降级。