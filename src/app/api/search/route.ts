import { NextResponse } from "next/server"
import { searchCompany } from "@/server/services/search-service"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  let body: { name?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (!name) {
    return NextResponse.json({ error: "企业名称不能为空" }, { status: 422 })
  }

  const result = await searchCompany(name)

  if (result.status === "failed") {
    return NextResponse.json(
      { data: { status: "failed", error: result.error } },
      { status: 200 },
    )
  }

  return NextResponse.json({
    data: { status: result.status, companyId: result.companyId },
  })
}
