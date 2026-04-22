import { useState, useMemo } from 'react'
import { useScoring } from '../context/ScoringContext'

const STALE_THRESHOLD_DAYS = 14

export default function DataRefreshPage() {
  const { companies } = useScoring()
  const [copiedCommand, setCopiedCommand] = useState('')

  const staleStats = useMemo(() => {
    const stats = {
      total: companies.length,
      fresh: 0,
      needsReview: 0,
      stale: 0,
      staleList: []
    }

    companies.forEach(c => {
      const status = c.v22_signal_status
      const ageDays = c.v22_signal_age_days || 0

      if (status === 'stale' || ageDays >= STALE_THRESHOLD_DAYS) {
        stats.stale++
        stats.staleList.push(c)
      } else if (status === 'needs_review' || ageDays >= 7) {
        stats.needsReview++
      } else {
        stats.fresh++
      }
    })

    stats.staleList.sort((a, b) => (b.v22_signal_age_days || 0) - (a.v22_signal_age_days || 0))

    return stats
  }, [companies])

  const copyCommand = (cmd, id) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedCommand(id)
      setTimeout(() => setCopiedCommand(''), 2000)
    })
  }

  const getLastUpdateDate = () => {
    const dates = companies.map(c => c.lastUpdate).filter(d => d).sort()
    return dates.length > 0 ? dates[dates.length - 1] : '未知'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据刷新</h1>
          <p className="mt-1 text-sm text-gray-500">
            A50股票数据一键刷新 · 最后更新: {getLastUpdateDate()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => copyCommand(
              'cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 v22_scorer.py',
              'rescore'
            )}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              copiedCommand === 'rescore'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copiedCommand === 'rescore' ? '✓ 已复制' : '重新计算评分'}
          </button>
          <button
            onClick={() => copyCommand(
              'cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 scripts/version_manager.py save "手动备份"',
              'snapshot'
            )}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              copiedCommand === 'snapshot'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {copiedCommand === 'snapshot' ? '✓ 已复制' : '保存快照'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-gray-900">{staleStats.total}</div>
          <div className="text-sm text-gray-500">股票总数</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="text-3xl font-bold text-green-600">{staleStats.fresh}</div>
          <div className="text-sm text-green-600">数据新鲜</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
          <div className="text-3xl font-bold text-yellow-600">{staleStats.needsReview}</div>
          <div className="text-sm text-yellow-600">待复核</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <div className="text-3xl font-bold text-red-600">{staleStats.stale}</div>
          <div className="text-sm text-red-600">需要更新</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">一键刷新流程</h2>
          <p className="text-sm text-gray-500 mt-1">复制命令到终端执行</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500"># 1. 保存快照</span>
              <button
                onClick={() => copyCommand(
                  'cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 scripts/version_manager.py save "数据刷新前备份"',
                  'step1'
                )}
                className={`ml-2 px-2 py-0.5 text-xs rounded ${
                  copiedCommand === 'step1' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {copiedCommand === 'step1' ? '✓' : '复制'}
              </button>
            </div>
            <code className="text-green-400">
              python3 scripts/version_manager.py save "数据刷新前备份"
            </code>

            <div className="flex items-center gap-2 mt-4">
              <span className="text-gray-500"># 2. 获取最新数据</span>
              <button
                onClick={() => copyCommand(
                  'cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --fetch-all',
                  'step2'
                )}
                className={`ml-2 px-2 py-0.5 text-xs rounded ${
                  copiedCommand === 'step2' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {copiedCommand === 'step2' ? '✓' : '复制'}
              </button>
            </div>
            <code className="text-green-400">
              python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --fetch-all
            </code>

            <div className="flex items-center gap-2 mt-4">
              <span className="text-gray-500"># 3. 更新 companies.json</span>
              <button
                onClick={() => copyCommand(
                  'cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --update',
                  'step3'
                )}
                className={`ml-2 px-2 py-0.5 text-xs rounded ${
                  copiedCommand === 'step3' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {copiedCommand === 'step3' ? '✓' : '复制'}
              </button>
            </div>
            <code className="text-green-400">
              python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --update
            </code>

            <div className="flex items-center gap-2 mt-4">
              <span className="text-gray-500"># 4. 重新计算评分</span>
              <button
                onClick={() => copyCommand(
                  'cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 v22_scorer.py',
                  'step4'
                )}
                className={`ml-2 px-2 py-0.5 text-xs rounded ${
                  copiedCommand === 'step4' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {copiedCommand === 'step4' ? '✓' : '复制'}
              </button>
            </div>
            <code className="text-green-400">
              python3 v22_scorer.py
            </code>

            <div className="flex items-center gap-2 mt-4">
              <span className="text-gray-500"># 5. 标记过期股票</span>
              <button
                onClick={() => copyCommand(
                  'cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 src/skills/a50-data-refresh/scripts/batch_refresh.py --all-stale',
                  'step5'
                )}
                className={`ml-2 px-2 py-0.5 text-xs rounded ${
                  copiedCommand === 'step5' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {copiedCommand === 'step5' ? '✓' : '复制'}
              </button>
            </div>
            <code className="text-green-400">
              python3 src/skills/a50-data-refresh/scripts/batch_refresh.py --all-stale
            </code>
          </div>

          <button
            onClick={() => copyCommand(
              `cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 scripts/version_manager.py save "数据刷新前备份" && python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --fetch-all && python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --update && python3 v22_scorer.py && python3 src/skills/a50-data-refresh/scripts/batch_refresh.py --all-stale`,
              'all'
            )}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              copiedCommand === 'all'
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copiedCommand === 'all' ? '✓ 已复制完整流程命令' : '📋 复制完整刷新流程命令'}
          </button>
        </div>
      </div>

      {staleStats.staleList.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              需要更新的股票 ({staleStats.staleList.length})
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              数据超过{STALE_THRESHOLD_DAYS}天未更新
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {staleStats.staleList.slice(0, 20).map(company => (
              <div
                key={company.code}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium text-gray-900">{company.code}</div>
                  <div className="w-32 text-sm text-gray-700">{company.name}</div>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    company.v22_signal_status === 'stale'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {company.v22_signal_status === 'stale' ? '已过期' : '待复核'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    {company.v22_signal_age_days || 0}天前更新
                  </div>
                  <button
                    onClick={() => copyCommand(
                      `python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --fetch ${company.code}`,
                      `fetch-${company.code}`
                    )}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      copiedCommand === `fetch-${company.code}`
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    {copiedCommand === `fetch-${company.code}` ? '✓' : '获取数据'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {staleStats.staleList.length > 20 && (
            <div className="p-4 text-center text-sm text-gray-500">
              还有 {staleStats.staleList.length - 20} 只股票未显示
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">快捷命令</h2>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          <div
            onClick={() => copyCommand(
              'cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 src/skills/a50-data-refresh/scripts/batch_refresh.py --check',
              'check'
            )}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="font-medium text-gray-900">🔍 检查过期数据</div>
            <div className="text-sm text-gray-500 mt-1">检测哪些股票需要更新</div>
            <code className="text-xs text-blue-600 mt-2 block">--check</code>
          </div>

          <div
            onClick={() => copyCommand(
              'cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --fetch 300750',
              'fetch-single'
            )}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="font-medium text-gray-900">📊 获取单只股票</div>
            <div className="text-sm text-gray-500 mt-1">指定股票代码获取数据</div>
            <code className="text-xs text-blue-600 mt-2 block">--fetch CODE</code>
          </div>

          <div
            onClick={() => copyCommand(
              'cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 v22_scorer.py',
              'rescore-cmd'
            )}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="font-medium text-gray-900">🔢 重新计算评分</div>
            <div className="text-sm text-gray-500 mt-1">运行 v22_scorer.py</div>
            <code className="text-xs text-blue-600 mt-2 block">v22_scorer.py</code>
          </div>

          <div
            onClick={() => copyCommand(
              'cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app && python3 scripts/version_manager.py save "手动备份"',
              'snapshot-cmd'
            )}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="font-medium text-gray-900">💾 保存快照</div>
            <div className="text-sm text-gray-500 mt-1">备份当前数据版本</div>
            <code className="text-xs text-blue-600 mt-2 block">version_manager.py save</code>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="font-medium text-blue-900">💡 使用说明</h3>
        <ul className="mt-2 text-sm text-blue-700 space-y-1">
          <li>• 数据刷新需要 <code className="bg-blue-100 px-1 rounded">akshare</code> 库（已安装 v1.18.20）</li>
          <li>• 刷新前建议先保存快照，防止数据丢失</li>
          <li>• 评分计算依赖 companies.json 中的 scoringRationale 字段</li>
          <li>• 刷新完成后需要刷新页面使数据生效</li>
        </ul>
      </div>
    </div>
  )
}
