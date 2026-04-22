# A50-Tracker 数据结构文档

## companies.json 结构

```json
[
  {
    "rank": 1,
    "code": "300750",
    "name": "宁德时代",
    "industry": "电池",
    "swIndustry": "电力设备",
    "grade": "A",
    "score": 83,
    "status": "analyzed",
    "valuation": 68,
    "growth": 88,
    "moat": 85,
    "other": 90,
    "recommendation": "买入（等待回调）",
    "idealPrice": "PE 20-22倍（300-330元）",
    "tags": ["全球锂电龙头", "储能高增长", "高分红", "估值合理"],
    "lastUpdate": "2026-04-05",
    "summary": "2025年净利722亿（+42%），全球市占率37.1%连续9年第一，储能收入+45%，PE 24倍合理偏低",

    "analysis": {
      "conclusion": "宁德时代作为全球动力电池绝对龙头，2025年交出亮眼成绩单...",
      "companyOverview": "宁德时代新能源科技股份有限公司（CATL），成立于2011年...",
      "annualReport": [
        {"metric": "营业收入", "value": "4237亿", "change": "+17.04%"},
        {"metric": "归母净利润", "value": "722.01亿", "change": "+42.28%"},
        {"metric": "毛利率", "value": "25.3%", "change": "+1.35pct"},
        {"metric": "净利率", "value": "17%", "change": "+3.2pct"},
        {"metric": "ROE", "value": "约24%", "change": "提升"},
        {"metric": "现金分红", "value": "300亿", "change": "占净利50%"},
        {"metric": "全球市占率", "value": "37.1%", "change": "连续9年第一"},
        {"metric": "PE(TTM)", "value": "24倍", "change": "历史中枢"}
      ],
      "competitiveAdvantage": [
        {
          "title": "规模优势（全球第一）",
          "points": ["全球动力电池市占率37.1%", "2025年全球装机量117.6GWh"]
        },
        {
          "title": "技术领先（研发投入221亿）",
          "points": ["麒麟电池：续航1000km+", "神行电池：超充技术领先"]
        }
      ],
      "valuationAnalysis": {
        "current": "PE 24倍处于近5年50%分位...",
        "comparison": [...]
      },
      "growthDrivers": [...],
      "risks": [...],
      "financials": {
        "PE": "24倍",
        "PB": "5.23倍",
        "ROE": "约24%",
        "股息率": "约2%",
        "毛利率": "25.3%",
        "净利率": "17%"
      }
    },

    "scoringRationale": {
      "moat": {"score": 20, "summary": "全球市占率37.1%绝对龙头，品牌+技术+规模三重护城河"},
      "growth": {"score": 16, "summary": "净利+42%高增长，储能业务爆发+45%"},
      "profitability": {"score": 18, "summary": "ROE 24%优秀，毛利率25.3%"},
      "valuation": {"score": 17, "summary": "PE 24倍合理偏低，股息率2%"},
      "catalyst": {"score": 8, "summary": "储能催化+固态电池2027年量产"}
    }
  }
]
```

## decisionState.json 结构

```json
{
  "300750": {
    "meta": {
      "symbol": "300750",
      "name": "宁德时代",
      "updatedAt": "2026-04-14",
      "lastReviewedAt": "2026-04-10",
      "reviewDeadline": "2026-04-20",
      "owner": "manual",
      "version": "v1"
    },
    "review": {
      "reviewStatus": "approved",
      "decisionAction": "buy",
      "decisionReason": "估值接近理想区间，基本面未恶化",
      "reviewNotes": "重点复核储能增速",
      "reviewer": "",
      "reviewedAt": "2026-04-10",
      "reviewCount": 1
    },
    "portfolio": {
      "portfolioPosition": 0,
      "targetPosition": "8-10%",
      "maxPosition": "10%",
      "minPosition": "0%",
      "positionType": "core",
      "rebalanceAction": "open"
    },
    "checklist": {
      "fundamental_trend": {"status": "pass", "note": "...", "confidence": 4},
      "valuation_fit": {"status": "pass", "note": "...", "confidence": 4},
      "catalyst_validity": {"status": "pass", "note": "...", "confidence": 4},
      "risk_events": {"status": "pass", "note": "...", "confidence": 4},
      "industry_cycle": {"status": "pass", "note": "...", "confidence": 3},
      "earnings_quality": {"status": "pass", "note": "...", "confidence": 4},
      "cashflow_health": {"status": "pass", "note": "...", "confidence": 4},
      "position_fit": {"status": "pass", "note": "...", "confidence": 4},
      "liquidity_fit": {"status": "pass", "note": "...", "confidence": 5},
      "timing_window": {"status": "pass", "note": "...", "confidence": 3},
      "data_completeness": {"status": "pass", "note": "...", "confidence": 5},
      "thesis_integrity": {"status": "pass", "note": "...", "confidence": 4}
    },
    "signals": {
      "signalStatus": "fresh",
      "signalAgeDays": 4,
      "staleReason": "",
      "reviewPriority": "medium",
      "constraintHit": "",
      "dataGaps": []
    },
    "audit": {
      "createdAt": "2026-04-10",
      "history": [],
      "tags": ["core", "growth"],
      "archived": false
    }
  }
}
```

## decision_review 状态值

| 状态 | 含义 |
|------|------|
| `approved` | 已审核批准 |
| `rejected` | 已拒绝 |
| `needs_review` | 需要复核 |

## decisionAction 操作标签

| 操作 | 含义 |
|------|------|
| `buy` | 买入 |
| `add` | 加仓 |
| `hold` | 持有 |
| `trim` | 减仓 |
| `watch` | 观察 |
| `avoid` | 规避 |

## signalStatus 状态

| 状态 | 含义 | 阈值 |
|------|------|------|
| `fresh` | 数据新鲜 | 0-7天 |
| `needs_review` | 需要复核 | 7-14天 |
| `stale` | 数据过期 | >14天 |

## checklist_auto_status

| 状态 | 含义 |
|------|------|
| `pass` | 通过 |
| `fail` | 未通过 |
| `review` | 需要人工复核 |

## isActionable 判断条件

```
isActionable = (
  signal_status !== 'stale'
  AND checklist_auto_status === 'pass'
  AND decision_review_status === 'approved'
  AND dataGaps 为空
  AND constraintHit 为空
  AND action in [buy, add]
)
```
