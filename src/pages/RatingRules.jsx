import { Link } from 'react-router-dom'

function RatingRules() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
          ← 返回列表
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">评分系统规则说明</h1>

        {/* 评级体系概述 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">一、评级体系</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 pr-4">评级</th>
                  <th className="text-left py-2 pr-4">分数范围</th>
                  <th className="text-left py-2">含义</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">S+级</span></td>
                  <td className="py-2 pr-4">80-100分</td>
                  <td className="py-2">强烈推荐，极具投资价值</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">S级</span></td>
                  <td className="py-2 pr-4">70-79分</td>
                  <td className="py-2">推荐买入，价值显著</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4"><span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">A级</span></td>
                  <td className="py-2 pr-4">60-69分</td>
                  <td className="py-2">可以考虑，谨慎买入</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">B级</span></td>
                  <td className="py-2 pr-4">50-59分</td>
                  <td className="py-2">中性观望</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><span className="bg-red-50 text-red-400 px-2 py-0.5 rounded text-xs font-medium">C级</span></td>
                  <td className="py-2 pr-4">50分以下</td>
                  <td className="py-2">建议规避</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 评分维度 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">二、评分维度（满分100分）</h2>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">估值维度 (25分)</span>
                <span className="text-sm text-gray-500">权重25%</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• PE（市盈率）是否低于行业平均或历史均值</li>
                <li>• PB（市净率）是否处于历史低位</li>
                <li>• 股息率是否具有吸引力</li>
                <li>• 估值分位是否处于合理区间</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">成长维度 (25分)</span>
                <span className="text-sm text-gray-500">权重25%</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• 营收增速是否稳定</li>
                <li>• 净利润增速是否高于营收（规模化效应）</li>
                <li>• 是否有新的增长点（新产品、新市场）</li>
                <li>• 行业景气度是否向上</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">护城河维度 (25分)</span>
                <span className="text-sm text-gray-500">权重25%</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• 规模效应（成本优势）</li>
                <li>• 品牌护城河（定价权）</li>
                <li>• 网络效应（用户粘性）</li>
                <li>• 技术壁垒（专利、技术领先）</li>
                <li>• 渠道护城河</li>
                <li>• 资质/许可证壁垒</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">其他维度 (25分)</span>
                <span className="text-sm text-gray-500">权重25%</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• ROE（净资产收益率）是否稳定在15%以上</li>
                <li>• 现金流质量（经营现金流/净利润）</li>
                <li>• 分红稳定性与分红率</li>
                <li>• 治理结构与管理团队</li>
                <li>• 行业竞争格局（是否寡头垄断）</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 评分标准 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">三、评分标准</h2>
          <div className="bg-blue-50 rounded-lg p-4">
            <ul className="text-sm text-gray-700 space-y-2">
              <li><strong>• 估值维度：</strong>PE小于15倍得满分，15-25倍得15-20分，大于25倍得10分以下</li>
              <li><strong>• 成长维度：</strong>净利润增速大于20%得满分，10-20%得15-20分，小于10%得10分以下</li>
              <li><strong>• 护城河维度：</strong>具备4种以上护城河得20-25分，2-3种得15-20分，少于2种得15分以下</li>
              <li><strong>• 其他维度：</strong>ROE大于20%满分，15-20%得15-20分，小于15%得15分以下</li>
            </ul>
          </div>
        </section>

        {/* 投资建议 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">四、投资建议</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">强烈买入</h3>
              <p className="text-sm text-green-700">S+级或S级，估值处于历史底部，护城河深厚</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">可以考虑</h3>
              <p className="text-sm text-yellow-700">A级，估值合理，有一定成长性</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-800 mb-2">建议规避</h3>
              <p className="text-sm text-red-700">C级，估值偏高，护城河浅，竞争激烈</p>
            </div>
          </div>
        </section>

        {/* 免责声明 */}
        <section className="pt-6 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-2">免责声明</h3>
            <p className="text-xs text-gray-500">
              本评分系统仅供参考，不构成投资建议。投资有风险，入市需谨慎。
              请根据自身风险承受能力做出投资决策，并建议进行充分的个人研究或咨询专业投资顾问。
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default RatingRules