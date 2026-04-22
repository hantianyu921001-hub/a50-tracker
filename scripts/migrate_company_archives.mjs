import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { syncAllCompanyArchives } from '../src/services/companyArchives.js'

const ROOT = '/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app'
const COMPANIES_PATH = join(ROOT, 'src/data/companies.json')
const V22_RESULTS_PATH = join(ROOT, 'v22_results.json')
const DECISION_STATE_PATH = join(ROOT, 'src/data/decisionState.json')

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf-8'))
}

const companies = loadJson(COMPANIES_PATH, [])
const v22Results = loadJson(V22_RESULTS_PATH, [])
const decisionStates = loadJson(DECISION_STATE_PATH, {})

const result = syncAllCompanyArchives({
  companies,
  v22Results,
  decisionStates,
  trigger: 'migration',
  triggerReason: '从 monolith 数据迁移到单公司档案结构',
})

console.log(`Archived ${result.count} companies`)
console.log(`Current index: ${result.indexPath}`)
