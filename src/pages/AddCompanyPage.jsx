import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { refreshCompany } from '../services/api'

function normalizeSymbol(input) {
  return input.replace(/\s+/g, '').replace(/[^0-9]/g, '').slice(0, 6)
}

function getMarketHint(symbol) {
  if (!/^\d{6}$/.test(symbol)) return '请输入 6 位股票代码'
  if (symbol.startsWith('6')) return 'A股主板（上交所）'
  if (symbol.startsWith('0') || symbol.startsWith('3')) return 'A股（深交所）'
  return '将按代码跳转到详情页'
}

export default function AddCompanyPage() {
  const navigate = useNavigate()
  const [symbol, setSymbol] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const normalizedSymbol = useMemo(() => normalizeSymbol(symbol), [symbol])
  const isValid = /^\d{6}$/.test(normalizedSymbol)
  const marketHint = getMarketHint(normalizedSymbol)

  const handleSubmit = (event) => {
    event.preventDefault()
    setTouched(true)
    if (!isValid) return
    navigate(`/company/${normalizedSymbol}`)
  }

  const handleAnalyzeNow = async () => {
    setTouched(true)
    if (!isValid || submitting) return

    setSubmitting(true)
    setSubmitMessage('正在抓取外部数据并执行自动分析...')
    try {
      const result = await refreshCompany(normalizedSymbol, {
        analysisType: 'external',
        trigger: 'manual',
        triggerReason: `新增公司并立即分析 ${normalizedSymbol}`,
      })
      setSubmitMessage(`✅ ${result.message}`)
      navigate(`/company/${normalizedSymbol}`)
    } catch (error) {
      setSubmitMessage(`❌ ${error.message || '自动分析失败'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回总览
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="text-sm text-blue-600 font-medium mb-2">新增公司</div>
          <h1 className="text-2xl font-bold text-gray-900">输入股票代码，进入详情页并手动触发入档</h1>
          <p className="mt-2 text-sm text-gray-600">
            当前最成熟的是银行自动分析链。进入详情页后，点击右上角“手动刷新”，系统会抓取外部数据、自动分析并写入单公司归档。
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="company-symbol" className="block text-sm font-medium text-gray-700 mb-2">
                股票代码
              </label>
              <input
                id="company-symbol"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="例如：601288"
                value={symbol}
                onChange={(event) => setSymbol(normalizeSymbol(event.target.value))}
                onBlur={() => setTouched(true)}
                className={`w-full rounded-lg border px-4 py-3 text-lg tracking-[0.2em] outline-none transition-colors ${
                  touched && !isValid
                    ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-400'
                    : 'border-gray-300 bg-white text-gray-900 focus:border-blue-400'
                }`}
              />
              <div className={`mt-2 text-sm ${touched && !isValid ? 'text-red-600' : 'text-gray-500'}`}>
                {marketHint}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="font-medium mb-1">当前流程</div>
              <ol className="list-decimal pl-5 space-y-1">
                <li>输入 6 位股票代码并进入详情页</li>
                <li>你可以先进入详情页，再点击“手动刷新”</li>
                <li>也可以直接点“添加并立即分析”，一步完成入档</li>
              </ol>
            </div>

            {submitMessage && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                submitMessage.startsWith('✅')
                  ? 'border border-green-200 bg-green-50 text-green-700'
                  : submitMessage.startsWith('❌')
                    ? 'border border-red-200 bg-red-50 text-red-700'
                    : 'border border-blue-200 bg-blue-50 text-blue-700'
              }`}>
                {submitMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!isValid || submitting}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isValid && !submitting
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                进入详情页
              </button>
              <button
                type="button"
                onClick={handleAnalyzeNow}
                disabled={!isValid || submitting}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isValid && !submitting
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {submitting ? '分析中...' : '添加并立即分析'}
              </button>
              <Link
                to="/company/601288"
                className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                用农业银行示例查看
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
