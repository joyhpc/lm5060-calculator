# 测试改进计划

## 问题总结

**发现的 Bug**: 前端硬编码 `http://localhost:8000`，导致生产环境 API 调用失败

**根本原因**: 缺少端到端测试和集成测试

---

## 当前测试覆盖

### ✅ 已有测试（9个）

```
tests/
├── test_forward.py (6个)
│   ├── test_compute_bom_basic
│   ├── test_health_check_healthy
│   ├── test_health_check_critical
│   ├── test_input_validation
│   ├── test_monotonicity_vin_max
│   └── test_monotonicity_i_limit
└── test_roundtrip.py (3个)
    ├── test_roundtrip_basic
    ├── test_roundtrip_multiple_cases
    └── test_reverse_calculation_only
```

**覆盖范围**: 仅计算引擎（lm5060/）

---

## 缺失的测试

### 1. E2E 测试（端到端）

**工具**: Playwright 或 Cypress

**应测试**:
```typescript
// tests/e2e/forward-calculation.spec.ts
test('正向计算完整流程', async ({ page }) => {
  await page.goto('https://lm5060-calculator.vercel.app')
  
  // 填写表单
  await page.fill('[name="vin_min"]', '9')
  await page.fill('[name="vin_max"]', '36')
  await page.fill('[name="i_limit"]', '30')
  await page.fill('[name="rds_on"]', '5')
  await page.fill('[name="ocp_delay"]', '12')
  await page.fill('[name="dvdt"]', '0.5')
  
  // 提交
  await page.click('button[type="submit"]')
  
  // 验证结果
  await expect(page.locator('text=R8_kOhm')).toBeVisible()
  await expect(page.locator('text=170.0')).toBeVisible()
})

test('反向计算完整流程', async ({ page }) => {
  await page.goto('https://lm5060-calculator.vercel.app')
  
  // 切换到反向模式
  await page.click('text=反向计算')
  
  // 填写 BOM
  await page.fill('[name="R8"]', '170')
  await page.fill('[name="R10"]', '46.25')
  // ...
  
  // 提交并验证
  await page.click('button[type="submit"]')
  await expect(page.locator('text=uvlo_rising_V')).toBeVisible()
})

test('API 调用使用正确路径', async ({ page }) => {
  // 监听网络请求
  page.on('request', request => {
    if (request.url().includes('/api/forward')) {
      // 验证不是 localhost:8000
      expect(request.url()).not.toContain('localhost:8000')
    }
  })
  
  await page.goto('https://lm5060-calculator.vercel.app')
  await page.click('button[type="submit"]')
})
```

### 2. API 集成测试

**工具**: pytest + httpx

**应测试**:
```python
# tests/test_api_integration.py
import httpx
import pytest

BASE_URL = "http://localhost:8000"

def test_forward_api_integration():
    """测试正向计算 API"""
    response = httpx.post(
        f"{BASE_URL}/api/forward",
        json={
            "vin_min": 9.0,
            "vin_max": 36.0,
            "i_limit": 30.0,
            "rds_on": 5.0,
            "ocp_delay": 12.0,
            "dvdt": 0.5,
            "health_check": True,
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "R8_kOhm" in data["data"]
    assert data["data"]["R8_kOhm"] == 170.0

def test_reverse_api_integration():
    """测试反向计算 API"""
    response = httpx.post(
        f"{BASE_URL}/api/reverse",
        json={
            "R8": 170.0,
            "R10": 46.25,
            "R11": 10.0,
            "Rs": 14556.96,
            "C_TIMER": 64.5,
            "C_GATE": 48.0,
            "rds_on": 5.0,
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["uvlo_rising_V"] == 9.0

def test_api_error_handling():
    """测试 API 错误处理"""
    response = httpx.post(
        f"{BASE_URL}/api/forward",
        json={"vin_min": -1}  # 无效输入
    )
    
    assert response.status_code == 400
```

### 3. 前端单元测试

**工具**: Jest + React Testing Library

**应测试**:
```typescript
// app/__tests__/page.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Home from '../page'

// Mock fetch
global.fetch = jest.fn()

test('正向计算表单提交', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      success: true,
      data: { R8_kOhm: 170.0 }
    })
  })
  
  render(<Home />)
  
  // 填写表单
  fireEvent.change(screen.getByLabelText(/最小输入电压/), {
    target: { value: '9' }
  })
  
  // 提交
  fireEvent.click(screen.getByText(/计算 BOM/))
  
  // 验证 API 调用使用相对路径
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      '/api/forward',  // 不是 localhost:8000
      expect.any(Object)
    )
  })
})

test('API 错误处理', async () => {
  (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
  
  render(<Home />)
  fireEvent.click(screen.getByText(/计算 BOM/))
  
  await waitFor(() => {
    expect(screen.getByText(/错误/)).toBeInTheDocument()
  })
})
```

### 4. 部署前 Smoke Test

**工具**: GitHub Actions + Playwright

**CI/CD 流程**:
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # 运行单元测试
      - name: Run Python tests
        run: pytest tests/
      
      # 启动本地服务
      - name: Start API server
        run: python3 api/main.py &
      
      - name: Start frontend
        run: npm run build && npm start &
      
      # 运行 E2E 测试
      - name: Run E2E tests
        run: npx playwright test
  
  deploy-preview:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel Preview
        run: vercel deploy
      
      # 在 preview 环境运行 smoke test
      - name: Smoke test on preview
        run: |
          curl -f $PREVIEW_URL/api/forward -d @test-data.json
          npx playwright test --base-url=$PREVIEW_URL
  
  deploy-production:
    needs: deploy-preview
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: vercel deploy --prod
```

---

## 实施优先级

### P0 - 立即实施
1. **API 集成测试** (1-2 小时)
   - 测试 /api/forward 和 /api/reverse
   - 验证错误处理

2. **简单 E2E 测试** (2-3 小时)
   - 测试正向计算流程
   - 验证 API 路径正确

### P1 - 本周内
3. **前端单元测试** (1 天)
   - 测试表单组件
   - Mock API 调用

4. **部署前验证** (半天)
   - Preview 环境测试
   - Smoke test 自动化

### P2 - 下周
5. **完整 E2E 套件** (2-3 天)
   - 所有用户流程
   - 边界情况测试

---

## 测试命令

```bash
# 单元测试（已有）
pytest tests/

# API 集成测试（待添加）
pytest tests/test_api_integration.py

# 前端测试（待添加）
npm test

# E2E 测试（待添加）
npx playwright test

# 全部测试
npm run test:all
```

---

## 预期效果

实施后的测试覆盖：
- **单元测试**: 9 个（已有）+ 10 个（API）= 19 个
- **集成测试**: 5-10 个
- **E2E 测试**: 3-5 个关键流程
- **总计**: 30-35 个测试

**覆盖率目标**:
- 计算引擎: 100% ✅
- API 层: 90%
- 前端: 80%
- E2E: 关键流程 100%

---

## 经验教训

1. **测试金字塔要完整**
   - 不能只有单元测试
   - 必须有集成和 E2E 测试

2. **环境差异要测试**
   - 本地 vs 生产
   - 不同配置

3. **部署前必须验证**
   - Preview 环境
   - 自动化 smoke test

4. **避免硬编码**
   - 使用环境变量
   - 相对路径优先
