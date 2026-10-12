"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { uniqueCompanyNames } from "@/lib/company-name"
import { requestCompanySearch } from "@/lib/search-client"

const BATCH_LIMIT = 50
const CONCURRENCY = 2

type BatchResult = { name: string; status: string; companyId?: string; error?: string }

function lineCount(text: string) {
  return text.split("\n").filter((line) => line.trim().length > 0).length
}

export function BatchImport() {
  const router = useRouter()
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<BatchResult[] | null>(null)

  const names = useMemo(() => uniqueCompanyNames(text.split("\n")), [text])
  const entered = lineCount(text)
  const overLimit = names.length > BATCH_LIMIT

  async function handleSubmit() {
    if (names.length === 0 || names.length > BATCH_LIMIT || loading) return
    const queue = names
    setLoading(true)
    setResults(queue.map((name) => ({ name, status: "pending" })))

    let cursor = 0
    async function worker() {
      while (cursor < queue.length) {
        const index = cursor++
        const name = queue[index]
        setResults((current) =>
          current?.map((item, itemIndex) =>
            itemIndex === index ? { ...item, status: "running" } : item,
          ) ?? current,
        )
        const result = await requestCompanySearch(name)
        setResults((current) =>
          current?.map((item, itemIndex) => {
            if (itemIndex !== index) return item
            return result.ok
              ? { name, status: result.status, companyId: result.companyId }
              : { name, status: "failed", error: result.error }
          }) ?? current,
        )
      }
    }

    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
      )
    } finally {
      setLoading(false)
    }
  }

  const finished = results?.filter((item) => item.status !== "pending" && item.status !== "running").length ?? 0

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

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#6f655e]">
          {names.length === 0
            ? "请输入企业名称"
            : overLimit
              ? `去重后 ${names.length} 家，单次最多导入 ${BATCH_LIMIT} 家`
              : entered === names.length
                ? `共 ${names.length} 家企业待导入`
                : `输入 ${entered} 行，去重后 ${names.length} 家`}
        </p>
        <Button onClick={handleSubmit} disabled={loading || names.length === 0 || overLimit}>
          {loading ? "正在导入..." : "开始批量导入"}
        </Button>
      </div>

      {loading && results && (
        <p className="text-sm text-[#6f655e]">
          已完成 {finished} / {results.length} 家。已有报告的企业会立即完成，新企业需要逐家生成。
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
                  <tr key={`${r.name}-${i}`}>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">
                      {r.status === "pending" ? (
                        <span className="text-[#6f655e]">等待中</span>
                      ) : r.status === "running" ? (
                        <span className="text-[#6f655e]">查找中</span>
                      ) : r.status === "failed" ? (
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

          {!loading && (
            <p className="text-xs text-[#6f655e]">
              成功 {results.filter((r) => r.status !== "failed" && r.status !== "pending" && r.status !== "running").length} / {results.length} 家
            </p>
          )}
        </div>
      )}
    </div>
  )
}
