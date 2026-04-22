/**
 * 12项Checklist展示面板
 * 显示决策引擎的自动化评估结果
 */
import { useState } from 'react'

const CHECKLIST_NAMES = {
  fundamental_trend: '基本面趋势',
  valuation_fit: '估值匹配',
  catalyst_validity: '催化剂有效性',
  risk_events: '风险事件',
  industry_cycle: '行业周期',
  earnings_quality: '盈利质量',
  cashflow_health: '现金流健康',
  position_fit: '仓位匹配',
  liquidity_fit: '流动性匹配',
  timing_window: '时机窗口',
  data_completeness: '数据完整性',
  thesis_integrity: '投资逻辑完整性'
}

const STATUS_ICONS = {
  pass: '✅',
  review: '⚠️',
  fail: '❌',
  unknown: '❓'
}

const STATUS_COLORS = {
  pass: 'text-green-600 bg-green-50 border-green-100',
  review: 'text-yellow-600 bg-yellow-50 border-yellow-100',
  fail: 'text-red-600 bg-red-50 border-red-100',
  unknown: 'text-gray-600 bg-gray-50 border-gray-100'
}

export default function ChecklistPanel({ checklist, autoScore = null, compact = false }) {
  const [expanded, setExpanded] = useState(!compact)

  if (!checklist) return null

  const items = Object.entries(checklist)
  const passCount = items.filter(([, v]) => v.status === 'pass').length
  const reviewCount = items.filter(([, v]) => v.status === 'review').length
  const failCount = items.filter(([, v]) => v.status === 'fail').length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">📋 决策Checklist</h3>
            {autoScore !== null && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                autoScore >= 0.75 ? 'bg-green-100 text-green-800' :
                autoScore >= 0.45 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              }`}>
                自动评分: {(autoScore * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {expanded ? '收起' : '展开'}
          </button>
        </div>

        {/* 统计摘要 */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
            <span>{passCount}</span>通过
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs">
            <span>{reviewCount}</span>待复核
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
            <span>{failCount}</span>失败
          </span>
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map(([key, data]) => (
              <div
                key={key}
                className={`p-3 rounded-lg border ${STATUS_COLORS[data.status] || STATUS_COLORS.unknown}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base">{STATUS_ICONS[data.status] || STATUS_ICONS.unknown}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{CHECKLIST_NAMES[key] || key}</span>
                      <span className="text-xs opacity-75">置信度 {data.confidence || 3}/5</span>
                    </div>
                    <p className="text-xs mt-1 opacity-80">{data.note || '无备注'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 说明 */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
            <p className="mb-1">💡 说明：</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>✅ 通过：该项符合投资标准</li>
              <li>⚠️ 待复核：该项存在不确定性，需要人工确认</li>
              <li>❌ 失败：该项不满足投资条件</li>
            </ul>
            <p className="mt-2">综合评分 = Σ(状态分×权重×置信度因子) / 总权重</p>
          </div>
        </div>
      )}
    </div>
  )
}
