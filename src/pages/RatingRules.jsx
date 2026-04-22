import { Link } from 'react-router-dom'
import { useScoring } from '../context/ScoringContext'

function V20Rules() {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">A股投资价值量化评分模型</h1>
      <p className="text-gray-600 mb-8">五维度评分体系，总分100分</p>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">一、评分维度与权重</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">25%</div>
            <div className="text-sm text-gray-600 mt-1">护城河</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">20%</div>
            <div className="text-sm text-gray-600 mt-1">成长性</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">20%</div>
            <div className="text-sm text-gray-600 mt-1">盈利质量</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">25%</div>
            <div className="text-sm text-gray-600 mt-1">估值安全边际</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">10%</div>
            <div className="text-sm text-gray-600 mt-1">催化剂</div>
          </div>
        </div>
        <p className="text-center text-gray-700">五个维度综合评分，<span className="font-bold">总分100分</span></p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度一：护城河（0-25分）</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">评分</th><th className="px-4 py-2 text-left">标准</th></tr></thead>
          <tbody>
            <tr className="border-t"><td className="px-4 py-2 font-medium text-green-600">22-25分</td><td className="px-4 py-2">绝对龙头，不可替代（如茅台）</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-medium">17-21分</td><td className="px-4 py-2">强护城河，但存在替代品</td></tr>
            <tr className="border-t"><td className="px-4 py-2 font-medium">12-16分</td><td className="px-4 py-2">中等护城河，竞争优势明显但有挑战</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-medium">7-11分</td><td className="px-4 py-2">护城河较弱，竞争激烈</td></tr>
            <tr className="border-t"><td className="px-4 py-2 font-medium text-red-600">0-6分</td><td className="px-4 py-2">无护城河，同质化竞争</td></tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度二：成长性（0-20分）</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">评分</th><th className="px-4 py-2 text-left">标准</th></tr></thead>
          <tbody>
            <tr className="border-t"><td className="px-4 py-2 font-medium text-green-600">18-20分</td><td className="px-4 py-2">高增长，营收/利润增速大于20%</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-medium">14-17分</td><td className="px-4 py-2">中高增长，增速10-20%</td></tr>
            <tr className="border-t"><td className="px-4 py-2 font-medium">10-13分</td><td className="px-4 py-2">稳健增长，增速5-10%</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-medium">5-9分</td><td className="px-4 py-2">低增长或负增长，增速小于5%</td></tr>
            <tr className="border-t"><td className="px-4 py-2 font-medium text-red-600">0-4分</td><td className="px-4 py-2">衰退，负增长大于10%</td></tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度三：盈利质量（0-20分）</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">评分</th><th className="px-4 py-2 text-left">标准</th></tr></thead>
          <tbody>
            <tr className="border-t"><td className="px-4 py-2 font-medium text-green-600">18-20分</td><td className="px-4 py-2">ROE大于20%，毛利率大于40%，现金流极强，分红率大于50%</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-medium">14-17分</td><td className="px-4 py-2">ROE 15-20%，毛利率大于30%，现金流强，分红率大于40%</td></tr>
            <tr className="border-t"><td className="px-4 py-2 font-medium">10-13分</td><td className="px-4 py-2">ROE 10-15%，毛利率大于20%，现金流稳定，分红率大于30%</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-medium">5-9分</td><td className="px-4 py-2">ROE 5-10%，毛利率小于20%，现金流一般，分红率小于30%</td></tr>
            <tr className="border-t"><td className="px-4 py-2 font-medium text-red-600">0-4分</td><td className="px-4 py-2">ROE小于5%，现金流弱，不分红</td></tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度四：估值安全边际（0-25分）</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">评分</th><th className="px-4 py-2 text-left">标准</th></tr></thead>
          <tbody>
            <tr className="border-t"><td className="px-4 py-2 font-medium text-green-600">22-25分</td><td className="px-4 py-2">PE/PB处于历史低位（小于20%分位），股息率大于5%</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-medium">17-21分</td><td className="px-4 py-2">PE/PB合理偏低（20-40%分位），股息率3-5%</td></tr>
            <tr className="border-t"><td className="px-4 py-2 font-medium">12-16分</td><td className="px-4 py-2">PE/PB合理（40-60%分位），股息率2-3%</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-medium">7-11分</td><td className="px-4 py-2">PE/PB偏高（60-80%分位），股息率小于2%</td></tr>
            <tr className="border-t"><td className="px-4 py-2 font-medium text-red-600">0-6分</td><td className="px-4 py-2">PE/PB历史高位（大于80%分位），无股息</td></tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度五：催化剂（0-10分）</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">评分</th><th className="px-4 py-2 text-left">标准</th></tr></thead>
          <tbody>
            <tr className="border-t"><td className="px-4 py-2 font-medium text-green-600">9-10分</td><td className="px-4 py-2">强催化剂已出现（业绩拐点、政策落地、资产注入）</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-medium">7-8分</td><td className="px-4 py-2">催化剂明确但时间未定</td></tr>
            <tr className="border-t"><td className="px-4 py-2 font-medium">5-6分</td><td className="px-4 py-2">潜在催化剂，需观察</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-medium">3-4分</td><td className="px-4 py-2">无明显催化剂，业绩平稳</td></tr>
            <tr className="border-t"><td className="px-4 py-2 font-medium text-red-600">0-2分</td><td className="px-4 py-2">负面因素主导</td></tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">评级标准</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">总分</th><th className="px-4 py-2 text-left">评级</th><th className="px-4 py-2 text-left">投资建议</th></tr></thead>
          <tbody>
            <tr className="border-t bg-red-50"><td className="px-4 py-2 font-bold">90-100分</td><td className="px-4 py-2"><span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">S</span></td><td className="px-4 py-2">极度低估/确定性极高（强烈买入）</td></tr>
            <tr className="border-t bg-orange-50"><td className="px-4 py-2 font-bold">80-89分</td><td className="px-4 py-2"><span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">A</span></td><td className="px-4 py-2">明显低估/逻辑清晰（买入）</td></tr>
            <tr className="border-t bg-green-50"><td className="px-4 py-2 font-bold">70-79分</td><td className="px-4 py-2"><span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">B</span></td><td className="px-4 py-2">合理偏高/逻辑通顺（持有）</td></tr>
            <tr className="border-t bg-yellow-50"><td className="px-4 py-2 font-bold">60-69分</td><td className="px-4 py-2"><span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">C</span></td><td className="px-4 py-2">估值偏高/需要观察（观望）</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-bold">60分以下</td><td className="px-4 py-2"><span className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-bold">D</span></td><td className="px-4 py-2">高风险/逻辑有硬伤（规避）</td></tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ====== v2.2 细项评分依据表（可复用） ====== */
function CriteriaTable({ rows }) {
  return (
    <table className="w-full text-sm mt-3">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left w-20">分数</th>
          <th className="px-4 py-2 text-left">判断标准</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={`border-t ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
            <td className={`px-4 py-2 font-medium ${row.color || ''}`}>{row.score}</td>
            <td className="px-4 py-2">{row.criteria}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function V22Rules() {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">A股投资价值量化评分模型</h1>
      <p className="text-gray-600 mb-8">v2.2 执行增强版 · 六维度+风险扣分 · 7档评级</p>

      {/* ===== 总览 ===== */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">一、评分维度与权重</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">25%</div>
            <div className="text-sm text-gray-600 mt-1">护城河</div>
            <div className="text-xs text-gray-400">满分25</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">20%</div>
            <div className="text-sm text-gray-600 mt-1">成长性</div>
            <div className="text-xs text-gray-400">满分20</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">20%</div>
            <div className="text-sm text-gray-600 mt-1">盈利质量</div>
            <div className="text-xs text-gray-400">满分20</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">25%</div>
            <div className="text-sm text-gray-600 mt-1">估值安全边际</div>
            <div className="text-xs text-gray-400">满分25</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">10%</div>
            <div className="text-sm text-gray-600 mt-1">催化剂</div>
            <div className="text-xs text-gray-400">满分10</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center border border-red-200">
            <div className="text-2xl font-bold text-red-500">扣分</div>
            <div className="text-sm text-gray-600 mt-1">风险扣分</div>
            <div className="text-xs text-gray-400">最多-15</div>
          </div>
        </div>
        <p className="text-center text-gray-700">六维度评分 + 风险扣分，<span className="font-bold">总分100分</span></p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">二、当前系统实现口径：通用主干 + 行业增强</h2>
        <div className="space-y-4 text-sm text-gray-700 leading-7">
          <p>
            当前系统先为所有公司计算一版 <span className="font-semibold text-gray-900">通用主干评分</span>，
            再按行业叠加 <span className="font-semibold text-gray-900">行业增强评分</span>。银行是第一个完整接通的行业增强插件，
            因此银行股的最终分数不是“只看银行规则”，而是“通用主干 + 银行增强”的加权混合结果。
          </p>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <div className="font-medium text-blue-900 mb-2">正向维度（护城河 / 成长性 / 盈利质量 / 估值 / 催化剂）</div>
            <div className="font-mono text-blue-800">最终维度分 = 通用分 × 40% + 行业增强分 × 60%</div>
            <div className="mt-2 text-blue-900">计算后再按维度上限截断：护城河 25、成长 20、盈利 20、估值 25、催化 10。</div>
          </div>
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-4">
            <div className="font-medium text-rose-900 mb-2">风险维度（扣分项）</div>
            <div className="font-mono text-rose-800">最终风险分 = 通用风险 × 35% + 行业增强风险 × 65%</div>
            <div className="mt-2 text-rose-900">最终限制在 -15 到 0 之间，避免风险扣分异常放大。</div>
          </div>
          <p>
            详情页里如果看到 <span className="font-medium">“通用：...”</span> 和 <span className="font-medium">“银行增强：...”</span> 两类子项，
            说明系统正在同时展示主干判断和行业增强判断。当前最终分数采用加权混合，不是简单相加，也不是二选一。
          </p>
        </div>
      </div>

      {/* ===== 维度一：护城河 ===== */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度一：护城河（0-25分，5子项×5分）</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          {['品牌壁垒', '成本优势', '技术壁垒', '资源垄断', '转换成本'].map((item, i) => (
            <div key={i} className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-sm font-medium text-blue-800">{item}</div>
              <div className="text-xs text-gray-500 mt-1">0-5分</div>
            </div>
          ))}
        </div>

        {/* 1.1 品牌壁垒 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-blue-800 mb-2">1.1 品牌壁垒（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: '品牌=硬通货 / 绝对龙头 / 全球第一 / 全球最大 / 垄断地位 / 市占率>90% / 绝密配方' },
            { score: '4分', color: 'text-green-600', criteria: '龙头 / 第一 / 领先 / 核心供应商' },
            { score: '3分', criteria: '前三 / 主要 / 优势 / 知名；但电子/化工/钢铁/建材/建筑行业上限3分' },
            { score: '2分', criteria: '默认基础分（无明显品牌优势）' },
            { score: '≥3分', criteria: '银行/保险行业品牌保底3分' },
          ]} />
        </div>

        {/* 1.2 成本优势 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-blue-800 mb-2">1.2 成本优势（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: '成本领先 / 极致成本' },
            { score: '4分', color: 'text-green-600', criteria: '全球第一 / 全球最大 / 市占率第一 / 绝对龙头；或毛利率>70%' },
            { score: '3分', criteria: '成本优势 / 成本最低 / 规模效应 / 规模优势 / 一体化；或毛利率>50%' },
            { score: '2分', criteria: '默认基础分（无明显成本优势）' },
          ]} />
        </div>

        {/* 1.3 技术壁垒 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-blue-800 mb-2">1.3 技术壁垒（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: '绝密配方 / 市占率>90% / 生态闭环 / 全谱系 / 国内唯一' },
            { score: '4分', color: 'text-green-600', criteria: '不可复制 / 不可替代 / 全球唯一 / 稀缺性 / MDI全球第一 / 绝对领先' },
            { score: '3分', criteria: '技术壁垒 / 技术领先 / 技术护城河 / 专利 / 研发投入' },
            { score: '2分', criteria: '银行/保险行业保底2分' },
            { score: '1分', criteria: '默认基础分（无技术壁垒）' },
          ]} />
        </div>

        {/* 1.4 资源/牌照/渠道 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-blue-800 mb-2">1.4 资源/牌照/渠道（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: '区域垄断 / 特许经营' },
            { score: '4分', color: 'text-green-600', criteria: '天然垄断 / 物理不可替代 / 国家绝密 / 独占 / 央企；银行/保险保底4分；电力/核电/公用事业保底4分' },
            { score: '3分', criteria: '牌照 / 许可证 / 准入 / 配额 / 资源垄断 / 资源储量 / 矿；券商保底3分；石油/石化/煤炭保底3分' },
            { score: '2分', criteria: '渠道 / 经销商 / 客户认证 / 供应商认证' },
            { score: '1分', criteria: '默认基础分（无资源/牌照优势）' },
          ]} />
        </div>

        {/* 1.5 转换成本/网络效应 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-blue-800 mb-2">1.5 转换成本/网络效应（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: '垄断地位 / 唯一；茅台保底5分' },
            { score: '4分', color: 'text-green-600', criteria: '网络效应 / 7.5万商户 / 10亿用户 / 4亿人群 / 自我强化 / 闭环 / 不可替代 / 生态；银行保底4分；电力/核电/公用事业保底4分' },
            { score: '3分', criteria: '宁德时代保底3分；保险保底3分' },
            { score: '2分', criteria: '转换成本 / 客户粘性 / 客户壁垒 / 绑定 / 认证周期' },
            { score: '1分', criteria: '默认基础分（无转换成本优势）' },
          ]} />
        </div>

        {/* 护城河总分档位 */}
        <div className="bg-blue-50 rounded-lg p-4 mt-3">
          <h4 className="font-semibold text-blue-800 mb-2">护城河总分档位（5子项合计）</h4>
          <CriteriaTable rows={[
            { score: '22-25分', color: 'text-green-600', criteria: '多重壁垒叠加，几乎不可替代（茅台、长江电力）' },
            { score: '17-21分', criteria: '单一壁垒极强（万华MDI、宁德规模+技术）' },
            { score: '12-16分', criteria: '有一定壁垒但不稳固' },
            { score: '7-11分', criteria: '壁垒较弱，竞争者可进入' },
            { score: '0-6分', color: 'text-red-600', criteria: '无明显壁垒，大宗商品类' },
          ]} />
          <p className="text-xs text-gray-500 mt-2">⚠️ 关键数据缺失时，护城河维度上限17分（70%）</p>
        </div>
      </div>

      {/* ===== 维度二：成长性 ===== */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度二：成长性（0-20分）</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {[
            { name: '历史增速', max: '8分', desc: '营收/净利3年CAGR' },
            { name: '增长趋势', max: '6分', desc: '加速/平稳/放缓' },
            { name: '成长空间', max: '4分', desc: 'TAM渗透率天花板' },
            { name: '行业景气', max: '2分', desc: '政策+行业增速' },
          ].map((item, i) => (
            <div key={i} className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-sm font-medium text-green-800">{item.name}</div>
              <div className="text-xs text-gray-500 mt-1">{item.max} · {item.desc}</div>
            </div>
          ))}
        </div>

        {/* 2.1 历史增速 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-green-800 mb-2">2.1 历史增速（0-8分）</h4>
          <p className="text-xs text-gray-500 mb-2">取营收增速与净利增速中较高值(mx)和较低值(mn)综合判断</p>
          <CriteriaTable rows={[
            { score: '8分', color: 'text-green-600', criteria: 'mx≥100% 或 mn≥20%（爆发式增长）' },
            { score: '7分', color: 'text-green-600', criteria: 'mx≥20% 且 mn≥10%（高增长+稳健）；或scoringRationale成长≥90分' },
            { score: '6分', criteria: 'mx≥10% 且 mn≥10%（双位数稳健增长）' },
            { score: '5分', criteria: 'mx≥10%（单维度双位数增长）；或scoringRationale成长≥75分' },
            { score: '4分', criteria: 'mx≥5%（低速增长）' },
            { score: '3分', criteria: 'mx≥0%（零增长或微增）；或scoringRationale成长<40分时上限3分' },
            { score: '2分', criteria: 'mx≥-10%（小幅下滑）' },
            { score: '1分', color: 'text-red-600', criteria: 'mx<-10%（大幅衰退）' },
          ]} />
        </div>

        {/* 2.2 增长趋势 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-green-800 mb-2">2.2 增长趋势（0-6分）</h4>
          <p className="text-xs text-gray-500 mb-2">基于scoringRationale成长摘要关键词判断当前趋势方向</p>
          <CriteriaTable rows={[
            { score: '6分', color: 'text-green-600', criteria: '爆发 / 翻倍 / 暴增 / 大幅增长' },
            { score: '5分', color: 'text-green-600', criteria: '高增长 / 快速增长 / 稳健增长 / 持续增长' },
            { score: '4分', criteria: '增长 / 回升 / 改善' },
            { score: '3分', criteria: '默认基础分（中性趋势）' },
            { score: '2分', color: 'text-red-600', criteria: '放缓 / 承压 / 下降；或净利/营收为负时上限2分' },
            { score: '0分', color: 'text-red-600', criteria: '大幅下滑 / 暴跌 / 亏损 / 恶化' },
          ]} />
        </div>

        {/* 2.3 成长空间 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-green-800 mb-2">2.3 成长空间（0-4分）</h4>
          <p className="text-xs text-gray-500 mb-2">基于催化剂+估值摘要判断长期成长天花板</p>
          <CriteriaTable rows={[
            { score: '4分', color: 'text-green-600', criteria: 'AI / 算力 / 新能源 / 国产替代 / 出海' },
            { score: '3分', criteria: '渗透率提升 / 放量 / 扩张' },
            { score: '2分', criteria: '成熟 / 平稳 / 稳健；银行/保险/钢铁/建材/建筑/煤炭行业上限2分' },
            { score: '1分', color: 'text-red-600', criteria: '衰退 / 萎缩 / 天花板' },
          ]} />
        </div>

        {/* 2.4 行业景气 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-green-800 mb-2">2.4 行业景气（0-2分）</h4>
          <p className="text-xs text-gray-500 mb-2">中短期行业景气度动态评估</p>
          <CriteriaTable rows={[
            { score: '2分', color: 'text-green-600', criteria: '景气上行 / 供需改善 / 提价 / 涨价 / 供不应求 / 订单饱满；或AI算力/光模块主题' },
            { score: '1分', criteria: '默认基础分（行业中性）' },
            { score: '0分', color: 'text-red-600', criteria: '下行 / 出清 / 产能过剩 / 需求不足；或风险提示含周期下行/产能过剩' },
          ]} />
        </div>

        {/* 金融行业替代口径 */}
        <div className="bg-green-50 rounded-lg p-4 mt-3">
          <h4 className="font-semibold text-green-800 mb-2">🏦 金融行业替代口径</h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-green-700">银行：</span>
              历史增速按净利增速分级（≥10%→6分, ≥5%→5分, ≥0%→4分, ≥-5%→3分, 否则2分）；
              趋势看息差（企稳/回升/拐点→5分, 稳健→4分, 承压→2分）；
              空间看零售转型/财富管理（有→3分）；
              景气固定1分
            </div>
            <div>
              <span className="font-medium text-green-700">保险：</span>
              历史增速按净利（≥15%→7分, ≥5%→5分, ≥0%→4分, 否则2分）；
              趋势看NBV增长/新业务价值/拐点（有→5分）；空间固定2分；景气固定1分
            </div>
            <div>
              <span className="font-medium text-green-700">券商：</span>
              历史增速按净利（≥30%→7分, ≥10%→5分, ≥0%→4分, 否则2分）；
              趋势看市场活跃/交易量（有→5分, 承压→2分）；空间固定2分；景气固定1分
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">⚠️ 关键数据缺失时，成长性维度上限14分（70%）</p>
        </div>
      </div>

      {/* ===== 维度三：盈利质量 ===== */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度三：盈利质量（0-20分）</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {[
            { name: 'ROE', max: '5分' },
            { name: '利润率', max: '5分' },
            { name: '现金流', max: '5分' },
            { name: '股东回报', max: '5分' },
          ].map((item, i) => (
            <div key={i} className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-sm font-medium text-purple-800">{item.name}</div>
              <div className="text-xs text-gray-500 mt-1">{item.max}</div>
            </div>
          ))}
        </div>

        {/* 3.1 ROE */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-purple-800 mb-2">3.1 ROE（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: 'ROE ≥ 20%' },
            { score: '4分', color: 'text-green-600', criteria: 'ROE 15-20%' },
            { score: '3分', criteria: 'ROE 10-15%' },
            { score: '2分', criteria: 'ROE 5-10%（默认基础分）' },
            { score: '1分', color: 'text-red-600', criteria: 'ROE < 5%' },
          ]} />
          <p className="text-xs text-gray-500 mt-1">无ROE数据时，从盈利质量摘要提取ROE数值或"极高"关键词推断</p>
        </div>

        {/* 3.2 利润率 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-purple-800 mb-2">3.2 利润率（0-5分）</h4>
          <p className="text-xs text-gray-500 mb-2">综合毛利率+净利率判断，取两者中较高评分</p>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: '毛利率≥70% 或 净利率≥30%' },
            { score: '4分', color: 'text-green-600', criteria: '毛利率40-70%' },
            { score: '3分', criteria: '毛利率25-40% 或 净利率≥15%' },
            { score: '2分', criteria: '毛利率15-25%（默认基础分）' },
            { score: '1分', color: 'text-red-600', criteria: '毛利率<15%' },
          ]} />
        </div>

        {/* 3.3 现金流 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-purple-800 mb-2">3.3 现金流（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: '现金流充沛 / 现金流充裕 / 造血能力优异' },
            { score: '3分', criteria: '提及现金流 / 现金储备 / 经营现金流（中性）；金融行业保底3分' },
            { score: '2分', color: 'text-red-600', criteria: '现金流承压 / 现金流恶化 / 应收账款' },
            { score: '1分', color: 'text-red-600', criteria: '现金流严重 / 自由现金流为负' },
          ]} />
        </div>

        {/* 3.4 股东回报 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-purple-800 mb-2">3.4 股东回报（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: '股息率 ≥ 5%' },
            { score: '4分', color: 'text-green-600', criteria: '股息率 3-5%；或摘要提及分红率50%/75%、股息率5%/6%' },
            { score: '3分', criteria: '股息率 1.5-3%；或摘要提及高分红/分红稳定/分红比例44%' },
            { score: '2分', criteria: '股息率 0.5-1.5%；或提及回购（默认基础分）' },
            { score: '1分', color: 'text-red-600', criteria: '股息率 < 0.5%；或"不分红"' },
          ]} />
        </div>

        {/* 金融行业替代口径 */}
        <div className="bg-purple-50 rounded-lg p-4 mt-3">
          <h4 className="font-semibold text-purple-800 mb-2">🏦 金融行业替代口径</h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-purple-700">银行：</span>
              4个子项替换为——ROE（≥15%→5分, ≥12%→4分, ≥10%→3分）+ 资产质量（不良率0.9%/行业最低→5分, 资产质量优秀/拨备覆盖率→4分）+ 息差（企稳/回升/拐点→4分, 收窄→2分）+ 分红（≥5%→5分, ≥3%→4分）
            </div>
            <div>
              <span className="font-medium text-purple-700">保险：</span>
              ROE（≥15%→5分, ≥10%→4分）+ NBV（固定3分）+ 投资（固定3分）+ 分红（≥3%→4分）
            </div>
            <div>
              <span className="font-medium text-purple-700">券商：</span>
              ROE（≥12%→4分, ≥8%→3分）+ 收入结构（固定3分）+ 自营（固定3分）+ 分红（≥3%→4分）
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">⚠️ 关键数据缺失时，盈利质量维度上限14分（70%）</p>
        </div>
      </div>

      {/* ===== 维度四：估值安全边际 ===== */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度四：估值安全边际（0-25分）</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {[
            { name: '估值分位', max: '10分', desc: 'PE/PB历史分位' },
            { name: '行业对比', max: '5分', desc: '相对同业估值' },
            { name: '股息回报', max: '5分', desc: '股息率+回购' },
            { name: '增长匹配', max: '5分', desc: 'PEG/估值与增速匹配' },
          ].map((item, i) => (
            <div key={i} className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-sm font-medium text-yellow-800">{item.name}</div>
              <div className="text-xs text-gray-500 mt-1">{item.max} · {item.desc}</div>
            </div>
          ))}
        </div>

        {/* 4.1 估值分位 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-yellow-800 mb-2">4.1 估值分位（0-10分）</h4>
          <p className="text-xs text-gray-500 mb-2">综合PE和PB的绝对水平，取两者中较高评分</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">PE分位评分</p>
              <CriteriaTable rows={[
                { score: '10分', color: 'text-green-600', criteria: 'PE ≤ 8倍' },
                { score: '8分', color: 'text-green-600', criteria: 'PE 8-12倍' },
                { score: '7分', criteria: 'PE 12-15倍' },
                { score: '6分', criteria: 'PE 15-20倍' },
                { score: '5分', criteria: 'PE 20-25倍' },
                { score: '4分', criteria: 'PE 25-30倍' },
                { score: '3分', criteria: 'PE 30-40倍' },
                { score: '2分', color: 'text-red-600', criteria: 'PE 40-60倍' },
                { score: '1分', color: 'text-red-600', criteria: 'PE > 60倍' },
              ]} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">PB修正评分</p>
              <CriteriaTable rows={[
                { score: '10分', color: 'text-green-600', criteria: 'PB < 0.6倍（深度破净）' },
                { score: '8分', color: 'text-green-600', criteria: 'PB 0.6-0.8倍（破净）' },
                { score: '7分', criteria: 'PB 0.8-1.0倍（接近破净）' },
                { score: '5分', criteria: 'PB 1.0-1.5倍' },
              ]} />
            </div>
          </div>
          <div className="mt-3 p-3 bg-yellow-50 rounded text-xs text-gray-600">
            <p className="font-medium text-yellow-800 mb-1">文字修正规则（叠加PE/PB数值）</p>
            <p>"深度破净"/"严重破净"→≥10分 · "破净"→≥7分 · "历史低位"/"极低"→≥7分 · "合理偏低"→≥6分 · "合理"（非偏高）→≥5分 · "偏高"/"极高"/"泡沫"→≤2分 · "安全边际极高/高"→≥7分 · "安全边际不足"/"缺乏安全边际"→≤3分</p>
            <p className="mt-1"><span className="font-medium">金融行业</span>：PB为主，PB&lt;0.6→≥10分, PB&lt;0.8→≥8分, PB&lt;1.0→≥6分</p>
          </div>
        </div>

        {/* 4.2 行业对比 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-yellow-800 mb-2">4.2 行业对比（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: 'PB < 0.8倍（显著低于同业）' },
            { score: '4分', color: 'text-green-600', criteria: 'PB 0.8-1.0倍 或 PE ≤ 10倍（低于同业）' },
            { score: '3分', criteria: 'PB 1.0-2.0倍 或 PE 10-15倍（行业中等）' },
            { score: '2分', color: 'text-red-600', criteria: 'PB 2.0-5.0倍 或 PE ≥ 50倍（高于同业）' },
            { score: '1分', color: 'text-red-600', criteria: 'PB > 5.0倍（远高于同业）' },
          ]} />
        </div>

        {/* 4.3 股息回报 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-yellow-800 mb-2">4.3 股息回报（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: '股息率 ≥ 5%' },
            { score: '4分', color: 'text-green-600', criteria: '股息率 3-5%；或摘要提及股息率4%/5%/6%' },
            { score: '3分', criteria: '股息率 1.5-3%；或摘要提及高分红/分红稳定' },
            { score: '2分', criteria: '股息率 0.5-1.5%' },
            { score: '1分', color: 'text-red-600', criteria: '股息率 < 0.5%' },
          ]} />
        </div>

        {/* 4.4 增长匹配度 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-yellow-800 mb-2">4.4 增长匹配度（0-5分）</h4>
          <p className="text-xs text-gray-500 mb-2">PEG = PE / 净利增速，衡量估值与成长的匹配程度</p>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: 'PEG < 0.5（极度低估）' },
            { score: '4分', color: 'text-green-600', criteria: 'PEG 0.5-0.8（明显低估）；或摘要"安全边际极高/高"' },
            { score: '3分', criteria: 'PEG 0.8-1.0（合理）' },
            { score: '2分', color: 'text-red-600', criteria: 'PEG 1.0-1.5（偏贵）；或摘要"安全边际不足/缺乏安全边际"' },
            { score: '1分', color: 'text-red-600', criteria: 'PEG > 1.5（严重高估）；或摘要含"透支"' },
          ]} />
          <p className="text-xs text-gray-500 mt-2">⚠️ 关键数据缺失（PE+PB均无）时，估值维度上限17分（70%）</p>
        </div>
      </div>

      {/* ===== 维度五：催化剂 ===== */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度五：催化剂（0-10分）</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {[
            { name: '明确性', max: '5分', desc: '6个月内催化剂明确程度' },
            { name: '确定性', max: '5分', desc: '催化发生的概率' },
          ].map((item, i) => (
            <div key={i} className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-sm font-medium text-red-800">{item.name}</div>
              <div className="text-xs text-gray-500 mt-1">{item.max} · {item.desc}</div>
            </div>
          ))}
        </div>

        {/* 5.1 明确性 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-red-800 mb-2">5.1 明确性（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: '明确 / 确定性强 / 明牌 / 已确认' },
            { score: '4分', color: 'text-green-600', criteria: '爆发 / 放量 / 拐点 / 新品 / 订单 / 产能释放' },
            { score: '3分', criteria: 'AI / 算力 / 国产替代 / 出海 / 提价 / 政策 / 投产' },
            { score: '2分', color: 'text-red-600', criteria: '默认基础分；或"尚不明确"/"暂无重大"/"短期无"时上限2分' },
          ]} />
        </div>

        {/* 5.2 确定性 */}
        <div className="border rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-red-800 mb-2">5.2 兑现概率（0-5分）</h4>
          <CriteriaTable rows={[
            { score: '5分', color: 'text-green-600', criteria: '已兑现 / 已落地 / 已确认改善 / 业绩拐点确认（催化已发生→总分9-10分）' },
            { score: '3分', criteria: '订单 / 产能 / 投产 / 落地 / 路线图 / 已验证 / 需求 / 政策支持 / 行业趋势 / 渗透率' },
            { score: '2分', criteria: '默认基础分（催化概率一般）' },
          ]} />
          <p className="text-xs text-gray-500 mt-2">⚠️ 关键数据缺失时，催化剂维度上限7分（70%）</p>
        </div>
      </div>

      {/* ===== 维度六：风险扣分 ===== */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 border-red-200">
        <h3 className="text-lg font-bold text-red-700 mb-4">维度六：风险扣分（0~-15分）</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {[
            { name: '治理风险', max: '0~-5分', desc: '关联交易/质押/信披' },
            { name: '财务风险', max: '0~-4分', desc: '高负债/商誉/现金流差' },
            { name: '行业风险', max: '0~-3分', desc: '政策收紧/衰退' },
            { name: '竞争风险', max: '0~-3分', desc: '份额下滑/价格战' },
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 text-center border border-red-100">
              <div className="text-sm font-medium text-red-800">{item.name}</div>
              <div className="text-xs text-gray-500 mt-1">{item.max}</div>
              <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* 6.1 治理风险 */}
        <div className="border border-red-100 rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-red-800 mb-2">6.1 治理风险（0~-5分）</h4>
          <CriteriaTable rows={[
            { score: '-3分', color: 'text-red-600', criteria: '关联交易 / 大股东占款 / 财务造假 / 激进并购' },
            { score: '-2分', color: 'text-red-600', criteria: '质押 / 减持 / 治理' },
            { score: '-3分', color: 'text-red-600', criteria: '股权质押 / 平仓风险' },
            { score: '0~-5分', criteria: '多项叠加时累计，最多扣5分' },
          ]} />
        </div>

        {/* 6.2 财务风险 */}
        <div className="border border-red-100 rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-red-800 mb-2">6.2 财务风险（0~-4分）</h4>
          <CriteriaTable rows={[
            { score: '-3分', color: 'text-red-600', criteria: '现金流严重 / 现金流恶化' },
            { score: '-1分', color: 'text-red-600', criteria: '现金流承压' },
            { score: '-1分', color: 'text-red-600', criteria: '应收账款增加 / 延长（应收+增加/延长）' },
            { score: '-1分', color: 'text-red-600', criteria: 'ROE < 5%' },
            { score: '-1分', color: 'text-red-600', criteria: '减值侵蚀（减值+69亿/侵蚀）' },
            { score: '-2分', color: 'text-red-600', criteria: '高杠杆 / 短债 / 偿债' },
            { score: '0~-4分', criteria: '多项叠加时累计，最多扣4分' },
          ]} />
        </div>

        {/* 6.3 行业风险 */}
        <div className="border border-red-100 rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-red-800 mb-2">6.3 行业风险（0~-3分）</h4>
          <CriteriaTable rows={[
            { score: '-3分', color: 'text-red-600', criteria: '房地产行业' },
            { score: '-1分', color: 'text-red-600', criteria: '半导体/电子 / 化工/有色/钢铁/建材行业' },
            { score: '-1分', color: 'text-red-600', criteria: '摘要含"周期"/"周期性"' },
            { score: '-2分', color: 'text-red-600', criteria: '出口管制 / 地缘风险' },
            { score: '-1分', color: 'text-red-600', criteria: '产能过剩' },
            { score: '0~-3分', criteria: '多项叠加时累计，最多扣3分' },
          ]} />
        </div>

        {/* 6.4 竞争风险 */}
        <div className="border border-red-100 rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-red-800 mb-2">6.4 竞争风险（0~-3分）</h4>
          <CriteriaTable rows={[
            { score: '-2分', color: 'text-red-600', criteria: '价格战' },
            { score: '-1分', color: 'text-red-600', criteria: '替代 / 追赶 / 竞争加剧 / 市占率下滑' },
            { score: '0~-3分', criteria: '多项叠加时累计，最多扣3分' },
          ]} />
        </div>

        <p className="text-sm text-red-700 mt-2">⚠️ 风险扣分从总分中直接扣除，最多扣15分。另外7条评级约束规则可能触发评级上限。</p>
      </div>

      {/* ===== 评级标准 ===== */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">评级标准（v2.2：7档评级）</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">总分</th><th className="px-4 py-2 text-left">评级</th><th className="px-4 py-2 text-left">投资建议</th></tr></thead>
          <tbody>
            <tr className="border-t bg-red-50"><td className="px-4 py-2 font-bold">90-100分</td><td className="px-4 py-2"><span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">S</span></td><td className="px-4 py-2">质量优秀+估值有吸引力（极度低估）</td></tr>
            <tr className="border-t bg-rose-50"><td className="px-4 py-2 font-bold">85-89分</td><td className="px-4 py-2"><span className="bg-rose-500 text-white px-2 py-1 rounded text-xs font-bold">A+</span></td><td className="px-4 py-2">基本面很强+赔率好（强烈买入）</td></tr>
            <tr className="border-t bg-orange-50"><td className="px-4 py-2 font-bold">80-84分</td><td className="px-4 py-2"><span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">A</span></td><td className="px-4 py-2">基本面较强+配置价值（买入）</td></tr>
            <tr className="border-t bg-lime-50"><td className="px-4 py-2 font-bold">75-79分</td><td className="px-4 py-2"><span className="bg-lime-500 text-white px-2 py-1 rounded text-xs font-bold">B+</span></td><td className="px-4 py-2">有吸引力+可跟踪（偏强持有）</td></tr>
            <tr className="border-t bg-green-50"><td className="px-4 py-2 font-bold">70-74分</td><td className="px-4 py-2"><span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">B</span></td><td className="px-4 py-2">有亮点+需结合估值判断（持有）</td></tr>
            <tr className="border-t bg-yellow-50"><td className="px-4 py-2 font-bold">60-69分</td><td className="px-4 py-2"><span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">C</span></td><td className="px-4 py-2">逻辑一般+观察为主（观望）</td></tr>
            <tr className="border-t bg-gray-50"><td className="px-4 py-2 font-bold">60分以下</td><td className="px-4 py-2"><span className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-bold">D</span></td><td className="px-4 py-2">风险高+不宜配置（规避）</td></tr>
          </tbody>
        </table>
        <div className="mt-4 text-sm text-gray-600">
          <strong>v2.2 vs v2.0 评级门槛变化：</strong>
          S从90→90不变，A从80→80不变但新增A+（85+），B从70→70但新增B+（75+），C从60→60不变，D门槛不变。<br/>
          实际影响：因评分模型更严格，v2.2均分仅50.5，B级以上公司仅1家（招商银行72分）。
        </div>
      </div>

      {/* ===== 评级约束 ===== */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 border-amber-200">
        <h2 className="text-xl font-bold text-amber-800 mb-4">评级约束规则（7条）</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="border-l-4 border-amber-400 pl-3 py-1">
            <span className="font-medium">1. 财务真实性存疑</span> → 评级上限<span className="font-bold text-amber-700">C</span>
            <p className="text-xs text-gray-500 mt-0.5">触发：财务造假 / 审计问题 / 财务真实性</p>
          </div>
          <div className="border-l-4 border-amber-400 pl-3 py-1">
            <span className="font-medium">2. 连续2年经营现金流为负且利润为正</span> → 评级上限<span className="font-bold text-amber-700">C</span>
            <p className="text-xs text-gray-500 mt-0.5">触发：现金流连续为负 / 连续2年现金流为负</p>
          </div>
          <div className="border-l-4 border-amber-400 pl-3 py-1">
            <span className="font-medium">3. 单一客户收入占比超50%</span> → 评级上限<span className="font-bold text-amber-700">B</span>
            <p className="text-xs text-gray-500 mt-0.5">触发：单一客户占比超50% / 大客户依赖</p>
          </div>
          <div className="border-l-4 border-amber-400 pl-3 py-1">
            <span className="font-medium">4. 大股东高比例质押</span> → 评级上限<span className="font-bold text-amber-700">B</span>
            <p className="text-xs text-gray-500 mt-0.5">触发：质押比例高 / 平仓风险 / 大股东质押</p>
          </div>
          <div className="border-l-4 border-amber-400 pl-3 py-1">
            <span className="font-medium">5. 重大治理瑕疵</span> → 评级上限<span className="font-bold text-amber-700">C</span>
            <p className="text-xs text-gray-500 mt-0.5">触发：关联交易频繁 / 激进资本运作</p>
          </div>
          <div className="border-l-4 border-amber-400 pl-3 py-1">
            <span className="font-medium">6. 高杠杆+短债压力</span> → 评级上限<span className="font-bold text-amber-700">B</span>
            <p className="text-xs text-gray-500 mt-0.5">触发：短债压力 / 偿债风险高</p>
          </div>
          <div className="border-l-4 border-amber-400 pl-3 py-1">
            <span className="font-medium">7. 核心业务依赖单一政策</span> → 评级上限<span className="font-bold text-amber-700">B</span>
            <p className="text-xs text-gray-500 mt-0.5">触发：单一政策依赖 / 政策不确定性</p>
          </div>
        </div>
        <p className="text-sm text-amber-700 mt-4">多重约束触发时，取最严格的评级上限。如基础评级高于上限，则降级到上限。</p>
      </div>

      {/* ===== 缺失值处理 ===== */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 border-gray-300">
        <h2 className="text-xl font-bold text-gray-700 mb-4">缺失值处理规则</h2>
        <div className="text-sm text-gray-700 space-y-2">
          <p>当关键数据缺失时，对应维度评分上限为满分的70%：</p>
          <table className="w-full mt-2">
            <thead className="bg-gray-50">
              <tr><th className="px-4 py-2 text-left">维度</th><th className="px-4 py-2 text-left">缺失条件</th><th className="px-4 py-2 text-left">上限</th></tr>
            </thead>
            <tbody>
              <tr className="border-t"><td className="px-4 py-2">护城河</td><td className="px-4 py-2">-</td><td className="px-4 py-2">17分（25×70%）</td></tr>
              <tr className="border-t bg-gray-50"><td className="px-4 py-2">成长性</td><td className="px-4 py-2">营收增速与净利增速均缺失</td><td className="px-4 py-2">14分（20×70%）</td></tr>
              <tr className="border-t"><td className="px-4 py-2">盈利质量</td><td className="px-4 py-2">ROE、毛利率、净利率均缺失</td><td className="px-4 py-2">14分（20×70%）</td></tr>
              <tr className="border-t bg-gray-50"><td className="px-4 py-2">估值安全边际</td><td className="px-4 py-2">PE和PB均缺失</td><td className="px-4 py-2">17分（25×70%）</td></tr>
              <tr className="border-t"><td className="px-4 py-2">催化剂</td><td className="px-4 py-2">-</td><td className="px-4 py-2">7分（10×70%）</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">数据完整性检测：估值（PE+PB均无）、ROE、增速（营收+净利均无）、股息率缺失时标记</p>
        </div>
      </div>
    </>
  )
}

export default function RatingRules() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回公司列表
        </Link>
      </div>

      <V22Rules />

      <div className="bg-gray-50 rounded-lg border p-4 text-sm text-gray-600">
        <p className="font-medium mb-2">免责声明</p>
        <p>本评分系统仅供参考，不构成投资建议。投资有风险，入市需谨慎。请根据自身风险承受能力做出投资决策。</p>
        <p className="mt-2 text-xs">模型版本：v2.2（执行增强版） | 创建日期：2026-04-10</p>
      </div>
    </div>
  )
}
