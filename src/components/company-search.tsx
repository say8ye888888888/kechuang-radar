"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requestCompanySearch } from "@/lib/search-client"

export function CompanySearch() {
  const router = useRouter()
  const pending = useRef(false)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || pending.current) return

    pending.current = true
    setLoading(true)
    setError(null)

    try {
      const result = await requestCompanySearch(trimmed)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/company/${result.companyId}`)
    } finally {
      pending.current = false
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
          {loading ? "查找中..." : "搜索"}
        </Button>
      </form>

      {loading && (
        <p className="text-sm text-[#6f655e]">
          正在查找已有评估。若是新企业，大模型联网收集专利、财务等数据，约需 10-30 秒…
        </p>
      )}

      {error && (
        <p className="text-sm text-[#9d1c2f]">{error}</p>
      )}
    </div>
  )
}
