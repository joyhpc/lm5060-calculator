---
name: LM5060 Calculator Design
description: Python-based LM5060 hot-swap controller calculator with bidirectional computation
type: design
---

# LM5060 Calculator Design Specification

## 1. 项目概述

### 1.1 目标
构建 LM5060 热插拔控制器的 Python 计算器，支持双向计算：
- **正向计算**：根据系统需求（电压范围、限流、保护时间）计算外围器件参数
- **反向计算**：根据已有外围器件参数计算系统性能指标

### 1.2 设计原则
- **数据与逻辑分离**：参考 powercopilot 的 DAG pipeline 架构
- **可验证性**：支持 golden test cases 验证
- **可复用性**：模块化设计，可被其他脚本 import
- **快速闭环**：移植 ic-eval-tool 已验证的计算公式

---

## 2. 架构设计

### 2.1 目录结构
```
lm5060-calculator/
├── README.md
├── requirements.txt
├── main.py                      # 统一入口
├── lm5060/
│   ├── __init__.py
│   ├── constants.py             # LM5060 datasheet 常数
│   ├── schemas.py               # Pydantic 数据模型
│   ├── forward_engine.py        # 正向计算引擎
│   ├── reverse_engine.py        # 反向计算引擎
│   └── cli.py                   # 命令行接口
└── tests/
    ├── test_forward.py
    ├── test_reverse.py
    └── golden_cases.json        # 验证用例
```

### 2.2 数据流
```
正向计算流程：
用户需求 → ForwardInput (schemas) → forward_engine → BOMResult → 输出

反向计算流程：
器件参数 → ReverseInput (schemas) → reverse_engine → PerformanceResult → 输出
```

---

## 3. 数据模型设计

### 3.1 正向计算输入（ForwardInput）
```python
class ForwardInput(BaseModel):
    vin_min: float          # 最低工作电压 (V)，范围 4.5-80V
    vin_max: float          # 最高工作电压 (V)，范围 4.5-80V
    i_limit: float          # 限流电流 (A)，典型 1-50A
    rds_on: float           # MOSFET 导通电阻 (mΩ)
    ocp_delay: float        # 过流保护延时 (ms)，典型 1-100ms
    dvdt: float             # GATE 压摆率 (V/μs)，典型 0.1-2 V/μs
```

### 3.2 正向计算输出（BOMResult）
```python
class BOMResult(BaseModel):
    R8: float               # OVP 上拉电阻 (kΩ)
    R10: float              # UVLO 上拉电阻 (kΩ)
    R11: float = 10.0       # UVLO 下拉电阻 (kΩ)，固定值
    Rs: float               # SENSE 电阻 (Ω)
    C_TIMER: float          # TIMER 电容 (nF)
    C_GATE: float           # GATE 电容 (nF)
    V_DSTH: float           # VDS 阈值电压 (mV)，中间结果
```

### 3.3 反向计算输入（ReverseInput）
```python
class ReverseInput(BaseModel):
    R8: float               # OVP 上拉电阻 (kΩ)
    R10: float              # UVLO 上拉电阻 (kΩ)
    R11: float = 10.0       # UVLO 下拉电阻 (kΩ)
    Rs: float               # SENSE 电阻 (Ω)
    C_TIMER: float          # TIMER 电容 (nF)
    C_GATE: float           # GATE 电容 (nF)
    rds_on: float           # MOSFET 导通电阻 (mΩ)，用于反推限流
```

### 3.4 反向计算输出（PerformanceResult）
```python
class PerformanceResult(BaseModel):
    uvlo_rising: float      # UVLO 上升阈值 (V)
    uvlo_falling: float     # UVLO 下降阈值 (V)，考虑迟滞
    ovp_threshold: float    # OVP 触发电压 (V)
    ocp_delay: float        # 过流保护延时 (ms)
    i_limit: float          # 限流电流 (A)
    gate_slew_rate: float   # GATE 压摆率 (V/μs)
    vds_threshold: float    # VDS 阈值电压 (mV)
```

---

## 4. 计算引擎设计

### 4.1 常数定义（constants.py）
从 ic-eval-tool 的 `lm5060Hardware.js` 移植：
```python
LM5060_CONSTANTS = {
    "OVP_THRESHOLD": 2.0,           # OVP 比较器阈值 (V)
    "UVLO_THRESHOLD": 1.6,          # UVLO 比较器阈值 (V)
    "UVLO_BIAS_CURRENT": 5.5e-6,    # UVLO 偏置电流 (A)
    "DIVIDER_BOTTOM": 10.0,         # R11 固定值 (kΩ)
    "TIMER_CHARGE_CURRENT": 11e-6,  # TIMER 充电电流 (A)
    "TIMER_TRIP_VOLTAGE": 2.0,      # TIMER 触发电压 (V)
    "GATE_CHARGE_CURRENT": 24e-6,   # GATE 充电电流 (A)
    "SENSE_CURRENT": 16e-6,         # SENSE 引脚电流 (A)
    "REVERSE_COMP_CURRENT": 8e-6,   # 反向补偿电流 (A)
    "REVERSE_COMP_RESISTOR": 10000, # 反向补偿电阻 (Ω)
}
```

### 4.2 正向计算引擎（forward_engine.py）
核心函数：`compute_bom(input: ForwardInput) -> BOMResult`

**计算公式**（移植自 ic-eval-tool）：
```python
# OVP 上拉电阻
R8 = R11 * (vin_max - V_OVP) / V_OVP

# UVLO 上拉电阻
R10 = (vin_min - V_UVLO) / (I_UVLO_BIAS + V_UVLO / R11)

# TIMER 电容
C_TIMER = (ocp_delay * I_TIMER) / V_TIMER_TRIP

# VDS 阈值电压
V_DSTH = i_limit * (rds_on / 1000)

# SENSE 电阻
Rs = (V_DSTH / I_SENSE) + (R_COMP * I_COMP / I_SENSE)

# GATE 电容
C_GATE = I_GATE / dvdt
```

### 4.3 反向计算引擎（reverse_engine.py）
核心函数：`compute_performance(input: ReverseInput) -> PerformanceResult`

**反推公式**：
```python
# UVLO 上升阈值
uvlo_rising = V_UVLO * (1 + R10 / R11) + I_UVLO_BIAS * R10

# OVP 触发电压
ovp_threshold = V_OVP * (1 + R8 / R11)

# 过流保护延时
ocp_delay = (C_TIMER * V_TIMER_TRIP) / I_TIMER

# 限流电流
V_DSTH = (Rs - R_COMP * I_COMP / I_SENSE) * I_SENSE
i_limit = V_DSTH / (rds_on / 1000)

# GATE 压摆率
gate_slew_rate = I_GATE / C_GATE
```

---

## 5. 命令行接口设计

### 5.1 正向计算模式
```bash
python main.py forward \
  --vin-min 9.0 \
  --vin-max 36.0 \
  --i-limit 30.0 \
  --rds-on 5.0 \
  --ocp-delay 12.0 \
  --dvdt 0.5
```

**输出示例**：
```json
{
  "R8": 170.00,
  "R10": 46.30,
  "R11": 10.00,
  "Rs": 9.38,
  "C_TIMER": 66.0,
  "C_GATE": 48.0,
  "V_DSTH": 150.0
}
```

### 5.2 反向计算模式
```bash
python main.py reverse \
  --R8 170.0 \
  --R10 46.3 \
  --Rs 9.38 \
  --C-TIMER 66.0 \
  --C-GATE 48.0 \
  --rds-on 5.0
```

**输出示例**：
```json
{
  "uvlo_rising": 9.02,
  "uvlo_falling": 8.85,
  "ovp_threshold": 36.0,
  "ocp_delay": 12.0,
  "i_limit": 30.0,
  "gate_slew_rate": 0.5,
  "vds_threshold": 150.0
}
```

### 5.3 JSON 文件输入
```bash
python main.py forward --input config.json
python main.py reverse --input bom.json
```

---

## 6. 测试策略与正确性保证

### 6.1 公式来源验证（三重交叉验证）

**验证层级**：
1. **Datasheet 公式提取**
   - 从 LM5060 datasheet 手动提取所有计算公式
   - 记录公式所在页码和章节号
   - 标注公式适用条件和限制

2. **ic-eval-tool 交叉验证**
   - 对比 `/home/ubuntu/ic-eval-tool/src/lib/lm5060Hardware.js` 的实现
   - 验证常数值是否与 datasheet 一致
   - 检查是否有隐含的修正系数

3. **实际案例反推**
   - 从 TI 官方设计案例（Application Note）提取输入输出
   - 用我们的公式计算，对比官方结果
   - 误差超过 5% 则标记为待确认

**实施步骤**：
```python
# constants.py 中每个常数必须标注来源
LM5060_CONSTANTS = {
    "OVP_THRESHOLD": 2.0,  # Datasheet p.12, Table 6-3
    "UVLO_THRESHOLD": 1.6, # Datasheet p.12, Table 6-3
    # ... 每个常数都有出处
}
```

### 6.2 精度控制策略

**问题识别**：
- 电阻值：kΩ 级别，需要 2-3 位有效数字
- 电容值：nF 级别，需要 1-2 位有效数字
- 电流：μA 级别的偏置电流，需要科学计数法
- 中间计算：避免浮点累积误差

**精度规范**：
```python
class PrecisionConfig:
    RESISTOR_DIGITS = 2      # 电阻保留 2 位小数（kΩ）
    CAPACITOR_DIGITS = 1     # 电容保留 1 位小数（nF）
    VOLTAGE_DIGITS = 2       # 电压保留 2 位小数（V）
    CURRENT_DIGITS = 2       # 电流保留 2 位小数（A）
    
    # 中间计算使用 Decimal 避免浮点误差
    USE_DECIMAL = True
    DECIMAL_PRECISION = 10   # 中间计算精度
```

**实现方式**：
```python
from decimal import Decimal, getcontext

def compute_bom(input: ForwardInput) -> BOMResult:
    # 设置高精度上下文
    getcontext().prec = 10
    
    # 转换为 Decimal 计算
    vin_max = Decimal(str(input.vin_max))
    ovp_th = Decimal(str(LM5060_CONSTANTS["OVP_THRESHOLD"]))
    
    # 计算
    R8_raw = (vin_max - ovp_th) / ovp_th * Decimal("10.0")
    
    # 输出时四舍五入
    R8 = round(float(R8_raw), 2)
```

### 6.3 Golden Test Cases
从 ic-eval-tool 提取验证用例，确保计算结果一致性：
```json
{
  "cases": [
    {
      "name": "12V 系统，30A 限流",
      "source": "ic-eval-tool default params",
      "forward_input": {
        "vin_min": 9.0,
        "vin_max": 36.0,
        "i_limit": 30.0,
        "rds_on": 5.0,
        "ocp_delay": 12.0,
        "dvdt": 0.5
      },
      "expected_bom": {
        "R8": 170.0,
        "R10": 46.3,
        "Rs": 9.38,
        "C_TIMER": 66.0,
        "C_GATE": 48.0
      },
      "tolerance": 0.05
    }
  ]
}
```

### 6.4 往返验证（Round-trip Test）
```python
def test_roundtrip():
    # 正向计算
    forward_input = ForwardInput(vin_min=9.0, vin_max=36.0, ...)
    bom = forward_engine.compute_bom(forward_input)
    
    # 反向计算
    reverse_input = ReverseInput(**bom.dict(), rds_on=5.0)
    perf = reverse_engine.compute_performance(reverse_input)
    
    # 验证误差 < 1%
    assert abs(perf.i_limit - forward_input.i_limit) / forward_input.i_limit < 0.01
    assert abs(perf.ovp_threshold - forward_input.vin_max) / forward_input.vin_max < 0.01
```

### 6.5 边界条件测试
```python
def test_boundary_conditions():
    # 最小输入电压
    test_case_1 = ForwardInput(vin_min=4.5, vin_max=5.5, ...)
    
    # 最大输入电压
    test_case_2 = ForwardInput(vin_min=70.0, vin_max=80.0, ...)
    
    # 极小电流
    test_case_3 = ForwardInput(i_limit=0.1, ...)
    
    # 极大电流
    test_case_4 = ForwardInput(i_limit=100.0, ...)
```

### 6.6 实施检查清单

**开发阶段**：
- [ ] 从 datasheet 提取公式，标注页码
- [ ] 对比 ic-eval-tool 源码，确认常数一致性
- [ ] 使用 Decimal 进行中间计算
- [ ] 输出时按精度规范四舍五入

**测试阶段**：
- [ ] 运行 ic-eval-tool，记录 3 组不同参数的输入输出
- [ ] 用 Python 实现计算，对比结果（误差 < 5%）
- [ ] 往返测试通过（误差 < 1%）
- [ ] 边界条件测试通过

**交付阶段**：
- [ ] 在 README 中列出公式来源（datasheet 页码）
- [ ] 在代码注释中标注每个常数的出处
- [ ] 提供精度说明文档

---

## 7. 依赖项

```txt
pydantic>=2.0.0
pytest>=7.0.0
# 精度控制不需要额外依赖，使用 Python 内置 decimal 模块
```

---

## 8. 实现优先级

### P0（核心功能）
1. constants.py - 常数定义
2. schemas.py - 数据模型
3. forward_engine.py - 正向计算
4. reverse_engine.py - 反向计算
5. cli.py - 命令行接口
6. main.py - 入口

### P1（验证）
7. tests/golden_cases.json - 验证用例
8. tests/test_forward.py - 正向计算测试
9. tests/test_reverse.py - 反向计算测试

### P2（文档）
10. README.md - 使用说明
11. 公式推导文档

---

## 9. 边界条件处理

### 9.1 输入验证
- vin_min < vin_max
- vin_min >= 4.5V, vin_max <= 80V
- i_limit > 0
- rds_on > 0
- ocp_delay > 0
- dvdt > 0

### 9.2 计算异常
- R8/R10 计算结果为负数 → 抛出 ValueError
- 除零保护
- 超出器件规格范围时给出警告

---

## 10. 扩展性考虑

### 10.1 未来可能的扩展
- 支持 LM5060-Q1（汽车级）变体
- 增加 MOSFET SOA（安全工作区）校验
- 增加热计算（功耗、温升）
- 支持批量计算（多组参数）

### 10.2 不在当前范围
- 状态机仿真（ic-eval-tool 的 lm5060.js 功能）
- GUI 界面
- 原理图生成

---

## 11. 参考资料

- LM5060 Datasheet (TI)
- ic-eval-tool 源码：`/home/ubuntu/ic-eval-tool/src/lib/lm5060Hardware.js`
- powercopilot 架构参考：`/home/ubuntu/powercopilot/`
