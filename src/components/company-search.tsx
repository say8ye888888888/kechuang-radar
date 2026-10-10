"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CompanySearch() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      const json = await response.json()
      const data = json.data ?? json

      if (data.status === "failed") {
        setError(data.error || "收集企业信息失败")
        setLoading(false)
        return
      }

      router.push(`/company/${data.companyId}`)
    } catch {
      setError("网络错误，请重试")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="输入企业名称，如：杭州澄川半导体材料有限公司"
          aria-label="搜索企业名称"
          className="h-11 bg-white"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !name.trim()} className="h-11">
          <Search className="size-4" />
          {loading ? "收集中..." : "搜索"}
        </Button>
      </form>

      {loading && (
        <p className="text-sm text-[#6f655e]">
          正在收集企业信息，大模型联网检索专利、财务等数据，约需 10-30 秒…
        </p>
      )}

      {error && (
        <p className="text-sm text-[#9d1c2f]">{error}</p>
      )}
    </div>
  )
}
