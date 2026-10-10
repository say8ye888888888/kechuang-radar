import { NextResponse } from "next/server"
import { evaluationStore } from "@/server/repositories/evaluation-store"
import { evaluateSubmittedCompany } from "@/server/services/evaluation-service"
import { mockCollect } from "@/server/services/llm-collector"
import { validateCompanyInput } from "@/server/validation/company-input"

const COMPANY_NAMES = [
  // 第三代半导体材料 (10)
  "杭州澄瑞半导体材料有限公司", "深圳碳硅晶体科技有限公司", "上海氮镓半导体有限公司",
  "苏州宽禁带半导体材料有限公司", "合肥碳化硅衬底有限公司", "无锡光电半导体材料有限公司",
  "南京氮化镓外延科技有限公司", "东莞碳化硅功率器件有限公司", "武汉硅基集成材料有限公司",
  "成都砷化镓晶圆有限公司",

  // 工业软件 (10)
  "北京智核工业软件有限公司", "深圳数擎软件科技有限公司", "上海工软互联技术有限公司",
  "广州制造云软件有限公司", "杭州鸿图工业互联网有限公司", "南京智控软件有限公司",
  "苏州中科工业软件有限公司", "西安航天信息科技有限公司", "成都电子设计自动化有限公司",
  "青岛海工智能软件有限公司",

  // 生物医药 (10)
  "上海谱新生物医药有限公司", "苏州基因巢生物科技有限公司", "杭州肽度医药有限公司",
  "深圳百奥赛思制药有限公司", "北京诺康生物医药有限公司", "南京星联疫苗技术有限公司",
  "武汉光谷生物制药有限公司", "成都蓉生药业科技有限公司", "广州南粤医药研发有限公司",
  "天津津瑞特生物科技有限公司",

  // 新能源材料 (10)
  "宁德时代新能源材料有限公司", "深圳锂源动力材料有限公司", "上海氢能储存材料有限公司",
  "苏州光伏硅片材料有限公司", "合肥固态电池材料有限公司", "无锡正极材料科技有限公司",
  "南京燃料电池催化材料有限公司", "东莞电解液科技有限公司", "西安锌溴储能材料有限公司",
  "青岛海水制氢材料有限公司",

  // 低空经济与航空器控制 (10)
  "深圳翼龙无人机科技有限公司", "广州蜻蜓飞行器制造有限公司", "成都旋翼航空科技有限公司",
  "北京天途无人机有限公司", "杭州云鹰航空科技有限公司", "南京飞腾航空控制有限公司",
  "苏州雁翔低空科技科技有限公司", "西安腾宇航空电子有限公司", "武汉巡空无人机有限公司",
  "青岛海空联运飞行器有限公司",

  // 海洋工程装备 (10)
  "大连远洋海工装备有限公司", "青岛海鑫海洋工程科技有限公司", "上海中船海洋装备有限公司",
  "深圳深海探测装备有限公司", "天津港工重型装备有限公司", "广州海洋石油工程有限公",
  "烟台海工平台制造有限公司", "舟山深蓝海洋科技有限公", "南通海上风电装备有限公司",
  "湛江海洋勘探装备科技有限公司",
]

export async function POST() {
  const results: { name: string; status: string; companyId?: string }[] = []
  let created = 0
  let skipped = 0

  for (const name of COMPANY_NAMES) {
    const asOf = new Date().toISOString().slice(0, 10)

    // Check if already stored
    const existing = await evaluationStore.findByName(name)
    if (existing) {
      results.push({ name, status: "already_exists", companyId: existing.companyId })
      skipped++
      continue
    }

    // Generate mock company data
    const company = mockCollect(name)
    const validation = validateCompanyInput(company)
    if (!validation.success) {
      results.push({ name, status: "validation_failed" })
      continue
    }

    // Evaluate and store
    const evaluation = evaluateSubmittedCompany(validation.data, { asOf })
    await evaluationStore.save(validation.data, evaluation, asOf)
    results.push({ name, status: "created", companyId: company.id })
    created++
  }

  return NextResponse.json({
    data: { total: COMPANY_NAMES.length, created, skipped, results },
  })
}
