export default function FilterBar({ filters, onFilterChange, swIndustries, grades }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* 范围筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">范围</label>
          <select
            value={filters.scope}
            onChange={(e) => onFilterChange({ ...filters, scope: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="a50">A50</option>
            <option value="all">全部</option>
          </select>
        </div>

        {/* 评级 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">评级</label>
          <select
            value={filters.grade}
            onChange={(e) => onFilterChange({ ...filters, grade: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部评级</option>
            {grades.map((grade) => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
        </div>

        {/* 申万行业 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">行业</label>
          <select
            value={filters.swIndustry}
            onChange={(e) => onFilterChange({ ...filters, swIndustry: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部行业</option>
            {swIndustries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        {/* 状态 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部状态</option>
            <option value="analyzed">已分析</option>
            <option value="pending">待分析</option>
          </select>
        </div>

        {/* 搜索 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
          <input
            type="text"
            placeholder="公司名称或代码..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          显示 <span className="font-semibold">{filters.count}</span> 家公司
        </div>
        <button
          onClick={() => onFilterChange({ scope: 'all', search: '', grade: '', swIndustry: '', status: '' })}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          重置筛选
        </button>
      </div>
    </div>
  )
}