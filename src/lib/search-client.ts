const SEARCH_TIMEOUT_MS = 70_000

export type CompanySearchOutcome =
  | { ok: true; status: string; companyId: string }
  | { ok: false; error: string }

export async function requestCompanySearch(name: string): Promise<CompanySearchOutcome> {
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    })
    const json = (await response.json().catch(() => null)) as {
      data?: { status?: string; companyId?: string | null; error?: string }
      error?: string
    } | null

    if (!json) return { ok: false, error: "服务器返回了无法解析的结果" }
    if (!response.ok) return { ok: false, error: json.error || "搜索失败" }

    const data = json.data
    if (!data?.status || data.status === "failed" || !data.companyId) {
      return { ok: false, error: data?.error || "收集企业信息失败" }
    }
    return { ok: true, status: data.status, companyId: data.companyId }
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return { ok: false, error: "查找超时，请重试" }
    }
    return { ok: false, error: "网络错误，请重试" }
  }
}
