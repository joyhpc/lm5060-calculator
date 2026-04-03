# WCA 计算器测试文档

## 测试覆盖概览

### TypeScript 测试（Vitest）
- 位置：`lib/__tests__/wca-engine.test.ts`
- 运行：`npm test`
- 覆盖：30 个测试用例

### Python 测试（pytest）
- 位置：`tests/test_forward.py`, `tests/test_roundtrip.py`
- 运行：`pytest`
- 覆盖：正向计算、反向验算、单调性测试

## TypeScript 测试详细覆盖

### 1. 单位转换正确性（4 个测试）
防止 R10 单位转换 bug 复现：

- ✅ R10_ideal 必须在 1kΩ ~ 1000kΩ 范围内
- ✅ UVLO 开启电压必须在 5V ~ 80V 范围内
- ✅ OVP 触发电压必须在 5V ~ 80V 范围内
- ✅ 电流限制必须在 0.1A ~ 100A 范围内

### 2. 回归测试（2 个测试）
确保已修复的 bug 不会复现：

- ✅ vin_min=9V 应该产生 UVLO ≈ 9.28V，而非 7401V
- ✅ R10_ideal 计算后必须转换为 kΩ（不能是 Ω）

### 3. 基础计算正确性（5 个测试）

- ✅ R8 计算：基于 OVP 阈值和 vin_max
- ✅ Rs 计算：基于电流限制
- ✅ C_TIMER 计算：基于 OCP 延时
- ✅ C_GATE 计算：基于 dV/dt

### 4. E96/E24 标准电阻吸附（6 个测试）

- ✅ E96 吸附：170.23 kΩ → 169.0 kΩ
- ✅ E96 吸附：46.25 kΩ → 46.4 kΩ
- ✅ E24 吸附：170.23 kΩ → 180 kΩ
- ✅ E96 吸附：小数值 1.23 kΩ → 1.24 kΩ
- ✅ E96 吸附：大数值 999 kΩ → 976 kΩ
- ✅ getAlternativeResistors 返回 5 个备选值（前后各 2 个）

### 5. 容差传播计算（3 个测试）

- ✅ 5% 容差的区间宽度 > 1% 容差
- ✅ 0.1% 容差的区间宽度 < 1% 容差
- ✅ Min < Typ < Max 顺序正确

### 6. 迟滞电流偏移计算（3 个测试）

- ✅ 迟滞电流导致 UVLO 关断电压低于开启电压
- ✅ 迟滞偏移量在合理范围内（0.1V ~ 2V）
- ✅ 迟滞偏移量的 min/typ/max 顺序正确

### 7. 边界条件测试（4 个测试）

- ✅ 最小输入电压：vin_min = 5V
- ✅ 最大输入电压：vin_max = 80V
- ✅ 最小电流限制：i_limit = 0.5A
- ✅ 最大电流限制：i_limit = 100A

### 8. 集成测试（4 个测试）

- ✅ 完整的正向计算流程（输入 → BOM）
- ✅ 反向验算精度：标准电阻导致的阈值漂移 < 5%
- ✅ 浪涌电流计算：提供 c_load 和 connector_max_current
- ✅ MOSFET SOA 检查：提供 mosfet_i2t_limit

## 关键验证点

### 单位转换
- R10_ideal 计算后必须转换为 kΩ
- 所有电压输出必须在合理范围（5-80V）
- 容差计算：5% 容差的区间宽度 > 1% 容差
- E96 吸附：170.23 kΩ → 169.0 kΩ

### 输出范围断言
- UVLO 开启电压：5V ~ 80V
- OVP 触发电压：5V ~ 80V
- 电流限制：0.1A ~ 100A
- R10_ideal 必须在 1kΩ ~ 1000kΩ

## 运行测试

### TypeScript 测试
```bash
npm test                 # 运行所有测试
npm run test:ui          # 打开 Vitest UI
```

### Python 测试
```bash
pytest                   # 运行所有 Python 测试
pytest tests/test_forward.py -v  # 运行特定测试文件
```

## 测试框架

- **TypeScript**: Vitest 4.1.2
- **Python**: pytest 9.0.2

## 持续集成

测试应该在以下情况下运行：
1. 每次代码提交前
2. Pull Request 创建时
3. 合并到主分支前

## 添加新测试

### TypeScript 测试
在 `lib/__tests__/wca-engine.test.ts` 中添加新的 `describe` 或 `it` 块：

```typescript
describe('新功能测试', () => {
  it('应该满足某个条件', () => {
    const result = computeWCA({ /* 输入参数 */ })
    expect(result.某个字段).toBe(期望值)
  })
})
```

### Python 测试
在 `tests/` 目录下创建新的 `test_*.py` 文件：

```python
def test_new_feature():
    """测试新功能"""
    result = compute_bom(input_data)
    assert result.field == expected_value
```

## 测试覆盖率

当前测试覆盖了：
- ✅ 核心计算逻辑
- ✅ 单位转换
- ✅ 边界条件
- ✅ 容差传播
- ✅ 标准电阻吸附
- ✅ 回归测试（已修复的 bug）

未来可以添加：
- ⏳ 性能测试（大批量计算）
- ⏳ 模糊测试（随机输入）
- ⏳ 端到端测试（Web UI）
