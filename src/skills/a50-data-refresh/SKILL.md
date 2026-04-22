---
name: a50-data-refresh
description: A50股票数据一键刷新工具。当用户需要更新A50股票数据、刷新评分、检测过期数据、或批量更新股票信息时使用。包括：1) 检测过期股票数据 2) 获取最新股票信息（akshare） 3) 更新companies.json和decisionState.json 4) 重新计算v2.2评分 5) 保存版本快照。
---

# A50-Tracker 数据刷新 Skill

## 快速命令

| 命令 | 功能 |
|------|------|
| `刷新A50` | 检测过期数据并更新所有股票 |
| `分析 XXX` | 分析单只股票（如：分析 300750） |
| `检查过期` | 检测哪些股票数据需要更新 |
| `获取A50数据` | 从东方财富获取所有A50股票实时数据 |
| `保存快照` | 保存当前数据版本快照 |

## 工作目录

```
/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app/
```

## 数据文件

| 文件 | 作用 |
|------|------|
| `src/data/companies.json` | 公司主数据（评分、分析、年报等） |
| `src/data/decisionState.json` | 决策状态追踪 |
| `src/data/fetched_data.json` | akshare获取的实时数据缓存 |
| `v22_results.json` | v2.2评分结果 |

## 数据获取脚本 (akshare)

### 获取单只股票数据

```bash
cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app
python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --fetch 300750
```

输出：
```
📊 获取股票 300750 数据...

1. 实时行情:
   code: 300750
   name: 宁德时代
   price: 260.5
   change_pct: 2.35
   pe: 24.5
   pb: 5.23
   ...

2. 基本信息:
   industry: 电力设备
   concept: 锂电龙头,储能

3. 年报数据:
   revenue: 4237亿
   revenue_yoy: 17.04%
   net_profit: 722亿
   ...
```

### 获取所有A50股票数据

```bash
python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --fetch-all
```

### 更新 companies.json

```bash
# Dry Run（预览）
python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --update --dry-run

# 实际更新
python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --update
```

## 完整刷新流程

### 方式一：一键刷新（推荐）

```bash
cd /Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app

# 1. 保存快照
python3 scripts/version_manager.py save "数据刷新前备份"

# 2. 获取最新数据
python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --fetch-all

# 3. 更新 companies.json
python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --update

# 4. 重新计算评分
python3 v22_scorer.py

# 5. 标记过期股票
python3 src/skills/a50-data-refresh/scripts/batch_refresh.py --all-stale
```

### 方式二：分步执行

```bash
# Step 1: 检查过期股票
python3 src/skills/a50-data-refresh/scripts/batch_refresh.py --check

# Step 2: 获取指定股票数据
python3 src/skills/a50-data-refresh/scripts/stock_data_fetcher.py --fetch 300750

# Step 3: 更新数据
python3 src/skills/a50-data-refresh/scripts/batch_refresh.py --codes 300750,600519

# Step 4: 重新评分
python3 v22_scorer.py
```

## 批量脚本

### batch_refresh.py

```bash
# 检查过期
python3 batch_refresh.py --check

# 标记所有过期
python3 batch_refresh.py --all-stale

# 更新指定股票
python3 batch_refresh.py --codes 300750,600519,600036

# 完整刷新
python3 batch_refresh.py --full-refresh

# 重新评分
python3 batch_refresh.py --rescore
```

### refresh_stock.py

```bash
# 预览更新模板
python3 refresh_stock.py 300750 --dry-run

# 执行更新
python3 refresh_stock.py 300750
```

## 六维度评分模型 (v2.2)

| 维度 | 权重 | 满分 | 评分要素 |
|------|------|------|----------|
| 护城河 | 25% | 25分 | 品牌、成本、技术、资源、转换成本 |
| 成长性 | 20% | 20分 | 营收增速、净利增速、趋势、空间 |
| 盈利质量 | 20% | 20分 | ROE、毛利率、现金流、分红率 |
| 估值安全边际 | 25% | 25分 | PE/PB分位、股息率 |
| 催化剂 | 10% | 10分 | 政策、业绩拐点、新业务 |
| 风险扣分 | - | - | 治理、财务、行业、竞争风险 |

**评级标准**：S≥90, A+≥85, A≥80, B+≥75, B≥70, C≥60, D<60

## akshare 数据接口说明

### 实时行情 `stock_zh_a_spot_em()`
- 返回：最新价、涨跌幅、成交量、成交额、PE、PB、市值、股息率等

### 基本信息 `stock_individual_info_em()`
- 返回：行业、概念、上市时间、总股本、流通股本

### 年报数据 `stock_profit_sheet_by_report_em()`
- 返回：营业收入、营收同比、净利润、净利同比、EPS、BVPS

### 财务指标 `stock_financial_analysis_indicator()`
- 返回：ROE、毛利率、净利率、资产负债率、流动比率等

## 数据更新字段映射

| akshare字段 | companies.json路径 |
|-------------|-------------------|
| price | analysis.currentPrice |
| pe | analysis.financials.PE |
| pb | analysis.financials.PB |
| dv_ratio | analysis.financials.股息率 |
| market_cap | analysis.financials.总市值 |
| revenue | analysis.annualReport[营收] |
| net_profit | analysis.annualReport[净利] |

## 注意事项

1. **数据源**：akshare（东方财富数据）
2. **更新频率**：建议每周更新一次
3. **评分阈值**：STALE_THRESHOLD = 14天
4. **手动复核**：评分结果需人工审核确认
5. **快照保存**：重大更新前先保存快照

## 常见问题

**Q: akshare 需要安装吗？**
A: 已预装（v1.18.20）。如需更新：`pip install akshare -U`

**Q: 如何只更新单只股票？**
A: `python3 stock_data_fetcher.py --fetch 300750`

**Q: 评分结果在哪看？**
A: `v22_results.json` 文件，包含 v22_grade, v22_total 等字段

**Q: 数据过期了会怎样？**
A: decisionState.json 中 signalStatus 会变成 'stale'，需要尽快更新
