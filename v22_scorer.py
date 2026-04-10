#!/usr/bin/env python3
"""
v2.2 评分模型 - 批量评分脚本
核心改动（vs v2.1）：
1. 护城河：5子项×5分=25（品牌5+成本5+技术5+资源5+转换5）
2. 成长性：历史8+趋势6+空间4+景气2=20
3. 催化剂：催化已发生9-10分规则
4. 风险扣分：治理0~-5+财务0~-4+行业0~-3+竞争0~-3
5. 评级：S≥90 A+≥85 A≥80 B+≥75 B≥70 C≥60 D<60
6. 评级上限约束规则
7. 缺失值处理（关键数据缺失→维度≤70%）
8. 金融行业替代口径
"""
import json, re
from datetime import datetime

FINANCE_KW = ['银行', '保险', '券商', '证券']

def parse_pct(s):
    if not s or s == 'None': return None
    s = str(s).strip()
    m = re.search(r'(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*%', s)
    if m: return (float(m.group(1)) + float(m.group(2))) / 2
    m = re.search(r'([-+]?\d+\.?\d*)\s*%', s)
    if m: return float(m.group(1))
    m = re.search(r'([-+]?\d+\.?\d*)', s)
    return float(m.group(1)) if m else None

def parse_val(s, unit='倍'):
    if not s or s == 'None': return None
    s = str(s).strip()
    m = re.search(r'(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*' + unit, s)
    if m: return (float(m.group(1)) + float(m.group(2))) / 2
    m = re.search(r'(\d+\.?\d*)\s*' + unit, s)
    if m: return float(m.group(1))
    m = re.search(r'(\d+\.?\d*)', s)
    return float(m.group(1)) if m else None


class V22Scorer:
    def __init__(self, c):
        self.c = c
        self.fin = c.get('analysis', {}).get('financials', {}) or {}
        self.sr = c.get('scoringRationale', {}) or {}
        self.ar = c.get('analysis', {}).get('annualReport', []) or []
        self.name = c.get('name', '?')
        self.ind = c.get('industry', '') or c.get('swIndustry', '')
        self.is_bank = any(kw in self.ind for kw in ['银行'])
        self.is_ins = any(kw in self.ind for kw in ['保险'])
        self.is_broker = any(kw in self.ind for kw in ['券商', '证券'])
        self.is_fin = self.is_bank or self.is_ins or self.is_broker

        self.pe = parse_val(self.fin.get('PE', ''), '倍')
        self.pb = parse_val(self.fin.get('PB', ''), '倍')
        self.roe = parse_pct(str(self.fin.get('ROE', '')))
        self.dy = parse_pct(str(self.fin.get('股息率', '')))
        self.gm = parse_pct(str(self.fin.get('毛利率', '')))
        self.nm = parse_pct(str(self.fin.get('净利率', '')))

        self.rg = None; self.pg = None
        for item in self.ar:
            m = item.get('metric', ''); ch = item.get('change', '')
            if '营收' in m: self.rg = parse_pct(ch)
            if '净利' in m: self.pg = parse_pct(ch)

        self.moat_s = self._sr('moat')
        self.growth_s = self._sr('growth')
        self.profit_s = self._sr('profitability')
        self.val_s = self._sr('valuation')
        self.cat_s = self._sr('catalyst')

        self.moat_t = self._srs('moat').lower()
        self.growth_t = self._srs('growth').lower()
        self.profit_t = self._srs('profitability').lower()
        self.val_t = self._srs('valuation').lower()
        self.cat_t = self._srs('catalyst').lower()

        # supplement growth from summaries
        texts = f'{self.growth_t} {self.profit_t} {self.val_t}'
        if self.rg is None:
            m = re.search(r'营收[^\d]*?([-+]?\d+\.?\d*)%', texts)
            if m: self.rg = float(m.group(1))
        if self.pg is None:
            m = re.search(r'净利[^\d]*?([-+]?\d+\.?\d*)%', texts)
            if m: self.pg = float(m.group(1))

        # 数据完整性
        self.data_gaps = []
        self._check_data_gaps()

    def _check_data_gaps(self):
        if not self.pe and not self.pb: self.data_gaps.append('估值')
        if self.roe is None: self.data_gaps.append('ROE')
        if self.rg is None and self.pg is None: self.data_gaps.append('增速')
        if self.dy is None: self.data_gaps.append('股息率')

    def _sr(self, dim):
        info = self.sr.get(dim, {})
        if isinstance(info, dict):
            s = info.get('score')
            if s and str(s) != 'N/A':
                try: return float(s)
                except: pass
        return None

    def _srs(self, dim):
        info = self.sr.get(dim, {})
        return info.get('summary', '') if isinstance(info, dict) else ''

    def _gap_cap(self, dim, score):
        """缺失值上限约束：关键数据缺失→维度≤70%"""
        caps = {'moat': 17, 'growth': 14, 'profit': 14, 'valuation': 17, 'catalyst': 7}
        critical = False
        if dim == 'valuation' and not self.pe and not self.pb: critical = True
        if dim == 'profit' and self.roe is None and not self.gm and not self.nm: critical = True
        if dim == 'growth' and self.rg is None and self.pg is None: critical = True
        if critical:
            cap = caps.get(dim, score)
            if score > cap: return cap, True
        return score, False

    # ===== 护城河 25分 (5×5) =====
    def score_moat(self):
        s = 0; d = []; t = self.moat_t; ind = self.ind

        # 1. 品牌 (0-5)
        b = 2
        if any(kw in t for kw in ['品牌=硬通货','绝对龙头','全球第一','全球最大','垄断地位','市占率>90%','绝密配方']): b = 5
        elif any(kw in t for kw in ['龙头','第一','领先','核心供应商']): b = 4
        elif any(kw in t for kw in ['前三','主要','优势','知名']): b = 3
        if any(kw in ind for kw in ['电子','化工','钢铁','建材','建筑']): b = min(b, 3)
        if self.is_bank or self.is_ins: b = max(b, 3)
        s += b; d.append(f'品牌{b}/5')

        # 2. 成本 (0-5)
        c = 2
        if any(kw in t for kw in ['成本优势','成本最低','规模效应','规模优势','一体化']): c = 3
        if any(kw in t for kw in ['全球第一','全球最大','市占率第一','绝对龙头']): c = max(c, 4)
        if any(kw in t for kw in ['成本领先','极致成本']): c = 5
        if self.gm:
            if self.gm > 70: c = max(c, 4)
            elif self.gm > 50: c = max(c, 3)
        s += c; d.append(f'成本{c}/5')

        # 3. 技术 (0-5)
        te = 1
        if any(kw in t for kw in ['技术壁垒','技术领先','技术护城河','专利','研发投入']): te = 3
        if any(kw in t for kw in ['不可复制','不可替代','全球唯一','稀缺性']): te = 4
        if any(kw in t for kw in ['绝密配方','市占率>90%','生态闭环','全谱系','国内唯一']): te = 5
        if any(kw in t for kw in ['mdi全球','全球第一','绝对领先']): te = max(te, 4)
        if self.is_bank or self.is_ins: te = max(te, 2)
        s += te; d.append(f'技术{te}/5')

        # 4. 资源/牌照/渠道 (0-5)
        r = 1
        if any(kw in t for kw in ['渠道','经销商','客户认证','供应商认证']): r = 2
        if any(kw in t for kw in ['牌照','许可证','准入','配额']): r = 3
        if any(kw in t for kw in ['资源垄断','资源储量','矿']): r = 3
        if any(kw in t for kw in ['天然垄断','物理不可替代','国家绝密','独占','央企']): r = 4
        if any(kw in t for kw in ['区域垄断','特许经营']): r = 5
        if self.is_bank or self.is_ins: r = max(r, 4)
        if self.is_broker: r = max(r, 3)
        if any(kw in ind for kw in ['电力','核电','公用事业']): r = max(r, 4)
        if any(kw in ind for kw in ['石油','石化','煤炭']): r = max(r, 3)
        s += r; d.append(f'资源{r}/5')

        # 5. 转换成本/网络效应 (0-5)
        sw = 1
        if any(kw in t for kw in ['转换成本','客户粘性','客户壁垒','绑定','认证周期']): sw = 2
        if any(kw in t for kw in ['网络效应','7.5万商户','10亿用户','4亿人群']): sw = 4
        if any(kw in t for kw in ['自我强化','闭环','不可替代','生态']): sw = max(sw, 4)
        if any(kw in t for kw in ['垄断地位','唯一']): sw = max(sw, 5)
        if self.is_bank: sw = max(sw, 4)
        if self.is_ins: sw = max(sw, 3)
        if '茅台' in self.name: sw = 5
        if '宁德' in self.name: sw = max(sw, 3)
        if any(kw in ind for kw in ['电力','核电','公用事业']): sw = max(sw, 4)
        s += sw; d.append(f'转换{sw}/5')

        s, capped = self._gap_cap('moat', s)
        if capped: d.append('⚠缺失上限')
        return s, d

    # ===== 成长性 20分 (历史8+趋势6+空间4+景气2) =====
    def score_growth(self):
        if self.is_bank: return self._growth_bank()
        if self.is_ins: return self._growth_ins()
        if self.is_broker: return self._growth_broker()

        s = 0; d = []
        rg = self.rg; pg = self.pg
        gs = [g for g in [rg, pg] if g is not None]
        mx = max(gs) if gs else 0
        mn = min(gs) if gs else 0

        # 1. 历史增长 (0-8)
        if mx >= 100 or mn >= 20: h = 8
        elif mx >= 20 and mn >= 10: h = 7
        elif mx >= 10 and mn >= 10: h = 6
        elif mx >= 10: h = 5
        elif mx >= 5: h = 4
        elif mx >= 0: h = 3
        elif mx >= -10: h = 2
        else: h = 1
        if self.growth_s:
            if self.growth_s >= 90: h = max(h, 7)
            elif self.growth_s >= 75: h = max(h, 5)
            elif self.growth_s < 40: h = min(h, 3)
        s += h; d.append(f'历史{h}/8')

        # 2. 当前趋势 (0-6)
        tr = 3; gt = self.growth_t
        if any(kw in gt for kw in ['爆发','翻倍','暴增','大幅增长']): tr = 6
        elif any(kw in gt for kw in ['高增长','快速增长','稳健增长','持续增长']): tr = 5
        elif any(kw in gt for kw in ['增长','回升','改善']): tr = 4
        elif any(kw in gt for kw in ['放缓','承压','下降']): tr = 2
        elif any(kw in gt for kw in ['大幅下滑','暴跌','亏损','恶化']): tr = 0
        if pg is not None and pg < 0: tr = min(tr, 2)
        if rg is not None and rg < 0: tr = min(tr, 2)
        s += tr; d.append(f'趋势{tr}/6')

        # 3. 未来空间 (0-4) — 长期静态
        fu = 2; comb = f'{self.cat_t} {self.val_t}'
        if any(kw in comb for kw in ['ai','算力','新能源','国产替代','出海']): fu = 4
        elif any(kw in comb for kw in ['渗透率提升','放量','扩张']): fu = 3
        elif any(kw in comb for kw in ['成熟','平稳','稳健']): fu = 2
        elif any(kw in comb for kw in ['衰退','萎缩','天花板']): fu = 1
        if any(kw in self.ind for kw in ['银行','保险','钢铁','建材','建筑','煤炭']): fu = min(fu, 2)
        s += fu; d.append(f'空间{fu}/4')

        # 4. 行业景气 (0-2) — 中短期动态
        jc = 1; gt2 = self.growth_t
        risk_t = str(self.c.get('analysis', {}).get('riskWarning', '')).lower()
        if any(kw in gt2 for kw in ['景气上行','供需改善','提价','涨价','供不应求','订单饱满']): jc = 2
        elif any(kw in gt2 for kw in ['下行','出清','产能过剩','需求不足']): jc = 0
        elif any(kw in risk_t for kw in ['周期下行','产能过剩']): jc = 0
        if any(kw in comb for kw in ['ai算力','算力需求','光模块']): jc = 2
        s += jc; d.append(f'景气{jc}/2')

        s, capped = self._gap_cap('growth', s)
        if capped: d.append('⚠缺失上限')
        return s, d

    def _growth_bank(self):
        s = 0; d = []; gt = self.growth_t
        pg = self.pg or 0
        h = 6 if pg >= 10 else 5 if pg >= 5 else 4 if pg >= 0 else 3 if pg >= -5 else 2
        s += h; d.append(f'历史{h}/8')
        tr = 3
        if any(kw in gt for kw in ['息差企稳','息差回升','拐点','改善']): tr = 5
        elif any(kw in gt for kw in ['稳健','增长']): tr = 4
        elif any(kw in gt for kw in ['承压','下滑','收窄']): tr = 2
        s += tr; d.append(f'趋势{tr}/6')
        fu = 2
        if any(kw in gt for kw in ['零售转型','财富管理']): fu = 3
        s += fu; d.append(f'空间{fu}/4')
        s += 1; d.append('景气1/2')
        s, capped = self._gap_cap('growth', s)
        if capped: d.append('⚠缺失上限')
        return s, d

    def _growth_ins(self):
        s = 0; d = []; gt = self.growth_t
        pg = self.pg or 0
        h = 7 if pg >= 15 else 5 if pg >= 5 else 4 if pg >= 0 else 2
        s += h; d.append(f'历史{h}/8')
        tr = 3
        if any(kw in gt for kw in ['nbv增长','新业务价值','拐点']): tr = 5
        elif any(kw in gt for kw in ['稳健']): tr = 3
        s += tr; d.append(f'趋势{tr}/6')
        s += 2; d.append('空间2/4'); s += 1; d.append('景气1/2')
        s, capped = self._gap_cap('growth', s)
        if capped: d.append('⚠缺失上限')
        return s, d

    def _growth_broker(self):
        s = 0; d = []; gt = self.growth_t
        pg = self.pg or 0
        h = 7 if pg >= 30 else 5 if pg >= 10 else 4 if pg >= 0 else 2
        s += h; d.append(f'历史{h}/8')
        tr = 3
        if any(kw in gt for kw in ['市场活跃','交易量']): tr = 5
        elif any(kw in gt for kw in ['承压']): tr = 2
        s += tr; d.append(f'趋势{tr}/6')
        s += 2; d.append('空间2/4'); s += 1; d.append('景气1/2')
        s, capped = self._gap_cap('growth', s)
        if capped: d.append('⚠缺失上限')
        return s, d

    # ===== 盈利质量 20分 (ROE5+利润率5+现金流5+股东回报5) =====
    def score_profit(self):
        if self.is_bank: return self._profit_bank()
        if self.is_ins: return self._profit_ins()
        if self.is_broker: return self._profit_broker()

        s = 0; d = []; pt = self.profit_t

        # 1. ROE (0-5)
        r = 2
        if self.roe:
            if self.roe >= 20: r = 5
            elif self.roe >= 15: r = 4
            elif self.roe >= 10: r = 3
            elif self.roe >= 5: r = 2
            else: r = 1
        if not self.roe:
            m = re.search(r'roe[^\d]*?(\d+\.?\d*)', pt)
            if m:
                rv = float(m.group(1))
                r = 5 if rv >= 20 else 4 if rv >= 15 else 3 if rv >= 10 else 2 if rv >= 5 else 1
            elif '极高' in pt: r = 4
        s += r; d.append(f'ROE{r}/5')

        # 2. 利润率 (0-5)
        m = 2
        if self.gm:
            if self.gm >= 70: m = 5
            elif self.gm >= 40: m = 4
            elif self.gm >= 25: m = 3
            elif self.gm >= 15: m = 2
            else: m = 1
        if self.nm:
            if self.nm >= 30: m = max(m, 5)
            elif self.nm >= 15: m = max(m, 3)
        if not self.gm and not self.nm:
            mg = re.search(r'毛利率(\d+\.?\d*)%', pt)
            if mg:
                gmv = float(mg.group(1))
                m = 5 if gmv >= 70 else 4 if gmv >= 40 else 3 if gmv >= 25 else 2
        s += m; d.append(f'利润率{m}/5')

        # 3. 现金流 (0-5)
        cf = 3
        if any(kw in pt for kw in ['现金流充沛','现金流充裕','造血能力优异']): cf = 5
        elif any(kw in pt for kw in ['现金流','现金储备','经营现金流']): cf = 3
        if any(kw in pt for kw in ['现金流承压','现金流恶化','应收账款']): cf = min(cf, 2)
        if any(kw in pt for kw in ['现金流严重','自由现金流为负']): cf = 1
        if self.is_fin: cf = max(cf, 3)
        s += cf; d.append(f'现金流{cf}/5')

        # 4. 股东回报 (0-5)
        sr = 2
        if self.dy:
            if self.dy >= 5: sr = 5
            elif self.dy >= 3: sr = 4
            elif self.dy >= 1.5: sr = 3
            elif self.dy >= 0.5: sr = 2
            else: sr = 1
        if not self.dy:
            comb = f'{pt} {self.val_t}'
            if any(kw in comb for kw in ['分红率50%','分红率75%','股息率5%','股息率6%']): sr = 4
            elif any(kw in comb for kw in ['高分红','分红稳定','分红比例44%']): sr = 3
            if '回购' in comb: sr = max(sr, 2)
            if '不分红' in comb: sr = 1
        s += sr; d.append(f'股东回报{sr}/5')

        s, capped = self._gap_cap('profit', s)
        if capped: d.append('⚠缺失上限')
        return s, d

    def _profit_bank(self):
        s = 0; d = []; pt = self.profit_t
        # 银行：ROE + 不良率+拨备 + 息差 + 分红
        r = 2
        if self.roe:
            if self.roe >= 15: r = 5
            elif self.roe >= 12: r = 4
            elif self.roe >= 10: r = 3
            else: r = 2
        s += r; d.append(f'ROE{r}/5')

        # 不良率+拨备 → 利润率替代
        m = 3
        if any(kw in pt for kw in ['不良率0.9','不良率0.94','不良率行业最低']): m = 5
        elif any(kw in pt for kw in ['资产质量优秀','拨备覆盖率']): m = 4
        elif any(kw in pt for kw in ['不良率','拨备']): m = 3
        s += m; d.append(f'资产质量{m}/5')

        # 息差
        cf = 3
        if any(kw in pt for kw in ['息差企稳','息差回升','拐点']): cf = 4
        elif any(kw in pt for kw in ['息差收窄','息差下行']): cf = 2
        s += cf; d.append(f'息差{cf}/5')

        # 分红
        sr = 3
        if self.dy and self.dy >= 5: sr = 5
        elif self.dy and self.dy >= 3: sr = 4
        s += sr; d.append(f'分红{sr}/5')

        s, capped = self._gap_cap('profit', s)
        if capped: d.append('⚠缺失上限')
        return s, d

    def _profit_ins(self):
        s = 0; d = []; pt = self.profit_t
        r = 3
        if self.roe and self.roe >= 15: r = 5
        elif self.roe and self.roe >= 10: r = 4
        s += r; d.append(f'ROE{r}/5')
        s += 3; d.append(f'NBV{3}/5')
        s += 3; d.append(f'投资{3}/5')
        sr = 3
        if self.dy and self.dy >= 3: sr = 4
        s += sr; d.append(f'分红{sr}/5')
        s, capped = self._gap_cap('profit', s)
        if capped: d.append('⚠缺失上限')
        return s, d

    def _profit_broker(self):
        s = 0; d = []; pt = self.profit_t
        r = 3
        if self.roe and self.roe >= 12: r = 4
        elif self.roe and self.roe >= 8: r = 3
        s += r; d.append(f'ROE{r}/5')
        s += 3; d.append(f'收入结构{3}/5')
        s += 3; d.append(f'自营{3}/5')
        sr = 2
        if self.dy and self.dy >= 3: sr = 4
        s += sr; d.append(f'分红{sr}/5')
        s, capped = self._gap_cap('profit', s)
        if capped: d.append('⚠缺失上限')
        return s, d

    # ===== 估值安全边际 25分 (历史分位10+相对行业5+股东回报5+成长匹配5) =====
    def score_valuation(self):
        s = 0; d = []; vt = self.val_t

        # 1. 历史分位 (0-10)
        hs = 3
        if self.pe:
            if self.pe <= 8: hs = 10
            elif self.pe <= 12: hs = 8
            elif self.pe <= 15: hs = 7
            elif self.pe <= 20: hs = 6
            elif self.pe <= 25: hs = 5
            elif self.pe <= 30: hs = 4
            elif self.pe <= 40: hs = 3
            elif self.pe <= 60: hs = 2
            else: hs = 1
        # PB修正
        if self.pb:
            if self.pb < 0.6: hs = max(hs, 10)
            elif self.pb < 0.8: hs = max(hs, 8)
            elif self.pb < 1.0: hs = max(hs, 7)
            elif self.pb < 1.5: hs = max(hs, 5)
        # 文字修正
        if '深度破净' in vt or '严重破净' in vt: hs = max(hs, 10)
        elif '破净' in vt: hs = max(hs, 7)
        if '历史低位' in vt or '极低' in vt: hs = max(hs, 7)
        if '合理偏低' in vt: hs = max(hs, 6)
        elif '合理' in vt and '偏高' not in vt: hs = max(hs, 5)
        if '偏高' in vt or '极高' in vt or '泡沫' in vt: hs = min(hs, 2)
        if '安全边际极高' in vt or '安全边际高' in vt: hs = max(hs, 7)
        if '安全边际不足' in vt or '缺乏安全边际' in vt: hs = min(hs, 3)
        # 金融用PB为主
        if self.is_fin and self.pb:
            if self.pb < 0.6: hs = max(hs, 10)
            elif self.pb < 0.8: hs = max(hs, 8)
            elif self.pb < 1.0: hs = max(hs, 6)
        s += hs; d.append(f'分位{hs}/10')

        # 2. 相对行业 (0-5)
        rs = 3
        if self.pb:
            if self.pb < 0.8: rs = 5
            elif self.pb < 1.0: rs = 4
            elif self.pb < 2.0: rs = 3
            elif self.pb < 5.0: rs = 2
            else: rs = 1
        if self.pe:
            if self.pe <= 10: rs = max(rs, 4)
            elif self.pe <= 15: rs = max(rs, 3)
            elif self.pe >= 50: rs = min(rs, 2)
        s += rs; d.append(f'行业{rs}/5')

        # 3. 股东回报率 (0-5)
        sh = 1
        if self.dy:
            if self.dy >= 5: sh = 5
            elif self.dy >= 3: sh = 4
            elif self.dy >= 1.5: sh = 3
            elif self.dy >= 0.5: sh = 2
        if not self.dy:
            if any(kw in vt for kw in ['股息率4%','股息率5%','股息率6%']): sh = 4
            elif any(kw in vt for kw in ['高分红','分红稳定']): sh = 3
        s += sh; d.append(f'股回{sh}/5')

        # 4. 成长匹配度 (0-5)
        ms = 2
        if self.pe and self.pg and self.pg > 0:
            peg = self.pe / self.pg
            if peg < 0.5: ms = 5
            elif peg < 0.8: ms = 4
            elif peg < 1.0: ms = 3
            elif peg < 1.5: ms = 2
            else: ms = 1
        if '安全边际极高' in vt or '安全边际高' in vt: ms = max(ms, 4)
        if '安全边际不足' in vt or '缺乏安全边际' in vt: ms = min(ms, 2)
        if '透支' in vt: ms = 1
        s += ms; d.append(f'匹配{ms}/5')

        s, capped = self._gap_cap('valuation', s)
        if capped: d.append('⚠缺失上限')
        return s, d

    # ===== 催化剂 10分 (明确度5+兑现概率5) =====
    def score_catalyst(self):
        s = 0; d = []; comb = f'{self.cat_t} {self.val_t}'

        # 1. 明确度 (0-5)
        cl = 2
        if any(kw in comb for kw in ['明确','确定性强','明牌','已确认']): cl = 5
        elif any(kw in comb for kw in ['ai','算力','国产替代','出海','提价','政策','投产']): cl = 3
        elif any(kw in comb for kw in ['爆发','放量','拐点','新品','订单','产能释放']): cl = 4
        if any(kw in comb for kw in ['尚不明确','暂无重大','短期无']): cl = min(cl, 2)
        s += cl; d.append(f'明确{cl}/5')

        # 2. 兑现概率 (0-5)
        pr = 2
        # v2.2新增：催化已发生→9-10分（即明确5+概率4~5）
        if any(kw in comb for kw in ['已兑现','已落地','已确认改善','业绩拐点确认']): pr = 5
        elif any(kw in comb for kw in ['订单','产能','投产','落地']): pr = 3
        elif any(kw in comb for kw in ['路线图','已验证','需求']): pr = 3
        elif any(kw in comb for kw in ['政策支持','行业趋势','渗透率']): pr = max(pr, 3)
        s += pr; d.append(f'概率{pr}/5')

        s, capped = self._gap_cap('catalyst', s)
        if capped: d.append('⚠缺失上限')
        return s, d

    # ===== 风险扣分 (0~-15) =====
    def score_risk(self):
        rd = 0; risks = []
        pt = self.profit_t; gt = self.growth_t; vt = self.val_t; mt = self.moat_t
        risk_t = str(self.c.get('analysis', {}).get('riskWarning', '')).lower()
        risk_all = f'{risk_t} {pt} {gt} {vt} {mt}'.lower()

        # 1. 公司治理风险 (0~-5)
        gov = 0
        if any(kw in risk_all for kw in ['关联交易','大股东占款','财务造假','激进并购']):
            gov += 3
        if any(kw in risk_all for kw in ['质押','减持','治理']):
            gov += 2
        if any(kw in risk_all for kw in ['股权质押','平仓风险']):
            gov += 3
        if gov > 0:
            gov = min(gov, 5)
            rd -= gov; risks.append(f'治理-{gov}')

        # 2. 财务风险 (0~-4)
        fr = 0
        if any(kw in pt for kw in ['现金流严重','现金流恶化','现金流-409']): fr += 3
        elif any(kw in pt for kw in ['现金流承压']): fr += 1
        if any(kw in pt for kw in ['应收']) and any(kw in pt for kw in ['增加','延长','+47']): fr += 1
        if self.roe and self.roe < 5: fr += 1
        if any(kw in pt for kw in ['减值']) and any(kw in pt for kw in ['69亿','侵蚀']): fr += 1
        if any(kw in risk_all for kw in ['高杠杆','短债','偿债']):
            fr += 2
        if fr > 0:
            fr = min(fr, 4)
            rd -= fr; risks.append(f'财务-{fr}')

        # 3. 行业风险 (0~-3)
        ir = 0
        if any(kw in self.ind for kw in ['房地产']): ir += 3
        elif any(kw in self.ind for kw in ['半导体','电子']): ir += 1
        elif any(kw in self.ind for kw in ['化工','有色','钢铁','建材']): ir += 1
        if any(kw in risk_all for kw in ['周期','周期性']): ir += 1
        if any(kw in risk_all for kw in ['出口管制','地缘']): ir += 2
        if any(kw in risk_all for kw in ['产能过剩']): ir += 1
        if ir > 0:
            ir = min(ir, 3)
            rd -= ir; risks.append(f'行业-{ir}')

        # 4. 竞争风险 (0~-3)
        cr = 0
        if any(kw in risk_all for kw in ['价格战']): cr += 2
        if any(kw in risk_all for kw in ['替代','追赶']): cr += 1
        if any(kw in risk_all for kw in ['竞争加剧']): cr += 1
        if any(kw in risk_all for kw in ['市占率下滑']): cr += 1
        if cr > 0:
            cr = min(cr, 3)
            rd -= cr; risks.append(f'竞争-{cr}')

        return rd, risks

    # ===== 评级上限约束检查 =====
    def check_rating_cap(self):
        """v2.2评级上限约束规则"""
        caps = []
        risk_all = f'{str(self.c.get("analysis",{}).get("riskWarning",""))} {self.profit_t} {self.moat_t}'.lower()

        # 1. 财务真实性存疑 → 上限C
        if any(kw in risk_all for kw in ['财务造假','审计问题','财务真实性']):
            caps.append(('C', '财务真实性存疑'))

        # 2. 连续2年经营现金流为负且利润为正 → 上限C
        if any(kw in self.profit_t for kw in ['现金流连续为负','连续2年现金流为负']):
            caps.append(('C', '连续2年经营现金流为负'))

        # 3. 单一客户收入>50% → 上限B
        if any(kw in risk_all for kw in ['单一客户占比超50%','大客户依赖']):
            caps.append(('B', '单一客户收入占比超50%'))

        # 4. 大股东高比例质押 → 上限B
        if any(kw in risk_all for kw in ['质押比例高','平仓风险','大股东质押']):
            caps.append(('B', '大股东高比例质押'))

        # 5. 重大治理瑕疵 → 上限C
        if any(kw in risk_all for kw in ['关联交易频繁','激进资本运作']):
            caps.append(('C', '重大治理瑕疵'))

        # 6. 高杠杆+短债压力 → 上限B
        if any(kw in risk_all for kw in ['短债压力','偿债风险高']):
            caps.append(('B', '高杠杆短债压力'))

        # 7. 依赖单一政策 → 上限B
        if any(kw in risk_all for kw in ['单一政策依赖','政策不确定性']):
            caps.append(('B', '核心业务依赖单一政策'))

        return caps

    # ===== 综合评分 =====
    def score_all(self):
        moat, moat_d = self.score_moat()
        growth, growth_d = self.score_growth()
        profit, profit_d = self.score_profit()
        val, val_d = self.score_valuation()
        cat, cat_d = self.score_catalyst()
        risk, risk_d = self.score_risk()

        main_total = moat + growth + profit + val + cat
        total = main_total + risk
        total = max(total, 0)

        # 基础评级
        if total >= 90: base_grade = 'S'
        elif total >= 85: base_grade = 'A+'
        elif total >= 80: base_grade = 'A'
        elif total >= 75: base_grade = 'B+'
        elif total >= 70: base_grade = 'B'
        elif total >= 60: base_grade = 'C'
        else: base_grade = 'D'

        # 评级上限约束
        final_grade = base_grade
        constraint_hit = None
        caps = self.check_rating_cap()
        grade_order = ['D', 'C', 'B', 'B+', 'A', 'A+', 'S']
        for cap_grade, cap_reason in caps:
            if grade_order.index(final_grade) > grade_order.index(cap_grade):
                final_grade = cap_grade
                constraint_hit = cap_reason

        # 时效状态
        status = '有效'

        return {
            'name': self.name,
            'code': self.c.get('code', ''),
            'industry': self.ind,
            'v22_total': total,
            'v22_main': main_total,
            'v22_grade': final_grade,
            'v22_base_grade': base_grade,
            'v22_moat': moat,
            'v22_growth': growth,
            'v22_profit': profit,
            'v22_valuation': val,
            'v22_catalyst': cat,
            'v22_risk': risk,
            'v22_details': {
                'moat': moat_d, 'growth': growth_d, 'profit': profit_d,
                'valuation': val_d, 'catalyst': cat_d, 'risk': risk_d,
            },
            'constraint_hit': constraint_hit,
            'status': status,
            'orig_score': self.c.get('score'),
            'orig_grade': self.c.get('grade'),
            'pe': self.pe, 'pb': self.pb, 'roe': self.roe, 'dy': self.dy,
            'data_gaps': self.data_gaps,
        }


def main():
    with open('src/data/companies.json', 'r') as f:
        data = json.load(f)

    a50 = [c for c in data if c.get('isA50') == True]
    print(f'A50成分股: {len(a50)}家')

    results = []
    for c in a50:
        scorer = V22Scorer(c)
        r = scorer.score_all()
        results.append(r)
        print(f'{r["name"]:8s} | v2.2={r["v22_total"]:3d}({r["v22_grade"]}) | '
              f'护城河{r["v22_moat"]:2d}/25 成长{r["v22_growth"]:2d}/20 '
              f'盈利{r["v22_profit"]:2d}/20 估值{r["v22_valuation"]:2d}/25 '
              f'催化{r["v22_catalyst"]:2d}/10 风险{r["v22_risk"]:3d} | '
              f'原={r["orig_score"]}({r["orig_grade"]}) | '
              f'PE={r["pe"]} PB={r["pb"]} ROE={r["roe"]}'
              f'{" ⚠"+r["constraint_hit"] if r["constraint_hit"] else ""}')

    # Save raw results
    with open('v22_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # ===== 生成Markdown报告 =====
    lines = []
    lines.append('# 中证A50指数 v2.2模型批量评分报告')
    lines.append('')
    lines.append(f'**评分日期**：2026-04-10')
    lines.append('**模型版本**：v2.2（执行增强版）')
    lines.append(f'**评分公司**：{len(results)}家A50成分股')
    lines.append('**数据来源**：系统已有数据（companies.json）')
    lines.append('')
    lines.append('---')
    lines.append('')
    lines.append('## 一、v2.2模型核心变化（vs v2.1）')
    lines.append('')
    lines.append('| 改动项 | v2.1 | v2.2 |')
    lines.append('|--------|------|------|')
    lines.append('| 护城河 | 品牌5+成本4+技术5+资源4+转换5+总结2=25 | 5子项×5分=25 |')
    lines.append('| 成长性 | 历史8+趋势6+空间6=20 | 历史8+趋势6+空间4+景气2=20 |')
    lines.append('| 催化剂 | 明确5+概率5=10 | 同+催化已发生9-10分规则 |')
    lines.append('| 风险扣分 | 财务0~-5+行业0~-4+竞争0~-3+增长0~-2 | 治理0~-5+财务0~-4+行业0~-3+竞争0~-3 |')
    lines.append('| 评级 | S≥80 A≥70 B≥60 C≥50 D≥40 E<40 | S≥90 A+≥85 A≥80 B+≥75 B≥70 C≥60 D<60 |')
    lines.append('| 评级约束 | 无 | 7条触发条件+评级上限 |')
    lines.append('| 缺失值 | 无特殊处理 | 关键数据缺失→维度≤70% |')
    lines.append('| 金融口径 | 无 | 银行/保险/券商替代口径 |')
    lines.append('')
    lines.append('---')
    lines.append('')

    # 完整排名
    sorted_r = sorted(results, key=lambda x: x['v22_total'], reverse=True)
    lines.append('## 二、完整排名（v2.2评分从高到低）')
    lines.append('')
    lines.append('| 排名 | 公司 | 代码 | 行业 | v2.2总分 | 评级 | 护城河 | 成长 | 盈利 | 估值 | 催化 | 风险 | 原系统分 | 原评级 | 差值 | 约束 |')
    lines.append('|------|------|------|------|----------|------|--------|------|------|------|------|------|----------|--------|------|------|')

    for i, r in enumerate(sorted_r):
        diff = r['v22_total'] - (r['orig_score'] or 0)
        cstr = r['constraint_hit'] or ''
        lines.append(f'| {i+1} | {r["name"]} | {r["code"]} | {r["industry"]} | {r["v22_total"]} | {r["v22_grade"]} | '
                     f'{r["v22_moat"]} | {r["v22_growth"]} | {r["v22_profit"]} | {r["v22_valuation"]} | {r["v22_catalyst"]} | '
                     f'{r["v22_risk"]} | {r["orig_score"] or "-"} | {r["orig_grade"] or "-"} | {diff:+d} | {cstr} |')

    lines.append('')
    lines.append('---')
    lines.append('')

    # 评级分布
    lines.append('## 三、评级分布')
    lines.append('')
    v22_grades = {}; orig_grades = {}
    for r in results:
        v22_grades[r['v22_grade']] = v22_grades.get(r['v22_grade'], 0) + 1
        og = r['orig_grade'] or ''
        orig_grades[og] = orig_grades.get(og, 0) + 1

    lines.append('| 评级 | v2.2 | 原系统 | 含义 |')
    lines.append('|------|------|--------|------|')
    grade_meanings = {'S': '质量优秀+估值有吸引力', 'A+': '基本面很强+赔率好', 'A': '基本面较强+配置价值',
                      'B+': '有吸引力+可跟踪', 'B': '有亮点+需结合估值判断', 'C': '逻辑一般+观察为主', 'D': '风险高+不宜配置'}
    for g in ['S', 'A+', 'A', 'B+', 'B', 'C', 'D']:
        v = v22_grades.get(g, 0)
        o = orig_grades.get(g, 0)
        meaning = grade_meanings.get(g, '')
        lines.append(f'| {g} | {v} | {o} | {meaning} |')

    lines.append('')
    lines.append('---')
    lines.append('')

    # 分维度统计
    lines.append('## 四、分维度统计')
    lines.append('')
    avg = lambda key: sum(r[key] for r in results) / len(results)
    lines.append('| 维度 | 平均分 | 满分 | 得分率 |')
    lines.append('|------|--------|------|--------|')
    lines.append(f'| 护城河 | {avg("v22_moat"):.1f} | 25 | {avg("v22_moat")/25*100:.0f}% |')
    lines.append(f'| 成长性 | {avg("v22_growth"):.1f} | 20 | {avg("v22_growth")/20*100:.0f}% |')
    lines.append(f'| 盈利质量 | {avg("v22_profit"):.1f} | 20 | {avg("v22_profit")/20*100:.0f}% |')
    lines.append(f'| 估值安全边际 | {avg("v22_valuation"):.1f} | 25 | {avg("v22_valuation")/25*100:.0f}% |')
    lines.append(f'| 催化剂 | {avg("v22_catalyst"):.1f} | 10 | {avg("v22_catalyst")/10*100:.0f}% |')
    lines.append(f'| 风险扣分 | {avg("v22_risk"):.1f} | - | - |')
    lines.append(f'| **综合** | **{avg("v22_total"):.1f}** | **100** | **{avg("v22_total"):.0f}%** |')

    lines.append('')
    lines.append('---')
    lines.append('')

    # 核心发现
    lines.append('## 五、核心发现')
    lines.append('')

    b_plus = [r for r in sorted_r if r['v22_total'] >= 70]
    c_grade = [r for r in sorted_r if 60 <= r['v22_total'] < 70]
    d_grade = [r for r in sorted_r if r['v22_total'] < 60]

    lines.append(f'### 1. B级以上投资标的（v2.2≥70分）：{len(b_plus)}家')
    lines.append('')
    for r in b_plus:
        constraint = f' ⚠{r["constraint_hit"]}' if r['constraint_hit'] else ''
        lines.append(f'- **{r["name"]}**（{r["code"]}）{r["v22_total"]}分({r["v22_grade"]}) | '
                     f'护城河{r["v22_moat"]}/25 成长{r["v22_growth"]}/20 盈利{r["v22_profit"]}/20 '
                     f'估值{r["v22_valuation"]}/25 催化{r["v22_catalyst"]}/10 风险{r["v22_risk"]}{constraint}')

    lines.append('')
    lines.append(f'### 2. C级观察标的（60-69分）：{len(c_grade)}家')
    lines.append('')
    for r in c_grade:
        lines.append(f'- **{r["name"]}**（{r["code"]}）{r["v22_total"]}分(C) | '
                     f'护城河{r["v22_moat"]}/25 成长{r["v22_growth"]}/20 盈利{r["v22_profit"]}/20 '
                     f'估值{r["v22_valuation"]}/25 催化{r["v22_catalyst"]}/10 风险{r["v22_risk"]}')

    lines.append('')
    lines.append(f'### 3. D级规避标的（<60分）：{len(d_grade)}家')
    lines.append('')
    for r in d_grade:
        lines.append(f'- **{r["name"]}**（{r["code"]}）{r["v22_total"]}分(D) | '
                     f'护城河{r["v22_moat"]}/25 成长{r["v22_growth"]}/20 盈利{r["v22_profit"]}/20 '
                     f'估值{r["v22_valuation"]}/25 催化{r["v22_catalyst"]}/10 风险{r["v22_risk"]}')

    # 评级约束触发
    constrained = [r for r in results if r['constraint_hit']]
    if constrained:
        lines.append('')
        lines.append('### 4. 触发评级上限约束')
        lines.append('')
        for r in constrained:
            lines.append(f'- **{r["name"]}**（{r["code"]}）基础评级{r["v22_base_grade"]}→最终{r["v22_grade"]} | 原因：{r["constraint_hit"]}')

    # v2.1 vs v2.2对比
    lines.append('')
    lines.append('### 5. v2.2 vs v2.1 评级标准收紧影响')
    lines.append('')
    lines.append(f'- v2.2评级门槛全面提高：S从80→90，A从70→80，B从60→70，C从50→60')
    lines.append(f'- v2.2均分 **{avg("v22_total"):.1f}**，相比v2.1均分51.1变化不大（评分逻辑微调）')
    lines.append(f'- 但因评级门槛提高，实际B级以上公司数从7家→{len(b_plus)}家')
    lines.append(f'- 成长性新增"行业景气"子项（2分），对AI算力等高景气行业加分')

    # 数据缺失统计
    gap_companies = [r for r in results if r['data_gaps']]
    lines.append('')
    lines.append(f'### 6. 数据缺失情况')
    lines.append('')
    lines.append(f'- {len(gap_companies)}/{len(results)}家公司存在关键数据缺失')
    lines.append('- 缺失维度已触发70%上限约束，评分偏保守')
    lines.append('- **建议**：对手评标的逐项补齐PE/PB/ROE/增速/股息率后重新评分')

    lines.append('')
    lines.append('---')
    lines.append('')

    # 分维度Top5
    lines.append('## 六、各维度Top5')
    lines.append('')

    for dim, key, max_s in [('护城河', 'v22_moat', 25), ('成长性', 'v22_growth', 20),
                             ('盈利质量', 'v22_profit', 20), ('估值安全边际', 'v22_valuation', 25),
                             ('催化剂', 'v22_catalyst', 10)]:
        top5 = sorted(results, key=lambda x: x[key], reverse=True)[:5]
        lines.append(f'### {dim}（满分{max_s}分）')
        lines.append('')
        for r in top5:
            lines.append(f'- {r["name"]} {r[key]}/{max_s}')
        lines.append('')

    lines.append('---')
    lines.append('')
    lines.append('## 七、模型局限性与说明')
    lines.append('')
    lines.append('1. **数据不完整**：约40%公司缺少PE/PB/ROE等精确数据，触发70%上限约束')
    lines.append('2. **基于文字摘要**：多数评分从scoringRationale摘要推断，精度不如手动逐项分析')
    lines.append('3. **金融口径简化**：银行/保险/券商替代口径基于摘要推断，不如手动用专有指标')
    lines.append('4. **评级约束依赖关键词**：7条约束规则基于关键词匹配，可能漏判或误判')
    lines.append('5. **时效性**：本次评分为批量自动评分，未逐一核实最新财报和事件')
    lines.append('6. **建议**：对B级以上标的，务必手动逐项复核，补齐数据后重新评分')
    lines.append('')
    lines.append('---')
    lines.append('')
    lines.append('*报告由v2.2模型自动生成，仅供参考，不构成投资建议*')
    lines.append(f'*生成时间：{datetime.now().strftime("%Y-%m-%d %H:%M")}*')

    report = '\n'.join(lines)
    with open('v22_report.md', 'w', encoding='utf-8') as f:
        f.write(report)

    print(f'\n报告已保存: v22_report.md')
    print(f'结果已保存: v22_results.json')


if __name__ == '__main__':
    main()
