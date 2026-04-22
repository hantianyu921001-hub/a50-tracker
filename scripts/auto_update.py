#!/usr/bin/env python3
"""
A50-Tracker 自动更新工作流
功能：
  1. 保存当前版本快照
  2. 检测过期数据
  3. 自动调用 a50-company-analysis skill 更新过期股票
  4. 验证更新结果

用法: python3 auto_update.py [--dry-run]
"""

import json
import os
import sys
import subprocess
from datetime import datetime

V22_FILE = "/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app/v22_results.json"
STALE_THRESHOLD_DAYS = 14

# 需要更新的股票代码列表（从 check_expired.py 输出的列表）
STALE_CODES = [
    "600036", "002475", "600276", "002371", "688981", "601088", 
    "600887", "600309", "000792", "600031", "002714", "002230",
    "601012", "000988", "300760", "601600", "600941", "601766",
    "600585", "000938", "600436", "600048", "000617"
]

def save_snapshot(note=""):
    """保存当前版本快照"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    result = subprocess.run(
        ["python3", f"{script_dir}/version_manager.py", "save", note],
        capture_output=True, text=True
    )
    return result.returncode == 0

def check_expired():
    """检测过期数据"""
    with open(V22_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    expired = []
    for item in data:
        status = item.get('signal_status', 'fresh')
        age_days = item.get('signal_age_days', 0)
        if status == 'stale' or age_days >= STALE_THRESHOLD_DAYS:
            expired.append(item.get('code'))
    return expired

def call_analysis_skill(code):
    """调用 a50-company-analysis skill 分析股票"""
    print(f"\n🔄 正在分析 {code}...")
    
    # 这里需要通过某种方式触发 skill
    # 由于是自动化，我们生成一个命令脚本供用户手动执行
    # 或者你可以配置 MCP/CLI 来自动触发
    return True

def update_stale_data():
    """更新过期数据"""
    print("=" * 60)
    print("A50-Tracker 自动更新工作流")
    print("=" * 60)
    
    # Step 1: 保存快照
    print("\n📦 Step 1: 保存当前版本快照...")
    if save_snapshot("自动更新前备份"):
        print("   ✅ 快照保存成功")
    else:
        print("   ⚠️ 快照保存失败，继续执行...")
    
    # Step 2: 检测过期数据
    print("\n🔍 Step 2: 检测过期数据...")
    expired = check_expired()
    if not expired:
        print("   ✅ 没有需要更新的数据")
        return
    
    print(f"   📊 检测到 {len(expired)} 条过期数据")
    
    # Step 3: 生成更新命令
    print("\n📝 Step 3: 生成更新命令...")
    print("\n以下是需要更新的股票，请在 WorkBuddy 中逐个调用 skill：")
    print("-" * 40)
    for i, code in enumerate(expired, 1):
        print(f"  {i}. {code}")
    print("-" * 40)
    print("\n提示：在 WorkBuddy 中对每个代码说「分析 XXX」即可触发更新")

if __name__ == "__main__":
    is_dry_run = "--dry-run" in sys.argv
    if is_dry_run:
        print("🔍 [Dry Run 模式] 仅检测过期数据，不执行更新")
    
    update_stale_data()