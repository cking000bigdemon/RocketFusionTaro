# Rocket-Taro-Server API Reference

## API Overview

This document describes all API endpoints of Rocket-Taro-Server, mainly including user authentication and data management features.

## Basic Information

- **Base URL**: `http://localhost:8000`
- **Authentication**: Cookie-based Session
- **Data Format**: JSON
- **Character Encoding**: UTF-8
- **Logging System**: Structured logging with tracing
- **Security Features**: bcrypt password encryption, IP address logging, user agent tracking

## Common Response Format

All API endpoints return a unified JSON response format:

```json
{
    "code": 200,           // Status code: 200 for success, others for errors
    "message": "success",  // Response message
    "data": {}            // Response data, null on error
}
```

## Authentication Endpoints

### 1. User Login

**Endpoint**: `POST /api/auth/login`

**Description**: User login authentication

**Request Parameters**:
```json
{
    "username": "string",  // Username, required
    "password": "string"   // Password, required
}
```

**Response Example**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "username": "admin",
            "email": "admin@rocket-taro.com",
            "full_name": "System Administrator",
            "avatar_url": null,
            "is_admin": true
        },
        "session_token": "abc123...",
        "expires_at": "2025-08-28T12:00:00Z"
    }
}
```

**Error Response**:
```json
{
    "code": 400,
    "message": "Invalid username or password",
    "data": null
}
```

### 2. User Logout

**Endpoint**: `POST /api/auth/logout`

**Description**: User logout, clear session

**Request Headers**: Requires valid session cookie

**Response Example**:
```json
{
    "code": 200,
    "message": "success",
    "data": null
}
```

### 3. Get Current User

**Endpoint**: `GET /api/auth/current`

**Description**: Get current logged-in user's detailed information

**Request Headers**: Requires valid session cookie

**Response Example**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "admin",
        "email": "admin@rocket-taro.com",
        "full_name": "System Administrator",
        "avatar_url": null,
        "is_admin": true
    }
}
```

### 4. Check Authentication Status

**Endpoint**: `GET /api/auth/status`

**Description**: Check current user's authentication status

**Response Example**:

User authenticated:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "admin",
        "email": "admin@rocket-taro.com",
        "full_name": "System Administrator",
        "avatar_url": null,
        "is_admin": true
    }
}
```

User not authenticated:
```json
{
    "code": 200,
    "message": "success",
    "data": null
}
```

### 5. Authentication Check

**Endpoint**: `GET /api/auth/check`

**Description**: Simple authentication check endpoint

**Response Example**:
```json
{
    "code": 200,
    "message": "success",
    "data": true
}
```

## Business Data Endpoints

### 6. Health Check

**Endpoint**: `GET /api/health`

**Description**: Service health status check

**Response Example**:
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

### 7. Get User Data

**Endpoint**: `GET /api/user/:id`

**Description**: Get user information by user ID

**Path Parameters**:
- `id`: User UUID

**Request Headers**: Authentication required

### 8. Create User Data

**Endpoint**: `POST /create_user_data`

**Description**: Create new user data record

**Request Parameters**:
```json
{
    "name": "string",     // Name, required
    "email": "string",    // Email, required
    "phone": "string",    // Phone, optional
    "message": "string"   // Message, optional
}
```

### 9. Get User Data List

**Endpoint**: `GET /get_user_data`

**Description**: Get all user data records

**Response Example**:
```json
{
    "code": 200,
    "message": "success",
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "13800138000",
            "message": "Test message",
            "created_at": "2025-08-21T12:00:00Z"
        }
    ]
}
```

### 10. Mock Data Endpoints

**Endpoint**: `POST /create_mock_user_data`

**Description**: Create mock user data (for testing)

**Endpoint**: `GET /get_mock_user_data`

**Description**: Get mock user data list

## Error Codes

| Status Code | Description                    |
|-------------|--------------------------------|
| 200         | Request successful             |
| 400         | Bad request parameters         |
| 401         | Unauthorized or expired auth   |
| 403         | Insufficient permissions       |
| 404         | Resource not found             |
| 500         | Internal server error          |

## Authentication Mechanism

### Cookie Authentication
- After successful login, server sets an HttpOnly Cookie named `session_token`
- Cookie expires in 8 hours
- All authenticated endpoints automatically check the session_token in cookies
- Frontend doesn't need to manually handle tokens, browsers automatically carry cookies

### Session Management
- Session information is stored in database, including user ID, IP address, User-Agent, etc.
- Sessions expire in 7 days, automatically invalid after timeout
- Logout removes corresponding session record from database

## Request Examples

### JavaScript Fetch API
```javascript
// Login
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

// Get current user info (cookies automatically carried)
const userResponse = await fetch('/api/auth/current');
const userData = await userResponse.json();
```

### cURL Examples
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}' \
  -c cookies.txt

# Get user info (using saved cookies)
curl -X GET http://localhost:8000/api/auth/current \
  -b cookies.txt
```

## Development & Testing

### Test Accounts
- Username: `admin`, Password: `password` (administrator)
- Username: `test`, Password: `password` (regular user)

### Local Development
1. Start PostgreSQL database service
2. Run `cargo run` to start the server
3. Visit `http://localhost:8000/login.html` for login testing

## System Optimization Updates

### v1.1 Optimization (2025-08-21)

#### Code Quality Improvements
- **Removed Debug Code**: Cleaned up all `println!` debug statements, replaced with tracing structured logs
- **Logging System Upgrade**: Integrated tracing and tracing-subscriber, supporting structured log output
- **Error Handling Enhancement**: Improved error handling mechanisms with detailed error information and logging

#### Security Enhancements
- **IP Address Acquisition**: Correctly obtain real client IP addresses (supporting proxies and load balancers)
- **User-Agent Recording**: Accurately record user agent information for security auditing
- **Configuration Separation**: Moved database connection strings to configuration files, avoiding hardcoded security risks

#### Architecture Optimizations
- **Request Guards**: Added `RequestInfo` guard for elegant request metadata acquisition
- **Code Cleanup**: Removed unused functions and commented code, improved code readability
- **Dependency Optimization**: Added necessary dependencies, cleaned up unused imports

#### Performance Improvements
- **Logging Performance**: Structured logging replaced print output, improved production environment performance
- **Memory Optimization**: Cleaned up redundant code and temporary files, reduced memory usage

---

Last Updated: 2025-08-21
Documentation Version: v1.1