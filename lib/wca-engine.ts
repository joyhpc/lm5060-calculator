/**
 * LM5060 最坏情况分析 (Worst-Case Analysis) 引擎
 *
 * 核心功能：
 * 1. IC 容差计算（UVLO/OVP 阈值的 min/typ/max）
 * 2. 电阻容差传播（1% / 0.5% / 0.1%）
 * 3. 迟滞电流偏移计算（UVLO 关断电压修正）
 * 4. E96/E24 标准电阻吸附与反向验算
 * 5. MOSFET SOA 热应力预警
 * 6. 浪涌电流计算（容性负载联动）
 */

// ============================================================================
// 1. IC 容差数据（来自 LM5060 datasheet SNVS628H Section 6）
// ============================================================================

/** IC 内部参数容差 */
export const IC_TOLERANCES = {
  /** UVLO 阈值 (V) - Section 6.5, Page 7 */
  UVLO_THRESHOLD: { min: 1.45, typ: 1.6, max: 1.75 },

  /** OVP 阈值 (V) - Section 6.5, Page 7 */
  OVP_THRESHOLD: { min: 1.88, typ: 2.0, max: 2.12 },

  /** UVLO 偏置电流 (µA) - Section 6.5, Page 7 */
  UVLO_BIAS_CURRENT: { min: 3.8, typ: 5.5, max: 7.2 },

  /** UVLO 迟滞电流 (µA) - Section 6.5, Page 7
   * 物理现象：UVLO 引脚低于阈值时吸入电流，导致关断电压偏移 */
  UVLO_HYSTERESIS_CURRENT: { min: 16, typ: 21, max: 26 },

  /** SENSE 偏置电流 (µA) - Section 6.5, Page 7 */
  SENSE_CURRENT: { min: 13.6, typ: 15.8, max: 18.0 },

  /** TIMER 充电电流 (µA) - Section 6.5, Page 7 */
  TIMER_CHARGE_CURRENT: { min: 8.5, typ: 10.75, max: 13.0 },

  /** GATE 充电电流 (µA) - Section 6.5, Page 7 */
  GATE_CHARGE_CURRENT: { min: 17, typ: 24, max: 31 },

  /** 反向补偿电流 (µA) - Section 6.5, Page 7 */
  REVERSE_COMP_CURRENT: { min: 5.0, typ: 8.0, max: 11.0 },

  /** 反向补偿电阻 (Ω) - 内部固定值 */
  REVERSE_COMP_RESISTOR: 10000,

  /** TIMER 触发电压 (V) - Section 6.5, Page 7 */
  TIMER_TRIP_VOLTAGE: 2.0,
} as const

// ============================================================================
// 2. 电阻容差配置
// ============================================================================

/** 电阻精度等级 */
export type ResistorTolerance = '0.1%' | '0.5%' | '1%' | '5%'

/** 电阻容差映射 */
const RESISTOR_TOLERANCE_MAP: Record<ResistorTolerance, number> = {
  '0.1%': 0.001,
  '0.5%': 0.005,
  '1%': 0.01,
  '5%': 0.05,
}

// ============================================================================
// 3. E96/E24 标准电阻序列（IEC 60063）
// ============================================================================

/** E96 标准电阻序列（1% 精度）- 每十倍频程 96 个值 */
const E96_SERIES = [
  1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24,
  1.27, 1.30, 1.33, 1.37, 1.40, 1.43, 1.47, 1.50, 1.54, 1.58,
  1.62, 1.65, 1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00,
  2.05, 2.10, 2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55,
  2.61, 2.67, 2.74, 2.80, 2.87, 2.94, 3.01, 3.09, 3.16, 3.24,
  3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12,
  4.22, 4.32, 4.42, 4.53, 4.64, 4.75, 4.87, 4.99, 5.11, 5.23,
  5.36, 5.49, 5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65,
  6.81, 6.98, 7.15, 7.32, 7.50, 7.68, 7.87, 8.06, 8.25, 8.45,
  8.66, 8.87, 9.09, 9.31, 9.53, 9.76,
]

/** E24 标准电阻序列（5% 精度）- 每十倍频程 24 个值 */
const E24_SERIES = [
  1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4,
  2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2,
  6.8, 7.5, 8.2, 9.1,
]

/**
 * 将任意电阻值吸附到最接近的标准阻值
 * @param value 理想电阻值 (kΩ)
 * @param series 'E96' | 'E24'
 * @returns 标准阻值 (kΩ)
 */
export function snapToStandardResistor(value: number, series: 'E96' | 'E24' = 'E96'): number {
  const seriesData = series === 'E96' ? E96_SERIES : E24_SERIES

  // 计算数量级（例如 13.45 kΩ → 1.345 × 10^1）
  const magnitude = Math.floor(Math.log10(value))
  const normalized = value / Math.pow(10, magnitude)

  // 在标准序列中找最接近的值
  let closest = seriesData[0]
  let minDiff = Math.abs(normalized - closest)

  for (const candidate of seriesData) {
    const diff = Math.abs(normalized - candidate)
    if (diff < minDiff) {
      minDiff = diff
      closest = candidate
    }
  }

  // 恢复数量级
  return closest * Math.pow(10, magnitude)
}

/**
 * 获取标准阻值的备选方案（上下各 2 个）
 * @param value 理想电阻值 (kΩ)
 * @param series 'E96' | 'E24'
 * @returns 备选阻值数组 (kΩ)
 */
export function getAlternativeResistors(value: number, series: 'E96' | 'E24' = 'E96'): number[] {
  const seriesData = series === 'E96' ? E96_SERIES : E24_SERIES
  const magnitude = Math.floor(Math.log10(value))
  const normalized = value / Math.pow(10, magnitude)

  // 找到最接近的索引
  let closestIndex = 0
  let minDiff = Math.abs(normalized - seriesData[0])

  for (let i = 1; i < seriesData.length; i++) {
    const diff = Math.abs(normalized - seriesData[i])
    if (diff < minDiff) {
      minDiff = diff
      closestIndex = i
    }
  }

  // 取前后各 2 个（跨数量级处理）
  const alternatives: number[] = []
  for (let offset = -2; offset <= 2; offset++) {
    let idx = closestIndex + offset
    let mag = magnitude

    if (idx < 0) {
      idx += seriesData.length
      mag -= 1
    } else if (idx >= seriesData.length) {
      idx -= seriesData.length
      mag += 1
    }

    alternatives.push(seriesData[idx] * Math.pow(10, mag))
  }

  return alternatives
}

// ============================================================================
// 4. WCA 核心计算引擎
// ============================================================================

/** WCA 输入参数 */
export interface WCAInput {
  /** 最小输入电压 (V) */
  vin_min: number
  /** 最大输入电压 (V) */
  vin_max: number
  /** 电流限制 (A) */
  i_limit: number
  /** MOSFET 导通电阻 (mΩ) */
  rds_on: number
  /** 过流保护延时 (ms) */
  ocp_delay: number
  /** 门极转换速率 (V/µs) */
  dvdt: number
  /** 电阻精度 */
  resistor_tolerance: ResistorTolerance
  /** 后端负载电容 (µF) - 用于浪涌电流计算 */
  c_load?: number
  /** 连接器最大允许电流 (A) - 用于浪涌电流评估 */
  connector_max_current?: number
  /** MOSFET SOA 参数 - I²t 极限值 (A²·s) */
  mosfet_i2t_limit?: number
}

/** WCA 计算结果（区间范围） */
export interface WCAResult {
  /** UVLO 开启电压范围 (V) */
  uvlo_rising: { min: number; typ: number; max: number }

  /** UVLO 关断电压范围 (V) - 包含迟滞电流修正 */
  uvlo_falling: { min: number; typ: number; max: number }

  /** OVP 触发电压范围 (V) */
  ovp_threshold: { min: number; typ: number; max: number }

  /** 电流限制范围 (A) */
  i_limit: { min: number; typ: number; max: number }

  /** 理想 BOM 值 */
  ideal_bom: {
    R8: number
    R10: number
    Rs: number
    C_TIMER: number
    C_GATE: number
  }

  /** 标准电阻吸附后的 BOM */
  standard_bom: {
    R8: number
    R10: number
    Rs: number  // SENSE 电阻通常不吸附，保持精密值
    C_TIMER: number
    C_GATE: number
  }

  /** 使用标准电阻后的实际阈值（反向验算） */
  actual_thresholds: {
    uvlo_rising: { min: number; typ: number; max: number }
    uvlo_falling: { min: number; typ: number; max: number }
    ovp_threshold: { min: number; typ: number; max: number }
    threshold_drift_percent: number  // 相对理想值的漂移百分比
  }

  /** 迟滞电流导致的电压偏移 (V) */
  hysteresis_offset: { min: number; typ: number; max: number }

  /** 浪涌电流计算结果 */
  inrush_current?: {
    peak_current: number  // 峰值浪涌电流 (A)
    is_safe: boolean      // 是否在连接器承受范围内
    warning?: string      // 警告信息
  }

  /** MOSFET SOA 热应力评估 */
  soa_check?: {
    i2t_actual: number    // 实际 I²t 值 (A²·s)
    i2t_limit: number     // MOSFET 极限值 (A²·s)
    safety_margin: number // 安全裕量（百分比）
    is_safe: boolean
    warning?: string
  }

  /** 标准电阻备选方案 */
  alternatives: {
    R8: number[]
    R10: number[]
  }
}

/**
 * WCA 正向计算：需求 → BOM（含容差分析）
 */
export function computeWCA(input: WCAInput): WCAResult {
  const tol = RESISTOR_TOLERANCE_MAP[input.resistor_tolerance]
  const R9 = 10.0  // 固定 10kΩ
  const R11 = 10.0 // 固定 10kΩ

  // ========================================================================
  // Step 1: 计算理想 BOM（使用典型值）
  // ========================================================================

  const ovp_th_typ = IC_TOLERANCES.OVP_THRESHOLD.typ
  const uvlo_th_typ = IC_TOLERANCES.UVLO_THRESHOLD.typ
  const i_uvlo_bias_typ = IC_TOLERANCES.UVLO_BIAS_CURRENT.typ / 1e6  // µA → A
  const i_timer_typ = IC_TOLERANCES.TIMER_CHARGE_CURRENT.typ / 1e6
  const i_gate_typ = IC_TOLERANCES.GATE_CHARGE_CURRENT.typ
  const i_sense_typ = IC_TOLERANCES.SENSE_CURRENT.typ / 1e6
  const i_comp_typ = IC_TOLERANCES.REVERSE_COMP_CURRENT.typ / 1e6
  const r_comp = IC_TOLERANCES.REVERSE_COMP_RESISTOR

  // R8 = R9 × (VIN_MAX - OVPTH) / OVPTH
  // 结果单位：kΩ
  const R8_ideal = R9 * (input.vin_max - ovp_th_typ) / ovp_th_typ

  // R10 = (VIN_MIN - UVLOTH) / (UVLO_BIAS + UVLOTH/R11)
  // 结果单位：Ω，需要转换为 kΩ
  const R10_ideal_ohm = (input.vin_min - uvlo_th_typ) / (i_uvlo_bias_typ + uvlo_th_typ / (R11 * 1000))
  const R10_ideal = R10_ideal_ohm / 1000  // 转换为 kΩ

  // V_DSTH = I_LIMIT × RDS(ON)
  const v_dsth = input.i_limit * (input.rds_on / 1000)

  // Rs = V_DSTH / ISENSE + (RO × IOUT-EN) / ISENSE
  const Rs_ideal = (v_dsth / i_sense_typ) + (r_comp * i_comp_typ / i_sense_typ)

  // C_TIMER = (t_delay × ITIMERH) / VTMRH
  const C_TIMER_ideal = (input.ocp_delay / 1000) * i_timer_typ / IC_TOLERANCES.TIMER_TRIP_VOLTAGE * 1e9

  // C_GATE = IGATE / (dV/dt)
  const C_GATE_ideal = i_gate_typ / input.dvdt

  // ========================================================================
  // Step 2: 标准电阻吸附
  // ========================================================================

  const series = input.resistor_tolerance === '5%' ? 'E24' : 'E96'
  const R8_standard = snapToStandardResistor(R8_ideal, series)  // 输入 kΩ
  const R10_standard = snapToStandardResistor(R10_ideal, series)  // 输入 kΩ

  // ========================================================================
  // Step 3: 最坏情况分析（Min/Typ/Max）
  // ========================================================================

  // 3.1 UVLO 开启电压（使用标准电阻）
  const uvlo_rising_typ = uvlo_th_typ + R10_standard * 1000 * (i_uvlo_bias_typ + uvlo_th_typ / (R11 * 1000))

  // Min case: UVLO 阈值最小 + 偏置电流最小 + 电阻负偏差
  const uvlo_th_min = IC_TOLERANCES.UVLO_THRESHOLD.min
  const i_uvlo_bias_min = IC_TOLERANCES.UVLO_BIAS_CURRENT.min / 1e6
  const R10_min = R10_standard * (1 - tol)
  const uvlo_rising_min = uvlo_th_min + R10_min * 1000 * (i_uvlo_bias_min + uvlo_th_min / (R11 * 1000 * (1 + tol)))

  // Max case: UVLO 阈值最大 + 偏置电流最大 + 电阻正偏差
  const uvlo_th_max = IC_TOLERANCES.UVLO_THRESHOLD.max
  const i_uvlo_bias_max = IC_TOLERANCES.UVLO_BIAS_CURRENT.max / 1e6
  const R10_max = R10_standard * (1 + tol)
  const uvlo_rising_max = uvlo_th_max + R10_max * 1000 * (i_uvlo_bias_max + uvlo_th_max / (R11 * 1000 * (1 - tol)))

  // 3.2 迟滞电流导致的关断电压偏移
  // ΔV = I_HYS × R10（当 UVLO 引脚低于阈值时吸入电流）
  const i_hys_min = IC_TOLERANCES.UVLO_HYSTERESIS_CURRENT.min / 1e6
  const i_hys_typ = IC_TOLERANCES.UVLO_HYSTERESIS_CURRENT.typ / 1e6
  const i_hys_max = IC_TOLERANCES.UVLO_HYSTERESIS_CURRENT.max / 1e6

  const hys_offset_min = i_hys_min * R10_min * 1000
  const hys_offset_typ = i_hys_typ * R10_standard * 1000
  const hys_offset_max = i_hys_max * R10_max * 1000

  // UVLO 关断电压 = 开启电压 - 迟滞偏移
  const uvlo_falling_min = uvlo_rising_min - hys_offset_max  // 最坏情况：开启最低，偏移最大
  const uvlo_falling_typ = uvlo_rising_typ - hys_offset_typ
  const uvlo_falling_max = uvlo_rising_max - hys_offset_min  // 最坏情况：开启最高，偏移最小

  // 3.3 OVP 触发电压（使用标准电阻）
  const ovp_threshold_typ = ovp_th_typ * (1 + R8_standard / R9)

  const ovp_th_min = IC_TOLERANCES.OVP_THRESHOLD.min
  const R8_min = R8_standard * (1 - tol)
  const ovp_threshold_min = ovp_th_min * (1 + R8_min / (R9 * (1 + tol)))

  const ovp_th_max = IC_TOLERANCES.OVP_THRESHOLD.max
  const R8_max = R8_standard * (1 + tol)
  const ovp_threshold_max = ovp_th_max * (1 + R8_max / (R9 * (1 - tol)))

  // 3.4 电流限制范围
  const i_sense_min = IC_TOLERANCES.SENSE_CURRENT.min / 1e6
  const i_sense_max = IC_TOLERANCES.SENSE_CURRENT.max / 1e6
  const i_comp_min = IC_TOLERANCES.REVERSE_COMP_CURRENT.min / 1e6
  const i_comp_max = IC_TOLERANCES.REVERSE_COMP_CURRENT.max / 1e6

  const v_dsth_min = ((Rs_ideal * i_sense_min) - (r_comp * i_comp_max))
  const v_dsth_max = ((Rs_ideal * i_sense_max) - (r_comp * i_comp_min))

  const i_limit_min = v_dsth_min / ((input.rds_on / 1000) * 1.1)  // RDS(ON) 可能增大 10%
  const i_limit_typ = input.i_limit
  const i_limit_max = v_dsth_max / ((input.rds_on / 1000) * 0.9)  // RDS(ON) 可能减小 10%

  // ========================================================================
  // Step 4: 反向验算（使用标准电阻）
  // ========================================================================

  const actual_uvlo_rising_typ = uvlo_th_typ + R10_standard * 1000 * (i_uvlo_bias_typ + uvlo_th_typ / (R11 * 1000))
  const actual_ovp_threshold_typ = ovp_th_typ * (1 + R8_standard / R9)

  const threshold_drift = Math.max(
    Math.abs((actual_uvlo_rising_typ - input.vin_min) / input.vin_min),
    Math.abs((actual_ovp_threshold_typ - input.vin_max) / input.vin_max)
  ) * 100

  // ========================================================================
  // Step 5: 浪涌电流计算
  // ========================================================================

  let inrush_current: WCAResult['inrush_current'] | undefined

  if (input.c_load && input.connector_max_current) {
    // I_INRUSH = C_LOAD × (dV/dt)
    // dV/dt 由 C_GATE 控制：dV/dt = IGATE / C_GATE
    const dvdt_actual = i_gate_typ / C_GATE_ideal  // V/µs
    const peak_current = (input.c_load * 1e-6) * (dvdt_actual * 1e6)  // µF × V/s = A

    const is_safe = peak_current <= input.connector_max_current

    inrush_current = {
      peak_current,
      is_safe,
      warning: is_safe ? undefined : `浪涌电流 ${peak_current.toFixed(1)}A 超过连接器限制 ${input.connector_max_current}A！建议增大 C_GATE 至 ${(i_gate_typ / (input.connector_max_current / (input.c_load * 1e-6) / 1e6)).toFixed(1)} nF`
    }
  }

  // ========================================================================
  // Step 6: MOSFET SOA 热应力评估
  // ========================================================================

  let soa_check: WCAResult['soa_check'] | undefined

  if (input.mosfet_i2t_limit) {
    // 短路电流估算：I_SHORT ≈ VIN / RDS(ON)
    const i_short = input.vin_max / (input.rds_on / 1000)

    // 实际 I²t = I_SHORT² × t_FAULT
    const t_fault = input.ocp_delay / 1000  // ms → s
    const i2t_actual = i_short * i_short * t_fault

    const safety_margin = ((input.mosfet_i2t_limit - i2t_actual) / input.mosfet_i2t_limit) * 100
    const is_safe = i2t_actual <= input.mosfet_i2t_limit

    soa_check = {
      i2t_actual,
      i2t_limit: input.mosfet_i2t_limit,
      safety_margin,
      is_safe,
      warning: is_safe ? undefined : `MOSFET 热应力超限！实际 I²t = ${i2t_actual.toFixed(0)} A²·s，极限 = ${input.mosfet_i2t_limit} A²·s。建议减小 C_TIMER 至 ${(input.mosfet_i2t_limit / (i_short * i_short) * 1000).toFixed(1)} ms`
    }
  }

  // ========================================================================
  // Step 7: 返回完整结果
  // ========================================================================

  return {
    uvlo_rising: { min: uvlo_rising_min, typ: uvlo_rising_typ, max: uvlo_rising_max },
    uvlo_falling: { min: uvlo_falling_min, typ: uvlo_falling_typ, max: uvlo_falling_max },
    ovp_threshold: { min: ovp_threshold_min, typ: ovp_threshold_typ, max: ovp_threshold_max },
    i_limit: { min: i_limit_min, typ: i_limit_typ, max: i_limit_max },

    ideal_bom: {
      R8: parseFloat(R8_ideal.toFixed(2)),
      R10: parseFloat(R10_ideal.toFixed(2)),
      Rs: parseFloat(Rs_ideal.toFixed(2)),
      C_TIMER: parseFloat(C_TIMER_ideal.toFixed(1)),
      C_GATE: parseFloat(C_GATE_ideal.toFixed(1)),
    },

    standard_bom: {
      R8: R8_standard,
      R10: R10_standard,
      Rs: parseFloat(Rs_ideal.toFixed(2)),  // SENSE 电阻保持精密值
      C_TIMER: parseFloat(C_TIMER_ideal.toFixed(1)),
      C_GATE: parseFloat(C_GATE_ideal.toFixed(1)),
    },

    actual_thresholds: {
      uvlo_rising: {
        min: parseFloat(uvlo_rising_min.toFixed(2)),
        typ: parseFloat(actual_uvlo_rising_typ.toFixed(2)),
        max: parseFloat(uvlo_rising_max.toFixed(2))
      },
      uvlo_falling: {
        min: parseFloat(uvlo_falling_min.toFixed(2)),
        typ: parseFloat(uvlo_falling_typ.toFixed(2)),
        max: parseFloat(uvlo_falling_max.toFixed(2))
      },
      ovp_threshold: {
        min: parseFloat(ovp_threshold_min.toFixed(2)),
        typ: parseFloat(actual_ovp_threshold_typ.toFixed(2)),
        max: parseFloat(ovp_threshold_max.toFixed(2))
      },
      threshold_drift_percent: parseFloat(threshold_drift.toFixed(2)),
    },

    hysteresis_offset: {
      min: parseFloat(hys_offset_min.toFixed(3)),
      typ: parseFloat(hys_offset_typ.toFixed(3)),
      max: parseFloat(hys_offset_max.toFixed(3)),
    },

    inrush_current,
    soa_check,

    alternatives: {
      R8: getAlternativeResistors(R8_ideal, series),
      R10: getAlternativeResistors(R10_ideal, series),
    },
  }
}
