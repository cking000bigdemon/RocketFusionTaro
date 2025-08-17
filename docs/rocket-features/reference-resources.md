# Rocket参考资源

## API参考手册

### 核心Trait和类型

#### Rocket结构

```rust
// Rocket实例创建
let rocket = rocket::build()
    .mount("/", routes![...])
    .manage(state)
    .attach(fairing)
    .register("/", catchers![...]);

// 配置选项
let config = rocket::Config {
    port: 8000,
    address: "localhost".parse().unwrap(),
    workers: 4,
    log_level: rocket::config::LogLevel::Normal,
    ..Default::default()
};
```

#### FromRequest Trait

```rust
#[rocket::async_trait]
impl<'r> FromRequest<'r> for MyType {
    type Error = MyError;
    
    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        // 从请求中提取数据
        let value = request.headers().get_one("X-Header")?;
        MyType::from_str(value)
            .map(|v| Outcome::Success(v))
            .unwrap_or_else(|e| Outcome::Error((Status::BadRequest, e)))
    }
}
```

#### Responder Trait

```rust
impl<'r> Responder<'r, 'static> for MyType {
    fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
        Response::build()
            .status(Status::Ok)
            .header(ContentType::JSON)
            .sized_body(self.to_string().len(), Cursor::new(self.to_string()))
            .ok()
    }
}
```

### 路由宏参考

#### HTTP方法宏

```rust
// GET请求
#[get("/")]
#[get("/users/<id>")]
#[get("/users?<page>&<limit>")]

// POST请求
#[post("/users", data = "<user>")]
#[post("/users", format = "json", data = "<user>")]

// PUT请求
#[put("/users/<id>", data = "<user>")]

// DELETE请求
#[delete("/users/<id>")]

// PATCH请求
#[patch("/users/<id>", data = "<user>")]

// 多个方法
#[route(GET, path = "/")]
#[route(POST, path = "/", data = "<data>")]
```

#### 路径参数类型

```rust
// 基础类型
#[get("/users/<id>")]
fn user(id: u32) -> String { ... }

// 字符串
#[get("/files/<path>")]
fn file(path: String) -> String { ... }

// 路径片段
#[get("/files/<path..>")]
fn files(path: PathBuf) -> String { ... }

// 多个参数
#[get("/users/<user_id>/posts/<post_id>")]
fn user_post(user_id: u32, post_id: u32) -> String { ... }
```

### 状态管理API

#### 托管状态

```rust
// 添加托管状态
rocket::build()
    .manage(MyState::new())
    .mount("/", routes![...]);

// 获取托管状态
#[get("/state")]
fn get_state(state: &State<MyState>) -> String { ... }

// 可变状态
use std::sync::Mutex;
rocket::build()
    .manage(Mutex::new(MyState::new()));

#[get("/counter")]
fn counter(state: &State<Mutex<u32>>) -> String {
    let mut counter = state.lock().unwrap();
    *counter += 1;
    format!("Counter: {}", *counter)
}
```

#### 请求局部状态

```rust
use rocket::request::{Request, local_cache};

#[get("/cached")]
fn cached(req: &Request) -> String {
    let value = req.local_cache(|| expensive_computation());
    format!("Cached: {}", value)
}
```

### 错误处理API

#### 捕获器定义

```rust
#[catch(404)]
fn not_found() -> &'static str {
    "Page not found"
}

#[catch(500)]
fn internal_error() -> &'static str {
    "Internal server error"
}

#[catch(default)]
fn default(status: Status, req: &Request) -> String {
    format!("{} ({}): {}", status.code, status.reason(), req.uri())
}
```

#### 自定义错误类型

```rust
use rocket::response::status;

#[derive(Debug)]
enum ApiError {
    NotFound(String),
    BadRequest(String),
    Internal(String),
}

impl<'r> Responder<'r, 'static> for ApiError {
    fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
        match self {
            ApiError::NotFound(msg) => 
                status::NotFound(msg).respond_to(_),
            ApiError::BadRequest(msg) => 
                status::BadRequest(Some(msg)).respond_to(_),
            ApiError::Internal(msg) => 
                status::InternalServerError(Some(msg)).respond_to(_),
        }
    }
}
```

## 示例项目集

### 1. RESTful API服务

#### 项目结构

```
rocket-api/
├── src/
│   ├── main.rs
│   ├── models/
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   └── post.rs
│   ├── routes/
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   └── api.rs
│   ├── middleware/
│   │   └── auth.rs
│   └── utils/
│       └── response.rs
├── migrations/
├── tests/
└── Cargo.toml
```

#### 核心功能

```rust
// 完整的用户CRUD API
#[post("/users", data = "<user>")]
async fn create_user(
    db: Connection<AppDb>,
    user: Json<CreateUserRequest>
) -> Result<Json<UserResponse>, ApiError> {
    let new_user = user.into_inner().validate()?;
    
    let user = db.run(move |conn| {
        diesel::insert_into(users::table)
            .values(&new_user)
            .get_result::<User>(conn)
    }).await?;
    
    Ok(Json(UserResponse::from(user)))
}

#[get("/users/<id>")]
async fn get_user(
    db: Connection<AppDb>,
    id: i32
) -> Result<Json<UserResponse>, ApiError> {
    let user = db.run(move |conn| {
        users::table.find(id).first::<User>(conn)
    }).await?;
    
    Ok(Json(UserResponse::from(user)))
}

#[put("/users/<id>", data = "<user>")]
async fn update_user(
    db: Connection<AppDb>,
    id: i32,
    user: Json<UpdateUserRequest>
) -> Result<Json<UserResponse>, ApiError> {
    let updated_user = db.run(move |conn| {
        diesel::update(users::table.find(id))
            .set(&user.into_inner())
            .get_result::<User>(conn)
    }).await?;
    
    Ok(Json(UserResponse::from(updated_user)))
}

#[delete("/users/<id>")]
async fn delete_user(
    db: Connection<AppDb>,
    id: i32
) -> Result<Json<DeleteResponse>, ApiError> {
    db.run(move |conn| {
        diesel::delete(users::table.find(id))
            .execute(conn)
    }).await?;
    
    Ok(Json(DeleteResponse {
        message: "User deleted successfully".to_string()
    }))
}
```

### 2. 实时聊天应用

#### WebSocket实现

```rust
use rocket_ws::{WebSocket, Channel, Message};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

type ChatRooms = Arc<Mutex<HashMap<String, Vec<rocket_ws::stream::DuplexStream>>>>;

#[get("/chat/<room>")]
fn chat_room(
    ws: WebSocket,
    room: String,
    rooms: &State<ChatRooms>
) -> Channel<'static> {
    let rooms = rooms.inner().clone();
    
    ws.channel(move |stream| Box::pin(async move {
        // 加入房间
        {
            let mut rooms = rooms.lock().unwrap();
            rooms.entry(room.clone()).or_insert_with(Vec::new).push(stream.clone());
        }
        
        // 广播消息
        while let Some(message) = stream.next().await {
            if let Ok(Message::Text(text)) = message {
                let rooms = rooms.lock().unwrap();
                if let Some(participants) = rooms.get(&room) {
                    let full_message = format!("User: {}", text);
                    for participant in participants {
                        let _ = participant.send(Message::Text(full_message.clone())).await;
                    }
                }
            }
        }
        
        Ok(())
    }))
}
```

### 3. 文件上传服务

#### 多部分表单处理

```rust
use rocket::data::{Data, ToByteUnit};
use rocket::fs::TempFile;
use rocket::response::status;

#[post("/upload", data = "<file>")]
async fn upload_file(
    mut file: TempFile<'_>
) -> Result<String, status::BadRequest<&'static str>> {
    let filename = file.name().unwrap_or("upload");
    let path = format!("uploads/{}_{}", Utc::now().timestamp(), filename);
    
    file.persist_to(&path).await
        .map_err(|_| status::BadRequest(Some("Failed to save file")))?;
    
    Ok(format!("File uploaded to {}", path))
}

#[post("/upload/multiple", data = "<form>")]
async fn upload_multiple(
    form: Form<UploadForm<'_>>
) -> Result<Json<Vec<String>>, status::BadRequest<&'static str>> {
    let mut uploaded_files = Vec::new();
    
    for file in form.files.iter() {
        let filename = file.name().unwrap_or("upload");
        let path = format!("uploads/{}_{}", Utc::now().timestamp(), filename);
        
        file.persist_to(&path).await
            .map_err(|_| status::BadRequest(Some("Failed to save file")))?;
        
        uploaded_files.push(path);
    }
    
    Ok(Json(uploaded_files))
}

#[derive(FromForm)]
struct UploadForm<'r> {
    files: Vec<TempFile<'r>>,
}
```

### 4. 微服务模板

#### 服务发现集成

```rust
use consul::Client;

struct ServiceRegistry {
    consul: Client,
    service_name: String,
    service_id: String,
}

impl ServiceRegistry {
    async fn register(&self, port: u16) -> Result<(), Box<dyn std::error::Error>> {
        let registration = consul::AgentServiceRegistration {
            id: Some(self.service_id.clone()),
            name: self.service_name.clone(),
            address: Some("localhost".to_string()),
            port: Some(port),
            check: Some(consul::AgentServiceCheck {
                http: Some(format!("http://localhost:{}/health", port)),
                interval: Some("10s".to_string()),
                timeout: Some("5s".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        };
        
        self.consul.register(registration).await?;
        Ok(())
    }
    
    async fn deregister(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.consul.deregister(&self.service_id).await?;
        Ok(())
    }
}
```

## 常见问题

### 1. 编译错误

#### 宏相关问题

**问题**：`#[get("/")]` 宏无法识别

**解决方案**：
```rust
// 确保使用正确的宏导入
#[macro_use] extern crate rocket;

// 或者使用新的导入方式
use rocket::get;
```

#### 异步函数问题

**问题**：异步路由处理器编译错误

**解决方案**：
```rust
// 正确的方式
#[rocket::async_trait]
impl<'r> FromRequest<'r> for MyType {
    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        // 异步实现
    }
}
```

### 2. 运行时错误

#### 端口占用

**问题**：`Address already in use`

**解决方案**：
```bash
# 查找占用端口的进程
lsof -i :8000
# 或者
netstat -tulpn | grep :8000

# 更改Rocket端口
ROCKET_PORT=8001 cargo run
```

#### 数据库连接失败

**问题**：数据库连接超时

**解决方案**：
```rust
// 增加连接超时配置
let config = rocket_db_pools::Config {
    url: "mysql://user:password@localhost/myapp".to_string(),
    min_connections: 1,
    max_connections: 10,
    connect_timeout: 10, // 秒
    idle_timeout: 300,
    ..Default::default()
};
```

### 3. 性能问题

#### 内存泄漏

**问题**：应用内存持续增长

**解决方案**：
- 检查托管状态的使用
- 验证数据库连接池配置
- 使用Valgrind或AddressSanitizer检查内存泄漏

#### 响应缓慢

**问题**：API响应时间过长

**解决方案**：
```rust
// 使用连接池
#[get("/users")]
async fn get_users(db: Connection<AppDb>) -> Json<Vec<User>> {
    db.run(|conn| {
        users::table
            .limit(100) // 限制结果集大小
            .load::<User>(conn)
    }).await
    .map(Json)
    .unwrap_or_else(|_| Json(vec![]))
}
```

### 4. 部署问题

#### Docker镜像过大

**解决方案**：
```dockerfile
# 使用多阶段构建
FROM rust:1.70 as builder
# ... 构建阶段

FROM debian:bullseye-slim
# ... 运行时阶段
```

#### 环境变量未生效

**解决方案**：
```rust
// 在Rocket.toml中使用环境变量
[default]
port = ${PORT:8000}
address = "${ADDRESS:localhost}"

// 或者在代码中
use std::env;

#[launch]
fn rocket() -> _ {
    let port = env::var("PORT").unwrap_or_else(|_| "8000".to_string());
    let address = env::var("ADDRESS").unwrap_or_else(|_| "localhost".to_string());
    
    let config = rocket::Config {
        port: port.parse().unwrap(),
        address: address.parse().unwrap(),
        ..Default::default()
    };
    
    rocket::custom(config)
        .mount("/", routes![index])
}
```

## 版本更新指南

### 从0.4升级到0.5

#### 主要变更

1. **异步支持**：所有处理器现在是异步的
2. **数据库集成**：使用`rocket_db_pools`替代旧的数据库支持
3. **配置系统**：新的配置API

#### 迁移步骤

1. **更新依赖**：
```toml
[dependencies]
rocket = "0.5.0"
rocket_db_pools = { version = "0.1.0", features = ["diesel_mysql"] }
```

2. **更新路由**：
```rust
// 旧版本
#[get("/")]
fn index() -> &'static str {
    "Hello"
}

// 新版本
#[get("/")]
async fn index() -> &'static str {
    "Hello"
}
```

3. **更新数据库代码**：
```rust
// 旧版本
#[get("/users")]
fn get_users(conn: DbConn) -> Json<Vec<User>> {
    Json(users.load::<User>(&*conn).unwrap())
}

// 新版本
#[get("/users")]
async fn get_users(mut db: Connection<AppDb>) -> Json<Vec<User>> {
    Json(db.run(|conn| users.load::<User>(conn)).await.unwrap())
}
```

### 未来版本展望

#### 即将推出的功能

1. **HTTP/3支持**：基于QUIC协议
2. **更好的WebAssembly支持**：边缘计算场景
3. **改进的测试框架**：更简单的测试编写
4. **GraphQL集成**：内置GraphQL支持

#### 兼容性承诺

Rocket遵循语义化版本控制：
- **主要版本**：破坏性变更
- **次要版本**：新功能，向后兼容
- **补丁版本**：bug修复，完全兼容

### 升级检查清单

- [ ] 检查所有依赖版本
- [ ] 更新路由处理器为async
- [ ] 迁移数据库集成代码
- [ ] 更新配置文件格式
- [ ] 测试所有端点
- [ ] 更新部署脚本
- [ ] 验证性能基准
- [ ] 更新文档