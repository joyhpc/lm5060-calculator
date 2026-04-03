# LM5060 WCA 计算器 - 集成指南

## 快速开始

### 1. 安装依赖（如需要）

WCA 引擎是纯 TypeScript 实现，无外部依赖。直接复制文件即可使用。

### 2. 文件清单

```bash
# 核心引擎
lib/wca-engine.ts              # WCA 计算引擎（独立，无依赖）

# React 组件
components/WCAInputForm.tsx    # 输入表单
components/WCAResultDisplay.tsx # 结果展示

# 页面示例
app/wca/page.tsx               # Next.js 页面集成示例

# 文档
docs/WCA_UI_LAYOUT.md          # UI 布局方案
docs/WCA_TECHNICAL.md          # 技术文档
docs/WCA_INTEGRATION.md        # 集成指南（本文件）
```

### 3. 最小集成示例

```typescript
import { computeWCA, WCAInput } from '@/lib/wca-engine'

// 定义输入参数
const input: WCAInput = {
  vin_min: 9.0,
  vin_max: 36.0,
  i_limit: 30.0,
  rds_on: 5.0,
  ocp_delay: 12.0,
  dvdt: 0.5,
  resistor_tolerance: '1%',
}

// 执行计算
const result = computeWCA(input)

// 使用结果
console.log('UVLO 开启电压:', result.uvlo_rising)
console.log('推荐 BOM:', result.standard_bom)
```

---

## 与现有计算器集成

### 方案 1: 独立页面（推荐）

在现有项目中新增 `/wca` 路由：

```typescript
// app/wca/page.tsx
'use client'

import { useState } from 'react'
import WCAInputForm from '@/components/WCAInputForm'
import WCAResultDisplay from '@/components/WCAResultDisplay'
import { computeWCA, WCAInput, WCAResult } from '@/lib/wca-engine'

export default function WCAPage() {
  const [result, setResult] = useState<WCAResult | null>(null)

  const handleCalculate = (input: WCAInput) => {
    const wcaResult = computeWCA(input)
    setResult(wcaResult)
  }

  return (
    <div className="container mx-auto p-8">
      <h1>LM5060 WCA 计算器</h1>
      <div className="grid grid-cols-2 gap-8">
        <WCAInputForm onCalculate={handleCalculate} />
        {result && <WCAResultDisplay result={result} />}
      </div>
    </div>
  )
}
```

### 方案 2: 标签页集成

在现有页面中添加 WCA 标签：

```typescript
// app/page.tsx
'use client'

import { useState } from 'react'

type Mode = 'forward' | 'reverse' | 'wca'

export default function Home() {
  const [mode, setMode] = useState<Mode>('forward')

  return (
    <div>
      {/* 模式切换 */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setMode('forward')}>正向计算</button>
        <button onClick={() => setMode('reverse')}>反向计算</button>
        <button onClick={() => setMode('wca')}>WCA 分析</button>
      </div>

      {/* 内容区 */}
      {mode === 'forward' && <ForwardCalculator />}
      {mode === 'reverse' && <ReverseCalculator />}
      {mode === 'wca' && <WCACalculator />}
    </div>
  )
}
```

### 方案 3: API 端点（服务端计算）

如果需要服务端计算（例如记录日志、限流等）：

```typescript
// app/api/wca/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { computeWCA, WCAInput } from '@/lib/wca-engine'

export async function POST(request: NextRequest) {
  try {
    const input: WCAInput = await request.json()
    
    // 服务端计算
    const result = computeWCA(input)
    
    // 可选：记录日志
    console.log('[WCA] Calculation completed', { input, result })
    
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
```

客户端调用：

```typescript
const response = await fetch('/api/wca', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(input),
})

const { data } = await response.json()
```

---

## 与 Python 后端集成

### 方案 1: TypeScript → Python 移植

将 `wca-engine.ts` 移植到 Python：

```python
# lm5060/wca_engine.py

from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class WCAInput:
    vin_min: float
    vin_max: float
    i_limit: float
    rds_on: float
    ocp_delay: float
    dvdt: float
    resistor_tolerance: str
    c_load: Optional[float] = None
    connector_max_current: Optional[float] = None
    mosfet_i2t_limit: Optional[float] = None

@dataclass
class WCAResult:
    uvlo_rising: Dict[str, float]
    uvlo_falling: Dict[str, float]
    ovp_threshold: Dict[str, float]
    i_limit: Dict[str, float]
    ideal_bom: Dict[str, float]
    standard_bom: Dict[str, float]
    # ... 其他字段

def compute_wca(input_data: WCAInput) -> WCAResult:
    """WCA 计算引擎（Python 版本）"""
    
    # IC 容差数据
    IC_TOLERANCES = {
        'UVLO_THRESHOLD': {'min': 1.45, 'typ': 1.6, 'max': 1.75},
        'OVP_THRESHOLD': {'min': 1.88, 'typ': 2.0, 'max': 2.12},
        # ...
    }
    
    # 电阻容差
    tol = {'0.1%': 0.001, '0.5%': 0.005, '1%': 0.01, '5%': 0.05}[input_data.resistor_tolerance]
    
    # 计算理想 BOM
    R8_ideal = 10.0 * (input_data.vin_max - IC_TOLERANCES['OVP_THRESHOLD']['typ']) / IC_TOLERANCES['OVP_THRESHOLD']['typ']
    
    # 标准电阻吸附
    R8_standard = snap_to_standard_resistor(R8_ideal, 'E96' if tol <= 0.01 else 'E24')
    
    # 最坏情况分析
    uvlo_rising_min = calculate_uvlo_rising(
        uvlo_th=IC_TOLERANCES['UVLO_THRESHOLD']['min'],
        i_bias=IC_TOLERANCES['UVLO_BIAS_CURRENT']['min'] / 1e6,
        R10=R10_standard * (1 - tol),
        R11=10.0 * (1 + tol)
    )
    
    # ... 其他计算
    
    return WCAResult(
        uvlo_rising={'min': uvlo_rising_min, 'typ': uvlo_rising_typ, 'max': uvlo_rising_max},
        # ...
    )
```

### 方案 2: FastAPI 端点

```python
# api/wca.py

from fastapi import APIRouter
from lm5060.wca_engine import compute_wca, WCAInput, WCAResult

router = APIRouter()

@router.post("/wca", response_model=WCAResult)
async def calculate_wca(input_data: WCAInput):
    """WCA 计算端点"""
    result = compute_wca(input_data)
    return result
```

注册路由：

```python
# api/main.py

from fastapi import FastAPI
from api.wca import router as wca_router

app = FastAPI()
app.include_router(wca_router, prefix="/api")
```

---

## 自定义与扩展

### 1. 添加新的 IC 容差参数

```typescript
// lib/wca-engine.ts

export const IC_TOLERANCES = {
  // 现有参数...
  
  // 新增参数
  TIMER_DISCHARGE_CURRENT: { min: 2.0, typ: 3.0, max: 4.0 },
}

// 在计算中使用
const i_timer_discharge = IC_TOLERANCES.TIMER_DISCHARGE_CURRENT.typ / 1e6
```

### 2. 支持自定义电阻序列

```typescript
// lib/wca-engine.ts

// 添加 E48 序列（2% 精度）
const E48_SERIES = [
  1.00, 1.05, 1.10, 1.15, 1.21, 1.27, 1.33, 1.40, 1.47, 1.54,
  // ... 完整序列
]

export function snapToStandardResistor(
  value: number,
  series: 'E96' | 'E24' | 'E48' = 'E96'
): number {
  const seriesData = {
    'E96': E96_SERIES,
    'E24': E24_SERIES,
    'E48': E48_SERIES,
  }[series]
  
  // ... 吸附逻辑
}
```

### 3. 添加温度系数分析

```typescript
// lib/wca-engine.ts

interface WCAInput {
  // 现有字段...
  
  // 新增字段
  temp_min?: number  // 最低工作温度 (°C)
  temp_max?: number  // 最高工作温度 (°C)
  resistor_tempco?: number  // 电阻温度系数 (ppm/°C)
}

function computeWCA(input: WCAInput): WCAResult {
  // 温度修正
  if (input.temp_min && input.temp_max && input.resistor_tempco) {
    const temp_delta = input.temp_max - 25  // 相对 25°C 的温差
    const resistance_drift = input.resistor_tempco * temp_delta / 1e6
    
    // 应用温度修正
    const R8_temp_corrected = R8_standard * (1 + resistance_drift)
    // ...
  }
}
```

### 4. 导出计算报告（PDF/Excel）

```typescript
// lib/wca-export.ts

import { WCAResult } from './wca-engine'

export function exportToPDF(result: WCAResult): Blob {
  // 使用 jsPDF 生成 PDF
  const doc = new jsPDF()
  
  doc.text('LM5060 WCA 计算报告', 10, 10)
  doc.text(`UVLO 开启电压: ${result.uvlo_rising.min}V ~ ${result.uvlo_rising.max}V`, 10, 20)
  // ...
  
  return doc.output('blob')
}

export function exportToExcel(result: WCAResult): Blob {
  // 使用 xlsx 生成 Excel
  const workbook = XLSX.utils.book_new()
  
  const worksheet = XLSX.utils.json_to_sheet([
    { 参数: 'UVLO 开启电压 (Min)', 值: result.uvlo_rising.min, 单位: 'V' },
    { 参数: 'UVLO 开启电压 (Typ)', 值: result.uvlo_rising.typ, 单位: 'V' },
    // ...
  ])
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'WCA 结果')
  
  return XLSX.write(workbook, { type: 'blob', bookType: 'xlsx' })
}
```

---

## 性能优化

### 1. 计算缓存

```typescript
// lib/wca-cache.ts

import { WCAInput, WCAResult, computeWCA } from './wca-engine'

const cache = new Map<string, WCAResult>()

function getCacheKey(input: WCAInput): string {
  return JSON.stringify(input)
}

export function computeWCAWithCache(input: WCAInput): WCAResult {
  const key = getCacheKey(input)
  
  if (cache.has(key)) {
    console.log('[WCA] Cache hit')
    return cache.get(key)!
  }
  
  console.log('[WCA] Cache miss, computing...')
  const result = computeWCA(input)
  cache.set(key, result)
  
  return result
}
```

### 2. Web Worker 异步计算

```typescript
// workers/wca-worker.ts

import { computeWCA, WCAInput } from '@/lib/wca-engine'

self.onmessage = (e: MessageEvent<WCAInput>) => {
  const input = e.data
  const result = computeWCA(input)
  self.postMessage(result)
}
```

使用 Worker：

```typescript
// components/WCAInputForm.tsx

const worker = new Worker(new URL('@/workers/wca-worker.ts', import.meta.url))

const handleCalculate = (input: WCAInput) => {
  setLoading(true)
  
  worker.postMessage(input)
  
  worker.onmessage = (e) => {
    setResult(e.data)
    setLoading(false)
  }
}
```

---

## 测试

### 1. 单元测试

```typescript
// __tests__/wca-engine.test.ts

import { computeWCA, snapToStandardResistor } from '@/lib/wca-engine'

describe('WCA Engine', () => {
  test('基础计算', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })
    
    expect(result.uvlo_rising.typ).toBeCloseTo(9.0, 1)
    expect(result.uvlo_rising.min).toBeLessThan(result.uvlo_rising.typ)
    expect(result.uvlo_rising.max).toBeGreaterThan(result.uvlo_rising.typ)
  })
  
  test('标准电阻吸附', () => {
    expect(snapToStandardResistor(170.23, 'E96')).toBe(169.0)
    expect(snapToStandardResistor(46.18, 'E96')).toBe(46.4)
    expect(snapToStandardResistor(100.5, 'E24')).toBe(100.0)
  })
  
  test('容差传播', () => {
    const result1 = computeWCA({ resistor_tolerance: '0.1%', /* ... */ })
    const result5 = computeWCA({ resistor_tolerance: '5%', /* ... */ })
    
    // 5% 容差的区间应该更宽
    const range1 = result1.uvlo_rising.max - result1.uvlo_rising.min
    const range5 = result5.uvlo_rising.max - result5.uvlo_rising.min
    expect(range5).toBeGreaterThan(range1)
  })
})
```

### 2. 集成测试

```typescript
// __tests__/wca-integration.test.ts

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WCAPage from '@/app/wca/page'

describe('WCA Page', () => {
  test('完整计算流程', async () => {
    render(<WCAPage />)
    
    // 填写表单
    fireEvent.change(screen.getByLabelText('最小输入电压'), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('最大输入电压'), { target: { value: '36' } })
    
    // 提交计算
    fireEvent.click(screen.getByText('开始 WCA 计算'))
    
    // 等待结果
    await waitFor(() => {
      expect(screen.getByText(/UVLO 开启电压/)).toBeInTheDocument()
    })
  })
})
```

---

## 部署

### Vercel 部署

```bash
# 1. 确保文件结构正确
lm5060-calculator/
├── lib/wca-engine.ts
├── components/
├── app/wca/page.tsx
└── package.json

# 2. 部署
vercel --prod
```

### Docker 部署

```dockerfile
# Dockerfile

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

---

## 故障排查

### 问题 1: 计算结果为 NaN

**原因**: 输入参数无效（例如 vin_min >= vin_max）

**解决**:
```typescript
// 添加输入验证
if (input.vin_min >= input.vin_max) {
  throw new Error('vin_min 必须小于 vin_max')
}
```

### 问题 2: 标准电阻吸附失败

**原因**: 输入值超出 E96/E24 范围（< 1Ω 或 > 10MΩ）

**解决**:
```typescript
// 添加范围检查
if (value < 1 || value > 10e6) {
  console.warn(`阻值 ${value} 超出标准范围，保持原值`)
  return value
}
```

### 问题 3: UI 组件样式错误

**原因**: Tailwind CSS 未正确配置

**解决**:
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // ...
}
```

---

## 联系与支持

- **GitHub Issues**: [项目地址]/issues
- **技术文档**: `/docs/WCA_TECHNICAL.md`
- **UI 布局**: `/docs/WCA_UI_LAYOUT.md`

---

**最后更新**: 2026-04-03
