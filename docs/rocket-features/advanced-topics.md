# Rocket高级主题

## 性能优化

### 基准测试与分析

#### 使用Criterion进行基准测试

```rust
// benches/rocket_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use rocket::local::blocking::Client;

fn bench_routing_performance(c: &mut Criterion) {
    let rocket = rocket::build()
        .mount("/", routes![
            bench_route,
            bench_route_with_param,
            bench_route_with_db
        ]);
    
    let client = Client::tracked(rocket).unwrap();
    
    c.bench_function("simple_route", |b| {
        b.iter(|| {
            let response = client.get("/bench").dispatch();
            black_box(response);
        })
    });
    
    c.bench_function("route_with_param", |b| {
        b.iter(|| {
            let response = client.get("/bench/123").dispatch();
            black_box(response);
        })
    });
}

#[get("/bench")]
fn bench_route() -> &'static str {
    "Hello, benchmark!"
}

#[get("/bench/<id>")]
fn bench_route_with_param(id: u32) -> String {
    format!("ID: {}", id)
}

criterion_group!(benches, bench_routing_performance);
criterion_main!(benches);
```

#### 性能分析工具

```bash
# 使用perf进行性能分析
perf record -g cargo bench
perf report

# 使用valgrind检查内存使用
valgrind --tool=memcheck cargo run

# 使用flamegraph生成火焰图
cargo install flamegraph
cargo flamegraph --bench rocket_benchmark
```

### 内存优化策略

#### 连接池优化

```rust
use rocket_db_pools::{Database, Config};

#[derive(Database)]
#[database("optimized_db")]
struct OptimizedDb(rocket_db_pools::diesel::MysqlPool);

// 优化连接池配置
impl OptimizedDb {
    fn optimized_config() -> Config {
        Config {
            url: std::env::var("DATABASE_URL").unwrap(),
            min_connections: 2,  // 最小连接数
            max_connections: 50,   // 最大连接数
            connect_timeout: 3,    // 连接超时(秒)
            idle_timeout: 600,     // 空闲超时(秒)
            max_lifetime: 3600,    // 最大生命周期(秒)
        }
    }
}
```

#### 缓存策略

```rust
use std::sync::RwLock;
use std::collections::HashMap;
use std::time::{Duration, Instant};

#[derive(Clone)]
struct CacheEntry<T> {
    value: T,
    expires_at: Instant,
}

struct AppCache<T> {
    data: RwLock<HashMap<String, CacheEntry<T>>>,
    ttl: Duration,
}

impl<T: Clone> AppCache<T> {
    fn new(ttl_seconds: u64) -> Self {
        Self {
            data: RwLock::new(HashMap::new()),
            ttl: Duration::from_secs(ttl_seconds),
        }
    }
    
    fn get(&self, key: &str) -> Option<T> {
        let data = self.data.read().unwrap();
        data.get(key)
            .filter(|entry| entry.expires_at > Instant::now())
            .map(|entry| entry.value.clone())
    }
    
    fn set(&self, key: String, value: T) {
        let mut data = self.data.write().unwrap();
        data.insert(key, CacheEntry {
            value,
            expires_at: Instant::now() + self.ttl,
        });
    }
}

// 使用缓存的路由
#[get("/cached-data/<key>")]
fn get_cached_data(key: String, cache: &State<AppCache<String>>) -> Option<String> {
    cache.get(&key)
}
```

#### 异步优化

```rust
use tokio::task;
use futures::future::join_all;

#[get("/batch-process")]
async fn batch_process() -> Json<Vec<ProcessResult>> {
    let tasks: Vec<_> = (0..100)
        .map(|i| {
            task::spawn(async move {
                // 模拟耗时操作
                tokio::time::sleep(Duration::from_millis(10)).await;
                ProcessResult { id: i, status: "completed".to_string() }
            })
        })
        .collect();
    
    let results = join_all(tasks).await;
    Json(results.into_iter().flatten().collect())
}
```

### 数据库性能优化

#### 查询优化

```rust
use diesel::prelude::*;
use rocket_db_pools::Connection;

#[get("/users/optimized")]
async fn get_users_optimized(db: Connection<AppDb>) -> Json<Vec<User>> {
    db.run(|conn| {
        users::table
            .select((users::id, users::username, users::email))
            .filter(users::active.eq(true))
            .order(users::created_at.desc())
            .limit(100)
            .load::<User>(conn)
    }).await
    .map(Json)
    .unwrap_or_else(|_| Json(vec![]))
}

// 使用索引的查询
#[get("/users/search/<query>")]
async fn search_users(db: Connection<AppDb>, query: String) -> Json<Vec<User>> {
    db.run(move |conn| {
        users::table
            .filter(users::username.ilike(format!("%{}%", query)))
            .or_filter(users::email.ilike(format!("%{}%", query)))
            .limit(50)
            .load::<User>(conn)
    }).await
    .map(Json)
    .unwrap_or_else(|_| Json(vec![]))
}
```

## 安全最佳实践

### 认证与授权

#### JWT认证实现

```rust
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use chrono::{Utc, Duration};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
    iat: usize,
}

struct AuthService;

impl AuthService {
    fn generate_token(user_id: &str) -> String {
        let expiration = Utc::now()
            .checked_add_signed(Duration::hours(24))
            .expect("valid timestamp")
            .timestamp() as usize;
        
        let claims = Claims {
            sub: user_id.to_string(),
            exp: expiration,
            iat: Utc::now().timestamp() as usize,
        };
        
        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(std::env::var("JWT_SECRET").unwrap().as_ref())
        ).unwrap()
    }
    
    fn verify_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        decode::<Claims>(
            token,
            &DecodingKey::from_secret(std::env::var("JWT_SECRET").unwrap().as_ref()),
            &Validation::default()
        ).map(|data| data.claims)
    }
}

// JWT守卫
use rocket::request::{Request, FromRequest, Outcome};
use rocket::http::Status;

#[rocket::async_trait]
impl<'r> FromRequest<'r> for Claims {
    type Error = &'static str;
    
    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let auth_header = request.headers().get_one("Authorization");
        
        match auth_header {
            Some(header) if header.starts_with("Bearer ") => {
                let token = header.trim_start_matches("Bearer ");
                match AuthService::verify_token(token) {
                    Ok(claims) => Outcome::Success(claims),
                    Err(_) => Outcome::Error((Status::Unauthorized, "Invalid token")),
                }
            }
            _ => Outcome::Error((Status::Unauthorized, "Missing token")),
        }
    }
}

// 受保护的路由
#[get("/protected")]
fn protected_route(claims: Claims) -> String {
    format!("Hello, user {}!", claims.sub)
}
```

#### 权限控制

```rust
#[derive(Debug, Clone, PartialEq)]
enum UserRole {
    Admin,
    User,
    Guest,
}

#[derive(Debug, Serialize, Deserialize)]
struct UserClaims {
    sub: String,
    role: UserRole,
    exp: usize,
    iat: usize,
}

struct RoleGuard {
    required_role: UserRole,
}

impl RoleGuard {
    fn new(role: UserRole) -> Self {
        Self { required_role: role }
    }
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for RoleGuard {
    type Error = &'static str;
    
    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let claims = request.guard::<UserClaims>().await;
        
        match claims {
            Outcome::Success(claims) => {
                if claims.role == self.required_role {
                    Outcome::Success(RoleGuard::new(claims.role))
                } else {
                    Outcome::Error((Status::Forbidden, "Insufficient permissions"))
                }
            }
            Outcome::Error(e) => Outcome::Error(e),
            Outcome::Forward(_) => Outcome::Forward(()),
        }
    }
}

// 管理员路由
#[get("/admin/dashboard")]
fn admin_dashboard(_guard: RoleGuard) -> String {
    "Welcome to admin dashboard".to_string()
}
```

### 输入验证与清理

#### 自定义验证器

```rust
use validator::{Validate, ValidationError};

#[derive(Debug, Deserialize, Validate)]
struct UserRegistration {
    #[validate(length(min = 3, max = 20))]
    username: String,
    
    #[validate(email)]
    email: String,
    
    #[validate(length(min = 8, max = 128))]
    #[validate(custom = "validate_password")]
    password: String,
}

fn validate_password(password: &str) -> Result<(), ValidationError> {
    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_digit = password.chars().any(|c| c.is_digit(10));
    let has_special = password.chars().any(|c| !c.is_alphanumeric());
    
    if has_uppercase && has_lowercase && has_digit && has_special {
        Ok(())
    } else {
        Err(ValidationError::new("Password must contain uppercase, lowercase, digit, and special character"))
    }
}

// 使用验证的路由
#[post("/register", data = "<user>")]
fn register_user(user: Json<UserRegistration>) -> Result<String, Json<Vec<String>>> {
    match user.validate() {
        Ok(_) => Ok("User registered successfully".to_string()),
        Err(errors) => Err(Json(errors.field_errors()
            .iter()
            .flat_map(|(_, errs)| errs.iter().map(|e| e.to_string()))
            .collect())),
    }
}
```

#### SQL注入防护

```rust
use diesel::sql_types::Text;
use diesel::sql_query;

// 安全的查询方式
#[get("/users/search?<query>")]
async fn search_users_safe(db: Connection<AppDb>, query: String) -> Json<Vec<User>> {
    db.run(move |conn| {
        // 使用参数化查询
        users::table
            .filter(users::username.ilike(format!("%{}%", query)))
            .load::<User>(conn)
    }).await
    .map(Json)
    .unwrap_or_else(|_| Json(vec![]))
}

// 避免直接SQL拼接
#[get("/users/search/unsafe?<query>")]
async fn search_users_unsafe(db: Connection<AppDb>, query: String) -> Json<Vec<User>> {
    db.run(move |conn| {
        // 危险：直接拼接SQL
        let sql = format!("SELECT * FROM users WHERE username LIKE '%{}%'", query);
        sql_query(sql).load::<User>(conn)
    }).await
    .map(Json)
    .unwrap_or_else(|_| Json(vec![]))
}
```

### CSRF保护

```rust
use rocket_csrf::{CsrfFairing, CsrfToken};

#[launch]
fn rocket() -> _ {
    rocket::build()
        .attach(CsrfFairing::default())
        .mount("/", routes![form_page, submit_form])
}

#[get("/form")]
fn form_page(token: CsrfToken) -> Template {
    Template::render("form", context! {
        csrf_token: token.value(),
    })
}

#[post("/submit", data = "<form>")]
fn submit_form(token: CsrfToken, form: Form<FormData>) -> Result<String, Status> {
    // CSRF token自动验证
    Ok("Form submitted successfully".to_string())
}
```

## 部署指南

### 容器化部署

#### Dockerfile

```dockerfile
# 多阶段构建
FROM rust:1.70 as builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

# 构建应用
RUN cargo build --release

# 运行时镜像
FROM debian:bullseye-slim

# 安装运行时依赖
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl1.1 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# 复制二进制文件
COPY --from=builder /app/target/release/rocket-app /usr/local/bin/

# 创建非root用户
RUN useradd -r -s /bin/false rocket
USER rocket

# 暴露端口
EXPOSE 8000

# 启动应用
CMD ["/usr/local/bin/rocket-app"]
```

#### Docker Compose配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ROCKET_ENV=production
      - DATABASE_URL=mysql://user:password@db:3306/myapp
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=myapp
      - MYSQL_USER=user
      - MYSQL_PASSWORD=password
    volumes:
      - db_data:/var/lib/mysql
    ports:
      - "3306:3306"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  db_data:
  redis_data:
```

### 云部署

#### AWS ECS部署

```json
{
  "family": "rocket-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "rocket-app",
      "image": "your-registry/rocket-app:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ROCKET_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "mysql://user:password@rds-endpoint:3306/myapp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rocket-app",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Kubernetes部署

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rocket-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rocket-app
  template:
    metadata:
      labels:
        app: rocket-app
    spec:
      containers:
      - name: rocket-app
        image: your-registry/rocket-app:latest
        ports:
        - containerPort: 8000
        env:
        - name: ROCKET_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: rocket-app-service
spec:
  selector:
    app: rocket-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

### 零停机部署

#### 蓝绿部署

```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

ENV=$1
VERSION=$2

# 构建新版本
docker build -t rocket-app:$VERSION .
docker tag rocket-app:$VERSION rocket-app:latest

# 健康检查
health_check() {
    local url=$1
    for i in {1..30}; do
        if curl -f $url/health > /dev/null 2>&1; then
            return 0
        fi
        sleep 2
    done
    return 1
}

# 部署新版本
docker-compose -f docker-compose.$ENV.yml up -d --scale app=2

# 等待健康检查
if health_check "http://localhost:8000"; then
    echo "Deployment successful"
    docker-compose -f docker-compose.$ENV.yml up -d --scale app=3
else
    echo "Deployment failed, rolling back"
    docker-compose -f docker-compose.$ENV.yml up -d --scale app=1
    exit 1
fi
```

## 监控运维

### 应用监控

#### 健康检查端点

```rust
use rocket::serde::json::Json;
use serde_json::json;

#[derive(Serialize)]
struct HealthStatus {
    status: String,
    timestamp: chrono::DateTime<chrono::Utc>,
    version: String,
    uptime: u64,
}

#[get("/health")]
fn health_check() -> Json<HealthStatus> {
    Json(HealthStatus {
        status: "healthy".to_string(),
        timestamp: chrono::Utc::now(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime: get_uptime_seconds(),
    })
}

#[get("/ready")]
fn readiness_check(db: Connection<AppDb>) -> Result<String, Status> {
    // 检查数据库连接
    db.run(|conn| {
        diesel::sql_query("SELECT 1").execute(conn)
    }).await
    .map(|_| "ready".to_string())
    .map_err(|_| Status::ServiceUnavailable)
}
```

#### 指标收集

```rust
use prometheus::{Counter, Histogram, Registry};
use lazy_static::lazy_static;

lazy_static! {
    static ref HTTP_REQUESTS_TOTAL: Counter = Counter::new(
        "http_requests_total", 
        "Total number of HTTP requests"
    ).unwrap();
    
    static ref HTTP_REQUEST_DURATION: Histogram = Histogram::with_buckets(
        "http_request_duration_seconds",
        "HTTP request duration in seconds",
        vec![0.1, 0.5, 1.0, 2.5, 5.0, 10.0]
    ).unwrap();
}

pub struct MetricsFairing;

#[rocket::async_trait]
impl Fairing for MetricsFairing {
    fn info(&self) -> Info {
        Info {
            name: "Metrics Collector",
            kind: Kind::Request | Kind::Response,
        }
    }
    
    async fn on_request(&self, request: &mut Request<'_>, _: &mut Data<'_>) {
        HTTP_REQUESTS_TOTAL.inc();
    }
    
    async fn on_response<'r>(&self, _: &'r Request<'_>, response: &mut Response<'r>) {
        // 记录响应时间
    }
}

#[get("/metrics")]
fn metrics() -> String {
    use prometheus::Encoder;
    let encoder = prometheus::TextEncoder::new();
    let metric_families = prometheus::gather();
    encoder.encode_to_string(&metric_families).unwrap()
}
```

### 日志管理

#### 结构化日志

```rust
use tracing::{info, warn, error};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[launch]
fn rocket() -> _ {
    // 初始化日志
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();
    
    rocket::build()
        .attach(TracingFairing)
        .mount("/", routes![index])
}

struct TracingFairing;

#[rocket::async_trait]
impl Fairing for TracingFairing {
    fn info(&self) -> Info {
        Info {
            name: "Request Logger",
            kind: Kind::Request | Kind::Response,
        }
    }
    
    async fn on_request(&self, request: &mut Request<'_>, _: &mut Data<'_>) {
        info!(
            method = %request.method(),
            uri = %request.uri(),
            "Incoming request"
        );
    }
    
    async fn on_response<'r>(&self, _: &'r Request<'_>, response: &mut Response<'r>) {
        info!(status = %response.status(), "Request completed");
    }
}
```

#### 日志轮转

```rust
use tracing_appender::rolling::{RollingFileAppender, Rotation};

#[launch]
fn rocket() -> _ {
    let file_appender = RollingFileAppender::new(
        Rotation::DAILY,
        "logs",
        "rocket-app.log"
    );
    
    tracing_subscriber::fmt()
        .with_writer(file_appender)
        .init();
    
    rocket::build()
        .mount("/", routes![index])
}
```

### 错误追踪

#### Sentry集成

```rust
use sentry::integrations::anyhow::AnyhowHubExt;

#[launch]
fn rocket() -> _ {
    let _guard = sentry::init((
        "your-sentry-dsn",
        sentry::ClientOptions {
            release: Some(env!("CARGO_PKG_VERSION").into()),
            ..Default::default()
        }
    ));
    
    rocket::build()
        .attach(sentry::integrations::rocket::SentryFairing)
        .mount("/", routes![index])
}

#[catch(500)]
fn internal_error() -> String {
    sentry::capture_message("Internal server error", sentry::Level::Error);
    "Internal server error".to_string()
}
```

### 自动化运维

#### 自动伸缩

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rocket-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rocket-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### 备份策略

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/$DATE"

# 数据库备份
mysqldump -h localhost -u user -p$DB_PASSWORD myapp > "$BACKUP_DIR/database.sql"

# 文件备份
tar -czf "$BACKUP_DIR/uploads.tar.gz" /app/uploads/

# 清理旧备份
find /backups -type d -name "20*" -mtime +7 -exec rm -rf {} \;
```