"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type BatchResult = { name: string; status: string; companyId?: string; error?: string }

export function BatchImport() {
  const router = useRouter()
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<BatchResult[] | null>(null)

  const names = text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  async function handleSubmit() {
    if (names.length === 0 || loading) return
    setLoading(true)
    setResults(null)

    try {
      const res = await fetch("/api/search/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      })
      const json = await res.json()
      setResults(json.data?.results ?? [])
    } catch {
      setResults([{ name: "", status: "failed", error: "网络错误" }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"每行输入一个企业名称，例如：\n华为技术有限公司\n比亚迪股份有限公司\n中兴通讯股份有限公司\n宁德时代新能源科技有限公司"}
        rows={8}
        className="w-full rounded-lg border border-[#ddcfc3] bg-white px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-[#9d1c2f]"
        disabled={loading}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6f655e]">
          {names.length > 0 ? `共 ${names.length} 家企业待导入` : "请输入企业名称"}
        </p>
        <Button onClick={handleSubmit} disabled={loading || names.length === 0}>
          {loading ? "正在导入..." : "开始批量导入"}
        </Button>
      </div>

      {loading && (
        <p className="text-sm text-[#6f655e]">
          大模型逐个收集企业信息，每家约 10-30 秒，请耐心等待…
        </p>
      )}

      {results && (
        <div className="space-y-2">
          <div className="flex items-center justify-between border-t border-[#eadfd4] pt-3">
            <h3 className="text-sm font-semibold">导入结果</h3>
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              返回首页查看 →
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg ring-1 ring-[#eadfd4]">
            <table className="w-full text-sm">
              <thead className="bg-[#fbf6f1] text-xs text-[#6f655e]">
                <tr>
                  <th className="px-3 py-2 text-left">企业名称</th>
                  <th className="px-3 py-2 text-left">状态</th>
                  <th className="px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eadfd4] bg-white">
                {results.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">
                      {r.status === "failed" ? (
                        <span className="text-[#9d1c2f]">失败：{r.error}</span>
                      ) : r.status === "found_demo" ? (
                        <span className="text-[#6f655e]">已有（Demo）</span>
                      ) : r.status === "found_collected" ? (
                        <span className="text-[#6f655e]">已有（已收集）</span>
                      ) : (
                        <span className="text-green-700">已收集并评分</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.companyId && (
                        <button
                          className="text-[#9d1c2f] hover:underline"
                          onClick={() => router.push(`/company/${r.companyId}`)}
                        >
                          查看详情
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-[#6f655e]">
            成功 {results.filter((r) => r.status !== "failed").length} / {results.length} 家
          </p>
        </div>
      )}
    </div>
  )
}
