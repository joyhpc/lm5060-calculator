/**
 * WCA Engine 单元测试
 * 
 * 测试覆盖：
 * 1. 单位转换正确性（防止 R10 单位 bug 复现）
 * 2. 基础计算正确性
 * 3. E96/E24 标准电阻吸附
 * 4. 容差传播计算
 * 5. 输出范围断言
 * 6. 回归测试（已修复的 bug）
 */

import { describe, it, expect } from 'vitest'
import { computeWCA, snapToStandardResistor, getAlternativeResistors, IC_TOLERANCES } from '../wca-engine'

describe('WCA Engine - 单位转换', () => {
  it('R10_ideal 必须在 1kΩ ~ 1000kΩ 范围内', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    // R10_ideal 应该在合理范围内（kΩ）
    expect(result.ideal_bom.R10).toBeGreaterThan(1)
    expect(result.ideal_bom.R10).toBeLessThan(1000)
  })

  it('UVLO 开启电压必须在 5V ~ 80V 范围内', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    expect(result.uvlo_rising.min).toBeGreaterThan(5)
    expect(result.uvlo_rising.min).toBeLessThan(80)
    expect(result.uvlo_rising.typ).toBeGreaterThan(5)
    expect(result.uvlo_rising.typ).toBeLessThan(80)
    expect(result.uvlo_rising.max).toBeGreaterThan(5)
    expect(result.uvlo_rising.max).toBeLessThan(80)
  })

  it('OVP 触发电压必须在 5V ~ 80V 范围内', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    expect(result.ovp_threshold.min).toBeGreaterThan(5)
    expect(result.ovp_threshold.min).toBeLessThan(80)
    expect(result.ovp_threshold.typ).toBeGreaterThan(5)
    expect(result.ovp_threshold.typ).toBeLessThan(80)
    expect(result.ovp_threshold.max).toBeGreaterThan(5)
    expect(result.ovp_threshold.max).toBeLessThan(80)
  })

  it('电流限制必须在 0.1A ~ 100A 范围内', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    expect(result.i_limit.min).toBeGreaterThan(0.1)
    expect(result.i_limit.min).toBeLessThan(100)
    expect(result.i_limit.typ).toBeGreaterThan(0.1)
    expect(result.i_limit.typ).toBeLessThan(100)
    expect(result.i_limit.max).toBeGreaterThan(0.1)
    expect(result.i_limit.max).toBeLessThan(100)
  })
})

describe('WCA Engine - 回归测试（R10 单位转换 bug）', () => {
  it('修复前的 bug 场景：vin_min=9V 应该产生 UVLO ≈ 9.28V，而非 7401V', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    // UVLO 开启电压应该接近 9.28V（允许 ±0.5V 误差）
    expect(result.uvlo_rising.typ).toBeGreaterThan(8.5)
    expect(result.uvlo_rising.typ).toBeLessThan(10.0)

    // 绝对不能是 7401V 这种异常值
    expect(result.uvlo_rising.typ).toBeLessThan(100)
  })

  it('R10_ideal 计算后必须转换为 kΩ（不能是 Ω）', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    // R10_ideal 应该在 10kΩ ~ 100kΩ 范围内（典型值）
    // 如果是 Ω 单位，会是 10000 ~ 100000，导致后续计算错误
    expect(result.ideal_bom.R10).toBeGreaterThan(10)
    expect(result.ideal_bom.R10).toBeLessThan(200)
  })
})

describe('WCA Engine - 基础计算正确性', () => {
  it('R8 计算：基于 OVP 阈值和 vin_max', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    // R8 = (vin_max / V_OVP - 1) × R10
    // 预期 R8 应该在合理范围内
    expect(result.ideal_bom.R8).toBeGreaterThan(50)
    expect(result.ideal_bom.R8).toBeLessThan(500)
  })

  it('Rs 计算：基于电流限制', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    // Rs 应该在合理范围内（Ω）
    expect(result.ideal_bom.Rs).toBeGreaterThan(1)
    expect(result.ideal_bom.Rs).toBeLessThan(100000)
  })

  it('C_TIMER 计算：基于 OCP 延时', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    // C_TIMER 应该在合理范围内（nF）
    expect(result.ideal_bom.C_TIMER).toBeGreaterThan(1)
    expect(result.ideal_bom.C_TIMER).toBeLessThan(10000)
  })

  it('C_GATE 计算：基于 dV/dt', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    // C_GATE 应该在合理范围内（nF）
    expect(result.ideal_bom.C_GATE).toBeGreaterThan(1)
    expect(result.ideal_bom.C_GATE).toBeLessThan(10000)
  })
})

describe('WCA Engine - E96/E24 标准电阻吸附', () => {
  it('E96 吸附：170.23 kΩ → 169.0 kΩ', () => {
    const result = snapToStandardResistor(170.23, 'E96')
    expect(result).toBe(169)
  })

  it('E96 吸附：46.25 kΩ → 46.4 kΩ', () => {
    const result = snapToStandardResistor(46.25, 'E96')
    expect(result).toBe(46.4)
  })

  it('E24 吸附：170.23 kΩ → 180 kΩ', () => {
    const result = snapToStandardResistor(170.23, 'E24')
    expect(result).toBe(180)
  })

  it('E96 吸附：小数值 1.23 kΩ → 1.24 kΩ', () => {
    const result = snapToStandardResistor(1.23, 'E96')
    expect(result).toBe(1.24)
  })

  it('E96 吸附：大数值 999 kΩ → 976 kΩ', () => {
    const result = snapToStandardResistor(999, 'E96')
    expect(result).toBe(976)
  })

  it('getAlternativeResistors 返回 5 个备选值（前后各 2 个）', () => {
    const alternatives = getAlternativeResistors(170.23, 'E96')
    expect(alternatives).toHaveLength(5)
    expect(alternatives).toContain(169)
  })
})

describe('WCA Engine - 容差传播计算', () => {
  it('5% 容差的区间宽度 > 1% 容差', () => {
    const result_1pct = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    const result_5pct = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '5%',
    })

    const range_1pct = result_1pct.uvlo_rising.max - result_1pct.uvlo_rising.min
    const range_5pct = result_5pct.uvlo_rising.max - result_5pct.uvlo_rising.min

    expect(range_5pct).toBeGreaterThan(range_1pct)
  })

  it('0.1% 容差的区间宽度 < 1% 容差', () => {
    const result_01pct = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '0.1%',
    })

    const result_1pct = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    const range_01pct = result_01pct.uvlo_rising.max - result_01pct.uvlo_rising.min
    const range_1pct = result_1pct.uvlo_rising.max - result_1pct.uvlo_rising.min

    expect(range_01pct).toBeLessThan(range_1pct)
  })

  it('Min < Typ < Max 顺序正确', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    expect(result.uvlo_rising.min).toBeLessThan(result.uvlo_rising.typ)
    expect(result.uvlo_rising.typ).toBeLessThan(result.uvlo_rising.max)

    expect(result.ovp_threshold.min).toBeLessThan(result.ovp_threshold.typ)
    expect(result.ovp_threshold.typ).toBeLessThan(result.ovp_threshold.max)

    expect(result.i_limit.min).toBeLessThan(result.i_limit.typ)
    expect(result.i_limit.typ).toBeLessThan(result.i_limit.max)
  })
})

describe('WCA Engine - 迟滞电流偏移计算', () => {
  it('迟滞电流导致 UVLO 关断电压低于开启电压', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    // UVLO 关断电压应该低于开启电压
    expect(result.uvlo_falling.typ).toBeLessThan(result.uvlo_rising.typ)
  })

  it('迟滞偏移量在合理范围内（0.1V ~ 2V）', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    const offset = result.uvlo_rising.typ - result.uvlo_falling.typ

    expect(offset).toBeGreaterThan(0.1)
    expect(offset).toBeLessThan(2.0)
  })

  it('迟滞偏移量的 min/typ/max 顺序正确', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    expect(result.hysteresis_offset.min).toBeLessThan(result.hysteresis_offset.typ)
    expect(result.hysteresis_offset.typ).toBeLessThan(result.hysteresis_offset.max)
  })
})

describe('WCA Engine - 边界条件测试', () => {
  it('最小输入电压：vin_min = 5V', () => {
    const result = computeWCA({
      vin_min: 5.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    expect(result.uvlo_rising.typ).toBeGreaterThan(4.5)
    expect(result.uvlo_rising.typ).toBeLessThan(6.0)
  })

  it('最大输入电压：vin_max = 80V', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 80.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    expect(result.ovp_threshold.typ).toBeGreaterThan(70)
    expect(result.ovp_threshold.typ).toBeLessThan(85)
  })

  it('最小电流限制：i_limit = 0.5A', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 0.5,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    expect(result.i_limit.typ).toBeGreaterThan(0.4)
    expect(result.i_limit.typ).toBeLessThan(0.6)
  })

  it('最大电流限制：i_limit = 100A', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 100.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    expect(result.i_limit.typ).toBeGreaterThan(90)
    expect(result.i_limit.typ).toBeLessThan(110)
  })
})

describe('WCA Engine - 集成测试', () => {
  it('完整的正向计算流程（输入 → BOM）', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    // 验证所有输出字段存在
    expect(result.ideal_bom).toBeDefined()
    expect(result.standard_bom).toBeDefined()
    expect(result.actual_thresholds).toBeDefined()
    expect(result.uvlo_rising).toBeDefined()
    expect(result.uvlo_falling).toBeDefined()
    expect(result.ovp_threshold).toBeDefined()
    expect(result.i_limit).toBeDefined()
    expect(result.hysteresis_offset).toBeDefined()
    expect(result.alternatives).toBeDefined()
  })

  it('反向验算精度：标准电阻导致的阈值漂移 < 5%', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    // 阈值漂移应该在合理范围内
    expect(Math.abs(result.actual_thresholds.threshold_drift_percent)).toBeLessThan(5)
  })

  it('浪涌电流计算：提供 c_load 和 connector_max_current', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
      c_load: 1000,
      connector_max_current: 50,
    })

    expect(result.inrush_current).toBeDefined()
    expect(result.inrush_current?.peak_current).toBeGreaterThan(0)
    expect(result.inrush_current?.is_safe).toBeDefined()
  })

  it('MOSFET SOA 验证：自动基于 BSZ096N10LS5 datasheet', () => {
    const result = computeWCA({
      vin_min: 9.0,
      vin_max: 36.0,
      i_limit: 30.0,
      rds_on: 5.0,
      ocp_delay: 12.0,
      dvdt: 0.5,
      resistor_tolerance: '1%',
    })

    expect(result.soa_verification).toBeDefined()
    expect(result.soa_verification?.workingPoint.vds).toBe(18.0) // 36V / 2
    expect(result.soa_verification?.workingPoint.id).toBe(30.0)
    expect(result.soa_verification?.workingPoint.pulseWidth).toBe(12.0)
    expect(result.soa_verification?.limitCurrent).toBeGreaterThan(0)
    expect(result.soa_verification?.margin).toBeDefined()
    expect(result.soa_verification?.status).toMatch(/safe|warning|danger/)
    expect(result.soa_verification?.mosfetModel).toBe('BSZ096N10LS5')
  })
})
