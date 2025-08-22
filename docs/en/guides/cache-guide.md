# Redis Cache System User Guide

## Overview

This project integrates a Redis cache system that provides high-performance data caching functionality, including user authentication cache, session management cache, and user data cache.

## Configuration

### Redis Connection Configuration

Configure Redis connection information in `Rocket.toml`:

```toml
[default.cache]
redis_url = "redis://:ck320621@192.168.5.222:6379"

[development.cache]
redis_url = "redis://:ck320621@192.168.5.222:6379"

[production.cache]
redis_url = "redis://:ck320621@192.168.5.222:6379"
```

### Dependency Configuration

Redis dependencies in `Cargo.toml`:

```toml
redis = { version = "0.24", features = ["tokio-comp", "connection-manager"] }
```

## Cache Architecture

### Module Structure

```
src/cache/
├── mod.rs          # Cache module entry and configuration
├── redis.rs        # Redis connection pool and basic operations
├── user.rs         # User-related cache
├── session.rs      # Session management cache
└── data.rs         # User data cache
```

### Cache Key Naming Convention

All cache keys use a unified prefix `rocket_taro:`

- User info: `rocket_taro:user:{user_id}`
- Username mapping: `rocket_taro:username:{username}`
- Session token: `rocket_taro:session_token:{token}`
- User session: `rocket_taro:user_session:{token}`
- User data: `rocket_taro:user_data:{data_id}`
- Login failures: `rocket_taro:login_failures:{username}`

### TTL Strategy

```rust
pub mod ttl {
    pub const USER_SESSION: usize = 7 * 24 * 3600; // 7 days
    pub const USER_INFO: usize = 30 * 60; // 30 minutes
    pub const USER_DATA: usize = 10 * 60; // 10 minutes
    pub const LOGIN_ATTEMPTS: usize = 15 * 60; // 15 minutes
}
```

## Feature Overview

### 1. User Authentication Cache

- **Account Lock Protection**: Records login failure count, automatically locks after 5 failures for 15 minutes
- **User Info Cache**: Caches user basic information for 30 minutes
- **Username Mapping**: Fast user ID lookup

```rust
let user_cache = UserCache::new(redis.clone());

// Record login failure
user_cache.record_login_failure(&username).await?;

// Check account lock status
let is_locked = user_cache.is_account_locked(&username, 5).await?;

// Cache user information
user_cache.cache_user(&user).await?;
```

### 2. Session Management Cache

- **Session Info Cache**: Complete user session information, avoiding database queries
- **Access Time Update**: Records session last access time
- **Batch Invalidation**: Supports deleting all sessions for a user

```rust
let session_cache = SessionCache::new(redis.clone());

// Cache user session
session_cache.cache_user_session(&user, &session).await?;

// Get session by token
let user_session = session_cache.get_user_session_by_token(&token).await?;

// Invalidate session
session_cache.invalidate_session(&token).await?;
```

### 3. User Data Cache

- **Data List Cache**: Caches complete user data list
- **Single Item Cache**: Supports caching and retrieval of individual data items
- **Cache Warm-up**: Preloads frequently used data at system startup

```rust
let data_cache = DataCache::new(redis.clone());

// Cache user data
data_cache.cache_user_data(&user_data).await?;

// Get all user data
let cached_data = data_cache.get_all_user_data().await?;

// Cache warm-up
data_cache.warm_up_cache(&data_list).await?;
```

## API Endpoints

### Cache Management Endpoints (Admin privileges required)

#### 1. Cache Health Check
```
GET /api/cache/health
```

Returns Redis connection status and cache statistics.

#### 2. Cache Invalidation
```
POST /api/cache/invalidate
Content-Type: application/json

{
  "cache_type": "user|session|data|all",
  "identifier": "optional_id"
}
```

Supports invalidating specific types of cache or all cache.

#### 3. Clean Expired Sessions
```
POST /api/cache/cleanup
```

Cleans up all expired session cache.

#### 4. Get Cache Key List
```
GET /api/cache/keys/{pattern}
```

Gets list of cache keys matching pattern (for debugging).

#### 5. Cache Warm-up
```
POST /api/cache/warmup
```

Warms up user data cache.

## Usage Examples

### Using Cache in Routes

```rust
use crate::cache::{RedisPool, user::UserCache};

#[post("/api/auth/login", data = "<login_req>")]
pub async fn login(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    login_req: Json<LoginRequest>,
) -> Result<Json<ApiResponse<LoginResponse>>, Status> {
    let user_cache = UserCache::new(redis.inner().clone());
    
    // Check account lock
    if user_cache.is_account_locked(&login_req.username, 5).await? {
        return Ok(Json(ApiResponse::error("Account is locked")));
    }
    
    // Cache user info after successful authentication
    user_cache.cache_user(&user).await?;
    
    // Clear login failure records
    user_cache.clear_login_failures(&login_req.username).await?;
    
    Ok(Json(ApiResponse::success(response)))
}
```

### Using Cache in Request Guards

Authentication guards automatically integrate cache queries, prioritizing Redis for session information and falling back to database on failure.

## Performance Optimization

### 1. Cache Strategy

- **Read-First**: All read operations prioritize cache queries
- **Write-Update**: Data updates synchronously update cache
- **Graceful Degradation**: Automatic fallback to database on cache failure

### 2. Connection Management

- Uses connection pool to manage Redis connections
- Supports connection reuse and async operations
- Automatic reconnection mechanism

### 3. Error Handling

- Cache operation errors don't affect main functionality
- Detailed logging
- Graceful error degradation

## Monitoring and Maintenance

### Logging

The system records the following cache operation logs:

- Cache hits/misses
- Cache set/delete operations
- Connection errors and recovery
- Performance statistics

### Maintenance Recommendations

1. **Regular Cleanup**: Use cleanup endpoints to clear expired data
2. **Monitor Performance**: Watch cache hit rate and response time
3. **Capacity Management**: Monitor Redis memory usage
4. **Backup Strategy**: Regularly backup critical cache data

## Troubleshooting

### Common Issues

1. **Redis Connection Failure**
   - Check Redis service status
   - Verify connection configuration
   - Check network connectivity

2. **Cache Misses**
   - Confirm data is correctly cached
   - Check TTL settings
   - Verify cache key format

3. **Performance Issues**
   - Monitor Redis CPU and memory
   - Optimize cache strategy
   - Consider sharded deployment

### Debugging Tools

- Use `/api/cache/health` to check system status
- Use `/api/cache/keys/{pattern}` to view cache keys
- Check application logs for cache operation details

## Extension Development

### Adding New Cache Types

1. Define cache structure in corresponding module
2. Implement cache operation methods
3. Integrate cache logic in routes
4. Add corresponding management endpoints

### Custom TTL Strategy

Adjust TTL constants in `cache/mod.rs` based on business requirements.

### Cache Key Management

Use the `cache_key()` function to generate standard format cache keys, ensuring naming consistency.