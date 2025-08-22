# Development Guide

## Development Environment Setup

### Required Tool Installation

#### 1. Rust Environment
```bash
# Install Rust (using official installation script)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows users use MSVC toolchain
rustup default stable-x86_64-pc-windows-msvc
```

#### 2. Node.js Environment
- Download link: https://nodejs.org/
- Recommended version: 16.x LTS or higher
- Verify installation:
```bash
node --version
npm --version
```

#### 3. Taro CLI (Optional)
```bash
# Install Taro CLI globally
npm install -g @tarojs/cli
```

### Project Initialization

#### 1. Clone Project
```bash
git clone [project_url]
cd Rocket
```

#### 2. Install Dependencies
```bash
# Backend dependencies (handled automatically)
cd rocket-taro-server

# Frontend dependencies
cd ../frontend
npm install
```

## Development Workflow

### Backend Development

#### 1. Start Development Server
```bash
cd rocket-taro-server
cargo run
```

The server will start on `http://localhost:8000` by default.

#### 2. Code Quality Checks
```bash
# Code format check
cargo fmt --check

# Code quality check
cargo clippy

# Unit tests
cargo test
```

#### 3. Database Operations
```bash
# Check database connection
cargo run -- --check-db

# Reset database (development only)
cargo run -- --reset-db
```

### Frontend Development

#### 1. Web Development
```bash
cd frontend
npm run dev:h5
```

Access at `http://localhost:10086`.

#### 2. WeChat Mini Program Development
```bash
cd frontend
npm run dev:weapp
```

Open the `dist` directory in WeChat Developer Tools.

#### 3. Production Build
```bash
# Web build
npm run build:h5

# WeChat Mini Program build
npm run build:weapp
```

## Code Standards

### Rust Code Standards

#### 1. Naming Conventions
- **Variables/Functions**: snake_case
- **Types/Structs**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Modules**: snake_case

#### 2. Error Handling
```rust
// Use Result type for error handling
pub async fn get_user(id: Uuid) -> Result<User, DatabaseError> {
    // Implementation
}

// Use ? operator for error propagation
let user = database::get_user(id).await?;
```

#### 3. Documentation
```rust
/// Gets user information by ID
/// 
/// # Arguments
/// 
/// * `id` - User's unique identifier
/// 
/// # Returns
/// 
/// Returns user information or error
pub async fn get_user(id: Uuid) -> Result<User, DatabaseError> {
    // Implementation
}
```

### Frontend Code Standards

#### 1. Component Organization
```javascript
// Functional component with hooks
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'

const UserProfile = () => {
  const [user, setUser] = useState(null)
  
  useEffect(() => {
    // Component logic
  }, [])
  
  return (
    <View className="user-profile">
      {/* Component content */}
    </View>
  )
}

export default UserProfile
```

#### 2. State Management
```javascript
// Use Zustand for state management
import { create } from 'zustand'

const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))
```

## Testing Strategy

### Backend Testing

#### 1. Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_user_authentication() {
        // Test implementation
    }
}
```

#### 2. Integration Tests
```rust
// tests/integration_test.rs
use rocket::testing::launch;
use rocket::http::{Status, ContentType};

#[rocket::async_test]
async fn test_login_endpoint() {
    let client = Client::tracked(rocket()).await.expect("valid rocket instance");
    let response = client
        .post("/api/auth/login")
        .header(ContentType::JSON)
        .body(r#"{"username": "test", "password": "test"}"#)
        .dispatch()
        .await;
    
    assert_eq!(response.status(), Status::Ok);
}
```

### Frontend Testing

#### 1. Component Tests
```javascript
import { render, screen } from '@testing-library/react'
import UserProfile from '../UserProfile'

describe('UserProfile', () => {
  test('renders user information', () => {
    render(<UserProfile user={mockUser} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })
})
```

## Debugging Guide

### Backend Debugging

#### 1. Logging Configuration
```rust
// Set log level
export RUST_LOG=debug

// View specific module logs
export RUST_LOG=rocket_taro_server::auth=debug
```

#### 2. Database Debugging
```bash
# Connect to database directly
psql -h 192.168.5.222 -p 5432 -U user_ck -d postgres

# View active sessions
SELECT * FROM user_sessions WHERE expires_at > NOW();

# View login logs
SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 10;
```

### Frontend Debugging

#### 1. Browser DevTools
- Use browser developer tools for debugging
- Check network requests and responses
- Use React DevTools for component inspection

#### 2. WeChat Developer Tools
- Use built-in debugger for mini program development
- Check console logs and network requests
- Use simulation tools for testing

## Performance Optimization

### Backend Optimization

#### 1. Database Optimization
- Use connection pooling
- Implement query result caching
- Optimize SQL queries

#### 2. API Response Optimization
```rust
// Use async/await for concurrent operations
let (user, sessions) = tokio::try_join!(
    get_user(id),
    get_user_sessions(id)
)?;
```

### Frontend Optimization

#### 1. Bundle Optimization
```javascript
// Webpack optimization in config/index.js
webpackChain(chain) {
  chain.optimization.splitChunks({
    chunks: 'all',
    cacheGroups: {
      vendor: {
        name: 'vendor',
        test: /[\\/]node_modules[\\/]/,
        priority: 10,
      },
    },
  })
}
```

#### 2. Component Optimization
```javascript
// Use React.memo for component optimization
import { memo } from 'react'

const UserItem = memo(({ user }) => {
  return <View>{user.name}</View>
})
```

## Deployment Guide

### Production Build

#### 1. Backend Build
```bash
cd rocket-taro-server
cargo build --release
```

#### 2. Frontend Build
```bash
cd frontend
npm run build:h5
npm run build:weapp
```

### Environment Configuration

#### 1. Production Configuration
```toml
# Rocket.toml
[production]
address = "0.0.0.0"
port = 8000
keep_alive = 5
limits = { form = "64 kB", json = "1 MiB" }
secret_key = "your_production_secret_key"

[production.databases]
main = { url = "postgresql://user:pass@host:port/db" }
```

#### 2. Environment Variables
```bash
# Set production environment variables
export ROCKET_PROFILE=production
export DATABASE_URL="your_production_db_url"
export REDIS_URL="your_production_redis_url"
```

## Common Issues and Solutions

### Backend Issues

#### 1. Compilation Errors
```bash
# Update toolchain
rustup update

# Clean and rebuild
cargo clean
cargo build
```

#### 2. Database Connection Issues
- Check database service status
- Verify connection parameters
- Check firewall settings

### Frontend Issues

#### 1. Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

#### 2. Platform-specific Issues
- Check Taro version compatibility
- Verify platform-specific configurations
- Update dependencies to latest versions

## Development Best Practices

### 1. Version Control
- Use meaningful commit messages
- Create feature branches for new development
- Regularly sync with main branch

### 2. Code Review
- All code changes require review before merging
- Focus on code quality and security
- Ensure tests pass before merging

### 3. Documentation
- Update documentation with code changes
- Maintain API documentation
- Document architectural decisions

### 4. Security
- Never commit sensitive information
- Use environment variables for configuration
- Regularly update dependencies

### 5. Monitoring
- Implement logging for important operations
- Monitor application performance
- Set up error tracking and alerting