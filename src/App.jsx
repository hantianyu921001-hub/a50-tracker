import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import CompanyDetail from './pages/CompanyDetail'
import IndustryPage from './pages/IndustryPage'
import RatingRules from './pages/RatingRules'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-bold text-gray-900">
                A50 Tracker Plus
              </h1>
              <nav className="flex space-x-1">
                <NavLink to="/" end className={({ isActive }) => 
                  `px-3 py-2 text-sm font-medium rounded-md ${isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`
                }>
                  总览
                </NavLink>
                <NavLink to="/industry" className={({ isActive }) => 
                  `px-3 py-2 text-sm font-medium rounded-md ${isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`
                }>
                  行业分布
                </NavLink>
                <NavLink to="/rating-rules" className={({ isActive }) => 
                  `px-3 py-2 text-sm font-medium rounded-md ${isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`
                }>
                  评分规则
                </NavLink>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/company/:code" element={<CompanyDetail />} />
            <Route path="/industry" element={<IndustryPage />} />
            <Route path="/rating-rules" element={<RatingRules />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App