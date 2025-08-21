# PostgreSQL 客户端安装指南

## Windows 环境安装 PostgreSQL 客户端

### 方法1：官方安装包（推荐）

1. **下载 PostgreSQL**
   - 访问：https://www.postgresql.org/download/windows/
   - 选择最新版本（如 PostgreSQL 16）
   - 下载 Windows 安装包

2. **安装选项**
   - 可以选择"仅安装客户端工具"
   - 或完整安装但不启动服务器
   - 确保勾选 "Command Line Tools"

3. **验证安装**
   ```cmd
   psql --version
   ```

### 方法2：便携版本

1. **下载便携版**
   - 访问：https://www.enterprisedb.com/download-postgresql-binaries
   - 下载 Windows 便携版
   - 解压到任意目录（如 `C:\PostgreSQL\`）

2. **添加到环境变量**
   - 将 `C:\PostgreSQL\bin` 添加到 PATH
   - 重启命令行工具

### 方法3：包管理器安装

#### 使用 Chocolatey
```powershell
# 安装 Chocolatey（如果没有）
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装 PostgreSQL
choco install postgresql
```

#### 使用 Winget
```cmd
winget install PostgreSQL.PostgreSQL
```

## 替代方案：在线数据库管理工具

如果不想安装客户端，可以使用以下在线工具：

### 1. pgAdmin（Web界面）
- 下载：https://www.pgadmin.org/download/
- 安装后通过浏览器访问
- 图形化界面，易于使用

### 2. DBeaver（通用数据库工具）
- 下载：https://dbeaver.io/download/
- 免费的通用数据库管理工具
- 支持 PostgreSQL

### 3. 在线 SQL 执行

如果上述方法都不便使用，我可以为您提供一个简单的 SQL 执行接口。

## 快速测试连接

安装完成后，测试数据库连接：

```bash
# 测试连接
psql -h 192.168.5.222 -p 5432 -U user_ck -d postgres -c "SELECT version();"

# 执行建表脚本
psql -h 192.168.5.222 -p 5432 -U user_ck -d postgres -f init_database.sql
```

## 故障排查

### 1. 连接超时
```bash
# 测试网络连接
telnet 192.168.5.222 5432
# 或
Test-NetConnection -ComputerName 192.168.5.222 -Port 5432
```

### 2. 权限问题
- 确保用户 `user_ck` 存在
- 确保用户有登录权限
- 检查 `pg_hba.conf` 配置

### 3. 防火墙问题
- 确保目标服务器 5432 端口开放
- 检查本地防火墙设置

---

选择其中一种方法安装客户端工具后，就可以连接到数据库并执行初始化脚本了。