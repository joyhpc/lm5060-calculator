# LM5060 Datasheet 深度分析报告

## 执行摘要

通过对比 opendatasheet 提取数据、ic-eval-tool 实现和我们的 MVP，发现了以下关键问题：

---

## 1. opendatasheet 缺失的关键数据

### 1.1 设计公式（Design Formulas）❌

**状态**：完全未提取

**影响**：无法自动生成计算器，需要手动从 datasheet 或 ic-eval-tool 移植公式

**应该提取的内容**（来自 LM5060 datasheet Section 8.2.2）：

```json
{
  "design_formulas": [
    {
      "name": "R8_OVP_resistor",
      "formula": "R8 = R11 × (VIN_MAX - OVPTH) / OVPTH",
      "variables": {
        "R8": {"unit": "kΩ", "description": "OVP pull-up resistor"},
        "R11": {"unit": "kΩ", "description": "OVP pull-down resistor", "typical": 10.0},
        "VIN_MAX": {"unit": "V", "description": "Maximum input voltage"},
        "OVPTH": {"unit": "V", "description": "OVP threshold", "typical": 2.0}
      },
      "source": {"page": 22, "section": "8.2.2.1"},
      "purpose": "Set OVP trip voltage"
    },
    {
      "name": "R10_UVLO_resistor",
      "formula": "R10 = (VIN_MIN - UVLOTH) / (UVLOBIAS + UVLOTH / R11)",
      "variables": {
        "R10": {"unit": "kΩ", "description": "UVLO pull-up resistor"},
        "R11": {"unit": "kΩ", "description": "UVLO pull-down resistor", "typical": 10.0},
        "VIN_MIN": {"unit": "V", "description": "Minimum input voltage"},
        "UVLOTH": {"unit": "V", "description": "UVLO threshold", "typical": 1.6},
        "UVLOBIAS": {"unit": "A", "description": "UVLO bias current", "typical": 5.5e-6}
      },
      "source": {"page": 22, "section": "8.2.2.2"},
      "purpose": "Set UVLO rising threshold"
    },
    {
      "name": "C_TIMER",
      "formula": "C_TIMER = (t_delay × ITIMERH) / VTMRH",
      "variables": {
        "C_TIMER": {"unit": "nF", "description": "TIMER capacitor"},
        "t_delay": {"unit": "ms", "description": "Desired OCP delay"},
        "ITIMERH": {"unit": "µA", "description": "TIMER charge current", "typical": 11},
        "VTMRH": {"unit": "V", "description": "TIMER trip threshold", "typical": 2.0}
      },
      "source": {"page": 20, "section": "8.2.2.3"},
      "purpose": "Set overcurrent protection delay"
    },
    {
      "name": "Rs_SENSE_resistor",
      "formula": "Rs = (VDS_TH / ISENSE) + (RO × IOUT_EN / ISENSE)",
      "variables": {
        "Rs": {"unit": "Ω", "description": "SENSE resistor"},
        "VDS_TH": {"unit": "V", "description": "VDS threshold = I_LIMIT × RDS_ON"},
        "ISENSE": {"unit": "A", "description": "SENSE current", "typical": 16e-6},
        "RO": {"unit": "Ω", "description": "Internal compensation resistor", "typical": 10000},
        "IOUT_EN": {"unit": "A", "description": "OUT pin bias current", "typical": 8e-6}
      },
      "source": {"page": 19, "section": "8.2.2.4"},
      "purpose": "Set current limit threshold",
      "note": "RO and IOUT_EN are internal parameters, derived from Rs formula in datasheet"
    },
    {
      "name": "C_GATE",
      "formula": "C_GATE = IGATE / (dV/dt)",
      "variables": {
        "C_GATE": {"unit": "nF", "description": "GATE capacitor"},
        "IGATE": {"unit": "µA", "description": "GATE charge current", "typical": 24},
        "dV/dt": {"unit": "V/µs", "description": "Desired GATE slew rate"}
      },
      "source": {"page": 24, "section": "8.2.2.5"},
      "purpose": "Set GATE turn-on slew rate"
    }
  ]
}
```

---

### 1.2 典型应用电路（Typical Application Circuit）❌

**状态**：完全未提取

**影响**：无法自动识别外围器件连接关系、推荐值

**应该提取的内容**（来自 datasheet Figure 8-1, Page 23）：

```json
{
  "typical_application": {
    "figure": "Figure 8-1",
    "page": 23,
    "components": [
      {
        "designator": "R8",
        "type": "resistor",
        "connection": ["VIN", "OVP"],
        "typical_value": "170kΩ",
        "purpose": "OVP threshold setting"
      },
      {
        "designator": "R10",
        "type": "resistor",
        "connection": ["VIN", "UVLO"],
        "typical_value": "46.3kΩ",
        "purpose": "UVLO threshold setting"
      },
      {
        "designator": "R11",
        "type": "resistor",
        "connection": ["UVLO", "GND"],
        "typical_value": "10kΩ",
        "purpose": "UVLO divider bottom (fixed)"
      },
      {
        "designator": "Rs",
        "type": "resistor",
        "connection": ["SENSE", "OUT"],
        "typical_value": "9.38Ω",
        "purpose": "Current sense resistor"
      },
      {
        "designator": "C_TIMER",
        "type": "capacitor",
        "connection": ["TIMER", "GND"],
        "typical_value": "66nF",
        "purpose": "OCP delay timing"
      },
      {
        "designator": "C_GATE",
        "type": "capacitor",
        "connection": ["GATE", "OUT"],
        "typical_value": "48nF",
        "purpose": "GATE slew rate control"
      },
      {
        "designator": "Q1",
        "type": "MOSFET",
        "connection": ["GATE", "VIN", "OUT"],
        "typical_value": "N-channel, 30A, 60V",
        "purpose": "Main pass element"
      }
    ],
    "design_example": {
      "vin_range": "9V to 36V",
      "i_limit": "30A",
      "rds_on": "5mΩ",
      "ocp_delay": "12ms"
    }
  }
}
```

---

### 1.3 应用指南（Application Notes）❌

**状态**：完全未提取

**影响**：缺少设计经验、注意事项、最佳实践

**应该提取的内容**（来自 datasheet Section 8.2）：

```json
{
  "application_notes": [
    {
      "category": "component_selection",
      "title": "R11 Fixed Value Recommendation",
      "content": "R11 (UVLO divider bottom) should be fixed at 10kΩ for optimal performance",
      "rationale": "Minimizes UVLO threshold error and bias current impact",
      "source": {"page": 22, "section": "8.2.2.2"},
      "severity": "recommendation"
    },
    {
      "category": "component_selection",
      "title": "E96 Series Resistor Selection",
      "content": "Use E96 series resistors for R8 and R10 to minimize threshold errors",
      "rationale": "Standard ±1% tolerance provides adequate accuracy",
      "source": {"page": 22, "section": "8.2.2"},
      "severity": "recommendation"
    },
    {
      "category": "pcb_layout",
      "title": "SENSE Resistor Placement",
      "content": "Keep Rs trace short and away from switching nodes",
      "rationale": "Minimize noise coupling to current sense path",
      "consequence": "False OCP triggering due to noise",
      "source": {"page": 28, "section": "10.2"},
      "severity": "critical"
    },
    {
      "category": "design_limits",
      "title": "MOSFET RDS(ON) Selection",
      "content": "Choose MOSFET with RDS(ON) that gives VDS > 7mV at I_LIMIT",
      "rationale": "VDS comparator offset is ±7mV, need margin for reliable detection",
      "source": {"page": 19, "section": "8.2.2.4"},
      "severity": "critical"
    }
  ]
}
```

---

## 2. 已提取但需要增强的数据

### 2.1 电气特性（Electrical Characteristics）✓ 部分完成

**当前状态**：57 个参数已提取，但缺少关联信息

**需要增强**：

1. **参数之间的关系**
```json
{
  "symbol": "VTMRH",
  "parameter": "Timer fault threshold",
  "typical": 2.0,
  "unit": "V",
  "related_to": ["ITIMERH", "C_TIMER"],  // ← 新增
  "used_in_formulas": ["C_TIMER_calculation"]  // ← 新增
}
```

2. **内部参数标注**
```json
{
  "symbol": "IOUT-EN",
  "parameter": "OUT pin bias current",
  "typical": 8,
  "unit": "µA",
  "is_internal": false,  // ← 新增
  "used_in_design": true,  // ← 新增：是否用于外围器件计算
  "note": "Used in Rs calculation as reverse compensation current"  // ← 新增
}
```

3. **测试条件的结构化**
```json
{
  "symbol": "ITIMERH",
  "conditions": "TIMER charge current after start-up, VGS = 6.5 V, TJ = 25°C",
  "conditions_structured": {  // ← 新增
    "phase": "after_start_up",
    "VGS": 6.5,
    "temperature": 25,
    "temperature_unit": "°C"
  }
}
```

---

## 3. 我们 MVP 中的数据来源分析

### 3.1 常数来源统计

| 常数 | opendatasheet | 手动添加 | 来源说明 |
|------|--------------|---------|---------|
| OVP_THRESHOLD | ✓ | | OVPTH = 2.0V |
| UVLO_THRESHOLD | ✓ | | UVLOTH = 1.6V |
| UVLO_BIAS_CURRENT | ✓ | | UVLOBIAS = 5.5µA |
| TIMER_CHARGE_CURRENT | ✓ | | ITIMERH = 11µA |
| GATE_CHARGE_CURRENT | ✓ | | IGATE = 24µA |
| SENSE_CURRENT | ✓ | | ISENSE = 16µA |
| **DIVIDER_BOTTOM** | | ✓ | R11 = 10kΩ（推荐固定值，来自 datasheet 应用指南） |
| **TIMER_TRIP_VOLTAGE** | | ✓ | VTMRH = 2.0V（**实际在 opendatasheet 中有，但我们没用**） |
| **REVERSE_COMP_CURRENT** | | ✓ | IOUT-EN = 8µA（**实际在 opendatasheet 中有，但符号不同**） |
| **REVERSE_COMP_RESISTOR** | | ✓ | RO = 10kΩ（内部参数，从 Rs 公式反推） |

### 3.2 发现的问题

1. **VTMRH 遗漏**：opendatasheet 已提取（VTMRH = 2.0V），但我们没有使用，而是手动添加了 `TIMER_TRIP_VOLTAGE`

2. **IOUT-EN 符号不匹配**：opendatasheet 提取为 `IOUT-EN`，ic-eval-tool 称为 `reverseCompMicroAmp`，我们称为 `REVERSE_COMP_CURRENT`

3. **RO 内部参数**：10kΩ 是芯片内部的补偿电阻，datasheet 没有直接给出，是从 Rs 公式中反推的

---

## 4. 公式验证

### 4.1 Rs 公式的深入分析

**Datasheet 公式**（Page 19）：
```
Rs = VDS_TH / 16µA + (RO × 8µA) / 16µA
```

**拆解**：
- `VDS_TH / 16µA`：主检测项
- `(RO × 8µA) / 16µA`：反向补偿项
- `RO = 10kΩ`：内部补偿电阻（未在电气特性表中列出）
- `8µA`：OUT pin bias current（在电气特性表中为 `IOUT-EN`）

**ic-eval-tool 实现**：
```javascript
const rs = (vDsth / (senseCurrentMicroAmp * 1e-6))
    + ((reverseCompOhm * reverseCompMicroAmp * 1e-6) / (senseCurrentMicroAmp * 1e-6));
```

**我们的实现**：
```python
rs_raw = (v_dsth_raw / i_sense) + (r_comp * i_comp / i_sense)
```

**结论**：✓ 公式正确，但常数命名不一致

---

## 5. 给 opendatasheet 的改进建议

### 5.1 新增数据类型

建议在 `extraction` 中新增以下字段：

```json
{
  "extraction": {
    "component": {...},
    "absolute_maximum_ratings": [...],
    "electrical_characteristics": [...],
    "pin_definitions": [...],
    
    // ===== 新增 =====
    "design_formulas": [
      {
        "name": "string",
        "formula": "string (LaTeX or plain text)",
        "variables": {
          "var_name": {
            "unit": "string",
            "description": "string",
            "typical": "number (optional)",
            "refers_to": "symbol in electrical_characteristics (optional)"
          }
        },
        "source": {"page": "number", "section": "string"},
        "purpose": "string"
      }
    ],
    
    "typical_application": {
      "figure": "string",
      "page": "number",
      "components": [
        {
          "designator": "string",
          "type": "resistor|capacitor|mosfet|diode|...",
          "connection": ["pin1", "pin2"],
          "typical_value": "string",
          "purpose": "string"
        }
      ],
      "design_example": {
        "parameter_name": "value with unit"
      }
    },
    
    "application_notes": [
      {
        "category": "component_selection|pcb_layout|design_limits|...",
        "title": "string",
        "content": "string",
        "rationale": "string (optional)",
        "consequence": "string (optional)",
        "source": {"page": "number", "section": "string"},
        "severity": "info|recommendation|warning|critical"
      }
    ]
  }
}
```

### 5.2 增强现有数据

在 `electrical_characteristics` 中增加字段：

```json
{
  "symbol": "IOUT-EN",
  "parameter": "OUT pin bias current, enabled",
  "typical": 8,
  "unit": "µA",
  
  // ===== 新增 =====
  "is_internal": false,
  "used_in_design": true,
  "used_in_formulas": ["Rs_SENSE_resistor"],
  "alternative_names": ["reverseCompMicroAmp", "REVERSE_COMP_CURRENT"],
  "related_parameters": ["ISENSE", "Rs"]
}
```

---

## 6. 对我们 MVP 的改进建议

### 6.1 立即修复

1. **使用 opendatasheet 的 VTMRH**
```python
# 当前（错误）
TIMER_TRIP_VOLTAGE = ConstantValue(
    typical=2.0,
    source="Datasheet Section 8.2.2.3"  # 手动添加
)

# 应该
TIMER_TRIP_VOLTAGE = ConstantValue(
    typical=2.0,
    source="opendatasheet:VTMRH"  # 从 opendatasheet 提取
)
```

2. **使用 opendatasheet 的 IOUT-EN**
```python
# 当前（错误）
REVERSE_COMP_CURRENT = ConstantValue(
    typical=8.0,
    source="ic-eval-tool (needs datasheet verification)"
)

# 应该
REVERSE_COMP_CURRENT = ConstantValue(
    typical=8.0,
    source="opendatasheet:IOUT-EN"  # 从 opendatasheet 提取
)
```

### 6.2 文档改进

在 `constants.py` 中添加注释：

```python
# REVERSE_COMP_CURRENT
# Datasheet symbol: IOUT-EN (OUT pin bias current)
# Used in Rs calculation as reverse compensation term
# Formula: Rs = VDS_TH/ISENSE + (RO × IOUT-EN)/ISENSE
# Source: opendatasheet (IOUT-EN)
REVERSE_COMP_CURRENT = ConstantValue(...)

# REVERSE_COMP_RESISTOR
# Internal compensation resistor (not in electrical characteristics table)
# Derived from Rs formula in datasheet Section 8.2.2.4
# Value: 10kΩ (typical)
# Source: Datasheet formula analysis
REVERSE_COMP_RESISTOR = ConstantValue(...)
```

---

## 7. 总结

### 7.1 opendatasheet 的优势
- ✅ 电气特性提取完整（57 个参数）
- ✅ 有 min/typ/max 值
- ✅ 有测试条件
- ✅ 可追溯到 datasheet 页码

### 7.2 opendatasheet 的不足
- ❌ 缺少设计公式（最关键）
- ❌ 缺少典型应用电路
- ❌ 缺少应用指南
- ❌ 参数之间缺少关联信息

### 7.3 影响
- 无法完全自动化生成计算器
- 仍需手动从 datasheet 或 ic-eval-tool 提取公式
- 需要人工理解参数之间的关系

### 7.4 建议优先级

**P0（最高）**：
1. 提取设计公式（design_formulas）
2. 提取典型应用电路（typical_application）

**P1（高）**：
3. 提取应用指南（application_notes）
4. 增强电气特性的关联信息

**P2（中）**：
5. 参数符号的别名映射
6. 内部参数标注

---

**报告日期**：2026-04-02
**分析对象**：LM5060 (SNVS628H)
**opendatasheet 版本**：data/extracted_v2/lm5060_ds.json
