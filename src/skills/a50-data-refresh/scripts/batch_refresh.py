#!/usr/bin/env python3
"""
A50-Tracker 批量数据刷新脚本
功能：批量更新多只股票的数据状态，标记为需要复核

用法: python3 batch_refresh.py [--codes CODE1,CODE2,...] [--all-stale] [--check]
示例:
  python3 batch_refresh.py --check                           # 检查过期股票
  python3 batch_refresh.py --all-stale                       # 更新所有过期股票
  python3 batch_refresh.py --codes 300750,600519,600036     # 更新指定股票
"""

import json
import sys
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

# 配置路径
BASE_DIR = Path("/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app")
COMPANIES_FILE = BASE_DIR / "src/data/companies.json"
DECISION_FILE = BASE_DIR / "src/data/decisionState.json"
V22_RESULTS_FILE = BASE_DIR / "v22_results.json"

STALE_THRESHOLD_DAYS = 14


def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_companies():
    return load_json(COMPANIES_FILE)


def load_decision():
    return load_json(DECISION_FILE)


def load_v22_results():
    return load_json(V22_RESULTS_FILE)


def save_companies(data):
    save_json(COMPANIES_FILE, data)


def save_decision(data):
    save_json(DECISION_FILE, data)


def check_stale_stocks():
    """检测过期股票"""
    try:
        v22_data = load_v22_results()
    except FileNotFoundError:
        print("⚠️ v22_results.json 不存在，先运行评分脚本")
        return []

    stale = []
    for item in v22_data:
        status = item.get('signal_status', 'fresh')
        age_days = item.get('signal_age_days', 0)

        if status == 'stale' or age_days >= STALE_THRESHOLD_DAYS:
            stale.append({
                'code': item.get('code'),
                'name': item.get('name', item.get('code')),
                'status': status,
                'age_days': age_days,
                'grade': item.get('v22_grade', ''),
                'score': item.get('v22_total', 0)
            })

    return sorted(stale, key=lambda x: x['age_days'], reverse=True)


def display_stale_report(stale_list):
    """显示过期报告"""
    if not stale_list:
        print("\n✅ 所有股票数据都是新鲜的（< 14天）")
        return

    print(f"\n📊 检测到 {len(stale_list)} 条过期数据:")
    print("-" * 70)
    print(f"{'代码':<10} {'名称':<12} {'状态':<12} {'天数':<6} {'评级':<6} {'评分':<6}")
    print("-" * 70)

    for item in stale_list:
        name = item['name'][:10] if len(item['name']) > 10 else item['name']
        print(f"{item['code']:<10} {name:<12} {item['status']:<12} {item['age_days']:<6} {item['grade']:<6} {item['score']:<6}")

    print("-" * 70)


def mark_stock_as_stale(code, reason="数据过期"):
    """标记单只股票为过期状态"""
    decision = load_decision()

    if code not in decision:
        print(f"⚠️ {code} 不在 decisionState.json 中")
        return False

    decision[code]['signals']['signalStatus'] = 'stale'
    decision[code]['signals']['staleReason'] = reason
    decision[code]['signals']['reviewPriority'] = 'high'

    save_decision(decision)
    print(f"✅ 已标记 {code} ({decision[code]['meta']['name']}) 为过期")
    return True


def mark_all_stale():
    """标记所有过期股票"""
    stale = check_stale_stocks()

    if not stale:
        print("✅ 没有需要标记为过期的股票")
        return

    print(f"\n🔄 正在标记 {len(stale)} 只股票为过期状态...")
    for item in stale:
        mark_stock_as_stale(item['code'], f"数据超过{STALE_THRESHOLD_DAYS}天未更新")


def update_specific_stocks(codes):
    """更新指定股票"""
    decision = load_decision()
    companies = load_companies()
    today = datetime.now().strftime("%Y-%m-%d")

    updated = []
    not_found = []

    for code in codes:
        # 更新 decisionState
        if code in decision:
            decision[code]['meta']['updatedAt'] = today
            decision[code]['signals']['signalStatus'] = 'fresh'
            decision[code]['signals']['signalAgeDays'] = 0
            decision[code]['signals']['staleReason'] = ''
            decision[code]['signals']['reviewPriority'] = 'medium'
            updated.append(code)
        else:
            not_found.append(code)

        # 更新 companies.json 的 lastUpdate
        for company in companies:
            if company.get('code') == code:
                company['lastUpdate'] = today
                break

    save_decision(decision)
    save_companies(companies)

    if updated:
        print(f"✅ 已更新 {len(updated)} 只股票: {', '.join(updated)}")
    if not_found:
        print(f"⚠️ 未找到 {len(not_found)} 只股票: {', '.join(not_found)}")


def run_v22_scorer():
    """运行 v22 评分脚本"""
    print("\n🔢 正在运行 v22_scorer.py ...")
    try:
        result = subprocess.run(
            ['python3', str(BASE_DIR / 'v22_scorer.py')],
            capture_output=True,
            text=True,
            cwd=str(BASE_DIR)
        )
        if result.returncode == 0:
            print("✅ 评分计算完成")
            return True
        else:
            print(f"❌ 评分脚本出错: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ 运行评分脚本失败: {e}")
        return False


def save_snapshot(note=""):
    """保存快照"""
    print("\n📦 正在保存快照...")
    try:
        result = subprocess.run(
            ['python3', str(BASE_DIR / 'scripts/version_manager.py'), 'save', note],
            capture_output=True,
            text=True,
            cwd=str(BASE_DIR)
        )
        if result.returncode == 0:
            print("✅ 快照保存成功")
            return True
        else:
            print(f"⚠️ 快照保存失败: {result.stderr}")
            return False
    except Exception as e:
        print(f"⚠️ 快照保存失败: {e}")
        return False


def main():
    args = sys.argv[1:]

    if '--check' in args:
        # 检查过期股票
        stale = check_stale_stocks()
        display_stale_report(stale)

    elif '--all-stale' in args:
        # 标记所有过期股票
        save_snapshot("批量标记过期")
        mark_all_stale()

    elif '--codes' in args:
        # 更新指定股票
        idx = args.index('--codes')
        codes_str = args[idx + 1] if idx + 1 < len(args) else ''
        codes = [c.strip() for c in codes_str.split(',') if c.strip()]

        if not codes:
            print("❌ 请提供股票代码列表")
            print("用法: python3 batch_refresh.py --codes 300750,600519,600036")
            sys.exit(1)

        save_snapshot(f"批量更新: {', '.join(codes)}")
        update_specific_stocks(codes)

        # 可选：重新运行评分
        if '--rescore' in args:
            run_v22_scorer()

    elif '--full-refresh' in args:
        # 完整刷新流程
        print("=" * 60)
        print("A50-Tracker 完整数据刷新流程")
        print("=" * 60)

        # 1. 保存快照
        save_snapshot("完整刷新前备份")

        # 2. 检查过期
        stale = check_stale_stocks()
        display_stale_report(stale)

        # 3. 标记过期
        if stale:
            mark_all_stale()

        # 4. 提示用户获取新数据
        print("\n📝 下一步：")
        print("   1. 使用 web_access skill 获取最新股票数据")
        print("   2. 更新 companies.json 中的 annualReport 和 financials")
        print("   3. 运行: python3 batch_refresh.py --rescore")

    elif '--rescore' in args:
        # 仅重新评分
        run_v22_scorer()

    else:
        print("""
A50-Tracker 批量数据刷新脚本

用法:
  python3 batch_refresh.py --check              # 检查过期股票
  python3 batch_refresh.py --all-stale           # 标记所有过期股票
  python3 batch_refresh.py --codes 300750,600519  # 更新指定股票
  python3 batch_refresh.py --full-refresh       # 完整刷新流程
  python3 batch_refresh.py --rescore             # 重新计算评分

示例:
  python3 batch_refresh.py --check
  python3 batch_refresh.py --codes 300750,600519,600036 --rescore
  python3 batch_refresh.py --full-refresh
        """)
        sys.exit(1)


if __name__ == "__main__":
    main()
