# 服务配置说明

## 当前配置状态

✅ **数据库连接已配置**
- 服务器: `192.168.5.222:5432`
- 数据库: `postgres`
- 用户: `user_ck`
- 状态: 连接正常，自动初始化表结构

✅ **Redis缓存已配置**
- 服务器: `192.168.5.222:6379`
- 认证: 密码认证
- 状态: 连接正常，用于Session管理

## 配置文件

### Rocket.toml
```toml
[default.databases]
database_url = "host=192.168.5.222 port=5432 user=user_ck password=ck320621 dbname=postgres"

[default.cache]
redis_url = "redis://:ck320621@192.168.5.222:6379"
```

### 环境变量覆盖
如需覆盖配置，可设置环境变量：
- `DATABASE_URL` - 覆盖数据库连接
- `REDIS_URL` - 覆盖Redis连接

### 默认测试账户
系统自动创建测试账户：
- 管理员: `admin` / `password`
- 普通用户: `test` / `password`

## 验证方法

1. **检查数据库连接**：观察启动日志中的数据库初始化信息
2. **检查Redis连接**：观察启动日志中的缓存连接信息
3. **功能测试**：登录功能正常表示数据库和Session缓存都工作正常

## 注意事项

- 配置中包含敏感信息（密码），生产环境建议使用环境变量
- 数据库自动初始化，首次启动会创建必要的表结构
- Redis主要用于Session管理，提升认证性能