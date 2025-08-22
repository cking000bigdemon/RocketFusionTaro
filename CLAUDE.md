# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Rocket Server)
```bash
cd rocket-taro-server

# Development mode with structured logging
cargo run

# Production build and run
cargo build --release
cargo run --release

# Check code quality
cargo check
cargo clippy

# Environment variables (optional)
export DATABASE_URL="host=192.168.5.222 port=5432 user=user_ck password=ck320621 dbname=postgres"
```

### Frontend (Taro Application)
```bash
cd frontend

# Install dependencies
npm install

# Development modes
npm run dev:h5        # H5 web development
npm run dev:weapp     # WeChat mini-program development

# Production builds  
npm run build:h5      # Web build
npm run build:weapp   # WeChat mini-program build
```

### Database Setup
The application uses PostgreSQL with auto-initialization. Database tables and default users are created automatically on first startup. SQL initialization files are located in `database/`.

Default test accounts:
- Username: `admin`, Password: `password` (admin role)
- Username: `test`, Password: `password` (regular user)

## Architecture Overview

### Project Structure
This is a Rocket + Taro full-stack application template that supports web, H5, and WeChat mini-program deployment.

```
rocket-taro-server/     # Main backend application
├── src/
│   ├── auth/          # Authentication guards and middleware
│   ├── database/      # Database connection and operations
│   ├── models/        # Data models and structs
│   ├── routes/        # API route handlers
│   └── fairings/      # Rocket fairings (CORS, etc.)
├── frontend/dist/     # Built frontend assets served statically
└── Cargo.toml         # Rust dependencies

frontend/              # Taro React frontend
├── src/               # React components and pages
├── config/            # Taro build configuration
└── package.json       # Node.js dependencies
```

### Authentication System
The application implements a session-based authentication system:

- **Models**: User, UserSession, LoginRequest/Response in `src/models/auth.rs`
- **Database**: PostgreSQL with user, user_sessions, login_logs tables
- **Guards**: Request guards in `src/auth/guards.rs` for route protection
- **API**: Authentication endpoints in `src/routes/auth.rs`

Key authentication flows:
1. Login creates a session token stored in database and HTTP-only cookie
2. Request guards validate session tokens on protected routes
3. Sessions have 7-day expiration with automatic cleanup

### Database Layer
- **Connection**: Single PostgreSQL connection with Arc<Mutex<Client>> pooling
- **Auto-init**: Tables and default users created automatically on startup
- **Operations**: Database functions in `src/database/auth.rs` and `src/database/mod.rs`

### API Structure
The server mounts routes in two groups:
- `/api/*` - API endpoints (health, user data)  
- `/*` - Authentication, user data, and static file serving

### Frontend Integration
- Frontend builds to `frontend/dist/` and is served by Rocket FileServer
- Supports multi-platform builds (Web, H5, WeChat mini-program)
- Authentication state managed via API calls to backend

## Important Notes

### Database Connection
Database connection string is currently hardcoded in `src/database/mod.rs`. For production, this should be moved to environment variables or configuration files.

### Windows Development
Use MSVC toolchain to avoid dlltool.exe issues:
```bash
rustup default stable-x86_64-pc-windows-msvc
```

### Build Scripts
Automated build scripts are available in `scripts/` directory:
- `build-all.bat` - Full project build
- `build-frontend.bat` - Frontend only
- `start-rocket.bat` - Start server

### Multi-Platform Frontend
The Taro frontend can target multiple platforms. Use appropriate npm commands based on target platform. Built assets are automatically served by the Rocket backend.