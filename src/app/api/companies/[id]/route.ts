import { problem } from "@/server/http"
import { evaluationValidation, getEvaluation, validAsOf } from "@/server/services/evaluation-service"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const rawAsOf = new URL(request.url).searchParams.get("asOf")
  const asOf = rawAsOf ?? undefined
  if (rawAsOf !== null && !validAsOf(rawAsOf)) {
    return problem(422, "INVALID_AS_OF", "asOf 必须是有效的 YYYY-MM-DD 日期")
  }
  const evaluation = await getEvaluation(id, {
    asOf,
  })
  return evaluation
    ? NextResponse.json({
        data: { evaluation, validation: evaluationValidation(evaluation) },
      })
    : problem(404, "COMPANY_NOT_FOUND", "未找到指定企业")
}
