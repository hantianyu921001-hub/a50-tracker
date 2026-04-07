import json

# 读取现有数据
with open('/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app/src/data/companies.json', 'r', encoding='utf-8') as f:
    companies = json.load(f)

# 批量更新数据（第3批）
updates = {
    '600009': {  # 上海机场
        'status': 'analyzed',
        'score': 65,
        'grade': 'B',
        'financials': {
            'revenue': '125亿',
            'revenueGrowth': '+12%',
            'netProfit': '21亿',
            'netProfitGrowth': '+15%',
            'grossMargin': '35%',
            'roe': '5.2%'
        },
        'valuation': {
            'pe': 42,
            'pb': 3.5,
            'marketCap': '880亿'
        },
        'analysis': {
            'moat': 80,
            'growth': 55,
            'quality': 62,
            'valuation': 58,
            'catalyst': 72
        },
        'highlights': [
            '中国最大国际航空枢纽，浦东+虹桥双机场',
            '国际客流持续恢复，业绩改善',
            '免税租金重新谈判，中长期价值凸显',
            '成本控制良好，中期分红提升股东回报',
            '长三角经济圈核心枢纽，区位优势独特',
            '国际航线网络成熟，商业运营模式领先'
        ],
        'risks': [
            '免税租金收入承压，谈判进展缓慢',
            'PE 42倍估值偏高',
            '国际航班恢复不及预期',
            '宏观经济影响出行需求'
        ],
        'investmentAdvice': '观望。中国最大国际航空枢纽，国际客流持续恢复。免税租金重新谈判中，中长期价值凸显。但PE 42倍估值偏高，需等待免税协议落地或估值回调至PE 30倍以下（约30元）再考虑布局。目标价40-50元。'
    },
    '600436': {  # 片仔癀
        'status': 'analyzed',
        'score': 75,
        'grade': 'B+',
        'financials': {
            'revenue': '85亿',
            'revenueGrowth': '+8%',
            'netProfit': '29.5亿',
            'netProfitGrowth': '+10%',
            'grossMargin': '48%',
            'roe': '18%'
        },
        'valuation': {
            'pe': 55,
            'pb': 12.5,
            'marketCap': '1620亿'
        },
        'analysis': {
            'moat': 88,
            'growth': 58,
            'quality': 78,
            'valuation': 58,
            'catalyst': 72
        },
        'highlights': [
            '中药国宝级品牌，国家绝密配方',
            '连续5年稳居胡润医疗健康品牌榜首',
            '肝病用药市占率领先，品牌护城河深厚',
            '渠道扩张，名医入漳战略推进',
            '化妆品分拆上市在即，价值重估',
            '原材料成本压力缓解，盈利改善'
        ],
        'risks': [
            '营收增速创9年新低',
            '提价难抵成本压力',
            'PE 55倍+PB 12.5倍估值极高',
            '第二增长曲线遇瓶颈'
        ],
        'investmentAdvice': '观望。中药国宝级品牌，护城河深厚。但营收增速放缓，提价难抵成本压力，PE 55倍估值极高。建议等待业绩拐点或估值回调至PE 40倍以下（约200元）再考虑布局。目标价220-280元。'
    },
    '000792': {  # 盐湖股份
        'status': 'analyzed',
        'score': 78,
        'grade': 'A',
        'financials': {
            'revenue': '155.01亿',
            'revenueGrowth': '+2.43%',
            'netProfit': '84.76亿',
            'netProfitGrowth': '+81.76%',
            'grossMargin': '62%',
            'roe': '28%'
        },
        'valuation': {
            'pe': 21,
            'pb': 2.8,
            'marketCap': '1800亿'
        },
        'analysis': {
            'moat': 82,
            'growth': 75,
            'quality': 82,
            'valuation': 78,
            'catalyst': 78
        },
        'highlights': [
            '国内最大盐湖资源开发平台',
            '钾肥产能国内第一，成本优势明显',
            '盐湖提锂技术成熟，成本仅3万元/吨',
            '净利润84.76亿同比+81.76%，业绩爆发',
            '4万吨锂盐项目满负荷运行',
            '中国盐湖控股，资源整合加速'
        ],
        'risks': [
            '钾肥和锂盐价格波动风险',
            '产能扩张放缓',
            '新能源行业周期性',
            '环保压力增大'
        ],
        'investmentAdvice': '持有。国内盐湖资源龙头，钾肥+锂盐双轮驱动。2025年净利润+81.76%业绩爆发，PE 21倍估值合理。钾锂行业景气度提升，盐湖资源开发持续加码。建议持有，回调至PE 18倍以下（约30元）考虑加仓。目标价38-45元。'
    },
    '600585': {  # 海螺水泥
        'status': 'analyzed',
        'score': 74,
        'grade': 'B+',
        'financials': {
            'revenue': '825.32亿',
            'revenueGrowth': '-9.33%',
            'netProfit': '81.13亿',
            'netProfitGrowth': '+5.42%',
            'grossMargin': '24%',
            'roe': '8.5%'
        },
        'valuation': {
            'pe': 7.5,
            'pb': 0.72,
            'marketCap': '610亿',
            'dividendYield': '6.8%'
        },
        'analysis': {
            'moat': 78,
            'growth': 50,
            'quality': 75,
            'valuation': 90,
            'catalyst': 62
        },
        'highlights': [
            '国内水泥行业龙头，成本控制领先',
            '净利润81.13亿同比+5.42%，盈利改善',
            '综合成本下降11.12%，成本优势显著',
            'PB 0.72倍严重破净，估值极低',
            '股息率6.8%，分红比例不低于50%',
            '海外拓展稳步推进，产业链延伸'
        ],
        'risks': [
            '水泥需求下滑，行业周期下行',
            '房地产拖累需求',
            '环保成本持续上升',
            '营收-9.33%，增长乏力'
        ],
        'investmentAdvice': '持有。国内水泥龙头，成本控制行业领先。PB 0.72倍严重破净，股息率6.8%，估值安全边际极高。2025年净利润+5.42%，盈利改善。但水泥行业周期下行，需求承压。建议作为高股息防守配置，PB 0.6倍以下（约18元）加大仓位。目标价22-28元。'
    }
}

# 应用更新
for company in companies:
    code = company['code']
    if code in updates:
        for key, value in updates[code].items():
            company[key] = value

# 保存
with open('/Users/hantianyu/WorkBuddy/Claw/A50-Tracker/a50-app/src/data/companies.json', 'w', encoding='utf-8') as f:
    json.dump(companies, f, ensure_ascii=False, indent=2)

print("✓ 已更新4家公司: 上海机场、片仔癀、盐湖股份、海螺水泥")