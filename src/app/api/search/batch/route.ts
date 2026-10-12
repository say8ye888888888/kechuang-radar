import { NextResponse } from "next/server"
import { uniqueCompanyNames } from "@/lib/company-name"
import { searchCompany } from "@/server/services/search-service"

export const runtime = "nodejs"
export const maxDuration = 300

const CONCURRENCY = 2

export async function POST(request: Request) {
  let body: { names?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 })
  }

  const raw = Array.isArray(body.names) ? body.names : []
  const names = uniqueCompanyNames(raw.filter((name): name is string => typeof name === "string"))

  if (names.length === 0) {
    return NextResponse.json({ error: "企业名称列表不能为空" }, { status: 422 })
  }

  if (names.length > 50) {
    return NextResponse.json({ error: "单次最多导入 50 家企业" }, { status: 422 })
  }

  const results: { name: string; status: string; companyId?: string; error?: string }[] =
    new Array(names.length)
  let cursor = 0

  async function worker() {
    while (cursor < names.length) {
      const index = cursor++
      const name = names[index]
      const result = await searchCompany(name)
      results[index] =
        result.status === "failed"
          ? { name, status: "failed", error: result.error }
          : { name, status: result.status, companyId: result.companyId }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, names.length) }, () => worker()),
  )

  return NextResponse.json({ data: { results } })
}
