# LM5060 Calculator - 快速开始

## 安装

```bash
cd /home/ubuntu/lm5060-calculator
# 无需安装，直接使用
```

## 使用方式

### 1. Python API

```python
from lm5060 import compute_bom, compute_performance, ForwardInput, ReverseInput

# 正向计算：系统需求 → BOM
input_data = ForwardInput(
    vin_min=9.0,      # 最小输入电压 (V)
    vin_max=36.0,     # 最大输入电压 (V)
    i_limit=30.0,     # 电流限制 (A)
    rds_on=5.0,       # MOSFET 导通电阻 (mΩ)
    ocp_delay=12.0,   # 过流保护延时 (ms)
    dvdt=0.5          # 门极转换速率 (V/µs)
)

bom = compute_bom(input_data)
print(f"R8={bom.R8}kΩ, Rs={bom.Rs}Ω, C_TIMER={bom.C_TIMER}nF")

# 反向计算：BOM → 性能
reverse_input = ReverseInput(
    R8=170.0, R10=46.25, R11=10.0,
    Rs=14556.96, C_TIMER=64.5, C_GATE=48.0,
    rds_on=5.0
)

perf = compute_performance(reverse_input)
print(f"UVLO={perf.uvlo_rising}V, OVP={perf.ovp_threshold}V")
```

### 2. CLI - 命令行

```bash
# 正向计算
python3 -m lm5060.cli forward \
  --vin-min 9 --vin-max 36 --i-limit 30 \
  --rds-on 5 --ocp-delay 12 --dvdt 0.5

# 反向计算
python3 -m lm5060.cli reverse \
  --r8 170 --r10 46.25 --rs 14556.96 \
  --c-timer 64.5 --c-gate 48 --rds-on 5

# 健康检查
python3 -m lm5060.cli forward \
  --vin-min 9 --vin-max 36 --i-limit 30 \
  --rds-on 5 --ocp-delay 12 --dvdt 0.5 \
  --health-check
```

### 3. CLI - JSON 工作流

```bash
# 创建输入文件
cat > input.json << 'JSONEOF'
{
  "vin_min": 12.0,
  "vin_max": 48.0,
  "i_limit": 20.0,
  "rds_on": 10.0,
  "ocp_delay": 10.0,
  "dvdt": 1.0
}
JSONEOF

# 正向计算 → BOM
python3 -m lm5060.cli forward --json input.json --output bom.json

# 反向计算 → 性能
python3 -m lm5060.cli reverse --json bom.json --output performance.json
```

## 输出说明

### 正向计算输出（BOM）

| 参数 | 说明 | 单位 |
|------|------|------|
| R8 | OVP 上拉电阻 | kΩ |
| R10 | UVLO 上拉电阻 | kΩ |
| R11 | 分压器底部电阻（固定 10kΩ） | kΩ |
| Rs | SENSE 检测电阻 | Ω |
| C_TIMER | TIMER 定时电容 | nF |
| C_GATE | GATE 门极电容 | nF |
| V_DSTH | VDS 检测阈值 | mV |

### 反向计算输出（性能）

| 参数 | 说明 | 单位 |
|------|------|------|
| uvlo_rising | UVLO 上升阈值 | V |
| uvlo_falling | UVLO 下降阈值（带迟滞） | V |
| ovp_threshold | OVP 触发阈值 | V |
| ocp_delay | 过流保护延时 | ms |
| i_limit | 电流限制 | A |
| gate_slew_rate | 门极转换速率 | V/µs |
| vds_threshold | VDS 检测阈值 | mV |

## 典型应用场景

### 场景 1：设计新电路
1. 确定系统需求（电压范围、电流限制等）
2. 使用正向计算得到 BOM
3. 采购标准阻容值（可使用 E96 系列）
4. 使用反向计算验证实际性能

### 场景 2：分析现有电路
1. 测量电路板上的阻容值
2. 使用反向计算得到性能参数
3. 验证是否满足系统需求

### 场景 3：优化设计
1. 使用正向计算得到初始 BOM
2. 使用反向计算验证性能
3. 调整参数重新计算
4. 使用健康检查确保数值稳定

## 注意事项

1. **单位**：
   - 电压：V
   - 电流：A
   - 电阻：kΩ（R8/R10/R11）或 Ω（Rs）
   - 电容：nF
   - 时间：ms
   - RDS(ON)：mΩ

2. **精度**：
   - 往返误差 < 0.1%
   - 中间计算使用 Decimal 10 位精度

3. **健康检查**：
   - HEALTHY: 条件数 < 1e4（正常）
   - WARNING: 1e4 ≤ 条件数 < 1e6（敏感）
   - CRITICAL: 条件数 ≥ 1e6（病态，结果不可靠）

## 测试

```bash
# 运行所有测试
python3 -m pytest tests/ -v

# 运行特定测试
python3 -m pytest tests/test_forward.py -v
python3 -m pytest tests/test_roundtrip.py -v
```

## 文档

- `README.md`: 项目概述
- `VALIDATION.md`: 验证报告（常数、公式、精度）
- `DATASHEET_ANALYSIS.md`: Datasheet 深度分析
- `ARCHITECTURE.md`: 架构设计
- `DELIVERY.md`: 交付报告

## 数据来源

- **Datasheet**: TI LM5060 SNVS628H
- **常数提取**: opendatasheet (57 个电气参数)
- **公式来源**: Datasheet Section 8.2.2

## 支持

- GitHub Issue: https://github.com/joyhpc/opendatasheet/issues/27
- 项目路径: `/home/ubuntu/lm5060-calculator`
