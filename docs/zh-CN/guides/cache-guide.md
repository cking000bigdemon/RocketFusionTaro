# Redis缓存系统使用指南

## 概述

本项目集成了Redis缓存系统，提供高性能的数据缓存功能，包括用户认证缓存、会话管理缓存和用户数据缓存。

## 配置

### Redis连接配置

在 `Rocket.toml` 中配置Redis连接信息：

```toml
[default.cache]
redis_url = "redis://:ck320621@192.168.5.222:6379"

[development.cache]
redis_url = "redis://:ck320621@192.168.5.222:6379"

[production.cache]
redis_url = "redis://:ck320621@192.168.5.222:6379"
```

### 依赖配置

`Cargo.toml` 中的Redis依赖：

```toml
redis = { version = "0.24", features = ["tokio-comp", "connection-manager"] }
```

## 缓存架构

### 模块结构

```
src/cache/
├── mod.rs          # 缓存模块入口和配置
├── redis.rs        # Redis连接池和基础操作
├── user.rs         # 用户相关缓存
├── session.rs      # 会话管理缓存
└── data.rs         # 用户数据缓存
```

### 缓存键命名规范

所有缓存键使用统一前缀 `rocket_taro:`

- 用户信息: `rocket_taro:user:{user_id}`
- 用户名映射: `rocket_taro:username:{username}`
- 会话令牌: `rocket_taro:session_token:{token}`
- 用户会话: `rocket_taro:user_session:{token}`
- 用户数据: `rocket_taro:user_data:{data_id}`
- 登录失败: `rocket_taro:login_failures:{username}`

### TTL策略

```rust
pub mod ttl {
    pub const USER_SESSION: usize = 7 * 24 * 3600; // 7天
    pub const USER_INFO: usize = 30 * 60; // 30分钟
    pub const USER_DATA: usize = 10 * 60; // 10分钟
    pub const LOGIN_ATTEMPTS: usize = 15 * 60; // 15分钟
}
```

## 功能特性

### 1. 用户认证缓存

- **账户锁定保护**: 记录登录失败次数，超过5次自动锁定15分钟
- **用户信息缓存**: 缓存用户基本信息30分钟
- **用户名映射**: 快速查找用户ID

```rust
let user_cache = UserCache::new(redis.clone());

// 记录登录失败
user_cache.record_login_failure(&username).await?;

// 检查账户锁定状态
let is_locked = user_cache.is_account_locked(&username, 5).await?;

// 缓存用户信息
user_cache.cache_user(&user).await?;
```

### 2. 会话管理缓存

- **会话信息缓存**: 完整的用户会话信息，避免数据库查询
- **访问时间更新**: 记录会话最后访问时间
- **批量失效**: 支持删除用户的所有会话

```rust
let session_cache = SessionCache::new(redis.clone());

// 缓存用户会话
session_cache.cache_user_session(&user, &session).await?;

// 通过令牌获取会话
let user_session = session_cache.get_user_session_by_token(&token).await?;

// 失效会话
session_cache.invalidate_session(&token).await?;
```

### 3. 用户数据缓存

- **数据列表缓存**: 缓存完整的用户数据列表
- **单项数据缓存**: 支持单个数据项的缓存和获取
- **缓存预热**: 系统启动时预加载常用数据

```rust
let data_cache = DataCache::new(redis.clone());

// 缓存用户数据
data_cache.cache_user_data(&user_data).await?;

// 获取所有用户数据
let cached_data = data_cache.get_all_user_data().await?;

// 缓存预热
data_cache.warm_up_cache(&data_list).await?;
```

## API接口

### 缓存管理接口（需要管理员权限）

#### 1. 缓存健康检查
```
GET /api/cache/health
```

返回Redis连接状态和缓存统计信息。

#### 2. 缓存失效
```
POST /api/cache/invalidate
Content-Type: application/json

{
  "cache_type": "user|session|data|all",
  "identifier": "optional_id"
}
```

支持失效特定类型的缓存或所有缓存。

#### 3. 清理过期会话
```
POST /api/cache/cleanup
```

清理所有过期的会话缓存。

#### 4. 获取缓存键列表
```
GET /api/cache/keys/{pattern}
```

获取匹配模式的缓存键列表（调试用）。

#### 5. 缓存预热
```
POST /api/cache/warmup
```

预热用户数据缓存。

## 使用示例

### 在路由中使用缓存

```rust
use crate::cache::{RedisPool, user::UserCache};

#[post("/api/auth/login", data = "<login_req>")]
pub async fn login(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    login_req: Json<LoginRequest>,
) -> Result<Json<ApiResponse<LoginResponse>>, Status> {
    let user_cache = UserCache::new(redis.inner().clone());
    
    // 检查账户锁定
    if user_cache.is_account_locked(&login_req.username, 5).await? {
        return Ok(Json(ApiResponse::error("账户已被锁定")));
    }
    
    // 认证成功后缓存用户信息
    user_cache.cache_user(&user).await?;
    
    // 清除登录失败记录
    user_cache.clear_login_failures(&login_req.username).await?;
    
    Ok(Json(ApiResponse::success(response)))
}
```

### 在请求守卫中使用缓存

认证守卫已自动集成缓存查询，优先从Redis获取会话信息，失败时回退到数据库。

## 性能优化

### 1. 缓存策略

- **读优先**: 所有读操作优先查询缓存
- **写更新**: 数据更新时同步更新缓存
- **优雅降级**: 缓存失败时自动回退到数据库

### 2. 连接管理

- 使用连接池管理Redis连接
- 支持连接复用和异步操作
- 自动重连机制

### 3. 错误处理

- 缓存操作错误不影响主功能
- 详细的日志记录
- 优雅的错误降级

## 监控和维护

### 日志记录

系统会记录以下缓存操作日志：

- 缓存命中/未命中
- 缓存设置/删除操作
- 连接错误和恢复
- 性能统计信息

### 维护建议

1. **定期清理**: 使用清理接口清除过期数据
2. **监控性能**: 关注缓存命中率和响应时间
3. **容量管理**: 监控Redis内存使用情况
4. **备份策略**: 定期备份关键缓存数据

## 故障排除

### 常见问题

1. **Redis连接失败**
   - 检查Redis服务状态
   - 验证连接配置
   - 检查网络连通性

2. **缓存未命中**
   - 确认数据已正确缓存
   - 检查TTL设置
   - 验证缓存键格式

3. **性能问题**
   - 监控Redis CPU和内存
   - 优化缓存策略
   - 考虑分片部署

### 调试工具

- 使用 `/api/cache/health` 检查系统状态
- 使用 `/api/cache/keys/{pattern}` 查看缓存键
- 查看应用日志了解缓存操作详情

## 扩展开发

### 添加新的缓存类型

1. 在对应模块中定义缓存结构
2. 实现缓存操作方法
3. 在路由中集成缓存逻辑
4. 添加相应的管理接口

### 自定义TTL策略

根据业务需求调整 `cache/mod.rs` 中的TTL常量。

### 缓存键管理

使用 `cache_key()` 函数生成标准格式的缓存键，确保命名一致性。