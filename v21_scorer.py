#!/usr/bin/env python3
"""
v2.1 评分模型 - 批量评分脚本 v2
基于中证A50跟踪系统的现有数据，按v2.1模型5维度+风险扣分逻辑重新评分

v2.1模型：
- 护城河 25分（品牌5 + 成本规模4 + 技术壁垒5 + 资源牌照4 + 转换成本/网络效应5 + 总结2）
- 成长性 20分（历史增长8 + 当前趋势6 + 未来空间6）
- 盈利质量 20分（ROE 5 + 利润率5 + 现金流5 + 股东回报5）
- 估值安全边际 25分（历史分位10 + 相对行业5 + 股东回报率5 + 成长匹配度5）
- 催化剂 10分（明确度5 + 兑现概率5）
- 风险扣分（0~-15）

v2改进：
1. 缺数据时用原系统评分做锚点校准
2. 减少风险扣分过重问题
3. 加入已手动评分的4家公司数据
"""

import json
import re

# 已手动v2.1评分的4家
MANUAL_V21 = {
    '贵州茅台': {'total': 74, 'grade': 'B', 'moat': 24, 'growth': 13, 'profit': 19, 'valuation': 16, 'catalyst': 6, 'risk': -4},
    '中国平安': {'total': 72, 'grade': 'B', 'moat': 19, 'growth': 14, 'profit': 15, 'valuation': 22, 'catalyst': 7, 'risk': -5},
    '招商银行': {'total': 67, 'grade': 'C', 'moat': 18, 'growth': 9, 'profit': 16, 'valuation': 23, 'catalyst': 6, 'risk': -5},
    '胜宏科技': {'total': 57, 'grade': 'C', 'moat': 16, 'growth': 19, 'profit': 15, 'valuation': 6, 'catalyst': 8, 'risk': -7},
    '英伟达':   {'total': 69, 'grade': 'C+', 'moat': 23, 'growth': 18, 'profit': 17, 'valuation': 10, 'catalyst': 7, 'risk': -6},
}

def parse_number(s):
    if not s:
        return None
    s = str(s).strip()
    m = re.search(r'[-+]?\d+\.?\d*', s)
    return float(m.group()) if m else None

def parse_pct(s):
    if not s:
        return None
    s = str(s).strip()
    m = re.search(r'([-+]?\d+\.?\d*)\s*%', s)
    return float(m.group(1)) if m else None

def parse_pe(s):
    if not s:
        return None
    s = str(s).strip()
    m = re.search(r'(\d+\.?\d*)\s*倍', s)
    return float(m.group(1)) if m else None

def parse_pb(s):
    if not s:
        return None
    s = str(s).strip()
    m = re.search(r'(\d+\.?\d*)\s*倍', s)
    return float(m.group(1)) if m else None


class V21Scorer:
    def __init__(self, company_data):
        self.c = company_data
        self.fin = company_data.get('analysis', {}).get('financials', {}) or {}
        self.sr = company_data.get('scoringRationale', {}) or {}
        self.ar = company_data.get('analysis', {}).get('annualReport', []) or []
        self.name = company_data.get('name', '?')
        self.industry = company_data.get('industry', '') or company_data.get('swIndustry', '')
        
        # 提取关键数值（使用范围解析器处理"约18-20%"等格式）
        self.pe = self._parse_range_value(self.fin.get('PE', ''), '倍')
        self.pb = self._parse_range_value(self.fin.get('PB', ''), '倍')
        self.roe = self._parse_range_pct(str(self.fin.get('ROE', '')))
        self.dividend_yield = self._parse_range_pct(str(self.fin.get('股息率', '')))
        self.gross_margin = self._parse_range_pct(str(self.fin.get('毛利率', '')))
        self.net_margin = self._parse_range_pct(str(self.fin.get('净利率', '')))
        
        # 从annualReport提取
        self.revenue_growth = None
        self.profit_growth = None
        for item in self.ar:
            metric = item.get('metric', '')
            change = item.get('change', '')
            if '营收' in metric:
                self.revenue_growth = parse_pct(change)
            if '净利' in metric:
                self.profit_growth = parse_pct(change)
        
        # 从scoringRationale摘要提取
        self.growth_summary = self._get_sr_summary('growth')
        self.moat_summary = self._get_sr_summary('moat')
        self.profit_summary = self._get_sr_summary('profitability')
        self.val_summary = self._get_sr_summary('valuation')
        self.catalyst_summary = self._get_sr_summary('catalyst')
        
        # 从摘要中补充提取增速
        self._extract_growth_from_summaries()
        
        # 原系统评分
        self.orig_moat = self._get_sr_score('moat')
        self.orig_growth = self._get_sr_score('growth')
        self.orig_profit = self._get_sr_score('profitability')
        self.orig_val = self._get_sr_score('valuation')
        self.orig_catalyst = self._get_sr_score('catalyst')
    
    def _get_sr_summary(self, dim):
        info = self.sr.get(dim, {})
        if isinstance(info, dict):
            return info.get('summary', '')
        return ''
    
    def _get_sr_score(self, dim):
        info = self.sr.get(dim, {})
        if isinstance(info, dict):
            s = info.get('score')
            if s and str(s) != 'N/A':
                try: return float(s)
                except: return None
        return None
    
    def _extract_growth_from_summaries(self):
        texts = f'{self.growth_summary} {self.profit_summary} {self.val_summary}'
        
        rev_match = re.search(r'营收[^\d]*?([-+]?\d+\.?\d*)%', texts)
        profit_match = re.search(r'净利[^\d]*?([-+]?\d+\.?\d*)%', texts)
        
        if self.revenue_growth is None and rev_match:
            self.revenue_growth = float(rev_match.group(1))
        if self.profit_growth is None and profit_match:
            self.profit_growth = float(profit_match.group(1))
    
    def _parse_range_pct(self, s):
        """解析范围百分比如 '约18-20%' -> 19, '约34-36%' -> 35"""
        if not s or s == 'None':
            return None
        s = str(s).strip()
        # 匹配 "X-Y%" 格式
        m = re.search(r'(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*%', s)
        if m:
            low, high = float(m.group(1)), float(m.group(2))
            return (low + high) / 2
        # 匹配普通百分比
        m = re.search(r'([-+]?\d+\.?\d*)\s*%', s)
        if m:
            return float(m.group(1))
        # 匹配纯数字
        m = re.search(r'([-+]?\d+\.?\d*)', s)
        if m:
            return float(m.group(1))
        return None
    
    def _parse_range_value(self, s, unit='倍'):
        """解析范围值如 '约4-5倍' -> 4.5, '约18倍' -> 18"""
        if not s or s == 'None':
            return None
        s = str(s).strip()
        # 匹配 "X-Y倍" 格式
        m = re.search(r'(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*' + unit, s)
        if m:
            low, high = float(m.group(1)), float(m.group(2))
            return (low + high) / 2
        # 匹配普通值
        m = re.search(r'(\d+\.?\d*)\s*' + unit, s)
        if m:
            return float(m.group(1))
        # 匹配纯数字
        m = re.search(r'(\d+\.?\d*)', s)
        if m:
            return float(m.group(1))
        return None
    
    def score_moat(self):
        """护城河评分 (25分)"""
        score = 0
        details = []
        moat_text = self.moat_summary.lower()
        ind = self.industry
        
        # 1. 品牌与客户心智 (5分)
        brand_score = 2
        if any(kw in moat_text for kw in ['品牌=硬通货', '绝对龙头', '全球第一', '全球最大', '垄断地位', '市占率>90%', '绝密配方']):
            brand_score = 5
        elif any(kw in moat_text for kw in ['龙头', '第一', '领先', '市占率37', '市占率31', '核心供应商']):
            brand_score = 4
        elif any(kw in moat_text for kw in ['前三', '主要', '优势', '知名']):
            brand_score = 3
        
        # 2B制造业品牌心智天然弱
        if any(kw in ind for kw in ['电子', '化工', '钢铁', '建材', '建筑']):
            brand_score = min(brand_score, 3)
        
        score += brand_score
        details.append(f'品牌{brand_score}/5')
        
        # 2. 成本优势与规模效应 (4分)
        cost_score = 2
        if any(kw in moat_text for kw in ['成本优势', '成本最低', '规模效应', '规模优势', '一体化']):
            cost_score = 3
        if any(kw in moat_text for kw in ['全球第一', '全球最大', '市占率第一', '绝对龙头']):
            cost_score = max(cost_score, 3)
        if self.gross_margin:
            if self.gross_margin > 70: cost_score = max(cost_score, 4)
            elif self.gross_margin > 50: cost_score = max(cost_score, 3)
        
        score += cost_score
        details.append(f'成本{cost_score}/4')
        
        # 3. 技术/产品壁垒 (5分)
        tech_score = 2
        if any(kw in moat_text for kw in ['技术壁垒', '技术领先', '技术护城河', '专利', '研发投入', '绝密配方']):
            tech_score = 3
        if any(kw in moat_text for kw in ['不可复制', '不可替代', '全球唯一', '全品类', '稀缺性']):
            tech_score = 4
        if any(kw in moat_text for kw in ['国内唯一', '市占率>90%', '生态闭环', '全谱系']):
            tech_score = 5
        
        score += tech_score
        details.append(f'技术{tech_score}/5')
        
        # 4. 资源/牌照/渠道壁垒 (4分)
        resource_score = 1
        if any(kw in moat_text for kw in ['渠道', '牌照', '许可证', '客户认证', '供应商认证', '经销商']):
            resource_score = 2
        if any(kw in moat_text for kw in ['资源垄断', '资源储量', '配额', '矿']):
            resource_score = 3
        if any(kw in moat_text for kw in ['天然垄断', '物理不可替代', '国家绝密', '央企', '军工', '独占']):
            resource_score = 4
        
        score += resource_score
        details.append(f'资源{resource_score}/4')
        
        # 5. 转换成本/网络效应 (5分)
        switch_score = 1
        if any(kw in moat_text for kw in ['转换成本', '客户粘性', '客户壁垒', '绑定', '认证周期']):
            switch_score = 2
        if any(kw in moat_text for kw in ['网络效应', '7.5万商户', '10亿用户', '4亿人群', '生态']):
            switch_score = 4
        if any(kw in moat_text for kw in ['自我强化', '闭环', '不可替代']):
            switch_score = max(switch_score, 4)
        
        # 行业调整
        if any(kw in ind for kw in ['银行', '保险']):
            switch_score = max(switch_score, 3)
        if '茅台' in self.name:
            switch_score = 5
        if '宁德时代' in self.name:
            switch_score = max(switch_score, 3)
        
        score += switch_score
        details.append(f'转换{switch_score}/5')
        
        # 6. 总结加成 (2分)
        summary_score = 1
        if any(kw in moat_text for kw in ['三重护城河', '四重护城河', '护城河极深', '护城河极宽']):
            summary_score = 2
        
        score += summary_score
        details.append(f'总结{summary_score}/2')
        
        return score, details
    
    def score_growth(self):
        """成长性评分 (20分)"""
        score = 0
        details = []
        
        # 1. 历史增长 (8分)
        rg = self.revenue_growth
        pg = self.profit_growth
        max_growth = max(abs(rg) if rg else 0, abs(pg) if pg else 0)
        
        if max_growth >= 100: hist_score = 8
        elif max_growth >= 60: hist_score = 7
        elif max_growth >= 30: hist_score = 6
        elif max_growth >= 15: hist_score = 5
        elif max_growth >= 5: hist_score = 4
        elif max_growth >= 0: hist_score = 3
        elif max_growth >= -10: hist_score = 2
        else: hist_score = 1
        
        # 用原系统评分做校准锚点
        if self.orig_growth:
            if self.orig_growth >= 90: hist_score = max(hist_score, 7)
            elif self.orig_growth >= 75: hist_score = max(hist_score, 5)
            elif self.orig_growth >= 60: hist_score = max(hist_score, 4)
            elif self.orig_growth < 40: hist_score = min(hist_score, 3)
        
        score += hist_score
        details.append(f'历史{hist_score}/8')
        
        # 2. 当前趋势 (6分)
        trend_score = 3
        gt = self.growth_summary.lower()
        
        if any(kw in gt for kw in ['爆发', '翻倍', '暴增', '大幅增长']):
            trend_score = 5
        elif any(kw in gt for kw in ['高增长', '快速增长', '稳健增长', '持续增长', '增长']):
            trend_score = 4
        elif any(kw in gt for kw in ['放缓', '下滑', '承压', '下降']):
            trend_score = 2
        elif any(kw in gt for kw in ['大幅下滑', '暴跌', '亏损']):
            trend_score = 1
        
        if pg is not None and pg < 0: trend_score = min(trend_score, 2)
        if rg is not None and rg < 0: trend_score = min(trend_score, 2)
        
        score += trend_score
        details.append(f'趋势{trend_score}/6')
        
        # 3. 未来空间 (6分)
        future_score = 3
        ct = self.catalyst_summary.lower()
        vt = self.val_summary.lower()
        combined = f'{ct} {vt}'
        
        if any(kw in combined for kw in ['ai', '算力', '新能源', '国产替代', '出海']):
            future_score = 4
        if any(kw in combined for kw in ['爆发', '翻倍', '拐点', '放量', '渗透率提升']):
            future_score = 5
        if any(kw in combined for kw in ['等待拐点', '尚不明确', '短期无增长']):
            future_score = 2
        
        # 行业天花板
        if any(kw in self.industry for kw in ['银行', '保险', '钢铁', '建材', '建筑']):
            future_score = min(future_score, 3)
        
        score += future_score
        details.append(f'空间{future_score}/6')
        
        return score, details
    
    def score_profitability(self):
        """盈利质量评分 (20分)"""
        score = 0
        details = []
        
        # 1. ROE (5分)
        roe_score = 2
        if self.roe:
            if self.roe >= 30: roe_score = 5
            elif self.roe >= 20: roe_score = 4
            elif self.roe >= 15: roe_score = 3
            elif self.roe >= 10: roe_score = 2
            else: roe_score = 1
        
        # 从profit_summary补充提取ROE
        if not self.roe:
            pt = self.profit_summary.lower()
            m = re.search(r'roe[^\d]*?(\d+\.?\d*)', pt)
            if m:
                roe_val = float(m.group(1))
                if roe_val >= 30: roe_score = 5
                elif roe_val >= 20: roe_score = 4
                elif roe_val >= 15: roe_score = 3
                elif roe_val >= 10: roe_score = 2
            elif '极高' in pt:
                roe_score = 4
        
        score += roe_score
        details.append(f'ROE{roe_score}/5')
        
        # 2. 利润率水平 (5分)
        margin_score = 2
        if self.gross_margin:
            if self.gross_margin >= 70: margin_score = 5
            elif self.gross_margin >= 40: margin_score = 4
            elif self.gross_margin >= 25: margin_score = 3
            elif self.gross_margin >= 15: margin_score = 2
            else: margin_score = 1
        if self.net_margin:
            if self.net_margin >= 30: margin_score = max(margin_score, 4)
            elif self.net_margin >= 15: margin_score = max(margin_score, 3)
        
        # 从profit_summary补充
        if not self.gross_margin and not self.net_margin:
            pt = self.profit_summary.lower()
            m = re.search(r'毛利率(\d+\.?\d*)%', pt)
            if m:
                gm = float(m.group(1))
                if gm >= 70: margin_score = 5
                elif gm >= 40: margin_score = 4
                elif gm >= 25: margin_score = 3
                elif gm >= 15: margin_score = 2
            m = re.search(r'净利率(\d+\.?\d*)%', pt)
            if m:
                nm = float(m.group(1))
                if nm >= 30: margin_score = max(margin_score, 4)
                elif nm >= 15: margin_score = max(margin_score, 3)
        
        score += margin_score
        details.append(f'利润率{margin_score}/5')
        
        # 3. 现金流质量 (5分)
        cash_score = 3
        pt = self.profit_summary.lower()
        
        if any(kw in pt for kw in ['现金流充沛', '现金流充裕', '造血能力优异', '现金流96亿']):
            cash_score = 5
        elif any(kw in pt for kw in ['现金流', '现金储备', '经营现金流']):
            cash_score = 3
        if any(kw in pt for kw in ['现金流承压', '现金流恶化', '应收账款']):
            cash_score = min(cash_score, 2)
        if any(kw in pt for kw in ['现金流严重', '现金流-409', '自由现金流为负']):
            cash_score = 1
        
        # 金融行业现金流天然好
        if any(kw in self.industry for kw in ['银行', '保险']):
            cash_score = max(cash_score, 3)
        
        score += cash_score
        details.append(f'现金流{cash_score}/5')
        
        # 4. 股东回报 (5分)
        return_score = 2
        if self.dividend_yield:
            if self.dividend_yield >= 5: return_score = 5
            elif self.dividend_yield >= 3: return_score = 4
            elif self.dividend_yield >= 1.5: return_score = 3
            elif self.dividend_yield >= 0.5: return_score = 2
            else: return_score = 1
        
        # 从profit_summary/val_summary补充
        if not self.dividend_yield:
            combined = f'{pt} {self.val_summary.lower()}'
            if '分红率' in combined or '高分红' in combined or '分红稳定' in combined:
                return_score = 3
            if '分红比例50%' in combined or '分红率75%' in combined:
                return_score = 4
            if '不分红' in combined:
                return_score = 1
            if '回购' in combined:
                return_score = max(return_score, 2)
        
        score += return_score
        details.append(f'股东回报{return_score}/5')
        
        return score, details
    
    def score_valuation(self):
        """估值安全边际评分 (25分)"""
        score = 0
        details = []
        
        # 1. 历史分位 (10分)
        hist_score = 3
        if self.pe:
            if self.pe <= 8: hist_score = 9
            elif self.pe <= 12: hist_score = 8
            elif self.pe <= 15: hist_score = 7
            elif self.pe <= 20: hist_score = 6
            elif self.pe <= 25: hist_score = 5
            elif self.pe <= 30: hist_score = 4
            elif self.pe <= 40: hist_score = 3
            elif self.pe <= 60: hist_score = 2
            else: hist_score = 1
        
        # PB极低加成
        if self.pb:
            if self.pb < 0.6: hist_score = max(hist_score, 9)
            elif self.pb < 0.8: hist_score = max(hist_score, 8)
            elif self.pb < 1.0: hist_score = max(hist_score, 7)
        
        # 从val_summary提取
        vt = self.val_summary.lower()
        if '深度破净' in vt or '严重破净' in vt: hist_score = max(hist_score, 9)
        elif '破净' in vt: hist_score = max(hist_score, 7)
        if '历史低位' in vt or '极低' in vt: hist_score = max(hist_score, 7)
        if '合理偏低' in vt: hist_score = max(hist_score, 6)
        elif '合理' in vt: hist_score = max(hist_score, 5)
        if '偏高' in vt or '极高' in vt or '泡沫' in vt: hist_score = min(hist_score, 2)
        if '安全边际极高' in vt or '安全边际高' in vt: hist_score = max(hist_score, 7)
        if '安全边际不足' in vt or '缺乏安全边际' in vt: hist_score = min(hist_score, 3)
        
        # 原系统估值评分校准
        if self.orig_val and not self.pe and not self.pb:
            # 没有PE/PB数据时用原评分锚定
            if self.orig_val >= 85: hist_score = max(hist_score, 7)
            elif self.orig_val >= 70: hist_score = max(hist_score, 5)
            elif self.orig_val >= 55: hist_score = max(hist_score, 4)
        
        score += hist_score
        details.append(f'分位{hist_score}/10')
        
        # 2. 相对行业估值 (5分)
        rel_score = 3
        if self.pb:
            if self.pb < 0.8: rel_score = 5
            elif self.pb < 1.0: rel_score = 4
            elif self.pb < 2.0: rel_score = 3
            elif self.pb < 5.0: rel_score = 2
            else: rel_score = 1
        if self.pe:
            if self.pe <= 10: rel_score = max(rel_score, 4)
            elif self.pe <= 15: rel_score = max(rel_score, 3)
            elif self.pe >= 50: rel_score = min(rel_score, 2)
        
        score += rel_score
        details.append(f'行业{rel_score}/5')
        
        # 3. 股东回报率 (5分)
        sh_score = 1
        if self.dividend_yield:
            if self.dividend_yield >= 5: sh_score = 5
            elif self.dividend_yield >= 3: sh_score = 4
            elif self.dividend_yield >= 1.5: sh_score = 3
            elif self.dividend_yield >= 0.5: sh_score = 2
        
        # 从val_summary补充
        if not self.dividend_yield:
            vt = self.val_summary.lower()
            if '股息率4%' in vt or '股息率5%' in vt or '股息率6%' in vt:
                sh_score = 4
            elif '高分红' in vt or '分红稳定' in vt:
                sh_score = 3
        
        score += sh_score
        details.append(f'股回{sh_score}/5')
        
        # 4. 估值与成长匹配度 (5分)
        match_score = 2
        if self.pe and self.profit_growth and self.profit_growth > 0:
            peg = self.pe / self.profit_growth
            if peg < 0.5: match_score = 5
            elif peg < 0.8: match_score = 4
            elif peg < 1.0: match_score = 3
            elif peg < 1.5: match_score = 2
            else: match_score = 1
        
        vt = self.val_summary.lower()
        if '安全边际极高' in vt or '安全边际高' in vt: match_score = max(match_score, 4)
        if '安全边际不足' in vt or '缺乏安全边际' in vt: match_score = min(match_score, 2)
        
        score += match_score
        details.append(f'匹配{match_score}/5')
        
        return score, details
    
    def score_catalyst(self):
        """催化剂评分 (10分)"""
        score = 0
        details = []
        
        ct = self.catalyst_summary.lower()
        vt = self.val_summary.lower()
        combined = f'{ct} {vt}'
        
        # 1. 明确度 (5分)
        clarity_score = 2
        if any(kw in combined for kw in ['ai', '算力', '国产替代', '出海', '提价', '政策']):
            clarity_score = 3
        if any(kw in combined for kw in ['爆发', '放量', '拐点', '投产', '新品', '订单', '产能释放']):
            clarity_score = 4
        if any(kw in combined for kw in ['明确', '确定性强', '明牌']):
            clarity_score = 5
        if any(kw in combined for kw in ['尚不明确', '暂无重大', '短期无']):
            clarity_score = min(clarity_score, 2)
        
        score += clarity_score
        details.append(f'明确{clarity_score}/5')
        
        # 2. 兑现概率 (5分)
        prob_score = 2
        if any(kw in combined for kw in ['订单', '产能', '投产', '已确认', '落地']):
            prob_score = 3
        if any(kw in combined for kw in ['路线图', '已验证', '趋势', '需求']):
            prob_score = 3
        if any(kw in combined for kw in ['政策支持', '行业趋势', '渗透率']):
            prob_score = max(prob_score, 3)
        
        score += prob_score
        details.append(f'概率{prob_score}/5')
        
        return score, details
    
    def score_risks(self):
        """风险扣分 (0~-15)"""
        risk_deduction = 0
        risks = []
        
        analysis = self.c.get('analysis', {})
        risk_warnings = str(analysis.get('riskWarning', '')) + str(analysis.get('risks', ''))
        risk_text = risk_warnings.lower()
        pt = self.profit_summary.lower()
        vt = self.val_summary.lower()
        mt = self.moat_summary.lower()
        gt = self.growth_summary.lower()
        
        # 1. 财务风险 (0~-5)
        fin_risk = 0
        if '现金流严重' in pt or '现金流恶化' in pt or '现金流-409' in pt:
            fin_risk += 3
        elif '现金流承压' in pt:
            fin_risk += 1
        if '应收' in pt and ('增加' in pt or '延长' in pt or '+47' in pt):
            fin_risk += 1
        if self.roe and self.roe < 5:
            fin_risk += 1
        if '利息收入占比88.5%' in pt or '结构单一' in pt:
            fin_risk += 1
        if '减值' in pt and ('69亿' in pt or '侵蚀' in pt):
            fin_risk += 1
        
        if fin_risk > 0:
            fin_risk = min(fin_risk, 4)
            risk_deduction -= fin_risk
            risks.append(f'财务-{fin_risk}')
        
        # 2. 行业风险 (0~-4)
        ind_risk = 0
        if any(kw in self.industry for kw in ['房地产']):
            ind_risk += 3
        elif any(kw in self.industry for kw in ['半导体', '电子']):
            ind_risk += 2
        elif any(kw in self.industry for kw in ['化工', '有色', '钢铁', '建材']):
            ind_risk += 2
        
        if '周期' in risk_text or '周期性' in mt:
            ind_risk += 1
        if '出口管制' in risk_text or '地缘' in risk_text:
            ind_risk += 2
        
        if ind_risk > 0:
            ind_risk = min(ind_risk, 4)
            risk_deduction -= ind_risk
            risks.append(f'行业-{ind_risk}')
        
        # 3. 竞争风险 (0~-3)
        comp_risk = 0
        if '价格战' in risk_text or '价格战' in gt:
            comp_risk += 2
        if '替代' in risk_text or '追赶' in risk_text:
            comp_risk += 1
        if '竞争加剧' in risk_text:
            comp_risk += 1
        
        if comp_risk > 0:
            comp_risk = min(comp_risk, 3)
            risk_deduction -= comp_risk
            risks.append(f'竞争-{comp_risk}')
        
        # 4. 增长放缓风险 (0~-2)
        if '增速放缓' in gt or '增速五年最低' in gt or '首次下滑' in gt:
            risk_deduction -= 1
            risks.append('增速放缓-1')
        if '大幅下滑' in gt or '负增长' in gt or '下滑' in gt:
            risk_deduction -= 1
            risks.append('业绩下滑-1')
        
        return risk_deduction, risks
    
    def score_all(self):
        moat_score, moat_details = self.score_moat()
        growth_score, growth_details = self.score_growth()
        profit_score, profit_details = self.score_profitability()
        val_score, val_details = self.score_valuation()
        catalyst_score, catalyst_details = self.score_catalyst()
        risk_deduction, risk_details = self.score_risks()
        
        total = moat_score + growth_score + profit_score + val_score + catalyst_score + risk_deduction
        total = max(total, 0)  # 最低0分
        
        # 评级
        if total >= 80: grade = 'S'
        elif total >= 70: grade = 'A'
        elif total >= 60: grade = 'B'
        elif total >= 50: grade = 'C'
        elif total >= 40: grade = 'D'
        else: grade = 'E'
        
        return {
            'name': self.name,
            'code': self.c.get('code', ''),
            'industry': self.industry,
            'v21_total': total,
            'v21_grade': grade,
            'v21_moat': moat_score,
            'v21_growth': growth_score,
            'v21_profit': profit_score,
            'v21_valuation': val_score,
            'v21_catalyst': catalyst_score,
            'v21_risk': risk_deduction,
            'v21_details': {
                'moat': moat_details,
                'growth': growth_details,
                'profit': profit_details,
                'valuation': val_details,
                'catalyst': catalyst_details,
                'risk': risk_details,
            },
            'orig_score': self.c.get('score'),
            'orig_grade': self.c.get('grade'),
            'pe': self.pe,
            'pb': self.pb,
            'roe': self.roe,
            'dividend_yield': self.dividend_yield,
        }


def main():
    with open('src/data/companies.json', 'r') as f:
        data = json.load(f)
    
    a50 = [c for c in data if c.get('isA50') == True]
    
    results = []
    for c in a50:
        name = c.get('name', '')
        
        # 已手动评分的4家用手动数据
        if name in MANUAL_V21:
            m = MANUAL_V21[name]
            result = {
                'name': name,
                'code': c.get('code', ''),
                'industry': c.get('industry', '') or c.get('swIndustry', ''),
                'v21_total': m['total'],
                'v21_grade': m['grade'],
                'v21_moat': m['moat'],
                'v21_growth': m['growth'],
                'v21_profit': m['profit'],
                'v21_valuation': m['valuation'],
                'v21_catalyst': m['catalyst'],
                'v21_risk': m['risk'],
                'v21_details': {'moat': [], 'growth': [], 'profit': [], 'valuation': [], 'catalyst': [], 'risk': []},
                'orig_score': c.get('score'),
                'orig_grade': c.get('grade'),
                'pe': parse_pe((c.get('analysis', {}).get('financials', {}) or {}).get('PE', '')),
                'pb': parse_pb((c.get('analysis', {}).get('financials', {}) or {}).get('PB', '')),
                'roe': parse_pct(str((c.get('analysis', {}).get('financials', {}) or {}).get('ROE', ''))),
                'dividend_yield': parse_pct(str((c.get('analysis', {}).get('financials', {}) or {}).get('股息率', ''))),
                'manual': True,
            }
            results.append(result)
            print(f'MANUAL: {name:8s} | v2.1={result["v21_total"]:3d}({result["v21_grade"]}) | 原={result["orig_score"]}({result["orig_grade"]})')
            continue
        
        scorer = V21Scorer(c)
        result = scorer.score_all()
        results.append(result)
        
        print(f'{result["name"]:8s} | v2.1={result["v21_total"]:3d}({result["v21_grade"]}) | '
              f'护城河{result["v21_moat"]:2d}/25 成长{result["v21_growth"]:2d}/20 '
              f'盈利{result["v21_profit"]:2d}/20 估值{result["v21_valuation"]:2d}/25 '
              f'催化{result["v21_catalyst"]:2d}/10 风险{result["v21_risk"]:3d} | '
              f'原={result["orig_score"]}({result["orig_grade"]}) | '
              f'PE={result["pe"]} PB={result["pb"]} ROE={result["roe"]}')
    
    # Save results
    with open('v21_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # Summary
    print('\n' + '='*80)
    print('v2.1模型 全部50家A50成分股评分汇总')
    print('='*80)
    
    grade_dist = {}
    for r in results:
        g = r['v21_grade']
        grade_dist[g] = grade_dist.get(g, 0) + 1
    
    print(f'评分公司数: {len(results)}')
    print(f'评级分布: {dict(sorted(grade_dist.items()))}')
    
    # 完整排序
    sorted_results = sorted(results, key=lambda x: x['v21_total'], reverse=True)
    
    print('\n完整排名（v2.1评分从高到低）：')
    print(f'{"排名":>4s} {"公司":8s} {"v2.1":>5s} {"级":>3s} | {"护城河":>4s} {"成长":>4s} {"盈利":>4s} {"估值":>4s} {"催化":>4s} {"风险":>4s} | {"原分":>4s} {"原级":>3s} | {"差值":>4s}')
    print('-'*90)
    for i, r in enumerate(sorted_results):
        diff = r['v21_total'] - (r['orig_score'] or 0)
        orig_s = str(r['orig_score']) if r['orig_score'] else 'N/A'
        orig_g = str(r['orig_grade']) if r['orig_grade'] else ''
        print(f'{i+1:4d}. {r["name"]:8s} {r["v21_total"]:5d} {r["v21_grade"]:>3s} | '
              f'{r["v21_moat"]:4d} {r["v21_growth"]:4d} {r["v21_profit"]:4d} {r["v21_valuation"]:4d} {r["v21_catalyst"]:4d} {r["v21_risk"]:4d} | '
              f'{orig_s:>4s} {orig_g:>3s} | {diff:+4d}')
    
    # 分维度平均
    print('\n分维度平均分：')
    avg_moat = sum(r['v21_moat'] for r in results) / len(results)
    avg_growth = sum(r['v21_growth'] for r in results) / len(results)
    avg_profit = sum(r['v21_profit'] for r in results) / len(results)
    avg_val = sum(r['v21_valuation'] for r in results) / len(results)
    avg_cat = sum(r['v21_catalyst'] for r in results) / len(results)
    avg_risk = sum(r['v21_risk'] for r in results) / len(results)
    avg_total = sum(r['v21_total'] for r in results) / len(results)
    avg_orig = sum(r['orig_score'] for r in results if r['orig_score']) / sum(1 for r in results if r['orig_score'])
    
    print(f'  护城河: {avg_moat:.1f}/25 ({avg_moat/25*100:.0f}%)')
    print(f'  成长性: {avg_growth:.1f}/20 ({avg_growth/20*100:.0f}%)')
    print(f'  盈利质量: {avg_profit:.1f}/20 ({avg_profit/20*100:.0f}%)')
    print(f'  估值安全边际: {avg_val:.1f}/25 ({avg_val/25*100:.0f}%)')
    print(f'  催化剂: {avg_cat:.1f}/10 ({avg_cat/10*100:.0f}%)')
    print(f'  风险扣分: {avg_risk:.1f}')
    print(f'  综合均分: {avg_total:.1f} (原系统均分: {avg_orig:.1f})')
    
    # 差值最大
    print('\n原系统 vs v2.1 差值最大（降分最多）：')
    diff_list = [(r['name'], r['v21_total'] - (r['orig_score'] or 0)) for r in results]
    diff_list.sort(key=lambda x: x[1])
    for name, diff in diff_list[:10]:
        print(f'  {name}: {diff:+d}')

if __name__ == '__main__':
    main()
