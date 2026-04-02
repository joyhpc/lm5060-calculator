# LM5060 Calculator - Web UI 架构设计

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                         用户浏览器                            │
│                    (React + Next.js)                         │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/JSON
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Vercel Edge                             │
│  ┌──────────────┐              ┌──────────────┐            │
│  │  Static Site │              │  API Routes  │            │
│  │  (Frontend)  │              │  (FastAPI)   │            │
│  └──────────────┘              └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │   lm5060 Python Package  │
                     │  (计算引擎 - 无修改)      │
                     └──────────────────────────┘
```

## 目录结构

```
lm5060-calculator/
├── lm5060/                    # Python 计算引擎（不变）
│   ├── __init__.py
│   ├── constants.py
│   ├── schemas.py
│   ├── forward_engine.py
│   ├── reverse_engine.py
│   └── cli.py                 # CLI 保持独立
├── api/                       # FastAPI 后端（新增）
│   ├── __init__.py
│   ├── main.py               # FastAPI 应用
│   ├── routes.py             # API 路由
│   └── models.py             # API 数据模型
├── web/                       # Next.js 前端（新增）
│   ├── app/
│   │   ├── page.tsx          # 主页
│   │   ├── layout.tsx        # 布局
│   │   └── api/              # Next.js API 路由（代理到 FastAPI）
│   ├── components/
│   │   ├── ForwardForm.tsx   # 正向计算表单
│   │   ├── ReverseForm.tsx   # 反向计算表单
│   │   └── ResultDisplay.tsx # 结果展示
│   ├── lib/
│   │   └── api.ts            # API 客户端
│   ├── package.json
│   └── tsconfig.json
├── vercel.json               # Vercel 配置
├── requirements.txt          # Python 依赖
└── tests/                    # 测试（不变）
```

## 解耦设计

### 1. 计算引擎层（lm5060/）
- **职责**：纯计算逻辑
- **接口**：Python 函数
- **依赖**：无外部依赖
- **测试**：pytest

### 2. API 层（api/）
- **职责**：HTTP 接口封装
- **接口**：REST API (JSON)
- **依赖**：FastAPI + lm5060
- **测试**：pytest + httpx

### 3. CLI 层（lm5060/cli.py）
- **职责**：命令行接口
- **接口**：argparse
- **依赖**：lm5060（直接调用）
- **测试**：bash + pytest

### 4. Web UI 层（web/）
- **职责**：用户界面
- **接口**：React 组件
- **依赖**：API 层（HTTP）
- **测试**：Jest + React Testing Library

## API 设计

### POST /api/forward
**请求**：
```json
{
  "vin_min": 9.0,
  "vin_max": 36.0,
  "i_limit": 30.0,
  "rds_on": 5.0,
  "ocp_delay": 12.0,
  "dvdt": 0.5,
  "health_check": false
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "R8_kOhm": 170.0,
    "R10_kOhm": 46.25,
    "R11_kOhm": 10.0,
    "Rs_Ohm": 14556.96,
    "C_TIMER_nF": 64.5,
    "C_GATE_nF": 48.0,
    "V_DSTH_mV": 150.0
  },
  "health": {
    "condition_number": 1.21,
    "status": "HEALTHY",
    "warnings": []
  }
}
```

### POST /api/reverse
**请求**：
```json
{
  "R8": 170.0,
  "R10": 46.25,
  "R11": 10.0,
  "Rs": 14556.96,
  "C_TIMER": 64.5,
  "C_GATE": 48.0,
  "rds_on": 5.0
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "uvlo_rising_V": 9.0,
    "uvlo_falling_V": 8.46,
    "ovp_threshold_V": 36.0,
    "ocp_delay_ms": 12.0,
    "i_limit_A": 30.0,
    "gate_slew_rate_V_per_us": 0.5,
    "vds_threshold_mV": 150.0
  }
}
```

## CLI 测试 API

```bash
# 测试正向计算 API
curl -X POST http://localhost:8000/api/forward \
  -H "Content-Type: application/json" \
  -d '{
    "vin_min": 9.0,
    "vin_max": 36.0,
    "i_limit": 30.0,
    "rds_on": 5.0,
    "ocp_delay": 12.0,
    "dvdt": 0.5
  }'

# 测试反向计算 API
curl -X POST http://localhost:8000/api/reverse \
  -H "Content-Type: application/json" \
  -d '{
    "R8": 170.0,
    "R10": 46.25,
    "R11": 10.0,
    "Rs": 14556.96,
    "C_TIMER": 64.5,
    "C_GATE": 48.0,
    "rds_on": 5.0
  }'
```

## Vercel 部署配置

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "web/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "api/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/main.py"
    },
    {
      "src": "/(.*)",
      "dest": "web/$1"
    }
  ]
}
```

## 技术栈

### 后端
- **FastAPI**: 高性能 Python Web 框架
- **Pydantic**: 数据验证（已有）
- **uvicorn**: ASGI 服务器

### 前端
- **Next.js 14**: React 框架（App Router）
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式
- **shadcn/ui**: UI 组件库

### 部署
- **Vercel**: 无服务器部署
- **Edge Functions**: API 路由
- **CDN**: 静态资源

## 开发流程

1. **本地开发**：
   ```bash
   # 后端
   cd api && uvicorn main:app --reload
   
   # 前端
   cd web && npm run dev
   ```

2. **CLI 测试 API**：
   ```bash
   curl -X POST http://localhost:8000/api/forward -d @input.json
   ```

3. **部署**：
   ```bash
   vercel deploy
   ```

## 优势

1. **完全解耦**：CLI、API、UI 三层独立
2. **可测试性**：每层都可独立测试
3. **可扩展性**：易于添加新功能
4. **可维护性**：职责清晰，修改影响小
5. **可复用性**：计算引擎可用于其他项目
