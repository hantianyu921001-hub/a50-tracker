#!/usr/bin/env python3
"""
A50-Tracker 单只股票数据刷新脚本
功能：根据股票代码从东方财富获取最新数据并更新 companies.json

用法: python3 refresh_stock.py <股票代码> [--dry-run]
示例: python3 refresh_stock.py 300750
"""

import json
import sys
import re
from datetime import datetime
from pathlib import Path

# 配置路径
BASE_DIR = Path("/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app")
COMPANIES_FILE = BASE_DIR / "src/data/companies.json"
DECISION_FILE = BASE_DIR / "src/data/decisionState.json"


def load_companies():
    """加载公司数据"""
    with open(COMPANIES_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_companies(data):
    """保存公司数据"""
    with open(COMPANIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_decision():
    """加载决策状态"""
    with open(DECISION_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_decision(data):
    """保存决策状态"""
    with open(DECISION_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def find_company_by_code(code, companies):
    """根据代码查找公司"""
    for i, c in enumerate(companies):
        if c.get('code') == code:
            return i, c
    return None, None


def update_company_data(code, dry_run=True):
    """
    更新单只股票数据
    注意：此脚本生成更新模板，实际数据需要通过 web_access skill 获取
    """
    companies = load_companies()
    decision = load_decision()

    idx, company = find_company_by_code(code, companies)

    if company is None:
        print(f"❌ 未找到股票代码 {code}")
        return False

    today = datetime.now().strftime("%Y-%m-%d")

    # 生成更新模板（实际数据需手动或通过API获取）
    update_template = {
        "code": code,
        "name": company.get('name'),
        "lastUpdate": today,
        "update_needed": {
            "annualReport": company.get('analysis', {}).get('annualReport', []),
            "financials": company.get('analysis', {}).get('financials', {}),
            "conclusion": company.get('analysis', {}).get('conclusion', ''),
            "scoringRationale": company.get('scoringRationale', {})
        },
        "decision_update": {
            "meta.updatedAt": today,
            "signals.signalStatus": "fresh",
            "signals.signalAgeDays": 0
        }
    }

    if dry_run:
        print(f"\n🔍 [Dry Run] 更新模板 for {code} ({company.get('name')}):")
        print("-" * 50)
        print(json.dumps(update_template, ensure_ascii=False, indent=2))
        print("-" * 50)
        print("\n💡 提示：使用 --dry-run 跳过实际更新")
        print("   实际更新需要通过 web_access skill 获取最新数据")
        return True

    # 实际更新
    # 1. 更新 companies.json
    companies[idx]['lastUpdate'] = today

    # 2. 更新 decisionState.json
    if code in decision:
        decision[code]['meta']['updatedAt'] = today
        decision[code]['signals']['signalStatus'] = 'fresh'
        decision[code]['signals']['signalAgeDays'] = 0
        decision[code]['signals']['staleReason'] = ''

    save_companies(companies)
    save_decision(decision)

    print(f"✅ 已更新 {code} ({company.get('name')})")
    return True


def main():
    if len(sys.argv) < 2:
        print("用法: python3 refresh_stock.py <股票代码> [--dry-run]")
        print("示例: python3 refresh_stock.py 300750")
        sys.exit(1)

    code = sys.argv[1]
    dry_run = "--dry-run" in sys.argv

    update_company_data(code, dry_run)


if __name__ == "__main__":
    main()
