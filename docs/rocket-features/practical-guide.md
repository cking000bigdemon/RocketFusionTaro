# Rocket实战指南

## 快速入门

### 环境准备

#### Rust安装
```bash
# 安装Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 更新Rust
rustup update
```

#### 项目创建
```bash
# 创建新项目
cargo new rocket-app --bin
cd rocket-app

# 添加Rocket依赖
echo 'rocket = "0.5.0"' >> Cargo.toml
echo 'rocket_db_pools = { version = "0.1.0", features = ["diesel_mysql"] }' >> Cargo.toml
echo 'serde = { version = "1.0", features = ["derive"] }' >> Cargo.toml
```

### 最小可运行示例

#### 基本Hello World

```rust
// src/main.rs
#[macro_use] extern crate rocket;

#[get("/")]
fn index() -> &'static str {
    "Hello, Rocket! 🚀"
}

#[launch]
fn rocket() -> _ {
    rocket::build().mount("/", routes![index])
}
```

#### 运行应用

```bash
cargo run
# 访问 http://localhost:8000
```

### 配置文件

#### Rocket.toml

```toml
[default]
address = "localhost"
port = 8000
workers = 4
log_level = "normal"

[development]
address = "localhost"
port = 8000
log_level = "debug"

[staging]
address = "0.0.0.0"
port = 8000
log_level = "normal"

[production]
address = "0.0.0.0"
port = 80
workers = 16
log_level = "critical"
```

#### 环境变量配置

```bash
# .env文件
ROCKET_ADDRESS=localhost
ROCKET_PORT=8000
ROCKET_LOG_LEVEL=debug
DATABASE_URL=mysql://user:password@localhost/myapp
```

## 项目结构设计

### 推荐目录结构

```
rocket-app/
├── src/
│   ├── main.rs              # 应用入口
│   ├── models/
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   └── post.rs
│   ├── routes/
│   │   ├── mod.rs
│   │   ├── user_routes.rs
│   │   └── post_routes.rs
│   ├── services/
│   │   ├── mod.rs
│   │   ├── user_service.rs
│   │   └── auth_service.rs
│   ├── middleware/
│   │   ├── mod.rs
│   │   └── auth.rs
│   ├── config/
│   │   ├── mod.rs
│   │   └── app_config.rs
│   └── utils/
│       ├── mod.rs
│       └── validation.rs
├── tests/
│   ├── integration_tests.rs
│   └── api_tests.rs
├── migrations/
├── static/
│   ├── css/
│   ├── js/
│   └── images/
├── templates/
│   ├── base.html.tera
│   ├── index.html.tera
│   └── user/
│       ├── profile.html.tera
│       └── settings.html.tera
├── Cargo.toml
├── Rocket.toml
└── .env
```

### 模块化设计

#### 主应用结构

```rust
// src/main.rs
mod models;
mod routes;
mod services;
mod middleware;
mod config;

use rocket_db_pools::Database;
use rocket_dyn_templates::Template;

#[derive(Database)]
#[database("app_db")]
struct AppDb(rocket_db_pools::diesel::MysqlPool);

#[launch]
fn rocket() -> _ {
    rocket::build()
        .attach(AppDb::fairing())
        .attach(Template::fairing())
        .attach(middleware::cors::CorsFairing)
        .mount("/", routes![routes::index])
        .mount("/api/v1/users", routes::user_routes::get_routes())
        .mount("/api/v1/posts", routes::post_routes::get_routes())
        .register("/", catchers![
            routes::not_found,
            routes::internal_error
        ])
}
```

#### 路由模块化

```rust
// src/routes/mod.rs
pub mod user_routes;
pub mod post_routes;
pub mod auth_routes;

use rocket::{get, catch, catchers, Catcher};

#[get("/")]
pub async fn index() -> Template {
    Template::render("index", context! {
        title: "Welcome to Rocket App"
    })
}

#[catch(404)]
pub fn not_found() -> Template {
    Template::render("error/404", context! {
        title: "Page Not Found"
    })
}

#[catch(500)]
pub fn internal_error() -> Template {
    Template::render("error/500", context! {
        title: "Internal Server Error"
    })
}
```

#### 模型设计

```rust
// src/models/user.rs
use serde::{Deserialize, Serialize};
use diesel::prelude::*;

#[derive(Queryable, Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Insertable, Deserialize)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub username: String,
    pub email: String,
    pub password_hash: String,
}

#[derive(Deserialize)]
pub struct UserLogin {
    pub username: String,
    pub password: String,
}
```

## 配置管理

### 环境配置

#### 配置结构体

```rust
// src/config/app_config.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub auth: AuthConfig,
    pub email: EmailConfig,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub workers: Option<usize>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub min_connections: u32,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub jwt_expiration: i64,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, config::ConfigError> {
        let mut cfg = config::Config::new();
        cfg.merge(config::File::with_name("Rocket"))?;
        cfg.merge(config::Environment::with_prefix("APP"))?;
        cfg.try_into()
    }
}
```

#### 配置加载

```rust
// src/main.rs
use crate::config::AppConfig;

#[launch]
fn rocket() -> _ {
    let config = AppConfig::from_env().expect("Failed to load configuration");
    
    rocket::build()
        .manage(config)
        .attach(AppDb::fairing())
        .attach(Template::fairing())
        .mount("/", routes![index])
}
```

### 密钥管理

#### 使用.env文件

```bash
# .env
DATABASE_URL=mysql://user:password@localhost/myapp
JWT_SECRET=your-secret-key-here
EMAIL_PASSWORD=your-email-password
```

#### 运行时加载

```rust
use std::env;

pub fn load_secrets() -> Secrets {
    Secrets {
        jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
        email_password: env::var("EMAIL_PASSWORD").expect("EMAIL_PASSWORD must be set"),
    }
}
```

## 测试策略

### 单元测试

#### 路由测试

```rust
// tests/api_tests.rs
use rocket::local::blocking::Client;
use rocket::http::{Status, ContentType};

#[test]
fn test_index_route() {
    let client = Client::tracked(super::rocket()).expect("valid rocket instance");
    let response = client.get("/").dispatch();
    assert_eq!(response.status(), Status::Ok);
    assert!(response.into_string().unwrap().contains("Hello"));
}

#[test]
fn test_user_creation() {
    let client = Client::tracked(super::rocket()).expect("valid rocket instance");
    let response = client
        .post("/api/v1/users")
        .header(ContentType::JSON)
        .body(r#"{"username":"test","email":"test@example.com"}"#)
        .dispatch();
    
    assert_eq!(response.status(), Status::Created);
}
```

### 集成测试

#### 数据库测试

```rust
// tests/integration_tests.rs
use rocket::local::asynchronous::Client;
use rocket_db_pools::Database;

#[rocket::async_test]
async fn test_database_operations() {
    let client = Client::tracked(super::rocket()).await.expect("valid rocket instance");
    let db = client.rocket().state::<AppDb>().unwrap();
    
    // 测试数据库连接
    let result = db.run(|conn| {
        diesel::sql_query("SELECT 1").execute(conn)
    }).await;
    
    assert!(result.is_ok());
}
```

#### 端到端测试

```rust
// tests/e2e_tests.rs
use reqwest;

#[tokio::test]
async fn test_full_user_flow() {
    let client = reqwest::Client::new();
    
    // 创建用户
    let response = client
        .post("http://localhost:8000/api/v1/users")
        .json(&json!({
            "username": "testuser",
            "email": "test@example.com"
        }))
        .send()
        .await
        .unwrap();
    
    assert_eq!(response.status(), 201);
    
    // 获取用户
    let response = client
        .get("http://localhost:8000/api/v1/users/1")
        .send()
        .await
        .unwrap();
    
    assert_eq!(response.status(), 200);
}
```

### 测试配置

#### 测试数据库

```rust
// tests/common/mod.rs
use rocket_db_pools::Database;

pub async fn setup_test_db() -> AppDb {
    let db_url = "mysql://test:test@localhost/test_db";
    std::env::set_var("DATABASE_URL", db_url);
    
    // 运行迁移
    let db = AppDb::init().await;
    db.run(|conn| {
        diesel_migrations::run_pending_migrations(conn)
    }).await.unwrap();
    
    db
}
```

#### 测试工具函数

```rust
// tests/helpers.rs
use rocket::local::asynchronous::Client;

pub async fn create_test_client() -> Client {
    let rocket = rocket::build()
        .attach(AppDb::fairing())
        .mount("/", test_routes());
    
    Client::tracked(rocket).await.unwrap()
}

pub fn test_routes() -> Vec<rocket::Route> {
    routes![
        test_index,
        test_create_user
    ]
}
```

### 性能测试

#### 基准测试

```rust
// benches/api_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use rocket::local::blocking::Client;

fn bench_user_endpoint(c: &mut Criterion) {
    let client = Client::tracked(super::rocket()).unwrap();
    
    c.bench_function("user_endpoint", |b| {
        b.iter(|| {
            let response = client.get("/api/v1/users/1").dispatch();
            black_box(response);
        })
    });
}

criterion_group!(benches, bench_user_endpoint);
criterion_main!(benches);
```

#### 负载测试

```bash
# 使用wrk进行负载测试
wrk -t12 -c400 -d30s http://localhost:8000/api/v1/users

# 使用ab进行压力测试
ab -n 10000 -c 100 http://localhost:8000/api/v1/users
```