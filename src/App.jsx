import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CompanyDetail from './pages/CompanyDetail'
import Dashboard from './pages/Dashboard'
import RatingRules from './pages/RatingRules'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-bold text-gray-900">
                中证A50跟踪系统
              </h1>
              <nav className="flex space-x-4">
                <a href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  公司列表
                </a>
                <a href="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  统计看板
                </a>
                <a href="/rating-rules" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  评分规则
                </a>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/company/:code" element={<CompanyDetail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/rating-rules" element={<RatingRules />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App