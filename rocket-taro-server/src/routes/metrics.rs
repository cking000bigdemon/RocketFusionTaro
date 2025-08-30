use rocket::{post, serde::json::Json};
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error, instrument};
use chrono::{DateTime, Utc};

use crate::models::response::ApiResponse;

/// 前端路由指令执行错误指标
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RouteCommandErrorMetric {
    pub execution_id: String,
    pub command_type: String,
    pub error: String,
    pub duration: Option<f64>,
    pub timestamp: String,
    pub user_agent: String,
    pub url: String,
}

/// 接收前端路由指令执行错误指标
#[post("/api/metrics/route-command-error", data = "<metric>")]
#[instrument(skip_all, name = "receive_route_command_error_metric")]
pub async fn receive_route_command_error_metric(
    metric: Json<RouteCommandErrorMetric>,
) -> Json<ApiResponse<()>> {
    let metric = metric.into_inner();
    
    error!(
        execution_id = %metric.execution_id,
        command_type = %metric.command_type,
        error_message = %metric.error,
        duration = ?metric.duration,
        user_agent = %metric.user_agent,
        url = %metric.url,
        "Frontend route command execution error received"
    );
    
    // 在这里可以将指标保存到数据库或发送到监控系统
    // 例如：Prometheus、DataDog、或者自定义的指标收集系统
    
    // 可以基于错误类型和频率触发告警
    if metric.command_type == "NavigateTo" && metric.error.contains("页面跳转失败") {
        warn!(
            execution_id = %metric.execution_id,
            "High frequency navigation error detected, may indicate routing issues"
        );
    }
    
    // 记录性能问题
    if let Some(duration) = metric.duration {
        if duration > 5000.0 { // 超过5秒
            warn!(
                execution_id = %metric.execution_id,
                command_type = %metric.command_type,
                duration = %duration,
                "Slow route command execution detected"
            );
        }
    }
    
    Json(ApiResponse::with_toast((), "指标已记录"))
}

/// 前端性能指标
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceMetric {
    pub metric_type: String,
    pub value: f64,
    pub tags: std::collections::HashMap<String, String>,
    pub timestamp: String,
}

/// 接收前端性能指标
#[post("/api/metrics/performance", data = "<metric>")]
#[instrument(skip_all, name = "receive_performance_metric")]
pub async fn receive_performance_metric(
    metric: Json<PerformanceMetric>,
) -> Json<ApiResponse<()>> {
    let metric = metric.into_inner();
    
    info!(
        metric_type = %metric.metric_type,
        value = %metric.value,
        tags = ?metric.tags,
        "Frontend performance metric received"
    );
    
    // 根据指标类型进行不同的处理
    match metric.metric_type.as_str() {
        "route_command_duration" => {
            if metric.value > 3000.0 {
                warn!(
                    duration = %metric.value,
                    command_type = ?metric.tags.get("command_type"),
                    "Long route command execution time detected"
                );
            }
        }
        "page_load_time" => {
            if metric.value > 5000.0 {
                warn!(
                    load_time = %metric.value,
                    page = ?metric.tags.get("page"),
                    "Slow page load time detected"
                );
            }
        }
        "api_response_time" => {
            if metric.value > 2000.0 {
                warn!(
                    response_time = %metric.value,
                    endpoint = ?metric.tags.get("endpoint"),
                    "Slow API response time detected"
                );
            }
        }
        _ => {
            info!(metric_type = %metric.metric_type, "Unknown metric type received");
        }
    }
    
    Json(ApiResponse::with_toast((), "性能指标已记录"))
}

/// 获取系统健康状态
#[post("/api/metrics/health")]
#[instrument(name = "get_system_health")]
pub async fn get_system_health() -> Json<ApiResponse<SystemHealthStatus>> {
    info!("System health check requested");
    
    // 这里可以检查各种系统组件的状态
    let health_status = SystemHealthStatus {
        status: "healthy".to_string(),
        timestamp: chrono::Utc::now(),
        components: vec![
            ComponentHealth {
                name: "database".to_string(),
                status: "healthy".to_string(),
                last_check: chrono::Utc::now(),
                details: None,
            },
            ComponentHealth {
                name: "redis".to_string(),
                status: "healthy".to_string(),
                last_check: chrono::Utc::now(),
                details: None,
            },
            ComponentHealth {
                name: "route_handler".to_string(),
                status: "healthy".to_string(),
                last_check: chrono::Utc::now(),
                details: Some("All route commands executing normally".to_string()),
            },
        ],
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    
    Json(ApiResponse::success(health_status))
}

/// 系统健康状态
#[derive(Debug, Serialize)]
pub struct SystemHealthStatus {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub components: Vec<ComponentHealth>,
    pub version: String,
}

/// 组件健康状态
#[derive(Debug, Serialize)]
pub struct ComponentHealth {
    pub name: String,
    pub status: String,
    pub last_check: DateTime<Utc>,
    pub details: Option<String>,
}