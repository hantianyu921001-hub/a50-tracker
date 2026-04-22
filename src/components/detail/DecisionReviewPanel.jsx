import { useEffect, useState } from 'react'

const REVIEW_STATUS_OPTIONS = [
  { value: 'needs_review', label: '待复核' },
  { value: 'approved', label: '已确认' },
  { value: 'rejected', label: '已拒绝' },
]

const ACTION_OPTIONS = [
  { value: 'buy', label: '买入' },
  { value: 'add', label: '加仓' },
  { value: 'hold', label: '持有' },
  { value: 'trim', label: '减仓' },
  { value: 'watch', label: '观察' },
  { value: 'avoid', label: '规避' },
]

export default function DecisionReviewPanel({
  decisionState,
  signalStatus,
  onSubmit,
  submitting = false,
}) {
  const review = decisionState?.review || {}
  const meta = decisionState?.meta || {}
  const [form, setForm] = useState({
    action: review.decisionAction || '',
    reviewStatus: review.reviewStatus || 'needs_review',
    decisionReason: review.decisionReason || '',
    reviewNotes: review.reviewNotes || '',
    reviewDeadline: meta.reviewDeadline || '',
  })

  useEffect(() => {
    setForm({
      action: review.decisionAction || '',
      reviewStatus: review.reviewStatus || 'needs_review',
      decisionReason: review.decisionReason || '',
      reviewNotes: review.reviewNotes || '',
      reviewDeadline: meta.reviewDeadline || '',
    })
  }, [
    meta.reviewDeadline,
    review.decisionAction,
    review.decisionReason,
    review.reviewNotes,
    review.reviewStatus,
  ])

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.(form)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🧭 人工确认</h3>
            <p className="text-sm text-gray-500 mt-1">
              当前信号状态：{signalStatus || '未知'}，这里的提交会直接回写单公司 `decision.json`
            </p>
          </div>
          {review.reviewedAt && (
            <div className="text-xs text-gray-500 text-right">
              <div>最近确认</div>
              <div>{new Date(review.reviewedAt).toLocaleString('zh-CN')}</div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">复核状态</span>
            <select
              value={form.reviewStatus}
              onChange={(event) => handleChange('reviewStatus', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {REVIEW_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">决策动作</span>
            <select
              value={form.action}
              onChange={(event) => handleChange('action', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">请选择动作</option>
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-gray-700">核心理由</span>
            <input
              value={form.decisionReason}
              onChange={(event) => handleChange('decisionReason', event.target.value)}
              placeholder="例如：估值进入理想区间，但需继续跟踪息差修复"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-gray-700">复核备注</span>
            <textarea
              value={form.reviewNotes}
              onChange={(event) => handleChange('reviewNotes', event.target.value)}
              placeholder="记录你这次确认时重点看了哪些风险、数据和组合约束"
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">下次复核截止</span>
            <input
              type="date"
              value={form.reviewDeadline}
              onChange={(event) => handleChange('reviewDeadline', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-gray-500">
            建议先确认基本面、估值、风险事件和组合仓位，再提交人工结论。
          </div>
          <button
            type="submit"
            disabled={submitting}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              submitting
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {submitting ? '提交中...' : '保存人工确认'}
          </button>
        </div>
      </form>
    </div>
  )
}
