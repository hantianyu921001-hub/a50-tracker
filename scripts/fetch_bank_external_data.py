#!/usr/bin/env python3
import contextlib
import importlib.util
import io
import json
import math
import re
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

try:
    import akshare as ak
    from pypdf import PdfReader
except ImportError:
    import subprocess

    subprocess.run([sys.executable, "-m", "pip", "install", "--user", "pypdf", "akshare", "-q"], check=True)
    import akshare as ak
    from pypdf import PdfReader


BANK_IR_CONFIG = {
    "601288": {
        "name": "农业银行",
        "industry": "银行",
        "bank_type": "国有大行",
        "annual_reports_url": "https://www.abchina.com.cn/en/investor-relations/performance-reports/annual-reports/default.htm",
        "base_url": "https://www.abchina.com.cn/en/investor-relations/performance-reports/annual-reports/",
    },
    "600036": {
        "name": "招商银行",
        "industry": "银行",
        "bank_type": "股份行",
        "source_url": "https://www.cmbchina.com/cmbir/",
        "direct_pdf_url": "https://s3gw.cmbimg.com/lb5001-cmbweb-prd-1255000097/cmbir/20260409/4e4e3c3e-c293-49bf-8cb6-f9db3813ef25.pdf",
        "reporting_period": "2025",
        "parser": "cmb_zh_summary",
    },
}


def load_fetcher_module():
    base_dir = Path("/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app")
    script_path = base_dir / "src/skills/a50-data-refresh/scripts/stock_data_fetcher.py"
    spec = importlib.util.spec_from_file_location("stock_data_fetcher", script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sanitize_json_value(value):
    if isinstance(value, dict):
        return {key: sanitize_json_value(val) for key, val in value.items()}
    if isinstance(value, list):
        return [sanitize_json_value(item) for item in value]
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def fetch_text(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="ignore")


def fetch_json(url, headers=None):
    merged_headers = {"User-Agent": "Mozilla/5.0"}
    if headers:
        merged_headers.update(headers)
    request = urllib.request.Request(url, headers=merged_headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8", errors="ignore"))


def fetch_bytes(url, headers=None, timeout=20, attempts=3, delay=0.6):
    merged_headers = {"User-Agent": "Mozilla/5.0"}
    if headers:
        merged_headers.update(headers)
    request = urllib.request.Request(url, headers=merged_headers)
    last_error = None
    for index in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read()
        except Exception as exc:
            last_error = exc
            if index == attempts - 1:
                raise
            time.sleep(delay)
    raise last_error


def find_latest_report_pdf(config):
    if config.get("direct_pdf_url"):
        return {
            "reporting_period": config.get("reporting_period", ""),
            "pdf_url": config["direct_pdf_url"],
            "source_url": config.get("source_url") or config["direct_pdf_url"],
        }
    html = fetch_text(config["annual_reports_url"])
    match = re.search(
        r'<div class="annRep_title"><i class="ny_Llist"></i>(\d{4}) Annual Report</div>.*?href="(\./\d+/P\d+\.pdf)"',
        html,
        re.S,
    )
    if not match:
        return None
    year, relative_pdf = match.groups()
    pdf_url = urllib.request.urljoin(config["base_url"], relative_pdf)
    return {"reporting_period": year, "pdf_url": pdf_url, "source_url": config["annual_reports_url"]}


def extract_pdf_text(pdf_url):
    request = urllib.request.Request(pdf_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(response.read())
            tmp_path = tmp.name

    reader = PdfReader(tmp_path)
    return "\n".join((page.extract_text() or "") for page in reader.pages[:80])


def normalize_spaced_number(value):
    if value is None:
        return None
    value = re.sub(r"[\s,]+", "", value)
    try:
        return float(value)
    except ValueError:
        return None


def extract_number(text, pattern):
    match = re.search(pattern, text, re.I)
    if not match:
        return None
    return normalize_spaced_number(match.group(1))


def extract_percent_metric(text, label):
    label_pattern = re.escape(label).replace(r"\ ", r"\s+")
    pattern = rf"{label_pattern}\s+(?:\d+(?:,\d+)?)?\s*([0-9]{{1,3}})\s*\.\s*([0-9]{{1,2}})"
    match = re.search(pattern, text, re.I)
    if not match:
        return None
    integer_part, decimal_part = match.groups()
    return float(f"{integer_part}.{decimal_part}")


def extract_dividend_per_10_shares(text, reporting_period):
    pattern = rf"full-year dividend\s+for\s+{reporting_period}\s+to\s+RMB([0-9]+\.[0-9]+)\s+\(tax inclusive\)\s+per\s+10\s+shares"
    match = re.search(pattern, text, re.I)
    if not match:
        return None
    return safe_float(match.group(1))


def extract_cash_dividend_total(text):
    match = re.search(r"total amount of RMB([0-9,\s]+)\s+million\s+\(tax\s+inclusive\)", text, re.I)
    if not match:
        return None
    return normalize_spaced_number(match.group(1))


def extract_table_row_numbers(text, label, limit=5):
    label_pattern = re.escape(label).replace(r"\ ", r"\s+")
    pattern = rf"{label_pattern}\s+([0-9,\.\s]+)"
    match = re.search(pattern, text, re.I)
    if not match:
        return []
    raw = match.group(1)
    values = re.findall(r"\d[\d,]*", raw)
    return [normalize_spaced_number(item) for item in values[:limit] if normalize_spaced_number(item) is not None]


def extract_major_financial_section(text):
    start = text.rfind("Major Financial Data")
    if start == -1:
        return text
    end = text.find("Financial Indicators", start)
    if end == -1:
        end = start + 4000
    return text[start:end]


def safe_yoy(current, previous):
    if current in (None, 0) or previous in (None, 0):
        return None
    return (current - previous) / previous


def safe_float(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    if not text or text == "-":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def dataframe_to_map(df):
    result = {}
    for _, row in df.iterrows():
        result[str(row["item"]).strip()] = row["value"]
    return result


def safe_akshare_call(func, *args, **kwargs):
    attempts = kwargs.pop("_attempts", 3)
    delay = kwargs.pop("_delay", 0.8)
    for index in range(attempts):
        try:
            return func(*args, **kwargs)
        except Exception:
            if index == attempts - 1:
                return None
            time.sleep(delay)


def extract_akshare_abstract_metrics(code):
    df = safe_akshare_call(ak.stock_financial_abstract, symbol=code, _attempts=2, _delay=0.4)
    if df is None or getattr(df, "empty", True):
        return None

    def row_value(metric_name, report_key):
        target = df[df["指标"] == metric_name]
        if target.empty or report_key not in target.columns:
            return None
        return safe_float(target.iloc[0][report_key])

    report_key = str(df.columns[2]) if len(df.columns) > 2 else None
    if not report_key:
        return None
    report_suffix = report_key[4:]
    previous_key = f"{int(report_key[:4]) - 1}{report_suffix}" if len(report_key) == 8 and report_key.isdigit() else None
    if previous_key not in df.columns:
        previous_key = str(df.columns[3]) if len(df.columns) > 3 else None

    revenue = row_value("营业总收入", report_key)
    revenue_prev = row_value("营业总收入", previous_key) if previous_key else None
    net_profit = row_value("归母净利润", report_key)
    eps = row_value("基本每股收益", report_key)
    bvps = row_value("每股净资产", report_key)

    return {
        "report_key": report_key,
        "previous_key": previous_key,
        "revenue": revenue,
        "revenue_yoy": safe_yoy(revenue, revenue_prev),
        "net_profit": net_profit,
        "eps": eps,
        "bvps": bvps,
    }


def extract_daily_turnover(code):
    market_symbol = f"sh{code}" if code.startswith("6") else f"sz{code}"
    df = safe_akshare_call(ak.stock_zh_a_daily, symbol=market_symbol, adjust="", _attempts=2, _delay=0.4)
    if df is None or getattr(df, "empty", True):
        return None
    latest = df.tail(1).to_dict("records")[0]
    return safe_float(latest.get("turnover"))


def extract_business_profile(code):
    df = safe_akshare_call(ak.stock_zyjs_ths, symbol=code, _attempts=2, _delay=0.5)
    if df is None or getattr(df, "empty", True):
        return None
    latest = df.iloc[0]
    return {
        "main_business": str(latest.get("主营业务") or "").strip(),
        "product_type": str(latest.get("产品类型") or "").strip(),
        "product_name": str(latest.get("产品名称") or "").strip(),
        "business_scope": str(latest.get("经营范围") or "").strip(),
    }


def extract_eastmoney_company_survey(code):
    market_code = f"SH{code}" if code.startswith("6") else f"SZ{code}"
    headers = {
        "Referer": "https://emweb.securities.eastmoney.com/",
    }
    survey = safe_akshare_call(
        fetch_json,
        f"https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/CompanySurveyAjax?code={market_code}",
        headers,
        _attempts=2,
        _delay=0.5,
    )
    page = safe_akshare_call(
        fetch_json,
        f"https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/PageAjax?code={market_code}",
        headers,
        _attempts=2,
        _delay=0.5,
    )
    jbzl = (survey or {}).get("jbzl") or {}
    fxxg_list = (page or {}).get("fxxg") or []
    fxxg = fxxg_list[0] if fxxg_list else {}
    return {
        "industry": str(jbzl.get("sshy") or "").strip(),
        "industry_csrc": str(jbzl.get("sszjhhy") or "").strip(),
        "company_profile": str(jbzl.get("gsjj") or "").strip(),
        "business_scope": str(jbzl.get("jyfw") or "").strip(),
        "listing_date": str(fxxg.get("LISTING_DATE") or "").strip(),
    }


def infer_industry_from_profile(profile):
    if not profile:
        return None
    text = " ".join([
        profile.get("main_business") or "",
        profile.get("product_type") or "",
        profile.get("product_name") or "",
    ])
    if "银行" in text or "金融服务" in text:
        return "银行"
    if "卫星" in text or "航天" in text or "宇航" in text:
        return "航天装备"
    if "白酒" in text or "酒" in text:
        return "白酒"
    return None


def infer_concept_from_profile(profile, survey=None):
    texts = [
        profile.get("main_business") if profile else "",
        profile.get("product_type") if profile else "",
        profile.get("product_name") if profile else "",
        survey.get("company_profile") if survey else "",
    ]
    text = " ".join([item for item in texts if item])
    concepts = []
    concept_rules = [
        ("卫星", "卫星应用"),
        ("航天", "航天装备"),
        ("宇航", "宇航制造"),
        ("遥感", "遥感"),
        ("导航", "卫星导航"),
        ("智慧城市", "智慧城市"),
        ("云计算", "云计算"),
        ("金融服务", "金融服务"),
        ("银行", "银行"),
    ]
    for keyword, label in concept_rules:
        if keyword in text and label not in concepts:
            concepts.append(label)
    return "、".join(concepts[:4])


def percentile_rank(series, value):
    cleaned = [safe_float(item) for item in series if safe_float(item) is not None]
    target = safe_float(value)
    if not cleaned or target is None:
        return None
    count = sum(1 for item in cleaned if item <= target)
    return count / len(cleaned)


def extract_historical_valuation_metrics(code, current_pe, current_pb):
    result = {}
    configs = [
        ("pe", "市盈率(TTM)", current_pe),
        ("pb", "市净率", current_pb),
    ]
    for key, indicator, current_value in configs:
        df = safe_akshare_call(
            ak.stock_zh_valuation_baidu,
            symbol=code,
            indicator=indicator,
            period="近十年",
            _attempts=2,
            _delay=0.5,
        )
        if df is None or getattr(df, "empty", True):
            continue
        values = [safe_float(item) for item in df["value"].tolist() if safe_float(item) is not None]
        if not values:
            continue
        result[key] = {
            "current": safe_float(current_value) if current_value is not None else values[-1],
            "percentile": percentile_rank(values, current_value if current_value is not None else values[-1]),
            "min": min(values),
            "max": max(values),
            "latest_date": str(df.iloc[-1]["date"]),
        }
    return result or None


def extract_recent_announcements(code, lookback_days=30, limit=20):
    end_date = datetime.now().strftime("%Y%m%d")
    start_date = (datetime.now() - timedelta(days=lookback_days)).strftime("%Y%m%d")
    df = safe_akshare_call(
        ak.stock_zh_a_disclosure_report_cninfo,
        symbol=code,
        start_date=start_date,
        end_date=end_date,
        _attempts=2,
        _delay=0.5,
    )
    if df is None or getattr(df, "empty", True):
        return []

    announcements = []
    for _, row in df.head(limit).iterrows():
        title = str(row.get("公告标题") or "").strip()
        date = str(row.get("公告时间") or "").strip()
        url = str(row.get("公告链接") or "").strip()
        if not title:
            continue
        announcements.append({
            "id": f"{code}-notice-{abs(hash(f'{date}-{title}'))}",
            "date": date,
            "title": title,
            "url": url,
            "source": "cninfo_disclosure",
        })
    return announcements


def build_structured_events(code, annual, official_report, market_quote):
    events = []
    if annual and (annual.get("report_date") or annual.get("revenue") is not None or annual.get("net_profit") is not None):
        events.append({
            "id": f"{code}-financial-update",
            "date": str(annual.get("report_date") or __import__("datetime").datetime.now().strftime("%Y-%m-%d")),
            "type": "financial_update",
            "title": "最新财务快照已更新",
            "impact_level": "medium",
            "impact_direction": "neutral",
            "requires_refresh": True,
            "source": "generic_financial_snapshot",
        })
    if official_report and official_report.get("reporting_period"):
        events.append({
            "id": f"{code}-annual-{official_report['reporting_period']}",
            "date": f"{official_report['reporting_period']}-12-31",
            "type": "annual_results",
            "title": f"{official_report['reporting_period']} 年年报已发布",
            "impact_level": "high",
            "impact_direction": "neutral",
            "requires_refresh": True,
            "source": "official_annual_report",
        })
    if official_report and official_report.get("cash_dividend_total_million") is not None:
        events.append({
            "id": f"{code}-dividend-{official_report.get('reporting_period','latest')}",
            "date": f"{official_report.get('reporting_period','2025')}-12-31",
            "type": "dividend",
            "title": f"现金分红总额 {round(official_report['cash_dividend_total_million'] / 100, 2)} 亿元",
            "impact_level": "medium",
            "impact_direction": "positive",
            "requires_refresh": False,
            "source": "official_annual_report",
        })
    if market_quote and market_quote.get("turnover") is not None and market_quote.get("turnover") > 0.01:
        events.append({
            "id": f"{code}-turnover-spike",
            "date": __import__("datetime").datetime.now().strftime("%Y-%m-%d"),
            "type": "market_activity",
            "title": f"换手率升至 {round(market_quote['turnover'] * 100, 2)}%",
            "impact_level": "low",
            "impact_direction": "neutral",
            "requires_refresh": False,
            "source": market_quote.get("source") or "market_quote",
        })
    return events


def parse_tencent_market_quote(code):
    market_symbol = f"sh{code}" if code.startswith("6") else f"sz{code}"
    url = f"https://qt.gtimg.cn/q={market_symbol}"
    raw = fetch_bytes(url)
    text = raw.decode("gbk", errors="ignore").strip()
    if '="' not in text:
        return None
    body = text.split('="', 1)[1].rsplit('";', 1)[0]
    parts = body.split("~")
    if len(parts) < 36:
        return None
    trade_bundle = (parts[35] if len(parts) > 35 else "").split("/")
    volume = safe_float(trade_bundle[1]) if len(trade_bundle) > 1 else safe_float(parts[36] if len(parts) > 36 else None)
    amount = safe_float(trade_bundle[2]) if len(trade_bundle) > 2 else None
    return {
        "symbol": code,
        "name": parts[1],
        "price": safe_float(parts[3]),
        "prev_close": safe_float(parts[4]),
        "open": safe_float(parts[5]),
        "volume": volume,
        "amount": amount,
        "pe_dynamic": safe_float(parts[39]) if len(parts) > 39 else None,
        "pb": safe_float(parts[46]) if len(parts) > 46 else None,
        "float_market_cap": safe_float(parts[44]) * 100_000_000 if len(parts) > 44 and safe_float(parts[44]) is not None else None,
        "market_cap": safe_float(parts[45]) * 100_000_000 if len(parts) > 45 and safe_float(parts[45]) is not None else None,
        "change": safe_float(parts[31]) if len(parts) > 31 else None,
        "change_pct": safe_float(parts[32]) if len(parts) > 32 else None,
        "turnover": None,
        "high": safe_float(parts[33]) if len(parts) > 33 else None,
        "low": safe_float(parts[34]) if len(parts) > 34 else None,
        "source": "tencent_quote",
    }


def parse_sina_market_quote(code):
    market_symbol = f"sh{code}" if code.startswith("6") else f"sz{code}"
    url = f"https://hq.sinajs.cn/list={market_symbol}"
    raw = fetch_bytes(
        url,
        headers={"Referer": "https://finance.sina.com.cn"},
    )
    text = raw.decode("gbk", errors="ignore").strip()
    if "Forbidden" in text or '="' not in text:
        return None
    body = text.split('="', 1)[1].rsplit('";', 1)[0]
    parts = body.split(",")
    if len(parts) < 32:
        return None
    return {
        "symbol": code,
        "name": parts[0],
        "open": safe_float(parts[1]),
        "prev_close": safe_float(parts[2]),
        "price": safe_float(parts[3]),
        "high": safe_float(parts[4]),
        "low": safe_float(parts[5]),
        "volume": safe_float(parts[8]),
        "amount": safe_float(parts[9]),
        "date": parts[30],
        "time": parts[31],
        "source": "sina_quote",
    }


def parse_bank_market_quote(code):
    individual_info_df = safe_akshare_call(ak.stock_individual_info_em, symbol=code)
    individual_info = dataframe_to_map(individual_info_df) if individual_info_df is not None else {}
    tencent_quote = safe_akshare_call(parse_tencent_market_quote, code, _attempts=2, _delay=0.4)
    sina_quote = safe_akshare_call(parse_sina_market_quote, code, _attempts=2, _delay=0.4)
    quote = tencent_quote or sina_quote or {}
    turnover = extract_daily_turnover(code)
    valuation_history = extract_historical_valuation_metrics(code, quote.get("pe_dynamic"), quote.get("pb")) if quote else None

    if not individual_info and not quote:
        return None

    return {
        "symbol": code,
        "name": individual_info.get("股票简称") or quote.get("name"),
        "industry": individual_info.get("行业"),
        "price": quote.get("price") or safe_float(individual_info.get("最新")),
        "pe_dynamic": quote.get("pe_dynamic"),
        "pb": quote.get("pb"),
        "market_cap": safe_float(individual_info.get("总市值")) or quote.get("market_cap"),
        "float_market_cap": safe_float(individual_info.get("流通市值")) or quote.get("float_market_cap"),
        "change": quote.get("change"),
        "change_pct": quote.get("change_pct"),
        "turnover": turnover,
        "valuation_history": valuation_history,
        "high": quote.get("high"),
        "low": quote.get("low"),
        "open": quote.get("open"),
        "prev_close": quote.get("prev_close"),
        "volume": quote.get("volume"),
        "amount": quote.get("amount"),
        "listing_date": individual_info.get("上市时间"),
        "source": quote.get("source") or "akshare_single_stock_info",
    }


def parse_official_bank_report(code):
    config = BANK_IR_CONFIG.get(code)
    if not config:
        return None

    report_meta = find_latest_report_pdf(config)
    if not report_meta:
        return None

    text = extract_pdf_text(report_meta["pdf_url"])
    if config.get("parser") == "cmb_zh_summary":
        return parse_cmb_summary_report(code, config, report_meta, text)

    major_section = extract_major_financial_section(text)
    total_assets = extract_number(text, r"total assets\s+of RMB([0-9,\s]+) million")
    customer_loans = extract_number(text, r"total loans and advances to customers of RMB([0-9,\s]+) million")
    customer_deposits = extract_number(text, r"deposits from customers of RMB([0-9,\s]+) million")
    net_profit = extract_number(text, r"net profit of RMB([0-9,\s]+) million in 2025")
    capital_adequacy_ratio = extract_number(text, r"capital adequacy ratio was\s+([0-9]+\.[0-9]+)%")

    roe = extract_percent_metric(text, "Return on weighted average net assets")
    net_interest_margin = extract_percent_metric(text, "Net interest margin")
    npl_ratio = extract_percent_metric(text, "Non-performing loan ratio")
    provision_coverage = extract_percent_metric(text, "Allowance to non-performing loans")
    core_tier1_ratio = extract_percent_metric(text, "Common Equity Tier 1 (CET1) capital adequacy ratio")
    dividend_per_10_shares = extract_dividend_per_10_shares(text, report_meta["reporting_period"])
    cash_dividend_total = extract_cash_dividend_total(text)

    total_assets_series = extract_table_row_numbers(major_section, "Total assets")
    customer_loans_series = extract_table_row_numbers(major_section, "Total loans and advances to customers")
    customer_deposits_series = extract_table_row_numbers(major_section, "Deposits from customers")
    net_profit_series = extract_table_row_numbers(major_section, "Net profit")
    attributable_net_profit_series = extract_table_row_numbers(major_section, "Net profit attributable to")
    abstract_metrics = extract_akshare_abstract_metrics(code) or {}

    if len(total_assets_series) >= 2:
        total_assets = total_assets_series[0]
        total_assets_prev = total_assets_series[1]
    else:
        total_assets_prev = None

    if len(customer_loans_series) >= 2:
        customer_loans = customer_loans_series[0]
        customer_loans_prev = customer_loans_series[1]
    else:
        customer_loans_prev = None

    if len(customer_deposits_series) >= 2:
        customer_deposits = customer_deposits_series[0]
        customer_deposits_prev = customer_deposits_series[1]
    else:
        customer_deposits_prev = None

    if len(net_profit_series) >= 2:
        net_profit = net_profit_series[0]
        net_profit_prev = net_profit_series[1]
    else:
        net_profit_prev = None

    return {
        "company": {
            "symbol": code,
            "name": config["name"],
            "industry": config["industry"],
            "bank_type": config["bank_type"],
        },
        "reporting_period": report_meta["reporting_period"],
        "pdf_url": report_meta["pdf_url"],
        "source_url": report_meta["source_url"],
        "total_assets_million": total_assets,
        "customer_loans_million": customer_loans,
        "customer_deposits_million": customer_deposits,
        "net_profit_million": net_profit,
        "attributable_net_profit_million": attributable_net_profit_series[0] if attributable_net_profit_series else None,
        "roe_percent": roe,
        "net_interest_margin_percent": net_interest_margin,
        "npl_ratio_percent": npl_ratio,
        "provision_coverage_percent": provision_coverage,
        "core_tier1_ratio_percent": core_tier1_ratio,
        "capital_adequacy_ratio_percent": capital_adequacy_ratio,
        "dividend_per_10_shares": dividend_per_10_shares,
        "cash_dividend_total_million": cash_dividend_total,
        "revenue_million": abstract_metrics.get("revenue"),
        "revenue_yoy": abstract_metrics.get("revenue_yoy"),
        "eps": abstract_metrics.get("eps"),
        "bvps": abstract_metrics.get("bvps"),
        "yoy": {
            "total_assets": safe_yoy(total_assets, total_assets_prev),
            "customer_loans": safe_yoy(customer_loans, customer_loans_prev),
            "customer_deposits": safe_yoy(customer_deposits, customer_deposits_prev),
            "net_profit": safe_yoy(net_profit, net_profit_prev),
        },
        "previous": {
            "total_assets_million": total_assets_prev,
            "customer_loans_million": customer_loans_prev,
            "customer_deposits_million": customer_deposits_prev,
            "net_profit_million": net_profit_prev,
        },
    }


def extract_dual_year_metric(text, label, unit=None):
    unit_pattern = rf"（单位：{re.escape(unit)}）\s*" if unit else ""
    pattern = rf"([0-9,]+\.[0-9]+)\s+([0-9,]+\.[0-9]+)\s+2024\s+2025\s+{unit_pattern}{re.escape(label)}"
    match = re.search(pattern, text, re.S)
    if not match:
        return None, None
    prev_value, current_value = match.groups()
    return safe_float(current_value), safe_float(prev_value)


def extract_dual_percent_metric(text, label):
    pattern = rf"([0-9]+\.[0-9]+)%\s+([0-9]+\.[0-9]+)%\s+2024\s+2025\s+{re.escape(label)}"
    match = re.search(pattern, text, re.S)
    if not match:
        return None, None
    prev_value, current_value = match.groups()
    return safe_float(current_value), safe_float(prev_value)


def parse_cmb_summary_report(code, config, report_meta, text):
    revenue, revenue_prev = extract_dual_year_metric(text, "营业净收入", "亿元")
    net_profit_match = re.search(
        r"([0-9,]+\.[0-9]+)\s+([0-9,]+\.[0-9]+)\s+2024\s+2025\s+归属于本行股东净利润",
        text,
        re.S,
    )
    net_profit = safe_float(net_profit_match.group(2)) if net_profit_match else None
    net_profit_prev = safe_float(net_profit_match.group(1)) if net_profit_match else None
    total_assets, total_assets_prev = extract_dual_year_metric(text, "资产总额", "万亿元")
    customer_loans, customer_loans_prev = extract_dual_year_metric(text, "贷款和垫款总额", "万亿元")
    customer_deposits, customer_deposits_prev = extract_dual_year_metric(text, "客户存款总额", "万亿元")
    roe, _ = extract_dual_percent_metric(text, "ROAE")
    net_interest_margin, _ = extract_dual_percent_metric(text, "净利息收益率")
    npl_block_match = re.search(
        r"([0-9,]+\.[0-9]+)\s+([0-9,]+\.[0-9]+)\s+2024\s+2025\s+([0-9]+\.[0-9]+)%\s+([0-9]+\.[0-9]+)%\s+（单位：亿元）\s+不良贷款额、率",
        text,
        re.S,
    )
    npl_ratio = safe_float(npl_block_match.group(4)) if npl_block_match else None
    provision_match = re.search(
        r"([0-9]+\.[0-9]+)%\s+([0-9]+\.[0-9]+)%\s+2024\s+2025\s+([0-9]+\.[0-9]+)%\s+([0-9]+\.[0-9]+)%\s+拨备覆盖率和贷款拨备率",
        text,
        re.S,
    )
    provision_coverage = safe_float(provision_match.group(2)) if provision_match else None

    cap_match = re.search(
        r"2024\s+2025\s+([0-9]+\.[0-9]+)%([0-9]+\.[0-9]+)%\s+([0-9]+\.[0-9]+)%([0-9]+\.[0-9]+)%\s+([0-9]+\.[0-9]+)%([0-9]+\.[0-9]+)%\s+资本充足率\s+核心一级资本充足率\s+一级资本充足率",
        text,
        re.S,
    )
    capital_adequacy_ratio = safe_float(cap_match.group(6)) if cap_match else None
    core_tier1_ratio = safe_float(cap_match.group(4)) if cap_match else None

    npl_amount_match = re.search(
        r"([0-9,]+\.[0-9]+)\s+([0-9,]+\.[0-9]+)\s+2024\s+2025\s+([0-9]+\.[0-9]+)%\s+([0-9]+\.[0-9]+)%\s+（单位：亿元）\s+不良贷款额、率",
        text,
        re.S,
    )
    attributable_net_profit = net_profit
    abstract_metrics = extract_akshare_abstract_metrics(code) or {}

    return {
        "company": {
            "symbol": code,
            "name": config["name"],
            "industry": config["industry"],
            "bank_type": config["bank_type"],
        },
        "reporting_period": report_meta["reporting_period"],
        "pdf_url": report_meta["pdf_url"],
        "source_url": report_meta["source_url"],
        "total_assets_million": total_assets * 1_000_000 if total_assets is not None else None,
        "customer_loans_million": customer_loans * 1_000_000 if customer_loans is not None else None,
        "customer_deposits_million": customer_deposits * 1_000_000 if customer_deposits is not None else None,
        "net_profit_million": net_profit * 100 if net_profit is not None else None,
        "attributable_net_profit_million": attributable_net_profit * 100 if attributable_net_profit is not None else None,
        "roe_percent": roe,
        "net_interest_margin_percent": net_interest_margin,
        "npl_ratio_percent": npl_ratio,
        "provision_coverage_percent": provision_coverage,
        "core_tier1_ratio_percent": core_tier1_ratio,
        "capital_adequacy_ratio_percent": capital_adequacy_ratio,
        "dividend_per_10_shares": abstract_metrics.get("dividend_per_10_shares"),
        "cash_dividend_total_million": abstract_metrics.get("cash_dividend_total"),
        "revenue_million": revenue * 100 if revenue is not None else abstract_metrics.get("revenue"),
        "revenue_yoy": safe_yoy(revenue, revenue_prev) if revenue is not None and revenue_prev is not None else abstract_metrics.get("revenue_yoy"),
        "eps": abstract_metrics.get("eps"),
        "bvps": abstract_metrics.get("bvps"),
        "npl_amount_million": safe_float(npl_amount_match.group(2)) * 100 if npl_amount_match else None,
        "yoy": {
            "total_assets": safe_yoy(total_assets, total_assets_prev),
            "customer_loans": safe_yoy(customer_loans, customer_loans_prev),
            "customer_deposits": safe_yoy(customer_deposits, customer_deposits_prev),
            "net_profit": safe_yoy(net_profit, net_profit_prev),
        },
        "previous": {
            "total_assets_million": total_assets_prev * 1_000_000 if total_assets_prev is not None else None,
            "customer_loans_million": customer_loans_prev * 1_000_000 if customer_loans_prev is not None else None,
            "customer_deposits_million": customer_deposits_prev * 1_000_000 if customer_deposits_prev is not None else None,
            "net_profit_million": net_profit_prev * 100 if net_profit_prev is not None else None,
        },
    }


def main():
    if len(sys.argv) < 2:
      print(json.dumps({"success": False, "error": "missing stock code"}))
      sys.exit(1)

    code = sys.argv[1]
    include_legacy = "--include-legacy" in sys.argv[2:]
    discover_announcements = "--discover-announcements" in sys.argv[2:]

    if discover_announcements:
        print(json.dumps({
            "success": True,
            "code": code,
            "timestamp": datetime.now().isoformat(),
            "announcements": extract_recent_announcements(code),
        }, ensure_ascii=False))
        return

    result = {
        "code": code,
        "timestamp": datetime.now().isoformat(),
        "success": True,
        "errors": [],
    }

    if include_legacy:
        module = load_fetcher_module()
        with contextlib.redirect_stdout(io.StringIO()):
            result = module.fetch_stock_data(code)

    official_report = parse_official_bank_report(code)
    market_quote = parse_bank_market_quote(code)
    business_profile = extract_business_profile(code)
    company_survey = extract_eastmoney_company_survey(code)
    structured_events = build_structured_events(code, result.get("annual"), official_report, market_quote)
    result["official_report"] = official_report
    result["market_quote"] = market_quote
    result["business_profile"] = business_profile
    result["company_survey"] = company_survey
    result["events"] = structured_events
    if official_report is None:
        result["errors"].append("official_report_unavailable")
    if market_quote is None:
        result["errors"].append("market_quote_unavailable")
    print(json.dumps(sanitize_json_value(result), ensure_ascii=False))


if __name__ == "__main__":
    main()
