import { problem, ok } from "@/server/http"
import { evaluateSubmittedCompany, evaluationValidation, validAsOf } from "@/server/services/evaluation-service"
import { validateCompanyInput } from "@/server/validation/company-input"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return problem(400, "INVALID_JSON", "请求体不是有效 JSON")
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("company" in body)
  ) {
    return problem(422, "INVALID_BODY", "请求体必须包含 company 字段")
  }
  const validation = validateCompanyInput((body as { company: unknown }).company)
  if (!validation.success) {
    return problem(422, "VALIDATION_ERROR", "企业资料校验失败", validation.issues)
  }
  const rawAsOf = (body as { asOf?: unknown }).asOf
  if (rawAsOf !== undefined && typeof rawAsOf !== "string") {
    return problem(422, "INVALID_AS_OF", "asOf 必须是有效的 YYYY-MM-DD 日期")
  }
  const asOf = rawAsOf as string | undefined
  if (rawAsOf !== undefined && !validAsOf(asOf)) {
    return problem(422, "INVALID_AS_OF", "asOf 必须是有效的 YYYY-MM-DD 日期")
  }
  const evaluation = evaluateSubmittedCompany(validation.data, { asOf })
  return ok({ evaluation, validation: evaluationValidation(evaluation) })
}
