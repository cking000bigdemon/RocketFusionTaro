# Rocket-Taro-Server API接口文档

## 接口概述

本文档描述了Rocket-Taro-Server的所有API接口，主要包括用户认证和数据管理功能。

## 基础信息

- **基础URL**: `http://localhost:8000`
- **认证方式**: Cookie-based Session
- **数据格式**: JSON
- **字符编码**: UTF-8

## 通用响应格式

所有API接口都返回统一格式的JSON响应：

```json
{
    "code": 200,           // 状态码：200成功，其他为错误
    "message": "success",  // 响应消息
    "data": {}            // 响应数据，错误时为null
}
```

## 认证相关接口

### 1. 用户登录

**接口**: `POST /api/auth/login`

**描述**: 用户登录验证

**请求参数**:
```json
{
    "username": "string",  // 用户名，必填
    "password": "string"   // 密码，必填
}
```

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "username": "admin",
            "email": "admin@rocket-taro.com",
            "full_name": "系统管理员",
            "avatar_url": null,
            "is_admin": true
        },
        "session_token": "abc123...",
        "expires_at": "2025-08-28T12:00:00Z"
    }
}
```

**错误响应**:
```json
{
    "code": 400,
    "message": "用户名或密码错误",
    "data": null
}
```

### 2. 用户登出

**接口**: `POST /api/auth/logout`

**描述**: 用户登出，清除会话

**请求头**: 需要携带有效的session cookie

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": null
}
```

### 3. 获取当前用户信息

**接口**: `GET /api/auth/current`

**描述**: 获取当前登录用户的详细信息

**请求头**: 需要携带有效的session cookie

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "admin",
        "email": "admin@rocket-taro.com",
        "full_name": "系统管理员",
        "avatar_url": null,
        "is_admin": true
    }
}
```

### 4. 检查认证状态

**接口**: `GET /api/auth/status`

**描述**: 检查当前用户的认证状态

**响应示例**:

用户已登录：
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "admin",
        "email": "admin@rocket-taro.com",
        "full_name": "系统管理员",
        "avatar_url": null,
        "is_admin": true
    }
}
```

用户未登录：
```json
{
    "code": 200,
    "message": "success",
    "data": null
}
```

### 5. 认证检查

**接口**: `GET /api/auth/check`

**描述**: 简单的认证检查接口

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": true
}
```

## 业务数据接口

### 6. 健康检查

**接口**: `GET /api/health`

**描述**: 服务健康状态检查

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "status": "ok",
        "timestamp": "2025-08-21T12:00:00Z"
    }
}
```

### 7. 获取用户数据

**接口**: `GET /api/user/:id`

**描述**: 根据用户ID获取用户信息

**路径参数**:
- `id`: 用户UUID

**请求头**: 需要认证

### 8. 创建用户数据

**接口**: `POST /create_user_data`

**描述**: 创建新的用户数据记录

**请求参数**:
```json
{
    "name": "string",     // 姓名，必填
    "email": "string",    // 邮箱，必填
    "phone": "string",    // 电话，可选
    "message": "string"   // 消息，可选
}
```

### 9. 获取用户数据列表

**接口**: `GET /get_user_data`

**描述**: 获取所有用户数据记录

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "张三",
            "email": "zhangsan@example.com",
            "phone": "13800138000",
            "message": "测试消息",
            "created_at": "2025-08-21T12:00:00Z"
        }
    ]
}
```

### 10. Mock数据接口

**接口**: `POST /create_mock_user_data`

**描述**: 创建Mock用户数据（用于测试）

**接口**: `GET /get_mock_user_data`

**描述**: 获取Mock用户数据列表

## 错误码说明

| 状态码 | 说明                     |
|--------|--------------------------|
| 200    | 请求成功                 |
| 400    | 请求参数错误             |
| 401    | 未认证或认证失效         |
| 403    | 权限不足                 |
| 404    | 资源不存在               |
| 500    | 服务器内部错误           |

## 认证机制说明

### Cookie认证
- 登录成功后，服务器会设置名为`session_token`的HttpOnly Cookie
- 该Cookie有效期为8小时
- 所有需要认证的接口都会自动检查Cookie中的session_token
- 前端无需手动处理token，浏览器会自动携带Cookie

### 会话管理
- 会话信息存储在数据库中，包含用户ID、IP地址、User-Agent等
- 会话有效期为7天，超时自动失效
- 登出时会从数据库中删除对应的会话记录

## 请求示例

### JavaScript Fetch API
```javascript
// 登录
const loginResponse = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        username: 'admin',
        password: 'password'
    })
});

// 获取当前用户信息（Cookie会自动携带）
const userResponse = await fetch('/api/auth/current');
const userData = await userResponse.json();
```

### cURL示例
```bash
# 登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}' \
  -c cookies.txt

# 获取用户信息（使用保存的cookie）
curl -X GET http://localhost:8000/api/auth/current \
  -b cookies.txt
```

## 开发与测试

### 测试账号
- 用户名: `admin`, 密码: `password` (管理员)
- 用户名: `test`, 密码: `password` (普通用户)

### 本地开发
1. 启动PostgreSQL数据库服务
2. 运行 `cargo run` 启动服务器
3. 访问 `http://localhost:8000/login.html` 进行登录测试

---

最后更新时间: 2025-08-21
文档版本: v1.0