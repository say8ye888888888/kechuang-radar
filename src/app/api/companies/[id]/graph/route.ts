import { NextResponse } from "next/server"
import { getCompanyGraph } from "@/server/services/graph-service"
import { problem } from "@/server/http"
import { validAsOf } from "@/server/services/evaluation-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const url = new URL(request.url)
  const depth = Number(url.searchParams.get("depth") ?? "2")
  const rawAsOf = url.searchParams.get("asOf")
  if (rawAsOf !== null && !validAsOf(rawAsOf)) {
    return problem(422, "INVALID_AS_OF", "asOf 必须是有效的 YYYY-MM-DD 日期")
  }
  const graph = await getCompanyGraph(id, Number.isFinite(depth) ? depth : 2, {
    asOf: rawAsOf ?? undefined,
  })
  if (!graph) {
    return NextResponse.json(
      { error: { code: "COMPANY_NOT_FOUND", message: "未找到指定企业" } },
      { status: 404 },
    )
  }
  return NextResponse.json({ data: graph })
}
