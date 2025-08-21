# 数据库相关文件

本文件夹包含了项目的数据库相关文件和文档。

## 文件说明

### SQL文件

- `init_auth_tables.sql` - 认证相关数据库表初始化脚本
  - 包含用户表(users)、会话表(user_sessions)、登录日志表(login_logs)的创建语句
  - 包含默认管理员和测试用户的初始数据

- `init_database.sql` - 基础数据库初始化脚本（如存在）

- `init_database_fixed.sql` - 修复版数据库初始化脚本（如存在）

## 数据库表结构

### users (用户表)
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

### user_sessions (用户会话表)
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

### login_logs (登录日志表)
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

## 使用说明

1. 连接到PostgreSQL数据库
2. 执行 `init_auth_tables.sql` 文件来创建认证相关的表结构
3. 默认会创建两个测试用户：
   - admin (密码: password) - 管理员用户  
   - test (密码: password) - 普通用户

## 数据库连接配置

项目使用的数据库连接信息位于 `rocket-taro-server/src/database/mod.rs` 中：

```rust
let (client, connection) = tokio_postgres::connect(
    "host=192.168.5.222 port=5432 user=user_ck password=ck320621 dbname=postgres",
    NoTls,
).await?;
```

## 注意事项

- 所有密码都使用bcrypt进行哈希加密存储
- 会话令牌有7天有效期，超时自动失效  
- 登录失败会记录到login_logs表中
- 用户删除时会级联删除相关的会话记录