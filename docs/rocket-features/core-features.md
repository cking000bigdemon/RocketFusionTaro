# Rocket核心功能详解

## 路由系统详解

### 基础路由定义

Rocket使用属性宏定义路由，提供了直观且类型安全的API：

```rust
use rocket::get;

#[get("/")]
fn index() -> &'static str {
    "Hello, world!"
}

#[get("/hello/<name>")]
fn hello(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[get("/user/<id>")]
fn user(id: u64) -> String {
    format!("User ID: {}", id)
}
```

### 动态路径参数

Rocket支持多种类型的路径参数：

```rust
use rocket::get;

// 字符串片段
#[get("/files/<path..>")]
fn files(path: PathBuf) -> String {
    format!("File path: {}", path.display())
}

// 多个参数
#[get("/users/<user_id>/posts/<post_id>")]
fn user_post(user_id: u32, post_id: u32) -> String {
    format!("User {}'s post {}", user_id, post_id)
}

// 可选参数
#[get("/search?<q>&<limit>")]
fn search(q: Option<String>, limit: Option<usize>) -> String {
    let query = q.unwrap_or_else(|| "default".to_string());
    let max = limit.unwrap_or(10);
    format!("Searching '{}' with limit {}", query, max)
}
```

### HTTP方法支持

Rocket支持所有标准HTTP方法：

```rust
use rocket::{get, post, put, delete, patch};

#[get("/users")]
fn list_users() -> &'static str {
    "List all users"
}

#[post("/users", data = "<user>")]
fn create_user(user: Json<User>) -> Json<User> {
    user
}

#[put("/users/<id>", data = "<user>")]
fn update_user(id: u32, user: Json<User>) -> String {
    format!("Updated user {}", id)
}

#[delete("/users/<id>")]
fn delete_user(id: u32) -> String {
    format!("Deleted user {}", id)
}

#[patch("/users/<id>", data = "<user>")]
fn patch_user(id: u32, user: Json<User>) -> String {
    format!("Patched user {}", id)
}
```

## 请求处理机制

### FromRequest守卫

Rocket通过FromRequest trait实现强大的请求守卫机制：

```rust
use rocket::request::{self, Request, FromRequest};
use rocket::outcome::Outcome;

struct ApiKey(String);

#[rocket::async_trait]
impl<'r> FromRequest<'r> for ApiKey {
    type Error = ();

    async fn from_request(request: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        let keys: Vec<_> = request.headers().get("x-api-key").collect();
        if keys.len() != 1 {
            return Outcome::Forward(());
        }
        
        let key = keys[0];
        if is_valid_key(key) {
            Outcome::Success(ApiKey(key.to_string()))
        } else {
            Outcome::Error((Status::Unauthorized, ()))
        }
    }
}

#[get("/protected")]
fn protected(key: ApiKey) -> String {
    format!("Your API key is: {}", key.0)
}
```

### 数据提取

Rocket支持多种数据格式的自动提取：

```rust
use rocket::serde::json::Json;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
struct User {
    name: String,
    email: String,
    age: u8,
}

#[post("/users", format = "json", data = "<user>")]
fn create_user(user: Json<User>) -> Json<User> {
    // user已经是反序列化的User结构体
    user
}

// 表单数据处理
#[derive(FromForm)]
struct LoginForm {
    username: String,
    password: String,
}

#[post("/login", data = "<form>")]
fn login(form: Form<LoginForm>) -> String {
    format!("Login attempt for user: {}", form.username)
}
```

### 自定义验证器

可以创建自定义的验证器：

```rust
use rocket::request::{self, Request, FromRequest};

struct ValidEmail(String);

#[rocket::async_trait]
impl<'r> FromRequest<'r> for ValidEmail {
    type Error = &'static str;

    async fn from_request(request: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        let email = request.headers().get_one("email");
        match email {
            Some(e) if e.contains('@') => Outcome::Success(ValidEmail(e.to_string())),
            Some(_) => Outcome::Error((Status::BadRequest, "Invalid email format")),
            None => Outcome::Error((Status::BadRequest, "Email header missing")),
        }
    }
}
```

## 响应生成系统

### Responder trait

所有Rocket处理器必须返回实现了Responder trait的类型：

```rust
use rocket::response::Responder;
use rocket::http::ContentType;

// 基本响应类型
#[get("/text")]
fn text() -> &'static str {
    "Hello as text"
}

#[get("/json")]
fn json() -> rocket::serde::json::JsonValue {
    rocket::serde::json::json!({
        "message": "Hello as JSON",
        "status": "success"
    })
}

#[get("/html")]
fn html() -> rocket::response::content::RawHtml<&'static str> {
    rocket::response::content::RawHtml("<h1>Hello as HTML</h1>")
}
```

### 自定义响应

可以创建自定义的响应类型：

```rust
use rocket::response::{self, Response, Responder};
use rocket::http::{ContentType, Status};

struct ApiResponse<T> {
    inner: T,
    status: Status,
}

impl<'r, T: Responder<'r, 'static>> Responder<'r, 'static> for ApiResponse<T> {
    fn respond_to(self, req: &'r rocket::Request<'_>) -> response::Result<'static> {
        Response::build_from(self.inner.respond_to(req)?)
            .status(self.status)
            .header(ContentType::JSON)
            .ok()
    }
}

#[get("/api/status")]
fn api_status() -> ApiResponse<JsonValue> {
    ApiResponse {
        inner: json!({"status": "ok"}),
        status: Status::Ok,
    }
}
```

### 文件响应

Rocket提供了便捷的文件响应支持：

```rust
use rocket::response::status;
use rocket::fs::NamedFile;
use std::path::Path;

#[get("/files/<file..>")]
async fn files(file: PathBuf) -> Option<NamedFile> {
    NamedFile::open(Path::new("static/").join(file)).await.ok()
}

#[get("/download/<file>")]
async fn download(file: String) -> Result<NamedFile, status::NotFound<String>> {
    let path = Path::new("uploads/").join(&file);
    NamedFile::open(&path).await
        .map_err(|_| status::NotFound(format!("File '{}' not found", file)))
}
```

## 状态管理

### 托管状态 (Managed State)

托管状态在Rocket实例的整个生命周期内保持：

```rust
use rocket::State;
use std::sync::Mutex;

struct Database {
    // 数据库连接池
}

struct AppConfig {
    api_key: String,
    debug: bool,
}

#[get("/config")]
fn get_config(config: &State<AppConfig>) -> String {
    format!("Debug mode: {}", config.debug)
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .manage(Database::new())
        .manage(AppConfig {
            api_key: std::env::var("API_KEY").unwrap_or_default(),
            debug: cfg!(debug_assertions),
        })
        .mount("/", routes![get_config])
}
```

### 请求局部状态

请求局部状态仅在单个请求的生命周期内存在：

```rust
use rocket::request::{self, Request, FromRequest};
use rocket::outcome::Outcome;

struct RequestId(String);

#[rocket::async_trait]
impl<'r> FromRequest<'r> for RequestId {
    type Error = ();

    async fn from_request(request: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        Outcome::Success(RequestId(id))
    }
}

#[get("/request-id")]
fn request_id(id: RequestId) -> String {
    format!("Request ID: {}", id.0)
}
```

### 原子操作

Rocket提供了原子操作支持：

```rust
use std::sync::atomic::{AtomicU64, Ordering};
use rocket::State;

struct HitCounter(AtomicU64);

#[get("/count")]
fn hit_count(counter: &State<HitCounter>) -> String {
    let count = counter.0.fetch_add(1, Ordering::Relaxed);
    format!("This page has been visited {} times", count + 1)
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .manage(HitCounter(AtomicU64::new(0)))
        .mount("/", routes![hit_count])
}
```

## 错误处理

### 错误捕获器

Rocket允许定义自定义的错误处理：

```rust
use rocket::catch;
use rocket::response::status;

#[catch(404)]
fn not_found() -> &'static str {
    "Sorry, we couldn't find that page."
}

#[catch(500)]
fn internal_error() -> &'static str {
    "Whoops! Looks like we messed up."
}

#[catch(default)]
fn default_catcher(status: Status, req: &Request) -> String {
    format!("{} ({}): {}", status.code, status.reason(), req.uri())
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .register("/", catchers![not_found, internal_error, default_catcher])
}
```

### 自定义错误类型

可以创建自定义的错误类型：

```rust
use rocket::response::status;
use rocket::serde::json::Json;
use serde_json::Value;

#[derive(Debug)]
enum ApiError {
    Validation(String),
    NotFound(String),
    Internal(String),
}

impl<'r> Responder<'r, 'static> for ApiError {
    fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
        let (status, message) = match self {
            ApiError::Validation(msg) => (Status::BadRequest, msg),
            ApiError::NotFound(msg) => (Status::NotFound, msg),
            ApiError::Internal(msg) => (Status::InternalServerError, msg),
        };

        Response::build()
            .status(status)
            .header(ContentType::JSON)
            .sized_body(message.len(), Cursor::new(json!({"error": message}).to_string()))
            .ok()
    }
}

#[get("/users/<id>")]
fn get_user(id: u32) -> Result<Json<User>, ApiError> {
    if id == 0 {
        return Err(ApiError::Validation("Invalid user ID".to_string()));
    }
    
    // 模拟数据库查询
    Err(ApiError::NotFound(format!("User {} not found", id)))
}
```

### 错误链处理

Rocket支持错误链处理：

```rust
use thiserror::Error;

#[derive(Error, Debug)]
enum ServiceError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("User not found: {0}")]
    NotFound(String),
}

impl<'r> Responder<'r, 'static> for ServiceError {
    fn respond_to(self, req: &'r Request<'_>) -> response::Result<'static> {
        match self {
            ServiceError::Database(_) => {
                error!("Database error: {}", self);
                status::Custom(Status::InternalServerError, "Internal server error").respond_to(req)
            }
            ServiceError::Validation(msg) => {
                status::Custom(Status::BadRequest, msg).respond_to(req)
            }
            ServiceError::NotFound(msg) => {
                status::Custom(Status::NotFound, msg).respond_to(req)
            }
        }
    }
}
```