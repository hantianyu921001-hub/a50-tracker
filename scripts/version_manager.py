#!/usr/bin/env python3
"""
A50-Tracker 数据版本管理脚本
功能：
  1. 保存当前数据快照到历史版本
  2. 列出所有历史版本
  3. 回滚到指定版本
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

V22_FILE = "/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app/v22_results.json"
HISTORY_DIR = "/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app/v22_history"

def ensure_history_dir():
    Path(HISTORY_DIR).mkdir(parents=True, exist_ok=True)

def save_snapshot(note=""):
    """保存当前 v22_results.json 的快照"""
    ensure_history_dir()
    
    with open(V22_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 创建以日期为名的子目录
    date_str = datetime.now().strftime("%Y-%m-%d")
    date_dir = os.path.join(HISTORY_DIR, date_str)
    Path(date_dir).mkdir(parents=True, exist_ok=True)
    
    # 生成时间戳文件名
    timestamp = datetime.now().strftime("%H%M%S")
    filename = f"snapshot_{timestamp}.json"
    filepath = os.path.join(date_dir, filename)
    
    # 写入快照
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    # 更新索引文件
    index_file = os.path.join(HISTORY_DIR, "index.json")
    index = {}
    if os.path.exists(index_file):
        with open(index_file, 'r', encoding='utf-8') as f:
            index = json.load(f)
    
    if date_str not in index:
        index[date_str] = []
    index[date_str].append({
        "filename": filename,
        "timestamp": timestamp,
        "note": note,
        "count": len(data),
        "updated_at": datetime.now().isoformat()
    })
    
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 快照已保存: {date_str}/{filename}")
    print(f"   记录数: {len(data)}")
    if note:
        print(f"   备注: {note}")
    return filepath

def list_versions():
    """列出所有历史版本"""
    index_file = os.path.join(HISTORY_DIR, "index.json")
    if not os.path.exists(index_file):
        print("📭 暂无历史版本")
        return
    
    with open(index_file, 'r', encoding='utf-8') as f:
        index = json.load(f)
    
    print("📋 历史版本列表:")
    print("-" * 60)
    for date, versions in sorted(index.items(), reverse=True):
        print(f"\n📅 {date}")
        for v in versions:
            print(f"   • {v['timestamp']} - {v['count']}条记录 - {v.get('note', '无备注')}")
    print("-" * 60)

def restore_version(date_str, timestamp=None):
    """恢复到指定版本"""
    if timestamp:
        filepath = os.path.join(HISTORY_DIR, date_str, f"snapshot_{timestamp}.json")
    else:
        # 取当天最后一个版本
        index_file = os.path.join(HISTORY_DIR, "index.json")
        with open(index_file, 'r', encoding='utf-8') as f:
            index = json.load(f)
        versions = index.get(date_str, [])
        if not versions:
            print(f"❌ 日期 {date_str} 没有历史版本")
            return
        filename = versions[-1]["filename"]
        filepath = os.path.join(HISTORY_DIR, date_str, filename)
    
    if not os.path.exists(filepath):
        print(f"❌ 文件不存在: {filepath}")
        return
    
    # 备份当前版本
    current_backup = V22_FILE + ".backup"
    with open(V22_FILE, 'r', encoding='utf-8') as f:
        json.dump(json.load(f), open(current_backup, 'w'), ensure_ascii=False, indent=2)
    
    # 恢复
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    with open(V22_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 已恢复到: {date_str}/{os.path.basename(filepath)}")
    print(f"   原始文件已备份到: {current_backup}")

def diff_versions(date1, ts1, date2, ts2):
    """对比两个版本的差异（简化版：只对比数量）"""
    f1 = os.path.join(HISTORY_DIR, date1, f"snapshot_{ts1}.json")
    f2 = os.path.join(HISTORY_DIR, date2, f"snapshot_{ts2}.json")
    
    with open(f1) as f1, open(f2) as f2:
        d1, d2 = json.load(f1), json.load(f2)
    
    codes1 = {x['code'] for x in d1}
    codes2 = {x['code'] for x in d2}
    
    added = codes2 - codes1
    removed = codes1 - codes2
    
    print(f"📊 版本对比: {date1}/{ts1} vs {date2}/{ts2}")
    print(f"   记录数: {len(d1)} -> {len(d2)}")
    if added:
        print(f"   新增: {len(added)}条")
    if removed:
        print(f"   删除: {len(removed)}条")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    
    if cmd == "save":
        note = sys.argv[2] if len(sys.argv) > 2 else ""
        save_snapshot(note)
    elif cmd == "list":
        list_versions()
    elif cmd == "restore":
        date = sys.argv[2]
        ts = sys.argv[3] if len(sys.argv) > 3 else None
        restore_version(date, ts)
    elif cmd == "diff":
        date1, ts1, date2, ts2 = sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
        diff_versions(date1, ts1, date2, ts2)
    else:
        print("用法:")
        print("  python version_manager.py save [备注]")
        print("  python version_manager.py list")
        print("  python version_manager.py restore <日期> [时间戳]")
        print("  python version_manager.py diff <日期1> <时间1> <日期2> <时间2>")