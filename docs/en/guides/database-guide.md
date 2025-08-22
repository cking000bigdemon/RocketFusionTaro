# Database System User Guide

This document introduces the database system architecture, configuration, and usage of the Rocket-Taro project.

## Table of Contents

1. [Database Overview](#database-overview)
2. [Database Configuration](#database-configuration)
3. [Database Table Structure](#database-table-structure)
4. [Connection and Initialization](#connection-and-initialization)
5. [API Operation Examples](#api-operation-examples)
6. [Database Maintenance](#database-maintenance)
7. [Troubleshooting](#troubleshooting)

## Database Overview

This project uses PostgreSQL as the primary database, with asynchronous database operations through the `tokio-postgres` driver. The database system supports automatic initialization, user authentication, session management, and data storage features.

### Technology Stack
- **Database**: PostgreSQL 
- **Connection Pool**: Arc<Mutex<Client>> single connection mode
- **ORM**: Native SQL queries
- **Async Runtime**: Tokio
- **Password Encryption**: bcrypt

## Database Configuration

### Connection Configuration

Database connections are configured through environment variables or default settings:

```rust
// Environment variable approach
export DATABASE_URL="host=192.168.5.222 port=5432 user=user_ck password=ck320621 dbname=postgres"

// Default configuration (src/database/mod.rs:13)
let database_url = std::env::var("DATABASE_URL")
    .unwrap_or_else(|_| "host=192.168.5.222 port=5432 user=user_ck password=ck320621 dbname=postgres".to_string());
```

### Connection Parameters

| Parameter | Description | Example Value |
|-----------|-------------|---------------|
| host | Database server address | 192.168.5.222 |
| port | Database port | 5432 |
| user | Database username | user_ck |
| password | Database password | ck320621 |
| dbname | Database name | postgres |

## Database Table Structure

### 1. Users Table (users)

Stores system user information and authentication data.

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

**Field Descriptions:**
- `id`: User unique identifier (UUID)
- `username`: Username, unique and required
- `email`: Email address, unique and required
- `password_hash`: bcrypt encrypted password hash
- `full_name`: User's full name
- `avatar_url`: Avatar image URL
- `is_active`: Whether user is active
- `is_admin`: Whether user is administrator
- `last_login_at`: Last login timestamp
- `created_at`: Creation timestamp
- `updated_at`: Update timestamp

### 2. User Sessions Table (user_sessions)

Manages user login sessions and authentication tokens.

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

**Field Descriptions:**
- `id`: Session unique identifier
- `user_id`: Associated user ID, foreign key referencing users.id
- `session_token`: Session token for API authentication
- `user_agent`: User agent string
- `ip_address`: Client IP address
- `expires_at`: Session expiration time (default 7 days)
- `is_active`: Whether session is valid
- `created_at`: Creation timestamp

### 3. Login Logs Table (login_logs)

Records all login attempts for security auditing.

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

**Field Descriptions:**
- `id`: Log unique identifier
- `user_id`: Associated user ID (nullable)
- `username`: Username used for login
- `is_success`: Whether login was successful
- `ip_address`: Login IP address
- `user_agent`: User agent string
- `error_message`: Error message on failure
- `created_at`: Login timestamp

### 4. User Data Table (user_data)

Stores application business data.

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

**Field Descriptions:**
- `id`: Data unique identifier
- `name`: Name
- `email`: Email address
- `phone`: Phone number (optional)
- `message`: Message content (optional)
- `created_at`: Creation timestamp

## Connection and Initialization

### Database Connection Creation

Database connections are automatically created during application startup (src/database/mod.rs:10):

```rust
pub async fn create_connection() -> Result<DbPool, Error> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "host=192.168.5.222 port=5432 user=user_ck password=ck320621 dbname=postgres".to_string());
    
    let (client, connection) = tokio_postgres::connect(&database_url, NoTls).await?;
    
    // Run connection in background
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            error!("Database connection error: {}", e);
        }
    });
    
    // Automatically create tables
    init_auth_tables(&client).await?;
    
    Ok(Arc::new(Mutex::new(client)))
}
```

### Default User Creation

The system automatically creates two default test accounts:

```rust
// Administrator account
Username: admin
Password: password
Email: admin@rocket-taro.com
Role: Administrator

// Regular user account  
Username: test
Password: password
Email: test@rocket-taro.com
Role: Regular user
```

## API Operation Examples

### User Authentication Operations

#### 1. User Login Authentication

```rust
// src/database/auth.rs:14
pub async fn authenticate_user(
    pool: &DbPool,
    login_req: &LoginRequest,
) -> Result<Option<User>, Error>
```

**Usage Example:**
```rust
let login_request = LoginRequest {
    username: "admin".to_string(),
    password: "password".to_string(),
};

match authenticate_user(&db_pool, &login_request).await {
    Ok(Some(user)) => println!("Login successful: {}", user.username),
    Ok(None) => println!("Invalid username or password"),
    Err(e) => println!("Database error: {}", e),
}
```

#### 2. Create User Session

```rust  
// src/database/auth.rs:62
pub async fn create_user_session(
    pool: &DbPool,
    user_id: Uuid,
    user_agent: Option<String>,
    ip_address: Option<IpAddr>,
) -> Result<UserSession, Error>
```

**Usage Example:**
```rust
let session = create_user_session(
    &db_pool,
    user.id,
    Some("Mozilla/5.0...".to_string()),
    Some("192.168.1.100".parse().unwrap()),
).await?;

println!("Session token: {}", session.session_token);
```

#### 3. Validate Session Token

```rust
// src/database/auth.rs:95
pub async fn validate_session(
    pool: &DbPool,
    session_token: &str,
) -> Result<Option<(User, UserSession)>, Error>
```

**Usage Example:**
```rust
let token = "your_session_token_here";
match validate_session(&db_pool, token).await {
    Ok(Some((user, session))) => {
        println!("User authenticated: {}", user.username);
        println!("Session expires: {}", session.expires_at);
    },
    Ok(None) => println!("Invalid or expired session"),
    Err(e) => println!("Validation failed: {}", e),
}
```

### User Data Operations

#### 1. Insert User Data

```rust
// src/database/mod.rs:158
pub async fn insert_user_data(
    pool: &DbPool,
    data: &UserData,
) -> Result<(), Error>
```

**Usage Example:**
```rust
let new_data = UserData::new(NewUserData {
    name: "John Doe".to_string(),
    email: "john@example.com".to_string(),
    phone: Some("13800138000".to_string()),
    message: Some("Test message".to_string()),
});

insert_user_data(&db_pool, &new_data).await?;
println!("Data inserted successfully");
```

#### 2. Get All User Data

```rust
// src/database/mod.rs:180
pub async fn get_all_user_data(
    pool: &DbPool,
) -> Result<Vec<UserData>, Error>
```

**Usage Example:**
```rust
let all_data = get_all_user_data(&db_pool).await?;
for data in all_data {
    println!("User: {}, Email: {}", data.name, data.email);
}
```

## Database Maintenance

### Session Cleanup

The system provides automatic cleanup of expired sessions:

```rust
// src/database/auth.rs:203
pub async fn cleanup_expired_sessions(pool: &DbPool) -> Result<u64, Error>
```

**Recommended periodic execution:**
```rust
// Can set up scheduled tasks to clean up hourly
let deleted_count = cleanup_expired_sessions(&db_pool).await?;
println!("Cleaned up {} expired sessions", deleted_count);
```

### Login Log Recording

All login attempts are recorded:

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

## Troubleshooting

### Common Issues

#### 1. Connection Failure
- Check if database service is running
- Verify connection parameters (host, port, user, password)
- Confirm network connectivity

#### 2. Permission Errors
- Ensure database user has sufficient permissions
- Check table creation permissions
- Verify database name is correct

#### 3. Password Verification Failure
- Ensure correct password is used
- Check bcrypt hash is correct
- Verify user status (is_active = true)

#### 4. Session Expiration
- Sessions expire in 7 days by default
- Check system time is correct
- Can manually clean expired sessions

### Debugging Recommendations

1. **Enable Detailed Logging**: Set `RUST_LOG=debug` to view detailed database operation logs
2. **Check Connection Status**: Monitor database connection health
3. **Verify SQL Syntax**: Ensure all SQL statements have correct syntax
4. **Monitor Performance**: Watch database query performance and connection count

### Contact Support

When encountering database-related issues, please provide:
- Complete error message text
- Related application logs
- Database version and configuration information
- Steps to reproduce the issue