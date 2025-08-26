# C-End Routing Development Workflow

## Overview

This document standardizes the development workflow for C-end (user-facing) business features, ensuring proper implementation of the backend-driven routing architecture. C-end development must strictly follow the **Backend-First, Frontend-Follow** development pattern.

## Development Constraints & Requirements

### Mandatory Requirements
- ✅ **Backend-First Development**: Backend use cases and routing commands must be completed before frontend page development
- ✅ **Routing Command Driven**: All page navigation and user interactions must be controlled by backend routing commands
- ✅ **Naming Consistency**: Frontend and backend page routing names must be completely consistent
- ✅ **Feature Alignment Confirmation**: Page feature requirements must be confirmed before development; arbitrary route definition is prohibited
- ⚠️ **Single Platform Constraint**: Use single-platform development constraint mechanism, focus on one platform

### Prohibited Behaviors
- ❌ Frontend directly using `Taro.navigateTo`, `Taro.redirectTo` and other native routing methods
- ❌ Frontend arbitrarily defining page paths and navigation logic
- ❌ Route planning without backend confirmation
- ❌ Simultaneous development of multiple frontend platforms

## Development Workflow

### Step 1: Requirements Analysis & Route Planning

#### 1.1 Clarify Business Requirements
Before starting any development, clearly answer these questions:
- What is the user scenario for this feature?
- Which pages are involved? How do pages navigate between each other?
- What user interactions are needed (dialogs, toasts, confirmation boxes, etc.)?
- How are exceptional situations handled?

#### 1.2 Design Page Route Mapping
```javascript
// Example: User Order Management Feature
const routeMapping = {
  // Mini Program Path → H5 Path
  '/pages/order/list': '/order',
  '/pages/order/detail': '/order/detail',
  '/pages/order/payment': '/order/payment'
}
```

#### 1.3 Confirm Development Plan
**If requirements are unclear, the current process must be interrupted to ask the user for confirmation.**

### Step 2: Backend Development (Must be Completed First)

#### 2.1 Define Business Use Cases
Create corresponding use case classes in `src/use_cases/`:

```rust
// src/use_cases/order_use_case.rs
pub struct OrderUseCase {
    db_pool: DbPool,
}

impl OrderUseCase {
    pub async fn handle_order_list(&self, request: OrderListRequest) -> UseCaseResult<RouteCommand> {
        // Business logic processing
        let orders = self.get_user_orders(request.user_id).await?;
        
        // Generate routing commands
        Ok(RouteCommand::sequence(vec![
            RouteCommand::process_data("orders", serde_json::to_value(orders)?),
            RouteCommand::navigate_to("/pages/order/list"),
        ]))
    }
}
```

#### 2.2 Extend Route Command Generator
Add corresponding route command generation methods in `RouteCommandGenerator`:

```rust
// src/use_cases/route_command_generator.rs
impl RouteCommandGenerator {
    pub fn generate_order_route_command(result: &OrderResult) -> RouteCommand {
        match result.operation {
            OrderOperation::List => {
                RouteCommand::sequence(vec![
                    RouteCommand::process_data("orders", result.data.clone()),
                    RouteCommand::navigate_to("/pages/order/list"),
                ])
            }
            OrderOperation::Detail => {
                RouteCommand::navigate_to_with_params(
                    "/pages/order/detail", 
                    json!({ "order_id": result.order_id })
                )
            }
        }
    }
}
```

#### 2.3 Implement API Routes
Create API endpoints in `src/routes/`:

```rust
// src/routes/order.rs
#[post("/api/orders/list")]
pub async fn get_order_list(
    pool: &State<DbPool>,
    auth_user: AuthenticatedUser,
    request: Json<OrderListRequest>,
) -> Json<ApiResponse<Vec<Order>>> {
    let order_use_case = OrderUseCase::new(pool.inner().clone());
    
    match order_use_case.handle_order_list(request.into_inner()).await {
        Ok(route_command) => {
            // Return data and routing commands
            Json(ApiResponse::success_with_command(orders, route_command))
        }
        Err(e) => {
            let error_command = RouteCommandGenerator::generate_error_route_command(&e.to_string(), None);
            Json(ApiResponse::error_with_command("Failed to get orders", error_command))
        }
    }
}
```

#### 2.4 Register Routes to Main Application
Mount new routes in `src/main.rs`:

```rust
.mount("/", routes![
    // Existing routes...
    routes::order::get_order_list,
    routes::order::get_order_detail,
])
```

### Step 3: Shared Code Layer Development

#### 3.1 Update RouterHandler
Ensure `frontend-new/shared/router/RouterHandlerCore.js` supports new routing command types.

#### 3.2 Update Platform Adapters
Add path mappings in platform adapters:

```javascript
// VueH5PlatformAdapter.js
convertMiniProgramPathToH5(miniPath) {
    const pathMap = {
        '/pages/order/list': '/order',
        '/pages/order/detail': '/order/detail',
        // ... other mappings
    }
    // ...
}
```

### Step 4: Frontend Page Development

#### 4.1 Set Development Platform
```bash
# Select target development platform (mandatory constraint)
npm run platform:use  # Execute in corresponding frontend directory
```

#### 4.2 Create Page Components
Develop pages following standard Vue component structure (Script → Template → Style):

```vue
<!-- src/views/OrderList.vue -->
<script setup>
import { ref, onMounted, inject } from 'vue'
import { getRouterHandler } from '../utils/RouterHandler.js'

const apiClient = inject('apiClient')
const routerHandler = getRouterHandler()
const orders = ref([])
const isLoading = ref(false)

async function loadOrders() {
    isLoading.value = true
    try {
        // Call API, backend will automatically handle routing commands
        await apiClient.getOrderList()
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    loadOrders()
})
</script>

<template>
    <div class="order-list-page">
        <!-- UI Implementation -->
    </div>
</template>

<style lang="scss" scoped>
/* Style Implementation */
</style>
```

#### 4.3 Configure Routes
Add new pages to frontend route configuration:

```javascript
// src/router/index.js
const routes = [
    // Existing routes...
    {
        path: '/order',
        name: 'OrderList',
        component: () => import('../views/OrderList.vue'),
        meta: {
            title: 'Order List',
            requiresAuth: true,
            keepAlive: true
        }
    }
]
```

### Step 5: Testing & Validation

#### 5.1 Backend API Testing
```bash
cd rocket-taro-server
cargo test
```

#### 5.2 Route Command Testing
Use API tools to test if routing commands are generated correctly.

#### 5.3 Frontend Integration Testing
```bash
cd frontend-new/mobile/h5  # or corresponding platform
npm run dev
```

#### 5.4 End-to-End Testing
Verify complete user operation workflows.

## Development Checklist

### Backend Development Checklist
- [ ] Use Case implementation completed
- [ ] RouteCommand generation correct
- [ ] API routes implementation completed
- [ ] Routes correctly mounted to main application
- [ ] Error handling complete
- [ ] Unit tests pass

### Frontend Development Checklist
- [ ] Platform constraint mechanism enabled
- [ ] Page component structure follows standards
- [ ] Route configuration correct
- [ ] API integration correct (using injected apiClient)
- [ ] Routing commands auto-handled (no manual navigation code)
- [ ] Good user experience

### Integration Checklist
- [ ] Frontend-backend path mapping consistent
- [ ] Routing commands execute correctly
- [ ] Exception handling appropriate
- [ ] Cross-platform compatibility (if needed)

## Common Issues & Solutions

### Q: What to do if requirements are unclear?
**A**: Stop development immediately, ask user for detailed requirements, and continue only after getting clear answers. Do not develop based on assumptions.

### Q: Can I develop frontend pages first?
**A**: No. Must strictly follow the Backend → Shared Layer → Frontend development order.

### Q: How to handle complex page navigation logic?
**A**: Use RouteCommand combination commands:
- `Sequence`: Execute multiple commands in sequence
- `Conditional`: Conditional execution
- `Delay`: Delayed execution

### Q: What if frontend encounters situations requiring direct navigation?
**A**: Not allowed. All navigation must be executed through routing commands returned by backend APIs. If backend doesn't provide corresponding API, backend interface must be developed first.

## Tools & Scripts

### Platform Constraint Scripts
```bash
# View current platform status
node scripts/enforce-single-platform.js status

# Switch to H5 development
node scripts/enforce-single-platform.js switch h5

# Switch to Mini Program development
node scripts/enforce-single-platform.js switch miniprogram

# Unlock all platforms
node scripts/enforce-single-platform.js unlock
```

### Development Commands
```bash
# Backend development
cd rocket-taro-server
cargo run

# Frontend development (need to set platform first)
cd frontend-new/mobile/h5
npm run platform:use  # Set as current development platform
npm run dev

# Build verification
npm run build
```

## Summary

The core principle of C-end routing development workflow is **Backend Control, Frontend Execution**. Strictly following this workflow ensures:

1. **Consistency**: Frontend and backend routing logic are completely consistent
2. **Maintainability**: Business logic centralized in backend, easy to manage
3. **Scalability**: Reuse existing business logic when adding new platforms
4. **Testability**: Backend business logic can be tested independently
5. **User Experience**: Unified interaction logic and error handling

If you have any questions during development, please refer to this document or ask project maintainers.