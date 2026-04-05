/**
 * MOSFET Safe Operating Area (SOA) 验证算法
 *
 * 功能：
 * 1. 对数插值查找 SOA 边界
 * 2. 判断工作点是否在安全区内
 * 3. 计算安全裕量百分比
 */

import { BSZ096N10LS5_SOA, SOACurve, SOAPoint } from './mosfet-soa-data'

export interface SOACheckResult {
  safe: boolean           // 是否在安全区内
  margin: number          // 安全裕量 [%]，负值表示超出
  limitCurrent: number    // 该电压下的 SOA 电流极限 [A]
  workingPoint: {
    vds: number          // 工作电压 [V]
    id: number           // 工作电流 [A]
    pulseWidth: number   // 脉冲宽度 [ms]
  }
  status: 'safe' | 'warning' | 'danger'  // 安全状态
}

/**
 * 对数插值
 * 在对数坐标系中进行线性插值
 */
function logInterpolate(
  x: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  if (x <= x1) return y1
  if (x >= x2) return y2

  // 对数插值：log(y) = log(y1) + (log(x) - log(x1)) * (log(y2) - log(y1)) / (log(x2) - log(x1))
  const logX = Math.log10(x)
  const logX1 = Math.log10(x1)
  const logX2 = Math.log10(x2)
  const logY1 = Math.log10(y1)
  const logY2 = Math.log10(y2)

  const logY = logY1 + (logX - logX1) * (logY2 - logY1) / (logX2 - logX1)
  return Math.pow(10, logY)
}

/**
 * 在 SOA 曲线上查找指定电压下的电流极限
 */
function findCurrentLimitAtVoltage(curve: SOACurve, vds: number): number {
  const points = curve.points

  // 超出电压范围
  if (vds > points[points.length - 1].vds) {
    return points[points.length - 1].id
  }
  if (vds < points[0].vds) {
    return points[0].id
  }

  // 找到包围 vds 的两个点
  for (let i = 0; i < points.length - 1; i++) {
    if (vds >= points[i].vds && vds <= points[i + 1].vds) {
      return logInterpolate(
        vds,
        points[i].vds,
        points[i].id,
        points[i + 1].vds,
        points[i + 1].id
      )
    }
  }

  return points[points.length - 1].id
}

/**
 * 根据脉冲宽度选择合适的 SOA 曲线
 * 如果脉冲宽度在两条曲线之间，使用对数插值
 */
function selectSOACurve(pulseWidthMs: number): SOACurve {
  const pulseWidthMap: { [key: string]: number } = {
    'DC': Infinity,
    '10ms': 10,
    '1ms': 1,
    '100us': 0.1,
    '10us': 0.01,
    '1us': 0.001,
  }

  // 找到最接近的曲线
  let selectedCurve = BSZ096N10LS5_SOA[0]  // 默认 DC
  let minDiff = Infinity

  for (const curve of BSZ096N10LS5_SOA) {
    const curveTime = pulseWidthMap[curve.pulseWidth]
    const diff = Math.abs(Math.log10(curveTime) - Math.log10(pulseWidthMs))

    if (diff < minDiff) {
      minDiff = diff
      selectedCurve = curve
    }
  }

  return selectedCurve
}

/**
 * 检查 MOSFET 工作点是否在 SOA 安全区内
 *
 * @param vds - Drain-Source 电压 [V]
 * @param id - Drain 电流 [A]
 * @param pulseWidthMs - 脉冲宽度 [ms]
 * @returns SOA 检查结果
 */
export function checkSOA(
  vds: number,
  id: number,
  pulseWidthMs: number
): SOACheckResult {
  // 选择合适的 SOA 曲线
  const curve = selectSOACurve(pulseWidthMs)

  // 查找该电压下的电流极限
  const limitCurrent = findCurrentLimitAtVoltage(curve, vds)

  // 计算安全裕量
  const margin = ((limitCurrent - id) / limitCurrent) * 100

  // 判断安全状态
  let status: 'safe' | 'warning' | 'danger'
  if (margin >= 20) {
    status = 'safe'
  } else if (margin >= 0) {
    status = 'warning'
  } else {
    status = 'danger'
  }

  return {
    safe: margin >= 0,
    margin,
    limitCurrent,
    workingPoint: {
      vds,
      id,
      pulseWidth: pulseWidthMs,
    },
    status,
  }
}

/**
 * 检查两个串联 MOSFET 的 SOA
 *
 * @param vinMax - 最大输入电压 [V]
 * @param iLimit - 电流限制 [A]
 * @param ocpDelayMs - OCP 延时 [ms]
 * @returns SOA 检查结果（针对单个 MOSFET）
 */
export function checkSeriesMOSFETSOA(
  vinMax: number,
  iLimit: number,
  ocpDelayMs: number
): SOACheckResult {
  // 两个 MOS 串联，每个承受约一半电压
  const vdsPerMosfet = vinMax / 2

  // 每个 MOS 承受相同电流
  const idPerMosfet = iLimit

  return checkSOA(vdsPerMosfet, idPerMosfet, ocpDelayMs)
}
