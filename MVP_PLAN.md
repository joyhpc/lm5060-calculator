# LM5060 Calculator MVP Plan

## 核心理念

基于红军评审的洞察，MVP 版本聚焦于：
1. **数值健康度优先**：不只给答案，给答案的置信区间
2. **工程可实现性**：E 系列量化 + 容差分析
3. **多源验证**：opendatasheet + ic-eval-tool + datasheet 手算
4. **反馈闭环**：从第一天就收集用户数据

---

## MVP 范围（2 周交付）

### 包含功能
1. ✅ 正向计算（需求 → BOM）
2. ✅ 反向计算（BOM → 性能）
3. ✅ 条件数监控（数值健康度检查）
4. ✅ E96 系列量化（可购买的标准值）
5. ✅ 基础验证测试（往返测试 + ic-eval-tool 交叉验证）

### 不包含功能（留给 v2）
- ❌ 蒙特卡洛容差分析
- ❌ 多版本常数库
- ❌ 众包验证平台
- ❌ Web UI
- ❌ 硬件测试数据库

---

## 架构设计

```
lm5060-calculator/
├── lm5060/
│   ├── __init__.py
│   ├── constants.py              # 从 opendatasheet 提取的常数
│   ├── schemas.py                # Pydantic 数据模型
│   ├── forward_engine.py         # 正向计算 + 条件数监控
│   ├── reverse_engine.py         # 反向计算
│   ├── quantizer.py              # E96 系列量化器
│   └── cli.py                    # CLI 接口
├── tests/
│   ├── test_forward.py
│   ├── test_reverse.py
│   ├── test_roundtrip.py
│   ├── test_quantization.py
│   ├── test_cross_validation.py  # 与 ic-eval-tool 对比
│   └── golden_cases.json
├── scripts/
│   ├── extract_constants_from_opendatasheet.py  # 从 opendatasheet 提取常数
│   └── validate_against_ic_eval_tool.py         # 与 ic-eval-tool 交叉验证
├── main.py
├── requirements.txt
└── README.md
```

---

## 数据流

```
┌─────────────────────────────────────────────────────────────┐
│  输入：用户需求                                               │
│  vin_min=9V, vin_max=36V, i_limit=30A, ...                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 1: 输入验证 + 条件数估计                                │
│  - 检查参数合法性                                             │
│  - 计算条件数 κ                                               │
│  - 如果 κ > 1e6 → 警告：病态输入                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: 正向计算（使用 Decimal 精度）                        │
│  - R8 = 170.00 kΩ                                           │
│  - R10 = 46.30 kΩ                                           │
│  - Rs = 9.38 Ω                                              │
│  - C_TIMER = 66.0 nF                                        │
│  - C_GATE = 48.0 nF                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: E96 量化                                            │
│  - R8: 170kΩ → 169kΩ (E96) 或 174kΩ (E96)                  │
│  - 计算量化误差对性能的影响                                   │
│  - 给出推荐值 + 备选值                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 4: 反向验证                                             │
│  - 用量化后的值反向计算性能                                   │
│  - 验证往返误差 < 1%                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  输出：完整报告                                               │
│  {                                                           │
│    "ideal_bom": {...},                                      │
│    "quantized_bom": {...},                                  │
│    "performance_after_quantization": {...},                 │
│    "health_report": {                                       │
│      "condition_number": 5000,                              │
│      "status": "HEALTHY",                                   │
│      "warnings": []                                         │
│    }                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 关键技术决策

### 1. 常数来源：opendatasheet

**理由**：
- opendatasheet 已经提取了 LM5060 的电气特性
- 有 min/typ/max 值
- 有来源标注（页码、表格）

**实施**：
```python
# scripts/extract_constants_from_opendatasheet.py
import json

def extract_constants():
    """从 opendatasheet 提取常数"""
    with open("/home/ubuntu/opendatasheet/data/extracted_v2/lm5060_ds.json") as f:
        data = json.load(f)
    
    # 提取电气特性
    constants = {}
    for param_name, param_data in data.get("electrical_characteristics", {}).items():
        constants[param_name] = {
            "typical": param_data.get("typ"),
            "min": param_data.get("min"),
            "max": param_data.get("max"),
            "unit": param_data.get("unit"),
            "source": f"opendatasheet: {param_data.get('source', 'unknown')}"
        }
    
    return constants
```

**如果 opendatasheet 缺少关键常数**：
- 提 issue 到 opendatasheet repo
- 临时手动补充，标注为 "manual_extraction"

---

### 2. 公式来源：ic-eval-tool

**理由**：
- ic-eval-tool 的公式已经验证过
- 直接移植，降低出错风险

**实施**：
```python
# 从 ic-eval-tool/src/lib/lm5060Hardware.js 移植
def compute_bom(input_data: ForwardInput) -> BOMResult:
    """
    公式来源：ic-eval-tool/src/lib/lm5060Hardware.js
    已验证：与 ic-eval-tool 输出一致（误差 < 5%）
    """
    # ... 实现
```

---

### 3. 验证策略：三层测试

**Layer 1: 数学自洽性**
```python
def test_roundtrip():
    """往返测试：正向 → 反向 → 验证误差 < 1%"""
    pass

def test_monotonicity():
    """单调性测试：输出随输入单调变化"""
    pass
```

**Layer 2: 与 ic-eval-tool 交叉验证**
```python
def test_cross_validation_with_ic_eval_tool():
    """
    对比我们的计算和 ic-eval-tool 的结果
    
    方法：
    1. 启动 ic-eval-tool 的 dev server
    2. 通过 HTTP API 或 puppeteer 获取计算结果
    3. 对比差异
    """
    pass
```

**Layer 3: Datasheet 手算验证**
```python
def test_datasheet_example():
    """
    使用 datasheet 第 23 页的设计示例验证
    """
    pass
```

---

### 4. 条件数监控

**实施**：
```python
def estimate_condition_number(input_data: ForwardInput) -> float:
    """
    估计条件数：衡量数值稳定性
    
    方法：有限差分法
    - 对每个输入参数施加小扰动（1%）
    - 计算输出变化
    - 条件数 = max(|∂output/∂input| * |input/output|)
    """
    epsilon = 0.01  # 1% 扰动
    
    base_result = compute_bom(input_data)
    
    # 对 vin_min 施加扰动
    perturbed_input = input_data.copy(update={"vin_min": input_data.vin_min * (1 + epsilon)})
    perturbed_result = compute_bom(perturbed_input)
    
    # 计算相对变化
    relative_input_change = epsilon
    relative_output_change = abs(perturbed_result.R10 - base_result.R10) / base_result.R10
    
    condition_number = relative_output_change / relative_input_change
    
    return condition_number
```

---

### 5. E96 量化器

**实施**：
```python
class E96Quantizer:
    """E96 电阻系列量化器"""
    
    E96_SERIES = [
        1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24,
        1.27, 1.30, 1.33, 1.37, 1.40, 1.43, 1.47, 1.50, 1.54, 1.58,
        1.62, 1.65, 1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00,
        2.05, 2.10, 2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55,
        2.61, 2.67, 2.74, 2.80, 2.87, 2.94, 3.01, 3.09, 3.16, 3.24,
        3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12,
        4.22, 4.32, 4.42, 4.53, 4.64, 4.75, 4.87, 4.99, 5.11, 5.23,
        5.36, 5.49, 5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65,
        6.81, 6.98, 7.15, 7.32, 7.50, 7.68, 7.87, 8.06, 8.25, 8.45,
        8.66, 8.87, 9.09, 9.31, 9.53, 9.76
    ]
    
    def quantize(self, value: float) -> QuantizedResult:
        """量化到最接近的 E96 值"""
        decade = 10 ** int(np.log10(value))
        normalized = value / decade
        
        # 找最接近的标准值
        closest = min(self.E96_SERIES, key=lambda x: abs(x - normalized))
        quantized_value = closest * decade
        
        # 计算量化误差
        error = abs(value - quantized_value) / value
        
        # 找备选值
        idx = self.E96_SERIES.index(closest)
        alternatives = []
        if idx > 0:
            alternatives.append(self.E96_SERIES[idx - 1] * decade)
        if idx < len(self.E96_SERIES) - 1:
            alternatives.append(self.E96_SERIES[idx + 1] * decade)
        
        return QuantizedResult(
            ideal_value=value,
            quantized_value=quantized_value,
            quantization_error=error,
            alternatives=alternatives
        )
```

---

## 实施计划（2 周）

### Week 1: 核心功能

**Day 1-2: 基础架构**
- [ ] 从 opendatasheet 提取常数
- [ ] 定义 Pydantic schemas
- [ ] 实现 forward_engine（移植 ic-eval-tool 公式）

**Day 3-4: 反向计算 + 验证**
- [ ] 实现 reverse_engine
- [ ] 往返测试
- [ ] 单调性测试

**Day 5: 条件数监控**
- [ ] 实现条件数估计
- [ ] 边界条件扫描测试
- [ ] 生成"安全参数空间地图"

### Week 2: 工程化 + 验证

**Day 6-7: E96 量化**
- [ ] 实现 E96Quantizer
- [ ] 量化误差分析
- [ ] 性能影响计算

**Day 8-9: 交叉验证**
- [ ] 与 ic-eval-tool 对比测试
- [ ] Datasheet 示例验证
- [ ] 生成差异报告

**Day 10: CLI + 文档**
- [ ] 实现 CLI 接口
- [ ] 编写 README
- [ ] 使用示例

---

## 交付物

### 代码
1. ✅ 可运行的 Python 包
2. ✅ 完整的测试套件（覆盖率 > 80%）
3. ✅ CLI 工具

### 文档
1. ✅ README（安装、使用、示例）
2. ✅ 公式来源说明（标注 opendatasheet + ic-eval-tool）
3. ✅ 验证报告（与 ic-eval-tool 的对比结果）

### 数据
1. ✅ 常数文件（从 opendatasheet 提取，标注来源）
2. ✅ Golden test cases（至少 3 个）
3. ✅ 参数空间安全地图（条件数分布图）

---

## 成功标准

### 功能性
- [ ] 正向计算误差 < 5%（与 ic-eval-tool 对比）
- [ ] 往返测试误差 < 1%
- [ ] 条件数监控能识别病态输入

### 工程性
- [ ] E96 量化后的性能偏差 < 3%
- [ ] 所有测试通过
- [ ] 代码覆盖率 > 80%

### 可用性
- [ ] CLI 能正常运行
- [ ] 输出格式清晰（JSON）
- [ ] 错误提示友好

---

## 风险与缓解

### 风险 1: opendatasheet 缺少关键常数

**缓解**：
- 提前检查 opendatasheet 的 LM5060 数据
- 如果缺少，提 issue 并临时手动补充
- 标注为 "manual_extraction"，等 opendatasheet 更新后替换

### 风险 2: 与 ic-eval-tool 差异过大

**缓解**：
- 先用 ic-eval-tool 的默认参数测试
- 如果差异 > 5%，逐个公式对比
- 可能是单位转换或常数值不同

### 风险 3: 条件数估计不准确

**缓解**：
- 使用有限差分法，简单可靠
- 如果不准确，至少能给出"可能不稳定"的警告
- v2 再优化（用雅可比矩阵）

---

## 后续迭代（v2）

基于 MVP 的用户反馈，v2 将增加：
1. 蒙特卡洛容差分析
2. 多版本常数库（Rev A/B）
3. Web UI
4. 硬件测试数据收集

---

## 立即行动

**第一步**：检查 opendatasheet 的 LM5060 数据完整性
```bash
cd /home/ubuntu/opendatasheet
python3 -c "
import json
with open('data/extracted_v2/lm5060_ds.json') as f:
    data = json.load(f)
print('Available keys:', list(data.keys()))
"
```

**第二步**：提取关键常数
```bash
cd /home/ubuntu/lm5060-calculator
python3 scripts/extract_constants_from_opendatasheet.py
```

**第三步**：开始实现 forward_engine
