import { problem, ok } from "@/server/http"
import { findEvidence } from "@/server/services/evaluation-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const companyId = new URL(request.url).searchParams.get("companyId") ?? undefined
  const matches = await findEvidence(id, companyId)
  if (matches.length === 0) return problem(404, "EVIDENCE_NOT_FOUND", "未找到指定证据")
  if (matches.length > 1) {
    return problem(409, "AMBIGUOUS_EVIDENCE", "证据编号在多个企业中重复，请提供 companyId", matches.map((item) => ({
      path: "companyId",
      message: item.company.id,
    })))
  }
  return ok(matches[0])
}
