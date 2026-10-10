import { NextResponse } from "next/server"
import { searchCompany } from "@/server/services/search-service"

export async function POST(request: Request) {
  let body: { names?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 })
  }

  const raw = Array.isArray(body.names) ? body.names : []
  const names = raw
    .filter((n): n is string => typeof n === "string")
    .map((n) => n.trim())
    .filter((n) => n.length > 0)

  if (names.length === 0) {
    return NextResponse.json({ error: "企业名称列表不能为空" }, { status: 422 })
  }

  if (names.length > 50) {
    return NextResponse.json({ error: "单次最多导入 50 家企业" }, { status: 422 })
  }

  // Process sequentially to avoid overwhelming the LLM API
  const results: { name: string; status: string; companyId?: string; error?: string }[] = []
  for (const name of names) {
    const result = await searchCompany(name)
    if (result.status === "failed") {
      results.push({ name, status: "failed", error: result.error })
    } else {
      results.push({ name, status: result.status, companyId: result.companyId })
    }
  }

  return NextResponse.json({ data: { results } })
}
