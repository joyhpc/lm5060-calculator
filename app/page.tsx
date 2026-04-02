'use client'

import { useState } from 'react'

type Mode = 'forward' | 'reverse'

interface ForwardData {
  vin_min: number
  vin_max: number
  i_limit: number
  rds_on: number
  ocp_delay: number
  dvdt: number
  health_check: boolean
}

interface ReverseData {
  R8: number
  R10: number
  R11: number
  Rs: number
  C_TIMER: number
  C_GATE: number
  rds_on: number
}

// 参数说明
const parameterInfo: Record<string, string> = {
  vin_min: '最小输入电压，系统正常工作的最低电压',
  vin_max: '最大输入电压，过压保护触发电压',
  i_limit: '电流限制，过流保护触发电流',
  rds_on: 'MOSFET 导通电阻，影响功耗和检测精度',
  ocp_delay: '过流保护延时，避免瞬态过流误触发',
  dvdt: '门极转换速率，控制输出电压上升速度',
  R8: 'OVP 上拉电阻，设置过压保护阈值',
  R10: 'UVLO 上拉电阻，设置欠压锁定阈值',
  R11: '分压器底部电阻，通常固定为 10kΩ',
  Rs: 'SENSE 检测电阻，用于电流检测',
  C_TIMER: 'TIMER 定时电容，设置过流保护延时',
  C_GATE: 'GATE 门极电容，控制输出上升速度',
}

// Tooltip 组件
function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-1">
      <span className="cursor-help text-gray-400 hover:text-gray-600">ⓘ</span>
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-sm text-white bg-gray-800 rounded-lg shadow-lg -left-24">
        {text}
      </div>
    </div>
  )
}

// BOM 表格组件
function BOMTable({ data }: { data: any }) {
  const bomItems = [
    { designator: 'R8', value: `${data.R8_kOhm} kΩ`, description: 'OVP 上拉电阻' },
    { designator: 'R10', value: `${data.R10_kOhm} kΩ`, description: 'UVLO 上拉电阻' },
    { designator: 'R11', value: `${data.R11_kOhm} kΩ`, description: '分压器底部' },
    { designator: 'Rs', value: `${data.Rs_Ohm} Ω`, description: 'SENSE 检测电阻' },
    { designator: 'C1', value: `${data.C_TIMER_nF} nF`, description: 'TIMER 电容' },
    { designator: 'C2', value: `${data.C_GATE_nF} nF`, description: 'GATE 电容' },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-700">位号</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">参数值</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">说明</th>
          </tr>
        </thead>
        <tbody>
          {bomItems.map((item, i) => (
            <tr key={i} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2 font-mono font-semibold">{item.designator}</td>
              <td className="px-4 py-2 font-mono">{item.value}</td>
              <td className="px-4 py-2 text-gray-600">{item.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('forward')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [roundtripError, setRoundtripError] = useState<number | null>(null)

  const [forwardData, setForwardData] = useState<ForwardData>({
    vin_min: 9.0,
    vin_max: 36.0,
    i_limit: 30.0,
    rds_on: 5.0,
    ocp_delay: 12.0,
    dvdt: 0.5,
    health_check: true,
  })

  const [reverseData, setReverseData] = useState<ReverseData>({
    R8: 170.0,
    R10: 46.25,
    R11: 10.0,
    Rs: 14556.96,
    C_TIMER: 64.5,
    C_GATE: 48.0,
    rds_on: 5.0,
  })

  // 加载示例数据
  const loadExample = (exampleType: 'default' | '12V' | '48V') => {
    if (mode === 'forward') {
      const examples = {
        default: { vin_min: 9.0, vin_max: 36.0, i_limit: 30.0, rds_on: 5.0, ocp_delay: 12.0, dvdt: 0.5, health_check: true },
        '12V': { vin_min: 9.0, vin_max: 16.0, i_limit: 20.0, rds_on: 8.0, ocp_delay: 10.0, dvdt: 0.8, health_check: true },
        '48V': { vin_min: 36.0, vin_max: 60.0, i_limit: 10.0, rds_on: 10.0, ocp_delay: 15.0, dvdt: 0.3, health_check: true },
      }
      setForwardData(examples[exampleType])
    } else {
      const examples = {
        default: { R8: 170.0, R10: 46.25, R11: 10.0, Rs: 14556.96, C_TIMER: 64.5, C_GATE: 48.0, rds_on: 5.0 },
        '12V': { R8: 70.0, R10: 46.25, R11: 10.0, Rs: 17721.52, C_TIMER: 53.8, C_GATE: 30.0, rds_on: 8.0 },
        '48V': { R8: 290.0, R10: 102.5, R11: 10.0, Rs: 10126.58, C_TIMER: 80.6, C_GATE: 80.0, rds_on: 10.0 },
      }
      setReverseData(examples[exampleType])
    }
    setResult(null)
    setError(null)
    setRoundtripError(null)
  }

  // 往返验证
  const verifyRoundtrip = async (forwardResult: any, originalInput: ForwardData) => {
    try {
      const reverseResponse = await fetch('/api/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          R8: forwardResult.data.R8_kOhm,
          R10: forwardResult.data.R10_kOhm,
          R11: forwardResult.data.R11_kOhm,
          Rs: forwardResult.data.Rs_Ohm,
          C_TIMER: forwardResult.data.C_TIMER_nF,
          C_GATE: forwardResult.data.C_GATE_nF,
          rds_on: originalInput.rds_on,
        }),
      })

      if (reverseResponse.ok) {
        const reverseData = await reverseResponse.json()
        const errors = [
          Math.abs(reverseData.data.uvlo_rising_V - originalInput.vin_min) / originalInput.vin_min,
          Math.abs(reverseData.data.ovp_threshold_V - originalInput.vin_max) / originalInput.vin_max,
          Math.abs(reverseData.data.i_limit_A - originalInput.i_limit) / originalInput.i_limit,
        ]
        const maxError = Math.max(...errors) * 100
        setRoundtripError(maxError)
      }
    } catch (err) {
      console.error('Roundtrip verification failed:', err)
    }
  }

  const handleForwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setRoundtripError(null)

    try {
      const response = await fetch('/api/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forwardData),
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const data = await response.json()
      setResult(data)

      // 自动进行往返验证
      verifyRoundtrip(data, forwardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setRoundtripError(null)

    try {
      const response = await fetch('/api/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reverseData),
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">LM5060 Calculator</h1>
          <p className="text-gray-600">Hot-Swap Controller Design Tool | 往返精度 &lt; 0.1%</p>
          <div className="mt-2 flex gap-2 text-sm">
            <a href="https://github.com/joyhpc/lm5060-calculator" target="_blank" rel="noopener noreferrer"
               className="text-blue-600 hover:underline">GitHub</a>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">基于 Datasheet SNVS628H</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => { setMode('forward'); setResult(null); setError(null); setRoundtripError(null); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'forward'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            正向计算 (需求 → BOM)
          </button>
          <button
            onClick={() => { setMode('reverse'); setResult(null); setError(null); setRoundtripError(null); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'reverse'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            反向计算 (BOM → 性能)
          </button>
        </div>

        {/* Example Buttons */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <span className="text-sm text-gray-600 self-center">快速加载示例：</span>
          <button onClick={() => loadExample('default')} className="px-3 py-1 text-sm bg-white rounded-lg hover:bg-gray-50 border border-gray-200">
            9-36V / 30A
          </button>
          <button onClick={() => loadExample('12V')} className="px-3 py-1 text-sm bg-white rounded-lg hover:bg-gray-50 border border-gray-200">
            12V 系统
          </button>
          <button onClick={() => loadExample('48V')} className="px-3 py-1 text-sm bg-white rounded-lg hover:bg-gray-50 border border-gray-200">
            48V 系统
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">
              {mode === 'forward' ? '系统需求' : 'BOM 参数'}
            </h2>

            {mode === 'forward' ? (
              <form onSubmit={handleForwardSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最小输入电压 (V)
                    <Tooltip text={parameterInfo.vin_min} />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.vin_min}
                    onChange={(e) => setForwardData({ ...forwardData, vin_min: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如: 9.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大输入电压 (V)
                    <Tooltip text={parameterInfo.vin_max} />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.vin_max}
                    onChange={(e) => setForwardData({ ...forwardData, vin_max: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如: 36.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    电流限制 (A)
                    <Tooltip text={parameterInfo.i_limit} />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.i_limit}
                    onChange={(e) => setForwardData({ ...forwardData, i_limit: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如: 30.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MOSFET 导通电阻 (mΩ)
                    <Tooltip text={parameterInfo.rds_on} />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.rds_on}
                    onChange={(e) => setForwardData({ ...forwardData, rds_on: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如: 5.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    过流保护延时 (ms)
                    <Tooltip text={parameterInfo.ocp_delay} />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.ocp_delay}
                    onChange={(e) => setForwardData({ ...forwardData, ocp_delay: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如: 12.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    门极转换速率 (V/µs)
                    <Tooltip text={parameterInfo.dvdt} />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.dvdt}
                    onChange={(e) => setForwardData({ ...forwardData, dvdt: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如: 0.5"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={forwardData.health_check}
                    onChange={(e) => setForwardData({ ...forwardData, health_check: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    健康检查（数值稳定性分析）
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? '计算中...' : '计算 BOM'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleReverseSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    R8 (kΩ)
                    <Tooltip text={parameterInfo.R8} />
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={reverseData.R8}
                    onChange={(e) => setReverseData({ ...reverseData, R8: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    R10 (kΩ)
                    <Tooltip text={parameterInfo.R10} />
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={reverseData.R10}
                    onChange={(e) => setReverseData({ ...reverseData, R10: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rs (Ω)
                    <Tooltip text={parameterInfo.Rs} />
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={reverseData.Rs}
                    onChange={(e) => setReverseData({ ...reverseData, Rs: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    C_TIMER (nF)
                    <Tooltip text={parameterInfo.C_TIMER} />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={reverseData.C_TIMER}
                    onChange={(e) => setReverseData({ ...reverseData, C_TIMER: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    C_GATE (nF)
                    <Tooltip text={parameterInfo.C_GATE} />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={reverseData.C_GATE}
                    onChange={(e) => setReverseData({ ...reverseData, C_GATE: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MOSFET 导通电阻 (mΩ)
                    <Tooltip text={parameterInfo.rds_on} />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={reverseData.rds_on}
                    onChange={(e) => setReverseData({ ...reverseData, rds_on: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? '计算中...' : '计算性能'}
                </button>
              </form>
            )}
          </div>

          {/* Results */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">计算结果</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                错误: {error}
              </div>
            )}

            {result && result.success && (
              <div className="space-y-4">
                {/* 往返验证提示 */}
                {roundtripError !== null && mode === 'forward' && (
                  <div className={`p-3 rounded-lg ${roundtripError < 0.01 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {roundtripError < 0.01 ? '✓' : '⚠'} 往返验证:
                      </span>
                      <span className="text-sm">
                        误差 {roundtripError.toFixed(4)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* BOM 表格（正向计算） */}
                {mode === 'forward' && (
                  <div>
                    <h3 className="font-semibold mb-3 text-lg">BOM 清单</h3>
                    <BOMTable data={result.data} />
                  </div>
                )}

                {/* 性能参数（反向计算） */}
                {mode === 'reverse' && (
                  <div>
                    <h3 className="font-semibold mb-3 text-lg">性能参数</h3>
                    {Object.entries(result.data).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-700 font-medium">{key}</span>
                        <span className="text-gray-900 font-mono">{typeof value === 'number' ? value.toFixed(2) : String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {result.health && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">健康检查</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>条件数:</span>
                        <span className="font-mono">{result.health.condition_number.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>状态:</span>
                        <span className={`font-semibold ${
                          result.health.status === 'HEALTHY' ? 'text-green-600' :
                          result.health.status === 'WARNING' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {result.health.status}
                        </span>
                      </div>
                      {result.health.warnings.length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium">警告:</span>
                          <ul className="list-disc list-inside mt-1 text-yellow-700">
                            {result.health.warnings.map((warning: string, i: number) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!result && !error && (
              <div className="text-center text-gray-400 py-12">
                填写参数并点击计算按钮
              </div>
            )}
          </div>
        </div>

        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>基于 LM5060 Datasheet SNVS628H | 往返精度 &lt; 0.1% |
            <a href="https://github.com/joyhpc/lm5060-calculator" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
              GitHub
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}
