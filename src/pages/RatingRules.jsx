import { Link } from 'react-router-dom'

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

      <h1 className="text-3xl font-bold text-gray-900 mb-2">A股投资价值量化评分模型</h1>
      <p className="text-gray-600 mb-8">五维度评分体系，总分100分</p>

      {/* 评分维度 */}
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

        <p className="text-center text-gray-700">
          五个维度综合评分，<span className="font-bold">总分100分</span>
        </p>
      </div>

      {/* 维度一：护城河 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度一：护城河（0-25分）</h3>
        
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">评分</th>
              <th className="px-4 py-2 text-left">标准</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium text-green-600">22-25分</td>
              <td className="px-4 py-2">绝对龙头，不可替代（如茅台）</td>
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-medium">17-21分</td>
              <td className="px-4 py-2">强护城河，但存在替代品</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium">12-16分</td>
              <td className="px-4 py-2">中等护城河，竞争优势明显但有挑战</td>
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-medium">7-11分</td>
              <td className="px-4 py-2">护城河较弱，竞争激烈</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium text-red-600">0-6分</td>
              <td className="px-4 py-2">无护城河，同质化竞争</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700"><strong>评分要素：</strong></p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1">
            <li>• 品牌溢价：茅台（+8）、招行（+5）、平安（+4）</li>
            <li>• 技术壁垒：中际旭创（+4）、宁德时代（+4）</li>
            <li>• 资源垄断：长江电力（+5）、中国神华（+5）、中国广核（+5）</li>
            <li>• 成本优势：比亚迪（+3）、中国神华（+4）</li>
          </ul>
        </div>
      </div>

      {/* 维度二：成长性 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度二：成长性（0-20分）</h3>
        
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">评分</th>
              <th className="px-4 py-2 text-left">标准</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium text-green-600">18-20分</td>
              <td className="px-4 py-2">高增长，营收/利润增速大于20%</td>
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-medium">14-17分</td>
              <td className="px-4 py-2">中高增长，增速10-20%</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium">10-13分</td>
              <td className="px-4 py-2">稳健增长，增速5-10%</td>
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-medium">5-9分</td>
              <td className="px-4 py-2">低增长或负增长，增速小于5%</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium text-red-600">0-4分</td>
              <td className="px-4 py-2">衰退，负增长大于10%</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-700"><strong>评分示例：</strong></p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1">
            <li>• 中际旭创（+109%净利增长）：18分</li>
            <li>• 中国平安（NBV +29%）：16分</li>
            <li>• 贵州茅台（+15%营收）：14分</li>
            <li>• 宁德时代（+42%净利）：16分</li>
            <li>• 中国广核/招商银行/长江电力（稳定）：10分</li>
            <li>• 比亚迪（-19%净利）：6分</li>
          </ul>
        </div>
      </div>

      {/* 维度三：盈利质量 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度三：盈利质量（0-20分）</h3>
        
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">评分</th>
              <th className="px-4 py-2 text-left">标准</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium text-green-600">18-20分</td>
              <td className="px-4 py-2">ROE大于20%，毛利率大于40%，现金流极强，分红率大于50%</td>
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-medium">14-17分</td>
              <td className="px-4 py-2">ROE 15-20%，毛利率大于30%，现金流强，分红率大于40%</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium">10-13分</td>
              <td className="px-4 py-2">ROE 10-15%，毛利率大于20%，现金流稳定，分红率大于30%</td>
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-medium">5-9分</td>
              <td className="px-4 py-2">ROE 5-10%，毛利率小于20%，现金流一般，分红率小于30%</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium text-red-600">0-4分</td>
              <td className="px-4 py-2">ROE小于5%，现金流弱，不分红</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-gray-700"><strong>评分示例：</strong></p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1">
            <li>• 贵州茅台（ROE约30%，毛利91%）：20分</li>
            <li>• 中际旭创（ROE 43%，毛利33%）：18分</li>
            <li>• 长江电力（ROE约15%，现金流强）：16分</li>
            <li>• 招商银行（ROAE 13.44%）：16分</li>
            <li>• 中国平安（ROE约12%）：14分</li>
            <li>• 比亚迪（毛利17%，净利率4%）：10分</li>
          </ul>
        </div>
      </div>

      {/* 维度四：估值安全边际 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度四：估值安全边际（0-25分）</h3>
        
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">评分</th>
              <th className="px-4 py-2 text-left">标准</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium text-green-600">22-25分</td>
              <td className="px-4 py-2">PE/PB处于历史低位（小于20%分位），股息率大于5%</td>
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-medium">17-21分</td>
              <td className="px-4 py-2">PE/PB合理偏低（20-40%分位），股息率3-5%</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium">12-16分</td>
              <td className="px-4 py-2">PE/PB合理（40-60%分位），股息率2-3%</td>
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-medium">7-11分</td>
              <td className="px-4 py-2">PE/PB偏高（60-80%分位），股息率小于2%</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium text-red-600">0-6分</td>
              <td className="px-4 py-2">PE/PB历史高位（大于80%分位），无股息</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-gray-700"><strong>估值分位参考：</strong></p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left">公司</th>
                  <th className="px-2 py-1 text-right">PE</th>
                  <th className="px-2 py-1 text-right">PB</th>
                  <th className="px-2 py-1 text-right">PE分位</th>
                  <th className="px-2 py-1 text-right">股息率</th>
                  <th className="px-2 py-1 text-right">评分</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-2 py-1">招商银行</td>
                  <td className="px-2 py-1 text-right">6倍</td>
                  <td className="px-2 py-1 text-right">0.8倍</td>
                  <td className="px-2 py-1 text-right">小于10%</td>
                  <td className="px-2 py-1 text-right">约5%</td>
                  <td className="px-2 py-1 text-right font-bold text-green-600">25分</td>
                </tr>
                <tr className="border-t bg-gray-50">
                  <td className="px-2 py-1">中国平安</td>
                  <td className="px-2 py-1 text-right">7倍</td>
                  <td className="px-2 py-1 text-right">0.6倍(P/EV)</td>
                  <td className="px-2 py-1 text-right">小于10%</td>
                  <td className="px-2 py-1 text-right">约4%</td>
                  <td className="px-2 py-1 text-right font-bold text-green-600">25分</td>
                </tr>
                <tr className="border-t">
                  <td className="px-2 py-1">中国神华</td>
                  <td className="px-2 py-1 text-right">11倍</td>
                  <td className="px-2 py-1 text-right">1.5倍</td>
                  <td className="px-2 py-1 text-right">小于30%</td>
                  <td className="px-2 py-1 text-right">6-7%</td>
                  <td className="px-2 py-1 text-right font-bold">22分</td>
                </tr>
                <tr className="border-t bg-gray-50">
                  <td className="px-2 py-1">贵州茅台</td>
                  <td className="px-2 py-1 text-right">22倍</td>
                  <td className="px-2 py-1 text-right">8倍</td>
                  <td className="px-2 py-1 text-right">约50%</td>
                  <td className="px-2 py-1 text-right">约2.5%</td>
                  <td className="px-2 py-1 text-right font-bold">15分</td>
                </tr>
                <tr className="border-t">
                  <td className="px-2 py-1">宁德时代</td>
                  <td className="px-2 py-1 text-right">25倍</td>
                  <td className="px-2 py-1 text-right">5.4倍</td>
                  <td className="px-2 py-1 text-right">约80%</td>
                  <td className="px-2 py-1 text-right">约0.5%</td>
                  <td className="px-2 py-1 text-right font-bold text-red-600">8分</td>
                </tr>
                <tr className="border-t bg-gray-50">
                  <td className="px-2 py-1">比亚迪</td>
                  <td className="px-2 py-1 text-right">30倍</td>
                  <td className="px-2 py-1 text-right">—</td>
                  <td className="px-2 py-1 text-right">约70%</td>
                  <td className="px-2 py-1 text-right">约1%</td>
                  <td className="px-2 py-1 text-right font-bold text-red-600">8分</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 维度五：催化剂 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">维度五：催化剂（0-10分）</h3>
        
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">评分</th>
              <th className="px-4 py-2 text-left">标准</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium text-green-600">9-10分</td>
              <td className="px-4 py-2">强催化剂已出现（业绩拐点、政策落地、资产注入）</td>
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-medium">7-8分</td>
              <td className="px-4 py-2">催化剂明确但时间未定</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium">5-6分</td>
              <td className="px-4 py-2">潜在催化剂，需观察</td>
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-medium">3-4分</td>
              <td className="px-4 py-2">无明显催化剂，业绩平稳</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium text-red-600">0-2分</td>
              <td className="px-4 py-2">负面因素主导</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-gray-700"><strong>评分示例：</strong></p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1">
            <li>• 中国平安（NBV +29%拐点确认）：9分</li>
            <li>• 中国广核（CfD机制+惠州投产）：8分</li>
            <li>• 中际旭创（AI算力爆发）：8分</li>
            <li>• 长江电力（算电协同）：7分</li>
            <li>• 宁德时代（市占率重返50%）：7分</li>
            <li>• 比亚迪（价格战压力）：3分</li>
          </ul>
        </div>
      </div>

      {/* 评级标准 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">二、评级标准</h2>
        
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">总分</th>
              <th className="px-4 py-2 text-left">评级</th>
              <th className="px-4 py-2 text-left">投资建议</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t bg-red-50">
              <td className="px-4 py-2 font-bold">90-100分</td>
              <td className="px-4 py-2"><span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">S</span></td>
              <td className="px-4 py-2">极度低估/确定性极高（强烈买入）</td>
            </tr>
            <tr className="border-t bg-orange-50">
              <td className="px-4 py-2 font-bold">80-89分</td>
              <td className="px-4 py-2"><span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">A</span></td>
              <td className="px-4 py-2">明显低估/逻辑清晰（买入）</td>
            </tr>
            <tr className="border-t bg-green-50">
              <td className="px-4 py-2 font-bold">70-79分</td>
              <td className="px-4 py-2"><span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">B</span></td>
              <td className="px-4 py-2">合理偏高/逻辑通顺（持有）</td>
            </tr>
            <tr className="border-t bg-yellow-50">
              <td className="px-4 py-2 font-bold">60-69分</td>
              <td className="px-4 py-2"><span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">C</span></td>
              <td className="px-4 py-2">估值偏高/需要观察（观望）</td>
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-bold">60分以下</td>
              <td className="px-4 py-2"><span className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-bold">D</span></td>
              <td className="px-4 py-2">高风险/逻辑有硬伤（规避）</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 免责声明 */}
      <div className="bg-gray-50 rounded-lg border p-4 text-sm text-gray-600">
        <p className="font-medium mb-2">免责声明</p>
        <p>本评分系统仅供参考，不构成投资建议。投资有风险，入市需谨慎。请根据自身风险承受能力做出投资决策。</p>
        <p className="mt-2 text-xs">模型版本：v2.0（修正版）| 创建日期：2026-04-01</p>
      </div>
    </div>
  )
}