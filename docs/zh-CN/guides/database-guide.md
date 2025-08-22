# 数据库系统使用指南

本文档介绍 Rocket-Taro 项目的数据库系统架构、配置和使用方法。

## 目录

1. [数据库概述](#数据库概述)
2. [数据库配置](#数据库配置)
3. [数据库表结构](#数据库表结构)
4. [连接和初始化](#连接和初始化)
5. [API 操作示例](#api-操作示例)
6. [数据库维护](#数据库维护)
7. [故障排除](#故障排除)

## 数据库概述

本项目使用 PostgreSQL 作为主数据库，通过 `tokio-postgres` 驱动进行异步数据库操作。数据库系统支持自动初始化、用户认证、会话管理和数据存储等功能。

### 技术栈
- **数据库**: PostgreSQL 
- **连接池**: Arc<Mutex<Client>> 单连接模式
- **ORM**: 原生 SQL 查询
- **异步运行时**: Tokio
- **密码加密**: bcrypt

## 数据库配置

### 连接配置

数据库连接通过环境变量或默认配置进行设置：

```rust
// 环境变量方式
export DATABASE_URL="host=192.168.5.222 port=5432 user=user_ck password=ck320621 dbname=postgres"

// 默认配置 (src/database/mod.rs:13)
let database_url = std::env::var("DATABASE_URL")
    .unwrap_or_else(|_| "host=192.168.5.222 port=5432 user=user_ck password=ck320621 dbname=postgres".to_string());
```

### 连接参数说明

| 参数 | 说明 | 示例值 |
|------|------|--------|
| host | 数据库服务器地址 | 192.168.5.222 |
| port | 数据库端口 | 5432 |
| user | 数据库用户名 | user_ck |
| password | 数据库密码 | ck320621 |
| dbname | 数据库名称 | postgres |

## 数据库表结构

### 1. 用户表 (users)

存储系统用户信息和认证数据。

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**字段说明:**
- `id`: 用户唯一标识符 (UUID)
- `username`: 用户名，唯一且必填
- `email`: 邮箱地址，唯一且必填
- `password_hash`: bcrypt 加密的密码哈希
- `full_name`: 用户全名
- `avatar_url`: 头像图片URL
- `is_active`: 用户是否激活
- `is_admin`: 是否为管理员
- `last_login_at`: 最后登录时间
- `created_at`: 创建时间
- `updated_at`: 更新时间

### 2. 用户会话表 (user_sessions)

管理用户登录会话和认证令牌。

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**字段说明:**
- `id`: 会话唯一标识符
- `user_id`: 关联的用户ID，外键引用 users.id
- `session_token`: 会话令牌，用于API认证
- `user_agent`: 用户代理字符串
- `ip_address`: 客户端IP地址
- `expires_at`: 会话过期时间 (默认7天)
- `is_active`: 会话是否有效
- `created_at`: 创建时间

### 3. 登录日志表 (login_logs)

记录所有登录尝试，用于安全审计。

```sql
CREATE TABLE login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(50) NOT NULL,
    is_success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**字段说明:**
- `id`: 日志唯一标识符
- `user_id`: 关联的用户ID (可为空)
- `username`: 登录使用的用户名
- `is_success`: 登录是否成功
- `ip_address`: 登录IP地址
- `user_agent`: 用户代理字符串
- `error_message`: 失败时的错误信息
- `created_at`: 登录时间

### 4. 用户数据表 (user_data)

存储应用程序的业务数据。

```sql
CREATE TABLE user_data (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    phone VARCHAR,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL
);
```

**字段说明:**
- `id`: 数据唯一标识符
- `name`: 姓名
- `email`: 邮箱地址
- `phone`: 电话号码 (可选)
- `message`: 消息内容 (可选)
- `created_at`: 创建时间

## 连接和初始化

### 数据库连接创建

数据库连接在应用启动时自动创建 (src/database/mod.rs:10):

```rust
pub async fn create_connection() -> Result<DbPool, Error> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "host=192.168.5.222 port=5432 user=user_ck password=ck320621 dbname=postgres".to_string());
    
    let (client, connection) = tokio_postgres::connect(&database_url, NoTls).await?;
    
    // 后台运行连接
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            error!("Database connection error: {}", e);
        }
    });
    
    // 自动创建表
    init_auth_tables(&client).await?;
    
    Ok(Arc::new(Mutex::new(client)))
}
```

### 默认用户创建

系统自动创建两个默认测试账户:

```rust
// 管理员账户
用户名: admin
密码: password
邮箱: admin@rocket-taro.com
角色: 管理员

// 普通用户账户  
用户名: test
密码: password
邮箱: test@rocket-taro.com
角色: 普通用户
```

## API 操作示例

### 用户认证操作

#### 1. 用户登录认证

```rust
// src/database/auth.rs:14
pub async fn authenticate_user(
    pool: &DbPool,
    login_req: &LoginRequest,
) -> Result<Option<User>, Error>
```

**使用示例:**
```rust
let login_request = LoginRequest {
    username: "admin".to_string(),
    password: "password".to_string(),
};

match authenticate_user(&db_pool, &login_request).await {
    Ok(Some(user)) => println!("登录成功: {}", user.username),
    Ok(None) => println!("用户名或密码错误"),
    Err(e) => println!("数据库错误: {}", e),
}
```

#### 2. 创建用户会话

```rust  
// src/database/auth.rs:62
pub async fn create_user_session(
    pool: &DbPool,
    user_id: Uuid,
    user_agent: Option<String>,
    ip_address: Option<IpAddr>,
) -> Result<UserSession, Error>
```

**使用示例:**
```rust
let session = create_user_session(
    &db_pool,
    user.id,
    Some("Mozilla/5.0...".to_string()),
    Some("192.168.1.100".parse().unwrap()),
).await?;

println!("会话令牌: {}", session.session_token);
```

#### 3. 验证会话令牌

```rust
// src/database/auth.rs:95
pub async fn validate_session(
    pool: &DbPool,
    session_token: &str,
) -> Result<Option<(User, UserSession)>, Error>
```

**使用示例:**
```rust
let token = "your_session_token_here";
match validate_session(&db_pool, token).await {
    Ok(Some((user, session))) => {
        println!("用户已认证: {}", user.username);
        println!("会话有效期: {}", session.expires_at);
    },
    Ok(None) => println!("无效或过期的会话"),
    Err(e) => println!("验证失败: {}", e),
}
```

### 用户数据操作

#### 1. 插入用户数据

```rust
// src/database/mod.rs:158
pub async fn insert_user_data(
    pool: &DbPool,
    data: &UserData,
) -> Result<(), Error>
```

**使用示例:**
```rust
let new_data = UserData::new(NewUserData {
    name: "张三".to_string(),
    email: "zhangsan@example.com".to_string(),
    phone: Some("13800138000".to_string()),
    message: Some("测试消息".to_string()),
});

insert_user_data(&db_pool, &new_data).await?;
println!("数据插入成功");
```

#### 2. 获取所有用户数据

```rust
// src/database/mod.rs:180
pub async fn get_all_user_data(
    pool: &DbPool,
) -> Result<Vec<UserData>, Error>
```

**使用示例:**
```rust
let all_data = get_all_user_data(&db_pool).await?;
for data in all_data {
    println!("用户: {}, 邮箱: {}", data.name, data.email);
}
```

## 数据库维护

### 会话清理

系统提供自动清理过期会话的功能:

```rust
// src/database/auth.rs:203
pub async fn cleanup_expired_sessions(pool: &DbPool) -> Result<u64, Error>
```

**建议定期执行:**
```rust
// 可以设置定时任务，每小时清理一次
let deleted_count = cleanup_expired_sessions(&db_pool).await?;
println!("清理了 {} 个过期会话", deleted_count);
```

### 登录日志记录

所有登录尝试都会被记录:

```rust
// src/database/auth.rs:179
pub async fn log_login_attempt(
    pool: &DbPool,
    user_id: Option<Uuid>,
    username: &str,
    success: bool,
    ip_address: Option<IpAddr>,
    user_agent: Option<String>,
    failure_reason: Option<String>,
) -> Result<(), Error>
```

## 故障排除

### 常见问题

#### 1. 连接失败
- 检查数据库服务是否运行
- 验证连接参数 (host, port, user, password)
- 确认网络连通性

#### 2. 权限错误
- 确保数据库用户有足够的权限
- 检查表创建权限
- 验证数据库名称是否正确

#### 3. 密码验证失败
- 确保使用正确的密码
- 检查 bcrypt 哈希是否正确
- 验证用户状态 (is_active = true)

#### 4. 会话过期
- 会话默认7天有效期
- 检查系统时间是否正确
- 可以手动清理过期会话

### 调试建议

1. **启用详细日志**: 设置 `RUST_LOG=debug` 查看详细的数据库操作日志
2. **检查连接状态**: 监控数据库连接是否正常
3. **验证SQL语法**: 确保所有SQL语句语法正确
4. **监控性能**: 关注数据库查询性能和连接数

### 联系支持

如遇到数据库相关问题，请提供以下信息：
- 错误消息的完整文本
- 相关的应用程序日志
- 数据库版本和配置信息
- 复现问题的步骤