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

export default function Home() {
  const [mode, setMode] = useState<Mode>('forward')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

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

  const handleForwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">LM5060 Calculator</h1>
        <p className="text-gray-600 mb-8">Hot-Swap Controller Design Tool</p>

        {/* Mode Toggle */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => { setMode('forward'); setResult(null); setError(null); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'forward'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            正向计算 (需求 → BOM)
          </button>
          <button
            onClick={() => { setMode('reverse'); setResult(null); setError(null); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'reverse'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            反向计算 (BOM → 性能)
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
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.vin_min}
                    onChange={(e) => setForwardData({ ...forwardData, vin_min: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大输入电压 (V)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.vin_max}
                    onChange={(e) => setForwardData({ ...forwardData, vin_max: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    电流限制 (A)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.i_limit}
                    onChange={(e) => setForwardData({ ...forwardData, i_limit: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MOSFET 导通电阻 (mΩ)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.rds_on}
                    onChange={(e) => setForwardData({ ...forwardData, rds_on: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    过流保护延时 (ms)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.ocp_delay}
                    onChange={(e) => setForwardData({ ...forwardData, ocp_delay: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    门极转换速率 (V/µs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={forwardData.dvdt}
                    onChange={(e) => setForwardData({ ...forwardData, dvdt: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    健康检查
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
                {Object.entries(result.data).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">{key}</span>
                    <span className="text-gray-900 font-mono">{typeof value === 'number' ? value.toFixed(2) : String(value)}</span>
                  </div>
                ))}

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
          <p>基于 LM5060 Datasheet SNVS628H | 往返精度 &lt; 0.1%</p>
        </footer>
      </div>
    </main>
  )
}
