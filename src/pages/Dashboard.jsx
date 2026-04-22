import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useScoring } from '../context/ScoringContext'

const actionLabels = {
  buy: { label: '买入', color: 'text-green-600' },
  add: { label: '加仓', color: 'text-green-500' },
  hold: { label: '持有', color: 'text-blue-600' },
  trim: { label: '减仓', color: 'text-orange-500' },
  watch: { label: '观察', color: 'text-gray-500' },
  avoid: { label: '规避', color: 'text-red-600' },
}

const statusLabels = {
  fresh: { label: '有效', color: 'bg-green-100 text-green-700', desc: '数据7天内' },
  needs_review: { label: '待复核', color: 'bg-yellow-100 text-yellow-700', desc: '需人工确认' },
  stale: { label: '已过期', color: 'bg-red-100 text-red-700', desc: '数据超过21天' },
  approved: { label: '已确认', color: 'bg-blue-100 text-blue-700', desc: '人工复核通过' },
  rejected: { label: '已拒绝', color: 'bg-gray-100 text-gray-700', desc: '人工复核否决' },
}

function StatusCard({ title, count, color, onClick, active }) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        active 
          ? `${color} border-current shadow-md` 
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm font-medium">{title}</div>
    </div>
  )
}

function CompanyRow({ company, onStatusClick }) {
  const actionInfo = actionLabels[company.decision_action] || actionLabels.watch
  const statusInfo = statusLabels[company.v22_signal_status] || statusLabels.fresh
  const reviewStatus = company.decision_review_status || 'unknown'
  const reviewInfo = statusLabels[reviewStatus] || statusLabels.fresh
  
  return (
    <Link 
      to={`/company/${company.code}`}
      className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 border-b border-gray-100 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="w-16 text-sm font-medium text-gray-900">{company.code}</div>
        <div className="w-32 text-sm text-gray-700 truncate">{company.name}</div>
        <span className={`inline-flex px-2 py-0.5 rounded text-xs ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
        <span className={`inline-flex px-2 py-0.5 rounded text-xs ${reviewInfo.color}`}>
          {reviewInfo.label}
        </span>
      </div>
      <div className="flex items-center gap-6">
        {company.v22_total > 0 && (
          <div className="text-sm text-gray-500">
            评分: <span className="font-medium">{company.v22_total}</span>
          </div>
        )}
        <div className={`text-sm font-medium ${actionInfo.color}`}>
          {actionInfo.label}
        </div>
        {company.v22_signal_age_days > 0 && (
          <div className="text-xs text-gray-400 w-20">
            {company.v22_signal_age_days}天前
          </div>
        )}
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { companies } = useScoring()
  const [activeTab, setActiveTab] = useState('actionable')

  // 统计数据
  const stats = useMemo(() => {
    const counts = {
      fresh: 0,
      needs_review: 0,
      stale: 0,
      approved: 0,
      rejected: 0,
      actionable: 0,
      highPriority: 0,
    }
    
    companies.forEach(c => {
      const signalStatus = c.v22_signal_status
      const decisionStatus = c.decision_review_status
      const action = c.decision_action
      
      if (signalStatus) counts[signalStatus] = (counts[signalStatus] || 0) + 1
      if (decisionStatus === 'approved') counts.approved++
      if (decisionStatus === 'rejected') counts.rejected++
      
      // isActionable 判断
      const isActionable = 
        signalStatus !== 'stale' && 
        decisionStatus === 'approved' && 
        ['buy', 'add'].includes(action)
      if (isActionable) counts.actionable++
      
      if (c.v22_review_priority === 'high') counts.highPriority++
    })
    
    return counts
  }, [companies])

  // 筛选列表
  const lists = useMemo(() => {
    return {
      actionable: companies.filter(c => {
        const signalStatus = c.v22_signal_status
        const decisionStatus = c.decision_review_status
        const action = c.decision_action
        return (
          signalStatus !== 'stale' && 
          decisionStatus === 'approved' && 
          ['buy', 'add'].includes(action)
        )
      }).slice(0, 20),
      
      needs_review: companies.filter(c => {
        const signalStatus = c.v22_signal_status
        const decisionStatus = c.decision_review_status
        return signalStatus === 'needs_review' || decisionStatus === 'needs_review'
      }).slice(0, 20),
      
      stale: companies.filter(c => c.v22_signal_status === 'stale').slice(0, 20),
      
      high_priority: companies.filter(c => c.v22_review_priority === 'high').slice(0, 20),
      
      approved: companies.filter(c => c.decision_review_status === 'approved').slice(0, 20),
    }
  }, [companies])

  // 版本统计（模拟数据，后续接入 versionHistory 服务）
  const versionStats = useMemo(() => ({
    totalVersions: 5,
    lastRefresh: '2026-04-16',
    nextRefresh: '2026-04-30',
    pendingReviews: stats.needs_review,
    byType: { refresh: 3, event_update: 1, manual_review: 1 }
  }), [stats.needs_review])

  const tabs = [
    { id: 'actionable', label: '可执行', count: stats.actionable },
    { id: 'needs_review', label: '待复核', count: stats.needs_review },
    { id: 'stale', label: '已过期', count: stats.stale },
    { id: 'high_priority', label: '高优先级', count: stats.highPriority },
    { id: 'approved', label: '已确认', count: stats.approved },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部状态概览 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-xl font-bold text-gray-900 mb-6">📊 A50 工作台</h1>

          {/* 刷新状态栏 */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div>
                  <span className="text-gray-600">最后刷新：</span>
                  <span className="font-medium text-gray-900">{versionStats.lastRefresh}</span>
                </div>
                <div>
                  <span className="text-gray-600">下次定时：</span>
                  <span className="font-medium text-gray-900">{versionStats.nextRefresh}</span>
                </div>
                <div>
                  <span className="text-gray-600">版本数：</span>
                  <span className="font-medium text-blue-600">{versionStats.totalVersions}</span>
                </div>
                <div>
                  <span className="text-gray-600">待复核：</span>
                  <span className={`font-medium ${versionStats.pendingReviews > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {versionStats.pendingReviews}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs bg-white border border-blue-300 rounded hover:bg-blue-100 transition-colors">
                  🔄 手动刷新
                </button>
                <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  📜 版本历史
                </button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatusCard 
              title="可执行" 
              count={stats.actionable} 
              color="bg-green-50 border-green-300"
              onClick={() => setActiveTab('actionable')}
              active={activeTab === 'actionable'}
            />
            <StatusCard 
              title="待复核" 
              count={stats.needs_review} 
              color="bg-yellow-50 border-yellow-300"
              onClick={() => setActiveTab('needs_review')}
              active={activeTab === 'needs_review'}
            />
            <StatusCard 
              title="已过期" 
              count={stats.stale} 
              color="bg-red-50 border-red-300"
              onClick={() => setActiveTab('stale')}
              active={activeTab === 'stale'}
            />
            <StatusCard 
              title="高优先" 
              count={stats.highPriority} 
              color="bg-orange-50 border-orange-300"
              onClick={() => setActiveTab('high_priority')}
              active={activeTab === 'high_priority'}
            />
            <StatusCard 
              title="已确认" 
              count={stats.approved} 
              color="bg-blue-50 border-blue-300"
              onClick={() => setActiveTab('approved')}
              active={activeTab === 'approved'}
            />
            <StatusCard 
              title="总计" 
              count={companies.length} 
              color="bg-gray-50 border-gray-300"
              onClick={() => {}}
              active={false}
            />
          </div>
          
          {/* 流程说明 */}
          <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              数据更新
            </span>
            <span>→</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              signal_status 判断
            </span>
            <span>→</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              decision_review 复核
            </span>
            <span>→</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-600"></span>
              isActionable
            </span>
          </div>
        </div>
      </div>

      {/* Tab 内容区 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tab 切换 */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* 列表内容 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {lists[activeTab]?.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {lists[activeTab].map(company => (
                <CompanyRow 
                  key={company.code} 
                  company={company} 
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <div>暂无数据</div>
            </div>
          )}
        </div>

        {/* 说明 */}
        <div className="mt-6 text-xs text-gray-500">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>signal_status: fresh (数据7天内)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span>signal_status: needs_review (需人工确认)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>signal_status: stale (数据超过21天)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
