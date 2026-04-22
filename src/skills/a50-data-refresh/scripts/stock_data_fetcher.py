#!/usr/bin/env python3
"""
A50-Tracker 数据获取模块 v2
- 添加重试机制
- 使用多个备用数据源
- 降级策略确保稳定性
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any

# 尝试导入 akshare
try:
    import akshare as ak
    import pandas as pd
    AKSHARE_AVAILABLE = True
except ImportError:
    AKSHARE_AVAILABLE = False
    print("⚠️ akshare 未安装，正在安装...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "akshare", "-q"], check=True)
    try:
        import akshare as ak
        import pandas as pd
        AKSHARE_AVAILABLE = True
    except:
        print("❌ akshare 安装失败")

BASE_DIR = Path("/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app")
COMPANIES_FILE = BASE_DIR / "src/data/companies.json"
OUTPUT_FILE = BASE_DIR / "src/data/fetched_data.json"

A50_CODES = list(set([
    "600519", "300750", "600036", "601985", "601628",
    "600276", "002475", "002371", "688981", "601088",
    "600887", "600309", "000792", "600031", "002714",
    "002230", "601012", "000988", "300760", "601600",
    "600941", "601766", "600585", "000938", "600436",
    "600048", "000617", "600150", "601899", "600900",
    "601318", "601398", "601939", "601288", "600028",
    "600690", "600009", "601888", "002415", "300059",
    "688111", "688012", "002594", "300015"
]))

# 重试配置
MAX_RETRIES = 3
RETRY_DELAY = 2


def retry_request(func, *args, **kwargs):
    """带重试的请求"""
    for attempt in range(MAX_RETRIES):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                print(f"  ⚠️ 第 {attempt+1} 次失败，重试中... ({e})")
                time.sleep(RETRY_DELAY)
            else:
                print(f"  ❌ 最终失败: {e}")
                return None
    return None


def get_realtime_quote_via_zh_ah(code: str) -> Optional[Dict]:
    """通过 stock_zh_ah_spot 获取实时行情（备用方案）"""
    try:
        df = ak.stock_zh_ah_spot()
        if df is None or df.empty:
            return None
        row = df[df['代码'] == code]
        if row.empty:
            return None
        row = row.iloc[0]
        return {
            "code": code,
            "name": str(row.get("名称", "")),
            "price": float(row.get("最新价")) if pd.notna(row.get("最新价")) else None,
            "change_pct": float(row.get("涨跌幅")) if pd.notna(row.get("涨跌幅")) else None,
            "high": float(row.get("最高")) if pd.notna(row.get("最高")) else None,
            "low": float(row.get("最低")) if pd.notna(row.get("最低")) else None,
            "volume": float(row.get("成交量")) if pd.notna(row.get("成交量")) else None,
            "amount": float(row.get("成交额")) if pd.notna(row.get("成交额")) else None,
        }
    except Exception as e:
        return None


def get_realtime_quote_primary(code: str) -> Optional[Dict]:
    """主要实时行情获取 - stock_zh_a_spot_em"""
    try:
        df = ak.stock_zh_a_spot_em()
        if df is None or df.empty:
            return None
        row = df[df['代码'] == code]
        if row.empty:
            return None
        row = row.iloc[0]
        return {
            "code": code,
            "name": str(row.get("名称", "")),
            "price": float(row.get("最新价")) if pd.notna(row.get("最新价")) else None,
            "change_pct": float(row.get("涨跌幅")) if pd.notna(row.get("涨跌幅")) else None,
            "pe": float(row.get("市盈率-动态")) if pd.notna(row.get("市盈率-动态")) else None,
            "pb": float(row.get("市净率")) if pd.notna(row.get("市净率")) else None,
            "market_cap": float(row.get("总市值")) if pd.notna(row.get("总市值")) else None,
            "dv_ratio": float(row.get("股息率")) if pd.notna(row.get("股息率")) else None,
            "turnover": float(row.get("换手率")) if pd.notna(row.get("换手率")) else None,
            "high": float(row.get("最高")) if pd.notna(row.get("最高")) else None,
            "low": float(row.get("最低")) if pd.notna(row.get("最低")) else None,
            "volume": float(row.get("成交量")) if pd.notna(row.get("成交量")) else None,
            "amount": float(row.get("成交额")) if pd.notna(row.get("成交额")) else None,
        }
    except Exception as e:
        return None


def get_realtime_quote(code: str) -> Optional[Dict]:
    """获取实时行情（带备用方案）"""
    # 首先尝试主要接口
    result = retry_request(get_realtime_quote_primary, code)
    if result:
        return result

    # 备用：通过 ah spot 获取
    print(f"  → 使用备用方案...")
    return get_realtime_quote_via_zh_ah(code)


def get_stock_info(code: str) -> Optional[Dict]:
    """获取股票基本信息"""
    def _fetch():
        df = ak.stock_individual_info_em(symbol=code)
        if df is None or df.empty:
            return None
        info = {}
        for _, row in df.iterrows():
            info[row.get("item", "")] = row.get("value", "")
        return {
            "code": code,
            "industry": info.get("行业", ""),
            "concept": info.get("概念", ""),
            "listing_date": info.get("上市时间", ""),
        }

    return retry_request(_fetch)


def parse_value(val):
    """安全解析数值"""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, str):
        val = val.strip()
        if not val or val in ['N/A', 'None', '-', '']:
            return None
        # 处理 "72.64亿" 格式
        if '亿' in val:
            try:
                return float(val.replace('亿', '')) * 1e8
            except:
                return None
        # 处理百分比
        if '%' in val:
            try:
                return float(val.replace('%', ''))
            except:
                return None
        # 尝试直接转换
        try:
            return float(val)
        except:
            return None
    return None


def get_annual_report(code: str) -> Optional[Dict]:
    """获取年报数据"""
    def _fetch():
        # 方法1: 通过利润表
        try:
            df = ak.stock_profit_sheet_by_report_em(symbol=code)
            if df is not None and not df.empty:
                latest = df.iloc[0]
                if hasattr(latest, 'get'):
                    return {
                        "code": code,
                        "name": latest.get("股票名称"),
                        "report_date": latest.get("公告日期"),
                        "revenue": parse_value(latest.get("营业总收入")),
                        "revenue_yoy": latest.get("营业总收入同比"),
                        "net_profit": parse_value(latest.get("净利润")),
                        "net_profit_yoy": latest.get("净利润同比"),
                        "eps": parse_value(latest.get("基本每股收益")),
                        "bvps": parse_value(latest.get("每股净资产")),
                    }
        except Exception as e:
            pass
        return None

    result = retry_request(_fetch)
    if result and result.get('revenue'):
        return result

    # 备用：通过同花顺财务摘要
    def _fetch_ths():
        try:
            df = ak.stock_financial_abstract_ths(symbol=code)
            if df is not None and not df.empty:
                latest = df.iloc[0]
                # 同花顺数据单位已经是亿
                revenue_str = latest.get("营业总收入", "")
                net_profit_str = latest.get("净利润", "")

                # 解析营收
                revenue = None
                if revenue_str and isinstance(revenue_str, str):
                    if '亿' in revenue_str:
                        revenue = float(revenue_str.replace('亿', '')) * 1e8
                    else:
                        try:
                            revenue = float(revenue_str) * 1e8  # 假设是亿元
                        except:
                            revenue = None

                # 解析净利润
                net_profit = None
                if net_profit_str and isinstance(net_profit_str, str):
                    if '亿' in net_profit_str:
                        net_profit = float(net_profit_str.replace('亿', '')) * 1e8
                    else:
                        try:
                            net_profit = float(net_profit_str) * 1e8
                        except:
                            net_profit = None

                return {
                    "code": code,
                    "name": latest.get("报告期"),
                    "revenue": revenue,
                    "revenue_yoy": latest.get("营业总收入同比增长率"),
                    "net_profit": net_profit,
                    "net_profit_yoy": latest.get("净利润同比增长率"),
                    "eps": parse_value(latest.get("基本每股收益")),
                }
        except Exception as e:
            pass
        return None

    return retry_request(_fetch_ths)


def get_financial_indicators(code: str) -> Optional[Dict]:
    """获取财务指标"""
    def _fetch():
        df = ak.stock_financial_analysis_indicator(symbol=code, start_year="2024")
        if df is None or df.empty:
            return None
        latest = df.iloc[0]
        return {
            "code": code,
            "roe": parse_value(latest.get("净资产收益率(%)")),
            "gross_margin": parse_value(latest.get("销售毛利率(%)")),
            "net_margin": parse_value(latest.get("销售净利率(%)")),
            "debt_ratio": parse_value(latest.get("资产负债率(%)")),
        }

    result = retry_request(_fetch)
    if result and result.get('roe'):
        return result

    # 备用：通过同花顺
    def _fetch_ths():
        try:
            df = ak.stock_financial_abstract_ths(symbol=code)
            if df is not None and not df.empty:
                latest = df.iloc[0]
                return {
                    "code": code,
                    "roe": parse_value(latest.get("净资产收益率(%)")),
                    "gross_margin": parse_value(latest.get("销售毛利率(%)")),
                    "net_margin": parse_value(latest.get("销售净利率(%)")),
                    "debt_ratio": parse_value(latest.get("资产负债率(%)")),
                }
        except:
            pass
        return None

    return retry_request(_fetch_ths)


def fetch_stock_data(code: str) -> Dict:
    """获取单只股票完整数据"""
    print(f"\n📊 获取股票 {code} 数据...")
    print("-" * 50)

    data = {
        "code": code,
        "timestamp": datetime.now().isoformat(),
        "success": False,
        "errors": []
    }

    # 实时行情
    print("\n1. 实时行情:")
    quote = get_realtime_quote(code)
    if quote:
        data["quote"] = quote
        print(f"   ✅ {quote.get('name', '')}")
        print(f"   最新价: {quote.get('price', 'N/A')}")
        print(f"   涨跌幅: {quote.get('change_pct', 'N/A')}%")
        print(f"   PE: {quote.get('pe', 'N/A')}")
        print(f"   PB: {quote.get('pb', 'N/A')}")
        print(f"   市值: {quote.get('market_cap', 'N/A')/1e8:.2f}亿" if quote.get('market_cap') else "   市值: N/A")
    else:
        data["errors"].append("实时行情获取失败")
        print("   ❌ 获取失败")

    # 基本信息
    print("\n2. 基本信息:")
    info = get_stock_info(code)
    if info:
        data["info"] = info
        print(f"   ✅ 行业: {info.get('industry', 'N/A')}")
        print(f"   概念: {info.get('concept', 'N/A')}")
    else:
        data["errors"].append("基本信息获取失败")
        print("   ❌ 获取失败")

    # 年报数据
    print("\n3. 年报数据:")
    annual = get_annual_report(code)
    if annual:
        data["annual"] = annual
        if annual.get('revenue'):
            print(f"   ✅ 营收: {annual['revenue']/1e8:.2f}亿")
        if annual.get('net_profit'):
            print(f"   净利: {annual['net_profit']/1e8:.2f}亿")
        if annual.get('revenue_yoy'):
            print(f"   营收同比: {annual['revenue_yoy']}")
    else:
        data["errors"].append("年报数据获取失败")
        print("   ❌ 获取失败")

    # 财务指标
    print("\n4. 财务指标:")
    fin = get_financial_indicators(code)
    if fin:
        data["financial"] = fin
        if fin.get('roe'):
            print(f"   ✅ ROE: {fin['roe']:.2f}%")
        if fin.get('gross_margin'):
            print(f"   毛利率: {fin['gross_margin']:.2f}%")
        if fin.get('debt_ratio'):
            print(f"   资产负债率: {fin['debt_ratio']:.2f}%")
    else:
        data["errors"].append("财务指标获取失败")
        print("   ❌ 获取失败")

    data["success"] = len(data["errors"]) < 4
    print("\n" + "-" * 50)

    return data


def fetch_a50_all() -> List[Dict]:
    """获取所有A50股票数据"""
    if not AKSHARE_AVAILABLE:
        print("❌ akshare 不可用")
        return []

    print("\n📊 正在获取A50成分股数据...")
    print("=" * 50)

    results = []
    success_count = 0
    fail_count = 0

    for i, code in enumerate(A50_CODES):
        print(f"\n[{i+1}/{len(A50_CODES)}] {code}...", end=" ")

        data = fetch_stock_data(code)

        if data["success"]:
            success_count += 1
            print(f"✅ 成功")
        else:
            fail_count += 1
            print(f"⚠️ 部分失败 ({len(data['errors'])} 项)")

        # 清理大数据
        if "quote" in data and data["quote"]:
            data["quote"].pop("timestamp", None)
        if "info" in data and data["info"]:
            data["info"].pop("timestamp", None)

        results.append(data)
        time.sleep(0.5)  # 避免请求过快

    print("\n" + "=" * 50)
    print(f"📈 获取完成: {success_count} 成功, {fail_count} 失败")

    return results


def update_companies_from_fetch(fetched_data: List[Dict], dry_run=True) -> Dict:
    """更新 companies.json"""
    companies = json.load(open(COMPANIES_FILE, 'r', encoding='utf-8'))
    today = datetime.now().strftime("%Y-%m-%d")

    updated = []
    code_to_idx = {c.get("code"): i for i, c in enumerate(companies)}

    for data in fetched_data:
        code = data.get("code")
        if code not in code_to_idx:
            continue

        idx = code_to_idx[code]
        quote = data.get("quote", {})
        annual = data.get("annual", {})
        fin = data.get("financial", {})

        if "analysis" not in companies[idx]:
            companies[idx]["analysis"] = {}
        if "financials" not in companies[idx]["analysis"]:
            companies[idx]["analysis"]["financials"] = {}

        # 更新估值指标
        fin_data = companies[idx]["analysis"]["financials"]
        if quote.get("pe"):
            fin_data["PE"] = f"{quote['pe']:.1f}倍"
        if quote.get("pb"):
            fin_data["PB"] = f"{quote['pb']:.2f}倍"
        if quote.get("dv_ratio"):
            fin_data["股息率"] = f"{quote['dv_ratio']:.2f}%"
        if quote.get("market_cap"):
            fin_data["总市值"] = f"{quote['market_cap']/1e8:.2f}亿"

        # 更新年报数据
        if annual.get("revenue") or annual.get("net_profit"):
            if "annualReport" not in companies[idx]["analysis"]:
                companies[idx]["analysis"]["annualReport"] = []

            ar = companies[idx]["analysis"]["annualReport"]
            metrics = []

            if annual.get("revenue"):
                rev_val = annual['revenue']
                metrics.append({
                    "metric": "营业收入",
                    "value": f"{rev_val/1e8:.2f}亿" if rev_val else "N/A",
                    "change": str(annual.get('revenue_yoy', ''))
                })
            if annual.get("net_profit"):
                np_val = annual['net_profit']
                metrics.append({
                    "metric": "归母净利润",
                    "value": f"{np_val/1e8:.2f}亿" if np_val else "N/A",
                    "change": str(annual.get('net_profit_yoy', ''))
                })

            if metrics:
                existing = {m["metric"]: m for m in ar}
                existing.update({m["metric"]: m for m in metrics})
                companies[idx]["analysis"]["annualReport"] = list(existing.values())

        # 更新财务指标
        if fin.get("roe"):
            if "financials" not in companies[idx]["analysis"]:
                companies[idx]["analysis"]["financials"] = {}
            companies[idx]["analysis"]["financials"]["ROE"] = f"{fin['roe']:.2f}%"
        if fin.get("gross_margin"):
            companies[idx]["analysis"]["financials"]["毛利率"] = f"{fin['gross_margin']:.2f}%"
        if fin.get("debt_ratio"):
            companies[idx]["analysis"]["financials"]["资产负债率"] = f"{fin['debt_ratio']:.2f}%"

        companies[idx]["lastUpdate"] = today
        updated.append(code)

    if dry_run:
        print(f"\n🔍 [Dry Run] 将更新 {len(updated)} 条记录")
        return {"updated": updated, "dry_run": True}

    json.dump(companies, open(COMPANIES_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"\n✅ 成功更新 {len(updated)} 条记录")
    return {"updated": updated, "dry_run": False}


def main():
    args = sys.argv[1:]

    if not AKSHARE_AVAILABLE:
        print("❌ akshare 不可用")
        sys.exit(1)

    if "--fetch" in args:
        code = args[args.index("--fetch") + 1] if args.index("--fetch") + 1 < len(args) else None
        if not code:
            print("❌ 请提供股票代码: --fetch 300750")
            sys.exit(1)
        fetch_stock_data(code)

    elif "--fetch-all" in args:
        results = fetch_a50_all()
        json.dump(results, open(OUTPUT_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print(f"\n💾 数据已保存到 {OUTPUT_FILE}")

    elif "--update" in args:
        dry_run = "--dry-run" in args
        if dry_run:
            print("\n🔍 [Dry Run 模式]")
        if OUTPUT_FILE.exists():
            fetched = json.load(open(OUTPUT_FILE, 'r', encoding='utf-8'))
        else:
            print("⚠️ 未找到缓存数据，先运行 --fetch-all")
            fetched = fetch_a50_all()
        update_companies_from_fetch(fetched, dry_run)

    else:
        print("""
A50-Tracker 数据获取模块 v2

用法:
  python3 stock_data_fetcher.py --fetch 300750     # 获取单只股票
  python3 stock_data_fetcher.py --fetch-all       # 获取所有A50
  python3 stock_data_fetcher.py --update           # 更新 companies.json
  python3 stock_data_fetcher.py --update --dry-run # 预览更新

特点:
  - 自动重试机制 (最多3次)
  - 多备用数据源
  - 增量更新
        """)
        sys.exit(1)


if __name__ == "__main__":
    main()
