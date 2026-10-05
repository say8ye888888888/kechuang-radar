import { ok } from "@/server/http"
import { listEvaluations, validAsOf } from "@/server/services/evaluation-service"
import { problem } from "@/server/http"

const productCodes = new Set(["patent-loan", "credit-loan", "investigate", "hold", "decline"])

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? ""
  const product = url.searchParams.get("product")
  const rawAsOf = url.searchParams.get("asOf")
  const asOf = rawAsOf ?? undefined
  if (product && !productCodes.has(product)) {
    return problem(422, "INVALID_PRODUCT", "product 参数无效")
  }
  if (rawAsOf !== null && !validAsOf(rawAsOf)) {
    return problem(422, "INVALID_AS_OF", "asOf 必须是有效的 YYYY-MM-DD 日期")
  }
  const evaluations = await listEvaluations({ asOf })
  const items = evaluations
    .filter((evaluation) => {
      const blob = `${evaluation.company.id} ${evaluation.company.name} ${evaluation.company.shortName} ${evaluation.company.city} ${evaluation.company.strategicSector}`.toLowerCase()
      return (!query || blob.includes(query)) &&
        (!product || evaluation.decision.product === product)
    })
    .map((evaluation) => ({
      id: evaluation.company.id,
      name: evaluation.company.name,
      shortName: evaluation.company.shortName,
      city: evaluation.company.city,
      sector: evaluation.company.strategicSector,
      composite: evaluation.composite,
      grade: evaluation.grade,
      decision: evaluation.decision,
      financeStatus: evaluation.evidenceStatus?.financeStatus,
      scoreScope: evaluation.scoreScope,
      risk: evaluation.riskNotes[0]?.detail ?? "",
      meta: evaluation.meta,
    }))
  return ok({ items, count: items.length })
}
