import { useMemo, useState } from 'react'

const ACTION_COLORS = {
  buy: 'bg-green-100 text-green-800 border-green-200',
  add: 'bg-lime-100 text-lime-800 border-lime-200',
  hold: 'bg-blue-100 text-blue-800 border-blue-200',
  trim: 'bg-orange-100 text-orange-800 border-orange-200',
  watch: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  avoid: 'bg-red-100 text-red-800 border-red-200',
  sell: 'bg-red-100 text-red-800 border-red-200',
}

const ACTION_LABELS = {
  buy: '买入',
  add: '加仓',
  hold: '持有',
  trim: '减仓',
  watch: '观望',
  avoid: '规避',
  sell: '卖出',
}

function formatDate(value) {
  if (!value) return '未记录'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('zh-CN')
}

function extractSummaryLines(content = '') {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
}

function buildHistoryTimeline(history = [], changes = []) {
  return history.map((item) => {
    const snapshot = item.snapshot || {}
    const meta = snapshot.meta || {}
    const v22 = snapshot.v22 || {}
    const decision = snapshot.decision_summary || {}
    const matchedChange = changes.find(
      (change) => change.filename.replace(/\.md$/, '') === item.filename.replace(/\.json$/, '')
    )

    return {
      id: item.filename,
      timestamp: meta.updated_at || item.filename.replace(/\.json$/, ''),
      triggerReason: meta.trigger_reason || meta.trigger || '档案刷新',
      score: v22.v22_total,
      grade: v22.v22_grade,
      signalStatus: snapshot.signal?.signal_status || '',
      action: decision.action || '',
      reviewStatus: decision.review_status || '',
      summaryLines: extractSummaryLines(matchedChange?.content || ''),
    }
  })
}

export default function VersionHistory({
  currentRecord,
  decisionState,
  history = [],
  changes = [],
  loading = false,
}) {
  const [expanded, setExpanded] = useState(false)

  const currentReview = decisionState?.review || {}
  const currentMeta = decisionState?.meta || {}
  const rawSignals = currentRecord?.signal || decisionState?.signals || {}
  const currentSignals = {
    signal_status: rawSignals.signal_status || rawSignals.signalStatus || '',
    signal_age_days: rawSignals.signal_age_days ?? rawSignals.signalAgeDays ?? null,
    review_priority: rawSignals.review_priority || rawSignals.reviewPriority || 'low',
  }
  const tags = decisionState?.audit?.tags || []
  const timeline = useMemo(
    () => buildHistoryTimeline(history, changes),
    [history, changes]
  )

  if (loading) {
    return <div className="animate-pulse h-24 bg-gray-100 rounded-lg"></div>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">📜 版本历史</h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {expanded ? '收起' : '展开'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ACTION_COLORS[currentReview.decisionAction] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
            {ACTION_LABELS[currentReview.decisionAction] || '待定'}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            currentReview.reviewStatus === 'approved'
              ? 'bg-green-100 text-green-800'
              : currentReview.reviewStatus === 'needs_review'
                ? 'bg-yellow-100 text-yellow-800'
                : currentReview.reviewStatus === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
          }`}>
            {currentReview.reviewStatus === 'approved'
              ? '✅ 已确认'
              : currentReview.reviewStatus === 'needs_review'
                ? '⏳ 待复核'
                : currentReview.reviewStatus === 'rejected'
                  ? '❌ 已拒绝'
                  : '❓ 未确认'}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            currentSignals.signal_status === 'fresh'
              ? 'bg-green-100 text-green-800'
              : currentSignals.signal_status === 'needs_review'
                ? 'bg-yellow-100 text-yellow-800'
                : currentSignals.signal_status === 'stale'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
          }`}>
            {currentSignals.signal_status === 'fresh'
              ? '信号有效'
              : currentSignals.signal_status === 'needs_review'
                ? '信号待复核'
                : currentSignals.signal_status === 'stale'
                  ? '信号过期'
                  : '信号未知'}
            {currentSignals.signal_age_days != null ? ` (${currentSignals.signal_age_days}天)` : ''}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {currentReview.decisionReason && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">当前决策理由</div>
              <div className="text-sm text-gray-700">{currentReview.decisionReason}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">最后审核：</span>
              <span className="text-gray-900">{currentMeta.lastReviewedAt || '未审核'}</span>
            </div>
            <div>
              <span className="text-gray-500">审核次数：</span>
              <span className="text-gray-900">{currentReview.reviewCount || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">复核截止：</span>
              <span className={currentMeta.reviewDeadline && new Date(currentMeta.reviewDeadline) < new Date() ? 'text-red-600 font-medium' : 'text-gray-900'}>
                {currentMeta.reviewDeadline || '未设置'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">优先级：</span>
              <span className={
                currentSignals.review_priority === 'high'
                  ? 'text-red-600 font-medium'
                  : currentSignals.review_priority === 'medium'
                    ? 'text-yellow-600'
                    : 'text-gray-900'
              }>
                {currentSignals.review_priority || 'low'}
              </span>
            </div>
          </div>

          {timeline.length > 0 ? (
            <div>
              <div className="text-xs text-gray-500 mb-2">历史版本</div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {timeline.map((record) => (
                  <div key={record.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">{formatDate(record.timestamp)}</span>
                      {record.action && (
                        <span className={`px-1.5 py-0.5 rounded text-xs border ${ACTION_COLORS[record.action] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                          {ACTION_LABELS[record.action] || record.action}
                        </span>
                      )}
                      {record.grade && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-white text-gray-700 border border-gray-200">
                          {record.grade} / {record.score ?? 'N/A'}
                        </span>
                      )}
                      {record.signalStatus && (
                        <span className="text-xs text-gray-500">信号：{record.signalStatus}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-700 mb-2">{record.triggerReason}</div>
                    {record.summaryLines.length > 0 && (
                      <div className="space-y-1">
                        {record.summaryLines.slice(0, 4).map((line) => (
                          <div key={line} className="text-xs text-gray-500">{line}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              暂无版本历史记录
            </div>
          )}

          {tags.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">标签</div>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
