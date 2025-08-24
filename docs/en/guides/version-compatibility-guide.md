# Version Compatibility Guide

## Overview

The backend-driven routing architecture v2.0 introduces a comprehensive version compatibility system that ensures seamless operation across different client and server versions. This guide explains how the version control mechanism works, how to handle compatibility issues, and best practices for maintaining backward compatibility.

## Version Control System

### Version Schema

The system uses a semantic versioning approach with a three-digit format: `MAJOR.MINOR.PATCH`

- **MAJOR** (100s place): Breaking changes that require client updates
- **MINOR** (10s place): New features with backward compatibility
- **PATCH** (1s place): Bug fixes and minor improvements

#### Version Examples
```
Version 200 = v2.0.0
Version 201 = v2.0.1
Version 210 = v2.1.0
Version 300 = v3.0.0
```

### Compatibility Matrix

| Server Version | Client Version | Compatibility | Behavior |
|----------------|----------------|---------------|----------|
| 2.0.x | 2.0.x | ✅ Full | All features available |
| 2.1.x | 2.0.x | ✅ Backward | Fallback commands used |
| 2.0.x | 2.1.x | ⚠️ Limited | Client uses available features |
| 3.0.x | 2.x.x | ❌ Incompatible | Requires client upgrade |

## Versioned Route Commands

### Command Structure

```typescript
interface VersionedRouteCommand {
  version: number                    // Command version
  command: RouteCommand             // The actual route command
  fallback?: VersionedRouteCommand  // Fallback for older clients
  metadata?: RouteCommandMetadata   // Execution metadata
}

interface RouteCommandMetadata {
  timeout_ms?: number               // Command execution timeout
  priority?: number                 // Execution priority (1-10)
  execution_context?: Record<string, any> // Additional context data
}
```

### Example Implementation

#### Backend Generation
```rust
use crate::models::route_command::{RouteCommand, VersionedRouteCommand, RouteCommandMetadata};

pub struct RouteCommandGenerator;

impl RouteCommandGenerator {
    pub fn generate_versioned_navigation(
        path: &str, 
        is_advanced_client: bool
    ) -> VersionedRouteCommand {
        if is_advanced_client {
            // Latest version with advanced features
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
            // Basic version for older clients
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

#### Frontend Processing
```javascript
class RouterHandler {
    constructor() {
        this.SUPPORTED_VERSION = 200 // Current client version
        this.fallbackStack = []      // Track fallback executions
    }
    
    async execute(routeCommand) {
        if (this.isVersionedCommand(routeCommand)) {
            return this.executeVersionedCommand(routeCommand)
        }
        // Handle legacy commands without version
        return this.executeCommand(routeCommand)
    }
    
    isVersionedCommand(command) {
        return command && typeof command === 'object' && 'version' in command
    }
    
    async executeVersionedCommand(versionedCommand) {
        const { version, command, fallback, metadata } = versionedCommand
        
        // Check version compatibility
        if (!this.checkVersionCompatibility(version)) {
            console.warn(`Unsupported command version: ${version}`)
            
            if (fallback) {
                console.log('Executing fallback command due to version incompatibility')
                this.recordFallbackUsage(version, fallback.version)
                return this.executeVersionedCommand(fallback)
            }
            
            throw new Error(`No compatible version available for command version: ${version}`)
        }
        
        // Set execution timeout if specified
        if (metadata?.timeout_ms) {
            return Promise.race([
                this.executeCommand(command),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Command execution timeout')), metadata.timeout_ms)
                )
            ])
        }
        
        return this.executeCommand(command)
    }
    
    checkVersionCompatibility(serverVersion) {
        const serverMajor = Math.floor(serverVersion / 100)
        const clientMajor = Math.floor(this.SUPPORTED_VERSION / 100)
        
        // Major versions must match
        if (serverMajor !== clientMajor) {
            return false
        }
        
        // Minor versions: client can handle older server versions
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
        
        // Report fallback usage for monitoring
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
            console.warn('Failed to report fallback usage:', error)
        }
    }
}
```

## Client Version Detection

### Server-Side Detection

The server can detect client capabilities through various methods:

#### 1. User Agent Analysis
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
        
        // Parse version from User-Agent or custom header
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
    // Look for custom version header first
    if let Some(version_str) = user_agent.find("AppVersion/") {
        let version_part = &user_agent[version_str + 11..];
        if let Some(end) = version_part.find(' ') {
            return version_part[..end].parse().ok();
        }
    }
    
    // Fallback to browser/platform detection
    if user_agent.contains("MicroMessenger") {
        Some(150) // WeChat mini-program
    } else if user_agent.contains("Mobile") {
        Some(120) // Mobile browser
    } else {
        Some(100) // Desktop browser
    }
}
```

#### 2. Custom Headers
```javascript
// Frontend sends version in request headers
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

#### 3. Feature Negotiation Endpoint
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

## Migration Strategies

### 1. Gradual Rollout

#### Phase 1: Dual Command Support
```rust
pub fn generate_login_command(user: &User, client_version: u32) -> RouteCommand {
    if client_version >= 200 {
        // Advanced sequence with enhanced features
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
        // Simple sequence for older clients
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

#### Phase 2: Feature Flags
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

### 2. Deprecation Strategy

#### Deprecation Timeline
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
    
    // Example: Old parameter format deprecated in v2.0
    if client_version < 200 {
        warnings.push(DeprecationWarning {
            feature: "Legacy parameter format".to_string(),
            deprecated_since: "2.0.0".to_string(),
            removal_date: "3.0.0".to_string(),
            replacement: Some("Enhanced parameter format with metadata".to_string()),
            migration_guide: Some("https://docs.example.com/migration/v2-to-v3".to_string()),
        });
    }
    
    warnings
}
```

## Error Handling and Recovery

### Version Mismatch Handling

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
        
        // Default error handling
        return this.handleGenericError(error, context)
    }
    
    async handleVersionMismatch(error, context) {
        console.warn('Version mismatch detected:', error)
        
        // Try to negotiate a compatible version
        try {
            const negotiation = await this.negotiateCompatibility()
            if (negotiation.compatible_commands.length > 0) {
                return this.retryWithCompatibleVersion(context.command, negotiation)
            }
        } catch (negotiationError) {
            console.error('Capability negotiation failed:', negotiationError)
        }
        
        // Fallback to basic navigation
        return this.routerHandler.execute({
            type: 'NavigateTo',
            payload: { path: '/compatibility-error' }
        })
    }
    
    async handleUnsupportedCommand(error, context) {
        // Log unsupported command for analytics
        this.logUnsupportedCommand(context.command)
        
        // Try to find a similar supported command
        const alternativeCommand = this.findAlternativeCommand(context.command)
        if (alternativeCommand) {
            return this.routerHandler.execute(alternativeCommand)
        }
        
        // Show user-friendly error
        return this.routerHandler.execute({
            type: 'ShowDialog',
            payload: {
                dialog_type: 'Alert',
                title: 'Feature Unavailable',
                content: 'This feature requires a newer version of the app. Please update to continue.',
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

### Graceful Degradation

```javascript
class FeatureDegradation {
    constructor(routerHandler) {
        this.routerHandler = routerHandler
        this.degradationRules = new Map()
        this.initializeDegradationRules()
    }
    
    initializeDegradationRules() {
        // Parallel commands → Sequential execution
        this.degradationRules.set('Parallel', (command) => ({
            type: 'Sequence',
            payload: { commands: command.payload.commands }
        }))
        
        // Retry commands → Single attempt
        this.degradationRules.set('Retry', (command) => command.payload.command)
        
        // Conditional commands → Execute if_true branch
        this.degradationRules.set('Conditional', (command) => command.payload.if_true)
        
        // Delay commands → Immediate execution
        this.degradationRules.set('Delay', (command) => command.payload.command)
    }
    
    degradeCommand(command) {
        if (!this.routerHandler.supportsCommand(command.type)) {
            const degradationRule = this.degradationRules.get(command.type)
            if (degradationRule) {
                const degradedCommand = degradationRule(command)
                console.log(`Degrading command ${command.type} to ${degradedCommand.type}`)
                return degradedCommand
            }
        }
        
        return command
    }
}
```

## Monitoring and Analytics

### Version Analytics

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
        "Version compatibility metric recorded"
    );
    
    // Store metrics for analysis
    // This could be sent to analytics systems like Prometheus, DataDog, etc.
    
    Json(ApiResponse::success(()))
}
```

### Version Distribution Dashboard

```javascript
// Frontend analytics collection
class VersionAnalytics {
    constructor() {
        this.metrics = []
        this.reportInterval = 5 * 60 * 1000 // 5 minutes
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
            
            this.metrics = [] // Clear after successful report
        } catch (error) {
            console.warn('Failed to report version metrics:', error)
        }
    }
}
```

## Best Practices

### 1. Version Planning

- **Semantic Versioning**: Follow strict semantic versioning for predictable compatibility
- **Feature Flags**: Use feature flags for gradual rollout of new capabilities
- **Deprecation Policy**: Provide clear deprecation timelines (minimum 6 months notice)
- **Documentation**: Maintain comprehensive migration guides for major version changes

### 2. Testing Strategy

```javascript
// Version compatibility testing framework
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
            throw new Error(`No test suite found for version ${version}`)
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

### 3. Client Update Strategy

```javascript
// Update notification and management
class UpdateManager {
    constructor() {
        this.updateCheckInterval = 24 * 60 * 60 * 1000 // 24 hours
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
            console.warn('Update check failed:', error)
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
        // Show blocking update dialog
        this.routerHandler.execute({
            type: 'ShowDialog',
            payload: {
                dialog_type: 'Alert',
                title: 'Update Required',
                content: `A critical update is required to continue using the app. Please update to version ${serverInfo.version}.`,
                actions: [{
                    text: 'Update Now',
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

## Troubleshooting Common Issues

### 1. Version Mismatch Errors

**Problem**: Client receives "Unsupported command version" error
**Solution**: 
```javascript
// Check client version support
console.log('Client version:', ROUTE_COMMAND_VERSION)
console.log('Server version:', serverResponse.version)

// Verify compatibility
const compatible = RouterHandler.checkVersionCompatibility(serverResponse.version)
if (!compatible) {
    // Request capability negotiation
    const capabilities = await negotiateCapabilities()
    console.log('Available commands:', capabilities.compatible_commands)
}
```

### 2. Fallback Chain Failures

**Problem**: All fallback commands fail to execute
**Solution**:
```javascript
// Implement ultimate fallback
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
                title: 'System Error',
                content: message || 'An unexpected error occurred. Please refresh the page.',
                actions: []
            }
        }
    }
}
```

### 3. Feature Detection Issues

**Problem**: Server incorrectly detects client capabilities
**Solution**:
```javascript
// Explicit capability reporting
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

This comprehensive version compatibility system ensures smooth operation across different client and server versions while providing clear upgrade paths and graceful degradation when needed.