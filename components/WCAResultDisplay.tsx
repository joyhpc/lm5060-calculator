/**
 * WCA 结果展示组件
 *
 * 功能：
 * 1. 区间范围展示（Min/Typ/Max）
 * 2. 标准电阻对比（理想值 vs 标准值）
 * 3. SOA/浪涌电流警告
 * 4. 迟滞电流偏移可视化
 */

import React from 'react'
import { WCAResult } from '@/lib/wca-engine'

interface Props {
  result: WCAResult
}

/** 范围值显示组件 */
function RangeDisplay({
  label,
  range,
  unit,
  highlight = false
}: {
  label: string
  range: { min: number; typ: number; max: number }
  unit: string
  highlight?: boolean
}) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}>
      <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-red-600 font-mono">
          Min: {range.min.toFixed(2)} {unit}
        </span>
        <span className="text-gray-400">|</span>
        <span className="text-blue-600 font-mono font-semibold">
          Typ: {range.typ.toFixed(2)} {unit}
        </span>
        <span className="text-gray-400">|</span>
        <span className="text-orange-600 font-mono">
          Max: {range.max.toFixed(2)} {unit}
        </span>
      </div>
    </div>
  )
}

/** 警告横幅组件 */
function WarningBanner({
  type,
  message
}: {
  type: 'error' | 'warning'
  message: string
}) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-500 text-red-800'
    : 'bg-yellow-50 border-yellow-500 text-yellow-800'

  return (
    <div className={`p-4 border-l-4 rounded ${styles}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{type === 'error' ? '🔥' : '⚠️'}</span>
        <div>
          <div className="font-semibold mb-1">
            {type === 'error' ? '致命警告' : '注意'}
          </div>
          <div className="text-sm whitespace-pre-line">{message}</div>
        </div>
      </div>
    </div>
  )
}

/** BOM 对比表格 */
function BOMComparisonTable({ result }: { result: WCAResult }) {
  const rows = [
    {
      designator: 'R8',
      description: 'OVP 上拉电阻',
      ideal: result.ideal_bom.R8,
      standard: result.standard_bom.R8,
      unit: 'kΩ',
      alternatives: result.alternatives.R8,
    },
    {
      designator: 'R10',
      description: 'UVLO 上拉电阻',
      ideal: result.ideal_bom.R10,
      standard: result.standard_bom.R10,
      unit: 'kΩ',
      alternatives: result.alternatives.R10,
    },
    {
      designator: 'Rs',
      description: 'SENSE 检测电阻',
      ideal: result.ideal_bom.Rs,
      standard: result.standard_bom.Rs,
      unit: 'Ω',
      alternatives: [],
    },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-100 border-b-2 border-gray-300">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">位号</th>
            <th className="px-4 py-2 text-left font-semibold">说明</th>
            <th className="px-4 py-2 text-right font-semibold">理想值</th>
            <th className="px-4 py-2 text-right font-semibold">标准值</th>
            <th className="px-4 py-2 text-right font-semibold">偏差</th>
            <th className="px-4 py-2 text-left font-semibold">备选</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const deviation = ((row.standard - row.ideal) / row.ideal * 100).toFixed(2)
            const deviationColor = Math.abs(parseFloat(deviation)) > 5 ? 'text-red-600' : 'text-green-600'

            return (
              <tr key={i} className="border-b hover:bg-gray-50 group">
                <td className="px-4 py-3 font-mono font-semibold">{row.designator}</td>
                <td className="px-4 py-3 text-gray-600">{row.description}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-500">
                  {row.ideal.toFixed(2)} {row.unit}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-blue-600">
                  {row.standard.toFixed(2)} {row.unit}
                </td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${deviationColor}`}>
                  {deviation > '0' ? '+' : ''}{deviation}%
                </td>
                <td className="px-4 py-3 relative">
                  {row.alternatives.length > 0 && (
                    <>
                      <span className="text-gray-400 cursor-help">
                        {row.alternatives.length} 个备选 ⓘ
                      </span>
                      <div className="invisible group-hover:visible absolute z-20 left-0 top-full mt-1 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-xl">
                        {row.alternatives.map((alt, j) => (
                          <div key={j} className="font-mono py-1">
                            {alt.toFixed(2)} {row.unit}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** 迟滞电流偏移可视化 */
function HysteresisVisualization({ result }: { result: WCAResult }) {
  const offset = result.hysteresis_offset

  return (
    <div className="space-y-3">
      {/* UVLO 迟滞电流 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="font-semibold text-blue-900 mb-2">
          ⚡ UVLO 迟滞电流导致的关断电压偏移
        </div>
        <div className="text-sm text-blue-800 mb-3">
          当 UVLO 引脚低于阈值时，引脚吸入 {IC_TOLERANCES.UVLO_HYSTERESIS_CURRENT.typ} µA 电流（范围 {IC_TOLERANCES.UVLO_HYSTERESIS_CURRENT.min}~{IC_TOLERANCES.UVLO_HYSTERESIS_CURRENT.max} µA），
          通过 R10 产生电压降，导致实际关断电压低于理想分压值。
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-gray-600">Min 偏移:</span>
            <span className="ml-2 text-red-600 font-semibold">-{offset.min.toFixed(3)} V</span>
          </div>
          <div>
            <span className="text-gray-600">Typ 偏移:</span>
            <span className="ml-2 text-blue-600 font-semibold">-{offset.typ.toFixed(3)} V</span>
          </div>
          <div>
            <span className="text-gray-600">Max 偏移:</span>
            <span className="ml-2 text-orange-600 font-semibold">-{offset.max.toFixed(3)} V</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-blue-700 bg-blue-100 p-2 rounded">
          💡 公式：ΔV = I_HYS × R10（来源：Datasheet SNVS628H Section 8.2.3.2.1, Page 31）
        </div>
      </div>

      {/* OVP 固定电压迟滞 */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="font-semibold text-green-900 mb-2">
          🔒 OVP 固定电压迟滞（与 UVLO 不同）
        </div>
        <div className="text-sm text-green-800 mb-3">
          OVP 使用固定 240mV 电压迟滞，不依赖 R8 阻值。
          OVP 恢复电压 = OVP 触发电压 - 240mV。
          这与 UVLO 的电流迟滞机制不同。
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-gray-600">固定迟滞:</span>
            <span className="ml-2 text-green-600 font-semibold">240 mV</span>
          </div>
          <div>
            <span className="text-gray-600">OVP 偏置电流:</span>
            <span className="ml-2 text-green-600 font-semibold">≈0 µA（可忽略）</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-green-700 bg-green-100 p-2 rounded">
          💡 来源：opendatasheet OVPHYS = 240mV (typical)
        </div>
      </div>
    </div>
  )
}

/** 阈值漂移对比 */
function ThresholdDriftComparison({ result }: { result: WCAResult }) {
  const drift = result.actual_thresholds.threshold_drift_percent
  const driftColor = drift > 5 ? 'text-red-600' : drift > 2 ? 'text-yellow-600' : 'text-green-600'

  return (
    <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
      <div className="font-semibold text-gray-900 mb-3">
        📊 标准电阻导致的阈值漂移
      </div>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-600 mb-1">UVLO 开启电压（实际）</div>
          <div className="font-mono text-sm">
            {result.actual_thresholds.uvlo_rising.min.toFixed(2)} ~ {result.actual_thresholds.uvlo_rising.max.toFixed(2)} V
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">OVP 触发电压（实际）</div>
          <div className="font-mono text-sm">
            {result.actual_thresholds.ovp_threshold.min.toFixed(2)} ~ {result.actual_thresholds.ovp_threshold.max.toFixed(2)} V
          </div>
        </div>
      </div>
      <div className={`text-sm font-semibold ${driftColor}`}>
        相对理想值漂移：{drift.toFixed(2)}%
        {drift > 5 && ' ⚠️ 漂移较大，建议检查电阻精度'}
      </div>
    </div>
  )
}

export default function WCAResultDisplay({ result }: Props) {
  return (
    <div className="space-y-6">
      {/* 致命警告区域 */}
      {result.soa_verification && !result.soa_verification.safe && (
        <WarningBanner type="error" message={`MOSFET 工作点超出 SOA 安全区！裕量：${result.soa_verification.margin.toFixed(1)}%`} />
      )}

      {result.inrush_current && !result.inrush_current.is_safe && (
        <WarningBanner type="warning" message={result.inrush_current.warning!} />
      )}

      {/* 保护阈值区间 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">🎯 保护阈值（最坏情况分析）</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RangeDisplay
            label="UVLO 开启电压"
            range={result.uvlo_rising}
            unit="V"
          />
          <RangeDisplay
            label="UVLO 关断电压（含迟滞修正）"
            range={result.uvlo_falling}
            unit="V"
            highlight
          />
          <RangeDisplay
            label="OVP 触发电压"
            range={result.ovp_threshold}
            unit="V"
          />
          <RangeDisplay
            label="OVP 恢复电压（240mV 迟滞）"
            range={result.ovp_recovery}
            unit="V"
            highlight
          />
          <RangeDisplay
            label="电流限制"
            range={result.i_limit}
            unit="A"
          />
        </div>
      </div>

      {/* 迟滞电流可视化 */}
      <HysteresisVisualization result={result} />

      {/* BOM 对比表格 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">🔧 BOM 对比（理想值 vs 标准电阻）</h3>
        <BOMComparisonTable result={result} />
      </div>

      {/* 阈值漂移对比 */}
      <ThresholdDriftComparison result={result} />

      {/* SOA 安全区验证（基于 datasheet 曲线） */}
      {result.soa_verification && (
        <div className={`p-4 rounded-lg border ${
          result.soa_verification.status === 'safe' ? 'bg-green-50 border-green-300' :
          result.soa_verification.status === 'warning' ? 'bg-yellow-50 border-yellow-300' :
          'bg-red-50 border-red-300'
        }`}>
          <div className="font-semibold mb-3 flex items-center gap-2">
            {result.soa_verification.status === 'safe' && '✅'}
            {result.soa_verification.status === 'warning' && '⚠️'}
            {result.soa_verification.status === 'danger' && '❌'}
            <span>MOSFET 安全工作区 (SOA) 验证</span>
            <span className="text-xs font-normal text-gray-600">
              ({result.soa_verification.mosfetModel})
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
            <div>
              <div className="text-gray-600 text-xs">工作电压 (V_DS)</div>
              <div className="font-mono font-semibold">
                {result.soa_verification.workingPoint.vds.toFixed(1)} V
              </div>
              <div className="text-xs text-gray-500">每个 MOS</div>
            </div>
            <div>
              <div className="text-gray-600 text-xs">工作电流 (I_D)</div>
              <div className="font-mono font-semibold">
                {result.soa_verification.workingPoint.id.toFixed(1)} A
              </div>
            </div>
            <div>
              <div className="text-gray-600 text-xs">脉冲宽度</div>
              <div className="font-mono font-semibold">
                {result.soa_verification.workingPoint.pulseWidth.toFixed(1)} ms
              </div>
            </div>
            <div>
              <div className="text-gray-600 text-xs">SOA 电流极限</div>
              <div className="font-mono font-semibold text-blue-600">
                {result.soa_verification.limitCurrent.toFixed(1)} A
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white rounded border border-gray-200">
            <div className="flex-1">
              <div className="text-xs text-gray-600 mb-1">安全裕量</div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    result.soa_verification.margin >= 20 ? 'bg-green-500' :
                    result.soa_verification.margin >= 0 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, result.soa_verification.margin))}%` }}
                />
              </div>
            </div>
            <div className={`font-mono font-bold text-lg ${
              result.soa_verification.margin >= 20 ? 'text-green-600' :
              result.soa_verification.margin >= 0 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {result.soa_verification.margin.toFixed(1)}%
            </div>
          </div>

          {result.soa_verification.margin < 20 && (
            <div className="mt-3 text-xs p-2 rounded bg-white border border-gray-300">
              <div className="font-semibold mb-1">
                {result.soa_verification.margin < 0 ? '🚨 超出 SOA 安全区！' : '⚠️ 裕量不足 20%'}
              </div>
              <div className="text-gray-700">
                {result.soa_verification.margin < 0
                  ? '工作点超出 MOSFET 安全工作区，可能导致器件损坏。建议：(1) 降低电流限制，(2) 减小 OCP 延时，(3) 选用更高规格的 MOSFET。'
                  : '工作点接近 SOA 边界，建议增加安全裕量至 20% 以上。'}
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
            💡 基于 {result.soa_verification.mosfetModel} datasheet Diagram 3 (Safe Operating Area)，
            考虑两个 MOS 串联，每个承受 V_IN/2 电压。
          </div>
        </div>
      )}

      {/* 浪涌电流评估 */}
      {result.inrush_current && (
        <div className={`p-4 rounded-lg border ${result.inrush_current.is_safe ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
          <div className="font-semibold mb-2">
            {result.inrush_current.is_safe ? '✅' : '⚠️'} 浪涌电流评估
          </div>
          <div className="text-sm">
            <div className="font-mono">
              峰值浪涌电流：<span className="font-semibold">{result.inrush_current.peak_current.toFixed(1)} A</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              公式：I_INRUSH = C_LOAD × (dV/dt)，其中 dV/dt = IGATE / C_GATE
            </div>
          </div>
        </div>
      )}

      {/* 完整 BOM 清单 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">📋 推荐 BOM（标准电阻）</h3>
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <table className="w-full text-sm">
            <tbody className="font-mono">
              <tr className="border-b">
                <td className="py-2 font-semibold">R8 (OVP 上拉)</td>
                <td className="py-2 text-right text-blue-600 font-semibold">{result.standard_bom.R8.toFixed(2)} kΩ</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-semibold">R9 (OVP 下拉)</td>
                <td className="py-2 text-right">10.00 kΩ (固定)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-semibold">R10 (UVLO 上拉)</td>
                <td className="py-2 text-right text-blue-600 font-semibold">{result.standard_bom.R10.toFixed(2)} kΩ</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-semibold">R11 (UVLO 下拉)</td>
                <td className="py-2 text-right">10.00 kΩ (固定)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-semibold">Rs (SENSE 检测)</td>
                <td className="py-2 text-right text-blue-600 font-semibold">{result.standard_bom.Rs.toFixed(2)} Ω</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-semibold">C_TIMER</td>
                <td className="py-2 text-right text-blue-600 font-semibold">{result.standard_bom.C_TIMER.toFixed(1)} nF</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">C_GATE</td>
                <td className="py-2 text-right text-blue-600 font-semibold">{result.standard_bom.C_GATE.toFixed(1)} nF</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// 导出 IC 容差常量供 Tooltip 使用
import { IC_TOLERANCES } from '@/lib/wca-engine'
export { IC_TOLERANCES }
