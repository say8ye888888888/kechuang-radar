import { companies } from "./companies"
import { enrichDemoCompany } from "./demo-data"
import { evaluate } from "./score"
import type { Evaluation } from "./types"

const order = ["chengchuan", "zhiheng", "lanxi", "hengshi", "jingmai", "haiyu"]

export const catalog: Evaluation[] = order.map((id) => {
  const company = companies.find((item) => item.id === id)
  if (!company) throw new Error(`缺少演示企业 ${id}`)
  return evaluate(enrichDemoCompany(company), { asOf: "2026-10-05" })
})

export function getEvaluation(id: string) {
  return catalog.find((item) => item.company.id === id)
}
