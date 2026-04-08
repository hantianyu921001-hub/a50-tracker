import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import companies from '../data/companies.json'
import CompanyCard from '../components/CompanyCard'
import FilterBar from '../components/FilterBar'

export default function Home() {
  const [filters, setFilters] = useState({
    search: '',
    grade: '',
    industry: '',
    status: '',
  })

  const industries = useMemo(() => {
    return [...new Set(companies.map((c) => c.industry))].sort()
  }, [])

  const grades = ['S', 'A', 'B', 'C', 'D']

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (
          !company.name.toLowerCase().includes(searchLower) &&
          !company.code.includes(searchLower)
        ) {
          return false
        }
      }
      if (filters.grade && company.grade !== filters.grade) {
        return false
      }
      if (filters.industry && company.industry !== filters.industry) {
        return false
      }
      if (filters.status && company.status !== filters.status) {
        return false
      }
      return true
    })
  }, [filters])

  const filtersWithCount = { ...filters, count: filteredCompanies.length }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">公司列表</h2>
          <p className="text-gray-600">中证A50指数50家成分股深度分析</p>
        </div>
        <Link
          to="/rating-rules"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          评分规则
        </Link>
      </div>

      <FilterBar
        filters={filtersWithCount}
        onFilterChange={setFilters}
        industries={industries}
        grades={grades}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map((company) => (
          <CompanyCard key={company.code} company={company} />
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">没有找到符合条件的公司</div>
        </div>
      )}
    </div>
  )
}