# Rocket扩展功能详解

## 数据库集成

### rocket_db_pools集成

Rocket通过`rocket_db_pools`提供了统一的数据库连接池管理：

#### SQL数据库支持

```rust
use rocket_db_pools::{Database, Connection};
use rocket_db_pools::diesel::MysqlPool;

#[derive(Database)]
#[database("my_db")]
struct MyDb(MysqlPool);

#[get("/users/<id>")]
async fn get_user(mut db: Connection<MyDb>, id: i32) -> Option<String> {
    use schema::users::dsl::*;
    
    users
        .find(id)
        .select(schema::users::name)
        .first::<String>(&mut db)
        .await
        .ok()
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .attach(MyDb::fairing())
        .mount("/", routes![get_user])
}
```

#### 连接池配置

在`Rocket.toml`中配置数据库连接：

```toml
[default.databases.my_db]
url = "mysql://user:password@localhost/myapp"
min_connections = 2
max_connections = 10
connect_timeout = 5
idle_timeout = 120
```

#### 事务处理

```rust
use rocket_db_pools::Connection;

#[post("/transfer", data = "<transfer>")]
async fn transfer_money(
    mut db: Connection<MyDb>,
    transfer: Json<TransferRequest>
) -> Result<String, String> {
    db.transaction(|conn| async move {
        // 扣减源账户
        diesel::update(accounts::table.find(&transfer.from))
            .set(accounts::balance.eq(accounts::balance - transfer.amount))
            .execute(&conn)
            .await?;
            
        // 增加目标账户
        diesel::update(accounts::table.find(&transfer.to))
            .set(accounts::balance.eq(accounts::balance + transfer.amount))
            .execute(&conn)
            .await?;
            
        Ok("Transfer successful".to_string())
    }).await
}
```

### NoSQL数据库集成

#### Redis集成

```rust
use rocket::State;
use redis::Client;

#[get("/cache/<key>")]
async fn get_from_cache(key: String, client: &State<Client>) -> Result<String, Status> {
    let mut conn = client.get_async_connection().await
        .map_err(|_| Status::InternalServerError)?;
    
    let value: Option<String> = conn.get(&key).await
        .map_err(|_| Status::InternalServerError)?;
    
    value.ok_or(Status::NotFound)
}

#[launch]
fn rocket() -> _ {
    let client = Client::open("redis://127.0.0.1/").expect("Redis connection failed");
    
    rocket::build()
        .manage(client)
        .mount("/", routes![get_from_cache])
}
```

## 模板引擎

### rocket_dyn_templates集成

Rocket通过`rocket_dyn_templates`支持多种模板引擎：

#### Tera模板引擎

```rust
use rocket_dyn_templates::{Template, context};

#[get("/")]
fn index() -> Template {
    Template::render("index", context! {
        title: "Welcome to Rocket",
        items: vec!["Item 1", "Item 2", "Item 3"],
    })
}

#[get("/user/<name>")]
fn user(name: String) -> Template {
    Template::render("user", context! {
        name: name,
        age: 25,
    })
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .attach(Template::fairing())
        .mount("/", routes![index, user])
}
```

#### 模板文件结构

```
templates/
├── base.html.tera
├── index.html.tera
└── user.html.tera
```

#### 模板继承

```html
<!-- base.html.tera -->
<!DOCTYPE html>
<html>
<head>
    <title>{% block title %}Default Title{% endblock %}</title>
</head>
<body>
    <header>
        <h1>Rocket App</h1>
    </header>
    <main>
        {% block content %}{% endblock %}
    </main>
</body>
</html>

<!-- index.html.tera -->
{% extends "base" %}
{% block title %}{{ title }}{% endblock %}
{% block content %}
    <ul>
    {% for item in items %}
        <li>{{ item }}</li>
    {% endfor %}
    </ul>
{% endblock %}
```

#### Handlebars模板引擎

```rust
use rocket_dyn_templates::{Template, context};

#[get("/dashboard")]
fn dashboard() -> Template {
    Template::render("dashboard", context! {
        username: "Alice",
        posts: vec![
            context! { title: "First Post", date: "2024-01-01" },
            context! { title: "Second Post", date: "2024-01-02" },
        ],
    })
}
```

### 动态模板渲染

```rust
use rocket_dyn_templates::{Template, context};

#[get("/products?<page>&<limit>")]
fn products(page: Option<usize>, limit: Option<usize>) -> Template {
    let page = page.unwrap_or(1);
    let limit = limit.unwrap_or(10);
    
    // 模拟数据库查询
    let products = fetch_products(page, limit);
    
    Template::render("products", context! {
        products: products,
        current_page: page,
        total_pages: 5,
    })
}
```

## WebSocket支持

### rocket_ws集成

通过`rocket_ws`库实现WebSocket支持：

#### 基础WebSocket

```rust
use rocket_ws::{WebSocket, Channel, Message, stream};

#[get("/ws")]
fn websocket(ws: WebSocket) -> Channel<'static> {
    ws.channel(|mut stream| Box::pin(async move {
        while let Some(message) = stream.next().await {
            match message {
                Ok(Message::Text(text)) => {
                    let response = format!("Echo: {}", text);
                    let _ = stream.send(Message::Text(response)).await;
                },
                Ok(Message::Binary(bin)) => {
                    let _ = stream.send(Message::Binary(bin)).await;
                },
                _ => break,
            }
        }
        Ok(())
    }))
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .mount("/", routes![websocket])
}
```

#### 聊天室示例

```rust
use rocket::State;
use rocket_ws::{WebSocket, Channel, Message};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

type Users = Arc<Mutex<HashMap<String, rocket_ws::stream::DuplexStream>>>;

#[get("/chat/<username>")]
fn chat(ws: WebSocket, username: String, users: &State<Users>) -> Channel<'static> {
    let users = users.inner().clone();
    let username = username.clone();
    
    ws.channel(move |stream| Box::pin(async move {
        // 添加用户到聊天室
        {
            let mut users = users.lock().unwrap();
            users.insert(username.clone(), stream.clone());
        }
        
        // 广播用户加入消息
        {
            let users = users.lock().unwrap();
            let join_msg = format!("{} joined the chat", username);
            for (_, user_stream) in users.iter() {
                let _ = user_stream.send(Message::Text(join_msg.clone())).await;
            }
        }
        
        // 处理消息
        while let Some(message) = stream.next().await {
            match message {
                Ok(Message::Text(text)) => {
                    let msg = format!("{}: {}", username, text);
                    let users = users.lock().unwrap();
                    for (_, user_stream) in users.iter() {
                        let _ = user_stream.send(Message::Text(msg.clone())).await;
                    }
                },
                _ => break,
            }
        }
        
        // 清理用户
        {
            let mut users = users.lock().unwrap();
            users.remove(&username);
        }
        
        Ok(())
    }))
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .manage(Users::default())
        .mount("/", routes![chat])
}
```

#### WebSocket配置

```rust
use rocket_ws::{Config, WebSocket};

#[get("/ws/config")]
fn websocket_with_config(ws: WebSocket) -> Channel<'static> {
    let config = Config {
        max_message_size: Some(1024 * 1024), // 1MB
        max_frame_size: Some(1024 * 1024),
        ..Default::default()
    };
    
    ws.config(config).channel(|mut stream| Box::pin(async move {
        // WebSocket处理逻辑
        Ok(())
    }))
}
```

## TLS/SSL配置

### 原生TLS支持

Rocket支持通过`rocket`的TLS功能启用HTTPS：

#### 证书配置

```rust
use rocket::config::{Config, TlsConfig};

#[launch]
fn rocket() -> _ {
    let config = Config {
        port: 443,
        tls: Some(TlsConfig::from_paths(
            "certs/cert.pem",
            "certs/key.pem"
        )),
        ..Default::default()
    };
    
    rocket::custom(config)
        .mount("/", routes![index])
}
```

#### 环境配置

在`Rocket.toml`中配置TLS：

```toml
[default.tls]
certs = "certs/cert.pem"
key = "certs/key.pem"

[default]
port = 443
address = "0.0.0.0"
```

### Let's Encrypt集成

```rust
use rocket::config::{Config, TlsConfig};
use std::env;

#[launch]
fn rocket() -> _ {
    let cert_path = env::var("TLS_CERT_PATH").unwrap_or("/etc/ssl/certs/cert.pem".to_string());
    let key_path = env::var("TLS_KEY_PATH").unwrap_or("/etc/ssl/private/key.pem".to_string());
    
    let config = Config {
        port: 443,
        tls: Some(TlsConfig::from_paths(cert_path, key_path)),
        ..Default::default()
    };
    
    rocket::custom(config)
        .mount("/", routes![index])
}
```

### 反向代理配置

#### Nginx配置示例

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 安全头配置

```rust
use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::Header;
use rocket::{Request, Response};

pub struct SecurityHeaders;

#[rocket::async_trait]
impl Fairing for SecurityHeaders {
    fn info(&self) -> Info {
        Info {
            name: "Security Headers",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, _req: &'r Request<'_>, res: &mut Response<'r>) {
        res.set_header(Header::new("X-Content-Type-Options", "nosniff"));
        res.set_header(Header::new("X-Frame-Options", "DENY"));
        res.set_header(Header::new("X-XSS-Protection", "1; mode=block"));
        res.set_header(Header::new("Strict-Transport-Security", "max-age=31536000"));
    }
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .attach(SecurityHeaders)
        .mount("/", routes![index])
}
```