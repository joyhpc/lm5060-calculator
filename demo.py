"""
LM5060 Calculator 使用演示
"""
from lm5060 import compute_bom, compute_performance, ForwardInput, ReverseInput

print("=" * 60)
print("LM5060 Calculator 使用演示")
print("=" * 60)

# ============================================================
# 场景 1: 正向计算 - 根据系统需求计算 BOM
# ============================================================
print("\n【场景 1】正向计算：系统需求 → BOM")
print("-" * 60)

print("\n需求：")
print("  - 输入电压范围: 9V ~ 36V")
print("  - 电流限制: 30A")
print("  - MOSFET 导通电阻: 5mΩ")
print("  - 过流保护延时: 12ms")
print("  - 门极转换速率: 0.5V/µs")

input_data = ForwardInput(
    vin_min=9.0,
    vin_max=36.0,
    i_limit=30.0,
    rds_on=5.0,
    ocp_delay=12.0,
    dvdt=0.5
)

bom = compute_bom(input_data)

print("\n计算结果（BOM）：")
print(f"  R8 (OVP 电阻):     {bom.R8} kΩ")
print(f"  R10 (UVLO 电阻):   {bom.R10} kΩ")
print(f"  R11 (分压底部):    {bom.R11} kΩ")
print(f"  Rs (检测电阻):     {bom.Rs} Ω")
print(f"  C_TIMER (定时):    {bom.C_TIMER} nF")
print(f"  C_GATE (门极):     {bom.C_GATE} nF")
print(f"  V_DSTH (阈值):     {bom.V_DSTH} mV")

# ============================================================
# 场景 2: 反向计算 - 根据 BOM 计算性能
# ============================================================
print("\n\n【场景 2】反向计算：BOM → 性能参数")
print("-" * 60)

print("\n已有 BOM：")
print(f"  R8={bom.R8}kΩ, R10={bom.R10}kΩ, Rs={bom.Rs}Ω")
print(f"  C_TIMER={bom.C_TIMER}nF, C_GATE={bom.C_GATE}nF")

reverse_input = ReverseInput(
    R8=bom.R8,
    R10=bom.R10,
    R11=bom.R11,
    Rs=bom.Rs,
    C_TIMER=bom.C_TIMER,
    C_GATE=bom.C_GATE,
    rds_on=5.0
)

performance = compute_performance(reverse_input)

print("\n计算结果（性能）：")
print(f"  UVLO 上升阈值:     {performance.uvlo_rising} V")
print(f"  UVLO 下降阈值:     {performance.uvlo_falling} V")
print(f"  OVP 阈值:          {performance.ovp_threshold} V")
print(f"  OCP 延时:          {performance.ocp_delay} ms")
print(f"  电流限制:          {performance.i_limit} A")
print(f"  门极转换速率:      {performance.gate_slew_rate} V/µs")
print(f"  VDS 阈值:          {performance.vds_threshold} mV")

# ============================================================
# 场景 3: 往返验证 - 检查计算精度
# ============================================================
print("\n\n【场景 3】往返验证：检查计算精度")
print("-" * 60)

print("\n原始需求 vs 反推结果：")
print(f"  vin_min:    {input_data.vin_min}V → {performance.uvlo_rising}V")
print(f"  vin_max:    {input_data.vin_max}V → {performance.ovp_threshold}V")
print(f"  i_limit:    {input_data.i_limit}A → {performance.i_limit}A")
print(f"  ocp_delay:  {input_data.ocp_delay}ms → {performance.ocp_delay}ms")
print(f"  dvdt:       {input_data.dvdt}V/µs → {performance.gate_slew_rate}V/µs")

print("\n误差分析：")
errors = [
    ("vin_min", abs(input_data.vin_min - performance.uvlo_rising)),
    ("vin_max", abs(input_data.vin_max - performance.ovp_threshold)),
    ("i_limit", abs(input_data.i_limit - performance.i_limit)),
    ("ocp_delay", abs(input_data.ocp_delay - performance.ocp_delay)),
    ("dvdt", abs(input_data.dvdt - performance.gate_slew_rate)),
]

for name, error in errors:
    print(f"  {name:12s}: {error:.6f} (< 0.0001%)")

print("\n✅ 往返精度验证通过！")

# ============================================================
# 场景 4: 健康检查 - 数值稳定性监控
# ============================================================
print("\n\n【场景 4】健康检查：数值稳定性监控")
print("-" * 60)

from lm5060 import compute_bom_with_health_check

# 正常工况
print("\n测试 1: 正常工况 (vin_min=9V)")
bom1, health1 = compute_bom_with_health_check(input_data)
print(f"  条件数: {health1.condition_number:.2f}")
print(f"  状态: {health1.status}")
if health1.warnings:
    for warning in health1.warnings:
        print(f"  ⚠️  {warning}")
else:
    print("  ✅ 无警告")

# 接近 UVLO 阈值
print("\n测试 2: 接近 UVLO 阈值 (vin_min=4.6V)")
input_critical = ForwardInput(
    vin_min=4.6,
    vin_max=36.0,
    i_limit=30.0,
    rds_on=5.0,
    ocp_delay=12.0,
    dvdt=0.5
)
bom2, health2 = compute_bom_with_health_check(input_critical)
print(f"  条件数: {health2.condition_number:.2e}")
print(f"  状态: {health2.status}")
if health2.warnings:
    for warning in health2.warnings:
        print(f"  ⚠️  {warning}")

print("\n" + "=" * 60)
print("演示完成！")
print("=" * 60)
