import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const ANALYSIS_DIR = join(PROJECT_ROOT, 'analysis')
const ANALYSIS_INDEX_DIR = join(ANALYSIS_DIR, 'index')
const ANALYSIS_COMPANIES_DIR = join(ANALYSIS_DIR, 'companies')
const CURRENT_INDEX_PATH = join(ANALYSIS_INDEX_DIR, 'current_index.json')

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

function readJson(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

function writeJson(filePath, data) {
  ensureDir(dirname(filePath))
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function normalizeTimestamp(value = new Date()) {
  return new Date(value).toISOString().replace(/[:.]/g, '-')
}

function deriveSignalFromDate(lastUpdate, fallback = {}) {
  if (!lastUpdate) {
    return {
      signal_status: fallback.signal_status || 'stale',
      signal_age_days: fallback.signal_age_days ?? null,
      stale_reason: fallback.stale_reason || '缺少最近更新时间',
    }
  }

  const diffMs = Date.now() - new Date(lastUpdate).getTime()
  const ageDays = Number.isFinite(diffMs) ? Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))) : null
  if (ageDays == null) {
    return {
      signal_status: fallback.signal_status || 'stale',
      signal_age_days: fallback.signal_age_days ?? null,
      stale_reason: fallback.stale_reason || '更新时间格式无效',
    }
  }

  if (ageDays > 21) {
    return { signal_status: 'stale', signal_age_days: ageDays, stale_reason: `距离上次更新已 ${ageDays} 天` }
  }
  if (ageDays > 7) {
    return { signal_status: 'needs_review', signal_age_days: ageDays, stale_reason: '' }
  }
  return { signal_status: 'fresh', signal_age_days: ageDays, stale_reason: '' }
}

function getCompanyPaths(symbol) {
  const companyDir = join(ANALYSIS_COMPANIES_DIR, symbol)
  return {
    companyDir,
    currentPath: join(companyDir, 'current.json'),
    decisionPath: join(companyDir, 'decision.json'),
    eventsPath: join(companyDir, 'events.json'),
    historyDir: join(companyDir, 'history'),
    changesDir: join(companyDir, 'changes'),
  }
}

function ensureCompanyDirs(symbol) {
  const paths = getCompanyPaths(symbol)
  ensureDir(paths.companyDir)
  ensureDir(paths.historyDir)
  ensureDir(paths.changesDir)
  return paths
}

function extractSignal(legacyCompany = {}, v22Data = {}, decisionState = {}) {
  const decisionSignals = decisionState.signals || {}
  const inferred = deriveSignalFromDate(
    v22Data.lastUpdate || legacyCompany.lastUpdate || decisionState.meta?.updatedAt || '',
    {
    signal_status: v22Data.signal_status || decisionSignals.signalStatus,
    signal_age_days: v22Data.signal_age_days ?? decisionSignals.signalAgeDays,
    stale_reason: v22Data.stale_reason || decisionSignals.staleReason,
  })
  const constraintHit = v22Data.constraint_hit || decisionSignals.constraintHit || ''
  const dataGaps = v22Data.data_gaps || decisionSignals.dataGaps || []
  const derivedPriority =
    inferred.signal_status === 'stale' || constraintHit || (dataGaps && dataGaps.length > 0)
      ? 'high'
      : inferred.signal_status === 'needs_review'
        ? 'medium'
        : 'low'

  return {
    signal_status: v22Data.signal_status || decisionSignals.signalStatus || inferred.signal_status,
    signal_age_days: v22Data.signal_age_days ?? decisionSignals.signalAgeDays ?? inferred.signal_age_days,
    stale_reason: v22Data.stale_reason || decisionSignals.staleReason || inferred.stale_reason,
    review_priority: v22Data.review_priority || decisionSignals.reviewPriority || derivedPriority,
    constraint_hit: constraintHit,
    data_gaps: dataGaps,
  }
}

function extractChecklistAuto(v22Data = {}) {
  return {
    status: v22Data.checklist_auto_status || 'unknown',
    score: v22Data.checklist_auto_score ?? null,
    reasons: v22Data.checklist_auto_reasons || [],
  }
}

function extractExternalSignal(externalValidation = {}) {
  const score = externalValidation?.score || {}
  const dataGaps = score.data_gaps || []
  return {
    signal_status: dataGaps.length > 0 ? 'needs_review' : 'fresh',
    signal_age_days: 0,
    stale_reason: '',
    review_priority: dataGaps.length > 0 ? 'medium' : 'low',
    constraint_hit: '',
    data_gaps: dataGaps,
  }
}

function extractExternalChecklistAuto(externalValidation = {}) {
  const score = externalValidation?.score || {}
  const dataGaps = score.data_gaps || []
  return {
    status: dataGaps.length > 0 ? 'review' : 'pass',
    score: score.total ?? null,
    reasons: dataGaps.length > 0 ? dataGaps : ['核心外部数据已接通'],
  }
}

function hasDecisionContent(decisionState = {}) {
  if (!decisionState || typeof decisionState !== 'object') return false
  return Object.keys(decisionState).length > 0
}

function buildInitialExternalDecisionState({ code, name, signal, checklistAuto, externalValidation }) {
  const score = externalValidation?.score || {}
  const total = Number(score.total ?? 0)
  const dataGaps = signal?.data_gaps || []
  const hasGaps = dataGaps.length > 0
  const inferredAction =
    signal?.signal_status === 'stale'
      ? 'watch'
      : hasGaps
        ? 'watch'
        : total >= 75
          ? 'buy'
          : total >= 60
            ? 'hold'
            : 'watch'

  const reasonParts = [
    `自动分析初始化：当前总分 ${total || 'N/A'}，评级 ${score.grade || '待定'}`,
    hasGaps
      ? `仍有待补字段：${dataGaps.join('、')}`
      : '核心外部数据已接通，可进入人工复核',
  ]

  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 14)
  const today = new Date().toISOString().slice(0, 10)

  return {
    meta: {
      symbol: code,
      name,
      updatedAt: today,
      lastReviewedAt: '',
      reviewDeadline: deadline.toISOString().slice(0, 10),
      owner: 'system',
      version: 'external-init-v1',
    },
    review: {
      reviewStatus: 'needs_review',
      decisionAction: inferredAction,
      decisionReason: reasonParts.join('；'),
      reviewNotes: '',
      reviewer: '',
      reviewedAt: '',
      reviewCount: 0,
    },
    portfolio: {
      portfolioPosition: 0,
      targetPosition: '',
      maxPosition: '',
      minPosition: '',
      positionType: 'candidate',
      rebalanceAction: inferredAction,
    },
    checklist: {},
    signals: {
      signalStatus: signal?.signal_status || 'needs_review',
      signalAgeDays: signal?.signal_age_days ?? 0,
      staleReason: signal?.stale_reason || '',
      reviewPriority: signal?.review_priority || 'medium',
      constraintHit: signal?.constraint_hit || '',
      dataGaps,
      checklistAutoStatus: checklistAuto?.status || 'review',
      checklistAutoScore: checklistAuto?.score ?? null,
      checklistAutoReasons: checklistAuto?.reasons || [],
    },
    audit: {
      createdAt: new Date().toISOString(),
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'auto_init',
          trigger: 'external_analysis',
          reviewStatus: 'needs_review',
          decisionAction: inferredAction,
        },
      ],
    },
  }
}

function buildCurrentRecord({ legacyCompany, v22Data, decisionState, existingCurrent, trigger, triggerReason, externalValidation }) {
  const externalCompany = externalValidation?.externalData?.company || {}
  const code = legacyCompany?.code || v22Data?.code || decisionState?.meta?.symbol || externalValidation?.symbol || externalCompany.symbol
  const name = legacyCompany?.name || v22Data?.name || decisionState?.meta?.name || externalCompany.name || code
  const industry = legacyCompany?.industry || legacyCompany?.swIndustry || v22Data?.industry || externalCompany.industry || ''
  const signal = externalValidation
    ? extractExternalSignal(externalValidation)
    : extractSignal(legacyCompany, v22Data, decisionState)
  const checklistAuto = externalValidation
    ? extractExternalChecklistAuto(externalValidation)
    : extractChecklistAuto(v22Data)

  return {
    meta: {
      code,
      name,
      industry,
      last_update:
        legacyCompany?.lastUpdate ||
        v22Data?.lastUpdate ||
        externalValidation?.fetched_at ||
        existingCurrent?.meta?.last_update ||
        '',
      source_version: externalValidation
        ? `external-${externalValidation.analysis_type || 'generic'}-v1`
        : 'v2.2',
      updated_at: new Date().toISOString(),
      trigger,
      trigger_reason: triggerReason,
    },
    legacy: legacyCompany || existingCurrent?.legacy || null,
    v22: v22Data || existingCurrent?.v22 || null,
    external_validation: externalValidation || existingCurrent?.external_validation || null,
    signal,
    checklist_auto: checklistAuto,
    decision_summary: {
      review_status: decisionState?.review?.reviewStatus || '',
      action: decisionState?.review?.decisionAction || '',
      reason: decisionState?.review?.decisionReason || '',
      review_deadline: decisionState?.meta?.reviewDeadline || '',
      last_reviewed_at: decisionState?.meta?.lastReviewedAt || '',
    },
  }
}

function buildIndexEntry(currentRecord, decisionState = {}) {
  const legacy = currentRecord.legacy || {}
  const v22 = currentRecord.v22 || {}
  const external = currentRecord.external_validation || {}
  const signal = currentRecord.signal || {}
  const review = decisionState.review || {}

  return {
    code: currentRecord.meta.code,
    name: currentRecord.meta.name,
    industry: currentRecord.meta.industry,
    score: v22.v22_total ?? external.score?.total ?? legacy.score ?? 0,
    grade: v22.v22_grade ?? external.score?.grade ?? legacy.grade ?? '-',
    signal_status: signal.signal_status,
    signal_age_days: signal.signal_age_days,
    stale_reason: signal.stale_reason,
    review_priority: signal.review_priority,
    checklist_auto_status: currentRecord.checklist_auto?.status || 'unknown',
    decision_review_status: review.reviewStatus || '',
    decision_action: review.decisionAction || '',
    isActionable:
      signal.signal_status !== 'stale' &&
      currentRecord.checklist_auto?.status === 'pass' &&
      review.reviewStatus === 'approved' &&
      !(signal.data_gaps && signal.data_gaps.length > 0) &&
      !signal.constraint_hit &&
      ['buy', 'add'].includes(review.decisionAction),
    last_update: currentRecord.meta.last_update,
    archive_path: `analysis/companies/${currentRecord.meta.code}/current.json`,
  }
}

function upsertCurrentIndexEntry(entry) {
  const existingEntries = readJson(CURRENT_INDEX_PATH, [])
  const nextEntries = [...existingEntries.filter((item) => item.code !== entry.code), entry].sort((a, b) =>
    a.code.localeCompare(b.code)
  )
  writeJson(CURRENT_INDEX_PATH, nextEntries)
  return nextEntries
}

function summarizeChanges(previousCurrent, nextCurrent) {
  if (!previousCurrent) {
    return [
      `- 更新时间：${nextCurrent.meta.updated_at}`,
      `- 触发原因：${nextCurrent.meta.trigger_reason || '初始化归档'}`,
      '- 变更摘要：首次创建单公司分析档案',
    ]
  }

  const prevV22 = previousCurrent.v22 || {}
  const nextV22 = nextCurrent.v22 || {}
  const prevDecision = previousCurrent.decision_summary || {}
  const nextDecision = nextCurrent.decision_summary || {}
  const prevSignal = previousCurrent.signal || {}
  const nextSignal = nextCurrent.signal || {}
  const lines = [
    `- 更新时间：${nextCurrent.meta.updated_at}`,
    `- 触发原因：${nextCurrent.meta.trigger_reason || nextCurrent.meta.trigger || '刷新'}`,
  ]

  if ((prevV22.v22_total ?? null) !== (nextV22.v22_total ?? null)) {
    lines.push(`- 总分变化：${prevV22.v22_total ?? 'N/A'} -> ${nextV22.v22_total ?? 'N/A'}`)
  }
  if ((prevV22.v22_grade ?? null) !== (nextV22.v22_grade ?? null)) {
    lines.push(`- 评级变化：${prevV22.v22_grade ?? 'N/A'} -> ${nextV22.v22_grade ?? 'N/A'}`)
  }
  if ((prevSignal.signal_status ?? null) !== (nextSignal.signal_status ?? null)) {
    lines.push(`- 信号状态变化：${prevSignal.signal_status ?? 'N/A'} -> ${nextSignal.signal_status ?? 'N/A'}`)
  }
  if ((prevDecision.action ?? null) !== (nextDecision.action ?? null)) {
    lines.push(`- 决策动作变化：${prevDecision.action ?? 'N/A'} -> ${nextDecision.action ?? 'N/A'}`)
  }
  if ((prevDecision.review_status ?? null) !== (nextDecision.review_status ?? null)) {
    lines.push(`- 复核状态变化：${prevDecision.review_status ?? 'N/A'} -> ${nextDecision.review_status ?? 'N/A'}`)
  }
  if (lines.length === 2) {
    lines.push('- 变更摘要：分析正文和评分结构已同步，无关键状态变化')
  }

  return lines
}

function writeChangeSummary(paths, timestamp, previousCurrent, nextCurrent) {
  const changePath = join(paths.changesDir, `${timestamp}.md`)
  const content = [
    `# ${nextCurrent.meta.code} ${nextCurrent.meta.name} 更新摘要`,
    '',
    ...summarizeChanges(previousCurrent, nextCurrent),
    '',
  ].join('\n')
  writeFileSync(changePath, content, 'utf-8')
  return changePath
}

function archivePreviousCurrent(paths, timestamp) {
  if (!existsSync(paths.currentPath)) return null
  const historyPath = join(paths.historyDir, `${timestamp}.json`)
  copyFileSync(paths.currentPath, historyPath)
  return historyPath
}

function upsertEvents(paths, events = []) {
  const existingEvents = readJson(paths.eventsPath, [])
  if (!events.length && existingEvents) {
    if (!existsSync(paths.eventsPath)) writeJson(paths.eventsPath, [])
    return existingEvents
  }

  const existingMap = new Map(
    (existingEvents || []).filter(Boolean).map((event) => [
      `${event.id || ''}-${event.date || ''}-${event.title || ''}`,
      event,
    ]),
  )
  const now = new Date().toISOString()
  const normalizedIncoming = (events || []).filter(Boolean).map((event) => {
    const key = `${event.id || ''}-${event.date || ''}-${event.title || ''}`
    const existing = existingMap.get(key) || {}
    const requiresRefresh = Boolean(event.requires_refresh ?? existing.requires_refresh)
    const processed =
      event.processed ??
      existing.processed ??
      (requiresRefresh ? false : true)

    return {
      ...existing,
      ...event,
      requires_refresh: requiresRefresh,
      processed,
      processed_at:
        processed
          ? (event.processed_at || existing.processed_at || now)
          : (event.processed_at || existing.processed_at || ''),
    }
  })

  const nextEvents = [...normalizedIncoming, ...existingEvents]
    .filter(Boolean)
    .filter((event, index, arr) => {
      const key = `${event.id || ''}-${event.date || ''}-${event.title || ''}`
      return arr.findIndex((item) => `${item.id || ''}-${item.date || ''}-${item.title || ''}` === key) === index
    })
  writeJson(paths.eventsPath, nextEvents)
  return nextEvents
}

export function upsertCompanyEvents(symbol, events = []) {
  const paths = ensureCompanyDirs(symbol)
  return upsertEvents(paths, events)
}

export function markCompanyEventsProcessed(symbol, eventIds = [], metadata = {}) {
  const paths = ensureCompanyDirs(symbol)
  const existingEvents = readJson(paths.eventsPath, [])
  const eventIdSet = new Set(eventIds)
  const now = new Date().toISOString()
  const nextEvents = existingEvents.map((event) => {
    if (!eventIdSet.has(event.id)) return event
    return {
      ...event,
      processed: true,
      processed_at: metadata.processedAt || now,
      refresh_triggered_at: metadata.refreshTriggeredAt || now,
      refresh_version: metadata.refreshVersion || event.refresh_version || '',
    }
  })
  writeJson(paths.eventsPath, nextEvents)
  return nextEvents
}

export function syncCompanyArchive({
  legacyCompany,
  v22Data,
  decisionState = {},
  trigger = 'sync',
  triggerReason = '同步当前分析数据',
  events = [],
  externalValidation = null,
}) {
  const symbol =
    legacyCompany?.code ||
    v22Data?.code ||
    decisionState?.meta?.symbol ||
    externalValidation?.symbol ||
    externalValidation?.externalData?.company?.symbol
  if (!symbol) {
    throw new Error('syncCompanyArchive requires a company symbol/code')
  }

  const timestamp = normalizeTimestamp()
  const paths = ensureCompanyDirs(symbol)
  const previousCurrent = readJson(paths.currentPath, null)
  archivePreviousCurrent(paths, timestamp)

  const code =
    legacyCompany?.code ||
    v22Data?.code ||
    decisionState?.meta?.symbol ||
    externalValidation?.symbol ||
    externalValidation?.externalData?.company?.symbol
  const name =
    legacyCompany?.name ||
    v22Data?.name ||
    decisionState?.meta?.name ||
    externalValidation?.externalData?.company?.name ||
    code
  const signal = externalValidation
    ? extractExternalSignal(externalValidation)
    : extractSignal(legacyCompany, v22Data, decisionState)
  const checklistAuto = externalValidation
    ? extractExternalChecklistAuto(externalValidation)
    : extractChecklistAuto(v22Data)
  const resolvedDecisionState =
    externalValidation && !hasDecisionContent(decisionState)
      ? buildInitialExternalDecisionState({ code, name, signal, checklistAuto, externalValidation })
      : (decisionState || {})

  const nextCurrent = buildCurrentRecord({
    legacyCompany,
    v22Data,
    decisionState: resolvedDecisionState,
    existingCurrent: previousCurrent,
    trigger,
    triggerReason,
    externalValidation,
  })

  writeJson(paths.currentPath, nextCurrent)
  writeJson(paths.decisionPath, resolvedDecisionState)
  upsertEvents(
    paths,
    (events || []).map((event) => ({
      ...event,
      processed: event.requires_refresh ? true : (event.processed ?? true),
      processed_at: event.requires_refresh
        ? (event.processed_at || new Date().toISOString())
        : (event.processed_at || ''),
    })),
  )
  const changePath = writeChangeSummary(paths, timestamp, previousCurrent, nextCurrent)
  upsertCurrentIndexEntry(buildIndexEntry(nextCurrent, resolvedDecisionState))

  return {
    symbol,
    currentPath: paths.currentPath,
    decisionPath: paths.decisionPath,
    changePath,
    current: nextCurrent,
    decision: resolvedDecisionState,
  }
}

export function syncAllCompanyArchives({
  companies = [],
  v22Results = [],
  decisionStates = {},
  trigger = 'sync',
  triggerReason = '批量同步分析档案',
  companyEvents = {},
}) {
  ensureDir(ANALYSIS_DIR)
  ensureDir(ANALYSIS_INDEX_DIR)
  ensureDir(ANALYSIS_COMPANIES_DIR)

  const legacyMap = new Map(companies.map((company) => [company.code, company]))
  const v22Map = new Map(v22Results.map((item) => [item.code, item]))
  const symbols = new Set([
    ...legacyMap.keys(),
    ...v22Map.keys(),
    ...Object.keys(decisionStates || {}),
  ])

  const entries = []
  for (const symbol of [...symbols].sort()) {
    const result = syncCompanyArchive({
      legacyCompany: legacyMap.get(symbol),
      v22Data: v22Map.get(symbol),
      decisionState: decisionStates[symbol] || {},
      trigger,
      triggerReason,
      events: companyEvents[symbol] || [],
    })
    entries.push(buildIndexEntry(result.current, decisionStates[symbol] || {}))
  }

  writeJson(CURRENT_INDEX_PATH, entries)
  return { count: entries.length, indexPath: CURRENT_INDEX_PATH, entries }
}

export function loadCompanyCurrent(symbol) {
  const paths = getCompanyPaths(symbol)
  return readJson(paths.currentPath, null)
}

export function loadCompanyDecision(symbol) {
  const paths = getCompanyPaths(symbol)
  return readJson(paths.decisionPath, null)
}

export function loadCompanyHistory(symbol, limit = 20) {
  const paths = getCompanyPaths(symbol)
  if (!existsSync(paths.historyDir)) return []

  return readdirSync(paths.historyDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, limit)
    .map((file) => ({
      filename: file,
      path: join(paths.historyDir, file),
      snapshot: readJson(join(paths.historyDir, file), null),
    }))
}

export function loadCompanyChanges(symbol, limit = 20) {
  const paths = getCompanyPaths(symbol)
  if (!existsSync(paths.changesDir)) return []

  return readdirSync(paths.changesDir)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, limit)
    .map((file) => ({
      filename: file,
      path: join(paths.changesDir, file),
      content: readFileSync(join(paths.changesDir, file), 'utf-8'),
    }))
}

export function loadCompanyEvents(symbol) {
  const paths = getCompanyPaths(symbol)
  return readJson(paths.eventsPath, [])
}

export function getCurrentIndex() {
  return readJson(CURRENT_INDEX_PATH, [])
}

export const companyArchivePaths = {
  ANALYSIS_DIR,
  ANALYSIS_INDEX_DIR,
  ANALYSIS_COMPANIES_DIR,
  CURRENT_INDEX_PATH,
}
