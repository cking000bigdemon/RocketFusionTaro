# C端路由开发流程文档

## 概述

本文档规范了C端（用户端）业务功能的开发流程，确保后端驱动路由架构的正确实施。C端开发必须严格遵循 **后端优先，前端跟随** 的开发模式。

## 开发约束与要求

### 强制性要求
- ✅ **后端优先开发**：必须先开发完成后端用例和路由指令，再开发前端页面
- ✅ **路由指令驱动**：所有页面跳转和用户交互必须通过后端路由指令控制
- ✅ **命名一致性**：前后端对页面路由的命名必须完全一致
- ✅ **功能对齐确认**：开发前必须确认页面功能需求，不得随意定义路由
- ⚠️ **单端约束**：使用单端开发约束机制，专注一个平台开发

### 禁止行为
- ❌ 前端直接使用 `Taro.navigateTo`、`Taro.redirectTo` 等原生路由方法
- ❌ 前端随意定义页面路径和跳转逻辑
- ❌ 不经后端确认的路由规划
- ❌ 同时开发多个前端平台

## 开发流程

### 第一步：需求分析与路由规划

#### 1.1 明确业务需求
在开始任何开发前，必须清晰回答以下问题：
- 该功能的用户场景是什么？
- 涉及哪些页面？页面间的跳转关系如何？
- 需要哪些用户交互（弹窗、Toast、确认框等）？
- 异常情况如何处理？

#### 1.2 设计页面路由映射
```javascript
// 示例：用户订单管理功能
const routeMapping = {
  // 小程序路径 → H5路径
  '/pages/order/list': '/order',
  '/pages/order/detail': '/order/detail',
  '/pages/order/payment': '/order/payment'
}
```

#### 1.3 确认开发计划
**如果需求不清晰，必须中断当前流程询问用户获得确认。**

### 第二步：后端开发（必须优先完成）

#### 2.1 定义业务用例（Use Case）
在 `src/use_cases/` 中创建相应的用例类：

```rust
// src/use_cases/order_use_case.rs
pub struct OrderUseCase {
    db_pool: DbPool,
}

impl OrderUseCase {
    pub async fn handle_order_list(&self, request: OrderListRequest) -> UseCaseResult<RouteCommand> {
        // 业务逻辑处理
        let orders = self.get_user_orders(request.user_id).await?;
        
        // 生成路由指令
        Ok(RouteCommand::sequence(vec![
            RouteCommand::process_data("orders", serde_json::to_value(orders)?),
            RouteCommand::navigate_to("/pages/order/list"),
        ]))
    }
}
```

#### 2.2 扩展路由指令生成器
在 `RouteCommandGenerator` 中添加相应的路由指令生成方法：

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

#### 2.3 实现API路由
在 `src/routes/` 中创建API端点：

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
            // 返回数据和路由指令
            Json(ApiResponse::success_with_command(orders, route_command))
        }
        Err(e) => {
            let error_command = RouteCommandGenerator::generate_error_route_command(&e.to_string(), None);
            Json(ApiResponse::error_with_command("获取订单失败", error_command))
        }
    }
}
```

#### 2.4 注册路由到主应用
在 `src/main.rs` 中挂载新的路由：

```rust
.mount("/", routes![
    // 现有路由...
    routes::order::get_order_list,
    routes::order::get_order_detail,
])
```

### 第三步：共享代码层开发

#### 3.1 更新RouterHandler
确保 `frontend-new/shared/router/RouterHandlerCore.js` 支持新的路由指令类型。

#### 3.2 更新平台适配器
在各平台的适配器中添加路径映射：

```javascript
// VueH5PlatformAdapter.js
convertMiniProgramPathToH5(miniPath) {
    const pathMap = {
        '/pages/order/list': '/order',
        '/pages/order/detail': '/order/detail',
        // ... 其他映射
    }
    // ...
}
```

### 第四步：前端页面开发

#### 4.1 设置开发平台
```bash
# 选择目标开发平台（强制约束）
npm run platform:use  # 在对应前端目录执行
```

#### 4.2 创建页面组件
按照标准Vue组件结构（Script → Template → Style）开发页面：

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
        // 调用API，后端会自动处理路由指令
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
        <!-- UI 实现 -->
    </div>
</template>

<style lang="scss" scoped>
/* 样式实现 */
</style>
```

#### 4.3 配置路由
在前端路由配置中添加新页面：

```javascript
// src/router/index.js
const routes = [
    // 现有路由...
    {
        path: '/order',
        name: 'OrderList',
        component: () => import('../views/OrderList.vue'),
        meta: {
            title: '订单列表',
            requiresAuth: true,
            keepAlive: true
        }
    }
]
```

### 第五步：测试与验证

#### 5.1 后端API测试
```bash
cd rocket-taro-server
cargo test
```

#### 5.2 路由指令测试
使用API工具测试路由指令是否正确生成。

#### 5.3 前端集成测试
```bash
cd frontend-new/mobile/h5  # 或对应平台
npm run dev
```

#### 5.4 端到端测试
验证完整的用户操作流程。

## 开发检查清单

### 后端开发检查
- [ ] Use Case 实现完成
- [ ] RouteCommand 生成正确
- [ ] API 路由实现完成
- [ ] 路由已正确挂载到主应用
- [ ] 错误处理完备
- [ ] 单元测试通过

### 前端开发检查
- [ ] 平台约束机制已启用
- [ ] 页面组件结构符合标准
- [ ] 路由配置正确
- [ ] API集成正确（使用injected apiClient）
- [ ] 路由指令自动处理（无手动导航代码）
- [ ] 用户体验良好

### 集成检查
- [ ] 前后端路径映射一致
- [ ] 路由指令执行正确
- [ ] 异常情况处理恰当
- [ ] 跨平台兼容性（如果需要）

## 常见问题与解决方案

### Q: 如果需求不明确怎么办？
**A**: 立即停止开发，详细询问用户需求，获得明确答复后再继续。不得基于假设进行开发。

### Q: 可以先开发前端页面吗？
**A**: 不可以。必须严格按照后端→共享层→前端的顺序开发。

### Q: 如何处理复杂的页面跳转逻辑？
**A**: 使用RouteCommand的组合指令：
- `Sequence`: 顺序执行多个指令
- `Conditional`: 条件执行
- `Delay`: 延迟执行

### Q: 前端遇到需要直接跳转的情况怎么办？
**A**: 不允许。所有跳转都必须通过后端API返回的路由指令执行。如果后端没有提供相应的API，需要先开发后端接口。

## 工具与脚本

### 平台约束脚本
```bash
# 查看当前平台状态
node scripts/enforce-single-platform.js status

# 切换到H5开发
node scripts/enforce-single-platform.js switch h5

# 切换到小程序开发  
node scripts/enforce-single-platform.js switch miniprogram

# 解锁所有平台
node scripts/enforce-single-platform.js unlock
```

### 开发命令
```bash
# 后端开发
cd rocket-taro-server
cargo run

# 前端开发（需要先设置平台）
cd frontend-new/mobile/h5
npm run platform:use  # 设置为当前开发平台
npm run dev

# 构建验证
npm run build
```

## 总结

C端路由开发流程的核心原则是 **后端控制，前端执行**。严格按照本流程开发可以确保：

1. **一致性**：前后端路由逻辑完全一致
2. **可维护性**：业务逻辑集中在后端，便于管理
3. **可扩展性**：新增平台时复用现有业务逻辑
4. **可测试性**：后端业务逻辑独立测试
5. **用户体验**：统一的交互逻辑和错误处理

开发过程中如有任何疑问，请参考本文档或询问项目维护者。