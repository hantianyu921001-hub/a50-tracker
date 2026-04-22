#!/usr/bin/env python3
"""
A50-Tracker 过期数据检测与自动更新
功能：
  1. 扫描 v22_results.json 检测过期数据
  2. 生成需要更新的股票列表
  3. 输出格式化的报告（供 agent 调用 skill 使用）
"""

import json
from datetime import datetime, timedelta

V22_FILE = "/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app/v22_results.json"
STALE_THRESHOLD_DAYS = 14

def load_data():
    with open(V22_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def check_expired(data, threshold_days=STALE_THRESHOLD_DAYS):
    """检测过期数据"""
    expired = []
    today = datetime.now()
    
    for item in data:
        status = item.get('signal_status', 'fresh')
        age_days = item.get('signal_age_days', 0)
        
        # 判断是否过期
        is_stale = status == 'stale'
        is_old = age_days >= threshold_days
        
        if is_stale or is_old:
            expired.append({
                'code': item.get('code'),
                'name': item.get('name', item.get('code')),
                'signal_status': status,
                'signal_age_days': age_days,
                'stale_reason': item.get('stale_reason', ''),
                'v22_grade': item.get('v22_grade', ''),
                'v22_total': item.get('v22_total', 0),
            })
    
    return sorted(expired, key=lambda x: x['signal_age_days'], reverse=True)

def generate_report(expired):
    """生成格式化报告"""
    if not expired:
        print("✅ 所有数据都是最新的，无需更新")
        return []
    
    print(f"📊 检测到 {len(expired)} 条过期数据:")
    print("-" * 70)
    print(f"{'代码':<10} {'名称':<12} {'状态':<8} {'天数':<6} {'原因':<20}")
    print("-" * 70)
    
    for item in expired:
        name = item['name'][:10] if len(item['name']) > 10 else item['name']
        reason = item['stale_reason'][:18] if item['stale_reason'] else '-'
        print(f"{item['code']:<10} {name:<12} {item['signal_status']:<8} {item['signal_age_days']:<6} {reason:<20}")
    
    print("-" * 70)
    return expired

def get_update_commands(expired):
    """生成需要更新的股票代码列表"""
    return [item['code'] for item in expired]

if __name__ == "__main__":
    data = load_data()
    expired = check_expired(data)
    report = generate_report(expired)
    
    if expired:
        codes = get_update_commands(expired)
        print(f"\n📝 需要更新的股票代码: {', '.join(codes)}")
        print("\n请使用以下命令逐个更新:")
        for code in codes:
            print(f"  - 分析 {code}")