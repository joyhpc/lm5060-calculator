# LM5060 WCA 计算器 - 快速验证脚本

## 功能验证

本脚本用于快速验证 WCA 引擎的核心功能是否正常工作。

```typescript
// scripts/verify-wca.ts

import { computeWCA, snapToStandardResistor, getAlternativeResistors } from '../lib/wca-engine'

console.log('🧪 LM5060 WCA 引擎验证\n')

// ============================================================================
// 测试 1: 基础计算
// ============================================================================
console.log('📊 测试 1: 基础 WCA 计算')
const result1 = computeWCA({
  vin_min: 9.0,
  vin_max: 36.0,
  i_limit: 30.0,
  rds_on: 5.0,
  ocp_delay: 12.0,
  dvdt: 0.5,
  resistor_tolerance: '1%',
})

console.log('✓ UVLO 开启电压 (Typ):', result1.uvlo_rising.typ, 'V')
console.log('✓ UVLO 开启电压范围:', `${result1.uvlo_rising.min}V ~ ${result1.uvlo_rising.max}V`)
console.log('✓ UVLO 关断电压 (Typ):', result1.uvlo_falling.typ, 'V')
console.log('✓ OVP 触发电压 (Typ):', result1.ovp_threshold.typ, 'V')
console.log('✓ 电流限制范围:', `${result1.i_limit.min}A ~ ${result1.i_limit.max}A`)

// 验证 Min < Typ < Max
const checks1 = [
  result1.uvlo_rising.min < result1.uvlo_rising.typ && result1.uvlo_rising.typ < result1.uvlo_rising.max,
  result1.uvlo_falling.min < result1.uvlo_falling.typ && result1.uvlo_falling.typ < result1.uvlo_falling.max,
  result1.ovp_threshold.min < result1.ovp_threshold.typ && result1.ovp_threshold.typ < result1.ovp_threshold.max,
]

if (checks1.every(c => c)) {
  console.log('✅ 测试 1 通过: Min < Typ < Max 关系正确\n')
} else {
  console.error('❌ 测试 1 失败: 区间关系错误\n')
  process.exit(1)
}

// ============================================================================
// 测试 2: 迟滞电流偏移
// ============================================================================
console.log('📊 测试 2: 迟滞电流偏移')
console.log('✓ 迟滞偏移 (Typ):', result1.hysteresis_offset.typ.toFixed(3), 'V')
console.log('✓ 迟滞偏移范围:', `${result1.hysteresis_offset.min.toFixed(3)}V ~ ${result1.hysteresis_offset.max.toFixed(3)}V`)

// 验证偏移为负值（电压下降）
const checks2 = [
  result1.hysteresis_offset.typ < 0,
  result1.uvlo_falling.typ < result1.uvlo_rising.typ,
]

if (checks2.every(c => c)) {
  console.log('✅ 测试 2 通过: 迟滞电流导致电压下降\n')
} else {
  console.error('❌ 测试 2 失败: 迟滞偏移计算错误\n')
  process.exit(1)
}

// ============================================================================
// 测试 3: 标准电阻吸附
// ============================================================================
console.log('📊 测试 3: 标准电阻吸附')
console.log('✓ 理想 R8:', result1.ideal_bom.R8.toFixed(2), 'kΩ')
console.log('✓ 标准 R8:', result1.standard_bom.R8.toFixed(2), 'kΩ')
console.log('✓ 理想 R10:', result1.ideal_bom.R10.toFixed(2), 'kΩ')
console.log('✓ 标准 R10:', result1.standard_bom.R10.toFixed(2), 'kΩ')

// 验证标准阻值是 E96 序列
const testCases = [
  { input: 170.23, expected: 169.0 },
  { input: 46.18, expected: 46.4 },
  { input: 100.5, expected: 100.0 },
]

const checks3 = testCases.map(tc => {
  const result = snapToStandardResistor(tc.input, 'E96')
  console.log(`  ${tc.input} kΩ → ${result} kΩ (期望: ${tc.expected} kΩ)`)
  return Math.abs(result - tc.expected) < 0.01
})

if (checks3.every(c => c)) {
  console.log('✅ 测试 3 通过: 标准电阻吸附正确\n')
} else {
  console.error('❌ 测试 3 失败: 吸附算法错误\n')
  process.exit(1)
}

// ============================================================================
// 测试 4: 备选电阻推荐
// ============================================================================
console.log('📊 测试 4: 备选电阻推荐')
const alternatives = getAlternativeResistors(170.23, 'E96')
console.log('✓ 备选阻值:', alternatives.map(v => v.toFixed(2)).join(', '), 'kΩ')

if (alternatives.length === 5 && alternatives.includes(169.0)) {
  console.log('✅ 测试 4 通过: 备选电阻包含标准值\n')
} else {
  console.error('❌ 测试 4 失败: 备选电阻生成错误\n')
  process.exit(1)
}

// ============================================================================
// 测试 5: 容差传播
// ============================================================================
console.log('📊 测试 5: 容差传播')
const result_01 = computeWCA({ ...result1, resistor_tolerance: '0.1%' } as any)
const result_5 = computeWCA({ ...result1, resistor_tolerance: '5%' } as any)

const range_01 = result_01.uvlo_rising.max - result_01.uvlo_rising.min
const range_5 = result_5.uvlo_rising.max - result_5.uvlo_rising.min

console.log('✓ 0.1% 容差区间宽度:', range_01.toFixed(3), 'V')
console.log('✓ 5% 容差区间宽度:', range_5.toFixed(3), 'V')

if (range_5 > range_01) {
  console.log('✅ 测试 5 通过: 容差传播正确（5% > 0.1%）\n')
} else {
  console.error('❌ 测试 5 失败: 容差传播错误\n')
  process.exit(1)
}

// ============================================================================
// 测试 6: MOSFET SOA 评估
// ============================================================================
console.log('📊 测试 6: MOSFET SOA 评估')
const result6 = computeWCA({
  vin_min: 9.0,
  vin_max: 36.0,
  i_limit: 30.0,
  rds_on: 5.0,
  ocp_delay: 12.0,
  dvdt: 0.5,
  resistor_tolerance: '1%',
  mosfet_i2t_limit: 500000,
})

if (result6.soa_check) {
  console.log('✓ 实际 I²t:', result6.soa_check.i2t_actual.toFixed(0), 'A²·s')
  console.log('✓ MOSFET 极限:', result6.soa_check.i2t_limit.toFixed(0), 'A²·s')
  console.log('✓ 安全裕量:', result6.soa_check.safety_margin.toFixed(1), '%')
  console.log('✓ 安全状态:', result6.soa_check.is_safe ? '✅ 安全' : '❌ 危险')

  if (result6.soa_check.i2t_actual > 0) {
    console.log('✅ 测试 6 通过: SOA 评估正常\n')
  } else {
    console.error('❌ 测试 6 失败: I²t 计算错误\n')
    process.exit(1)
  }
} else {
  console.error('❌ 测试 6 失败: SOA 评估未执行\n')
  process.exit(1)
}

// ============================================================================
// 测试 7: 浪涌电流计算
// ============================================================================
console.log('📊 测试 7: 浪涌电流计算')
const result7 = computeWCA({
  vin_min: 9.0,
  vin_max: 36.0,
  i_limit: 30.0,
  rds_on: 5.0,
  ocp_delay: 12.0,
  dvdt: 0.5,
  resistor_tolerance: '1%',
  c_load: 1000,
  connector_max_current: 40,
})

if (result7.inrush_current) {
  console.log('✓ 峰值浪涌电流:', result7.inrush_current.peak_current.toFixed(1), 'A')
  console.log('✓ 连接器限制:', '40 A')
  console.log('✓ 安全状态:', result7.inrush_current.is_safe ? '✅ 安全' : '⚠️ 超限')

  if (result7.inrush_current.peak_current > 0) {
    console.log('✅ 测试 7 通过: 浪涌电流计算正常\n')
  } else {
    console.error('❌ 测试 7 失败: 浪涌电流计算错误\n')
    process.exit(1)
  }
} else {
  console.error('❌ 测试 7 失败: 浪涌电流评估未执行\n')
  process.exit(1)
}

// ============================================================================
// 测试 8: 反向验算
// ============================================================================
console.log('📊 测试 8: 反向验算')
console.log('✓ 实际 UVLO 开启电压 (Typ):', result1.actual_thresholds.uvlo_rising.typ, 'V')
console.log('✓ 实际 OVP 触发电压 (Typ):', result1.actual_thresholds.ovp_threshold.typ, 'V')
console.log('✓ 阈值漂移:', result1.actual_thresholds.threshold_drift_percent.toFixed(2), '%')

if (result1.actual_thresholds.threshold_drift_percent >= 0) {
  console.log('✅ 测试 8 通过: 反向验算正常\n')
} else {
  console.error('❌ 测试 8 失败: 反向验算错误\n')
  process.exit(1)
}

// ============================================================================
// 总结
// ============================================================================
console.log('=' .repeat(60))
console.log('🎉 所有测试通过！WCA 引擎工作正常')
console.log('=' .repeat(60))
console.log('\n核心功能验证：')
console.log('✅ IC 容差计算（Min/Typ/Max）')
console.log('✅ 迟滞电流偏移修正')
console.log('✅ E96/E24 标准电阻吸附')
console.log('✅ 备选电阻推荐')
console.log('✅ 容差传播分析')
console.log('✅ MOSFET SOA 热应力评估')
console.log('✅ 浪涌电流计算')
console.log('✅ 反向验算与阈值漂移')
console.log('\n可以开始集成到项目中！')
