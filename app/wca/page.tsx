/**
 * WCA 主页面集成示例
 *
 * 展示如何在 Next.js 页面中集成 WCA 功能
 */

'use client'

import { useState } from 'react'
import WCAInputForm from '@/components/WCAInputForm'
import WCAResultDisplay from '@/components/WCAResultDisplay'
import { computeWCA, WCAInput, WCAResult } from '@/lib/wca-engine'

export default function WCAPage() {
  const [result, setResult] = useState<WCAResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = (input: WCAInput) => {
    setLoading(true)
    setError(null)

    try {
      // 客户端直接计算（无需 API 调用）
      const wcaResult = computeWCA(input)
      setResult(wcaResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : '计算失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            LM5060 最坏情况分析 (WCA) 计算器
          </h1>
          <p className="text-gray-600">
            基于 IC 容差和电阻精度，计算保护阈值的极值区间，确保设计鲁棒性
          </p>
        </div>

        {/* 两栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：输入表单 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">输入参数</h2>
            <WCAInputForm onCalculate={handleCalculate} loading={loading} />
          </div>

          {/* 右侧：计算结果 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">计算结果</h2>

            {error && (
              <div className="p-4 bg-red-50 border border-red-300 rounded text-red-800">
                ❌ {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!loading && !error && result && (
              <WCAResultDisplay result={result} />
            )}

            {!loading && !error && !result && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📊</div>
                <div>输入参数后点击计算按钮</div>
              </div>
            )}
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            🎓 WCA 计算器使用指南
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <div className="font-semibold mb-2">1. IC 容差数据</div>
              <ul className="list-disc list-inside space-y-1">
                <li>UVLO 阈值：1.45V ~ 1.75V (典型 1.6V)</li>
                <li>OVP 阈值：1.88V ~ 2.12V (典型 2.0V)</li>
                <li>迟滞电流：16µA ~ 26µA (典型 21µA)</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">2. 电阻精度选择</div>
              <ul className="list-disc list-inside space-y-1">
                <li>0.1%：超高精度，用于关键应用</li>
                <li>0.5%：高精度，推荐用于工业级</li>
                <li>1%：标准精度，性价比最优</li>
                <li>5%：低精度，仅用于非关键场合</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">3. 标准电阻吸附</div>
              <ul className="list-disc list-inside space-y-1">
                <li>E96 系列：1% 精度，96 个标准值</li>
                <li>E24 系列：5% 精度，24 个标准值</li>
                <li>自动反向验算实际阈值漂移</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">4. 高级评估</div>
              <ul className="list-disc list-inside space-y-1">
                <li>浪涌电流：I = C_LOAD × (dV/dt)</li>
                <li>MOSFET SOA：I²t 热应力检查</li>
                <li>迟滞电流：ΔV = I_HYS × R10</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 公式参考 */}
        <div className="mt-6 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            📐 核心公式参考
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
            <div>
              <div className="text-gray-700 font-semibold mb-1">UVLO 开启电压：</div>
              <div className="bg-white p-2 rounded">
                V_UVLO = UVLOTH + R10 × (I_BIAS + UVLOTH/R11)
              </div>
              <div className="text-xs text-gray-600 mt-1">
                来源：Datasheet SNVS628H Section 8.2.3.2.1, Page 31
              </div>
            </div>
            <div>
              <div className="text-gray-700 font-semibold mb-1">UVLO 关断电压：</div>
              <div className="bg-white p-2 rounded">
                V_FALL = V_UVLO - (I_HYS × R10)
              </div>
              <div className="text-xs text-gray-600 mt-1">
                迟滞电流修正（实测验证）
              </div>
            </div>
            <div>
              <div className="text-gray-700 font-semibold mb-1">OVP 触发电压：</div>
              <div className="bg-white p-2 rounded">
                V_OVP = OVPTH × (1 + R8/R9)
              </div>
              <div className="text-xs text-gray-600 mt-1">
                来源：Datasheet SNVS628H Section 8.2.3.2.1, Page 30
              </div>
            </div>
            <div>
              <div className="text-gray-700 font-semibold mb-1">浪涌电流：</div>
              <div className="bg-white p-2 rounded">
                I_INRUSH = C_LOAD × (IGATE / C_GATE)
              </div>
              <div className="text-xs text-gray-600 mt-1">
                dV/dt 由 C_GATE 控制
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
