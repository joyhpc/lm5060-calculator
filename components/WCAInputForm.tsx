/**
 * WCA 输入表单组件
 *
 * 功能：
 * 1. 基础参数输入（电压、电流、延时等）
 * 2. 电阻精度选择（0.1% / 0.5% / 1% / 5%）
 * 3. 可选高级参数（负载电容、连接器限流、MOSFET SOA）
 * 4. 参数 Tooltip 说明
 */

import React, { useState } from 'react'
import { WCAInput, ResistorTolerance } from '@/lib/wca-engine'

interface Props {
  onCalculate: (input: WCAInput) => void
  loading?: boolean
}

/** Tooltip 组件 */
function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-1">
      <span className="cursor-help text-gray-400 hover:text-gray-600">ⓘ</span>
      <div className="invisible group-hover:visible absolute z-10 w-72 p-3 mt-1 text-sm text-white bg-gray-800 rounded-lg shadow-lg -left-32">
        {text}
      </div>
    </div>
  )
}

/** 输入字段组件 */
function InputField({
  label,
  value,
  onChange,
  unit,
  tooltip,
  type = 'number',
  step = 'any',
  min,
  max,
}: {
  label: string
  value: number | string
  onChange: (value: any) => void
  unit: string
  tooltip: string
  type?: string
  step?: string
  min?: number
  max?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        <Tooltip text={tooltip} />
      </label>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          step={step}
          min={min}
          max={max}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <span className="text-sm text-gray-600 w-12">{unit}</span>
      </div>
    </div>
  )
}

export default function WCAInputForm({ onCalculate, loading = false }: Props) {
  const [input, setInput] = useState<WCAInput>({
    vin_min: 9.0,
    vin_max: 36.0,
    i_limit: 30.0,
    rds_on: 5.0,
    ocp_delay: 12.0,
    dvdt: 0.5,
    resistor_tolerance: '1%',
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCalculate(input)
  }

  const loadExample = (type: 'default' | '12V' | '48V') => {
    const examples: Record<string, Partial<WCAInput>> = {
      default: {
        vin_min: 9.0,
        vin_max: 36.0,
        i_limit: 30.0,
        rds_on: 5.0,
        ocp_delay: 12.0,
        dvdt: 0.5,
        resistor_tolerance: '1%',
      },
      '12V': {
        vin_min: 9.0,
        vin_max: 16.0,
        i_limit: 20.0,
        rds_on: 8.0,
        ocp_delay: 10.0,
        dvdt: 0.8,
        resistor_tolerance: '1%',
      },
      '48V': {
        vin_min: 36.0,
        vin_max: 60.0,
        i_limit: 10.0,
        rds_on: 10.0,
        ocp_delay: 15.0,
        dvdt: 0.3,
        resistor_tolerance: '0.5%',
      },
    }
    setInput({ ...input, ...examples[type] })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 示例数据按钮 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => loadExample('default')}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          9-36V/30A
        </button>
        <button
          type="button"
          onClick={() => loadExample('12V')}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          12V 系统
        </button>
        <button
          type="button"
          onClick={() => loadExample('48V')}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          48V 系统
        </button>
      </div>

      {/* 基础参数 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          label="最小输入电压"
          value={input.vin_min}
          onChange={(v) => setInput({ ...input, vin_min: v })}
          unit="V"
          tooltip="系统正常工作的最低电压，低于此值触发 UVLO 保护"
          min={4.5}
          max={80}
        />
        <InputField
          label="最大输入电压"
          value={input.vin_max}
          onChange={(v) => setInput({ ...input, vin_max: v })}
          unit="V"
          tooltip="过压保护触发电压，高于此值切断输出"
          min={4.5}
          max={80}
        />
        <InputField
          label="电流限制"
          value={input.i_limit}
          onChange={(v) => setInput({ ...input, i_limit: v })}
          unit="A"
          tooltip="过流保护触发电流，超过此值启动延时保护"
          min={0.1}
        />
        <InputField
          label="MOSFET 导通电阻"
          value={input.rds_on}
          onChange={(v) => setInput({ ...input, rds_on: v })}
          unit="mΩ"
          tooltip="所选 N-Channel MOSFET 的 RDS(ON)，影响功耗和电流检测精度"
          min={0.1}
        />
        <InputField
          label="过流保护延时"
          value={input.ocp_delay}
          onChange={(v) => setInput({ ...input, ocp_delay: v })}
          unit="ms"
          tooltip="过流保护触发后的延时时间，避免瞬态过流误触发"
          min={1}
          max={100}
        />
        <InputField
          label="门极转换速率"
          value={input.dvdt}
          onChange={(v) => setInput({ ...input, dvdt: v })}
          unit="V/µs"
          tooltip="控制输出电压上升速度，影响浪涌电流大小"
          min={0.1}
          max={10}
        />
      </div>

      {/* 电阻精度选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          外围电阻精度
          <Tooltip text="选择 R8/R10 等分压电阻的精度等级，影响保护阈值的容差范围。高精度电阻（0.1%/0.5%）可减小阈值漂移，但成本更高。" />
        </label>
        <div className="flex gap-3">
          {(['0.1%', '0.5%', '1%', '5%'] as ResistorTolerance[]).map((tol) => (
            <label key={tol} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tolerance"
                value={tol}
                checked={input.resistor_tolerance === tol}
                onChange={(e) => setInput({ ...input, resistor_tolerance: e.target.value as ResistorTolerance })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm">{tol}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 高级参数折叠区 */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <span>{showAdvanced ? '▼' : '▶'}</span>
          高级参数（浪涌电流评估 & 自动 SOA 验证）
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 pl-6 border-l-2 border-blue-200">
            <InputField
              label="后端负载电容"
              value={input.c_load || ''}
              onChange={(v) => setInput({ ...input, c_load: v || undefined })}
              unit="µF"
              tooltip="后端负载的总输入电容（包括 MLCC、电解电容等），用于计算浪涌电流"
              min={0}
            />
            <InputField
              label="连接器最大允许电流"
              value={input.connector_max_current || ''}
              onChange={(v) => setInput({ ...input, connector_max_current: v || undefined })}
              unit="A"
              tooltip="电源连接器或前端保险丝的额定电流，用于评估浪涌电流是否安全"
              min={0}
            />
            <div className="text-xs text-gray-600 bg-green-50 p-3 rounded border border-green-200">
              ✅ <span className="font-semibold">MOSFET SOA 验证：</span>自动基于 BSZ096N10LS5 datasheet SOA 曲线进行验证，无需手动输入。
              计算器会检查工作点 (V_DS, I_D, t_pulse) 是否在安全区内，并给出安全裕量百分比。
            </div>
            <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
              💡 提示：浪涌电流评估对于高可靠性设计（如工业/汽车应用）非常重要。
            </div>
          </div>
        )}
      </div>

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
      >
        {loading ? '计算中...' : '🚀 开始 WCA 计算'}
      </button>

      {/* 说明文字 */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <div className="font-semibold mb-1">关于最坏情况分析 (WCA)：</div>
        <ul className="list-disc list-inside space-y-1">
          <li>计算器会基于 IC 容差（UVLO/OVP 阈值的 Min/Typ/Max）和电阻容差，计算出保护阈值的极值区间</li>
          <li>自动将理想电阻值吸附到 E96/E24 标准阻值，并反向验算实际阈值漂移</li>
          <li>包含迟滞电流修正：UVLO 关断时引脚吸入 21µA 电流，导致关断电压偏移</li>
          <li>所有公式来源于 LM5060 datasheet SNVS628H，确保计算准确性</li>
        </ul>
      </div>
    </form>
  )
}
