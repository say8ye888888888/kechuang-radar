"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { displayText } from "@/lib/display"
import { productLabel } from "@/lib/labels"
import type { Evaluation, ProductCode } from "@/lib/types"

const PAGE_SIZE = 10

const filters: { id: "all" | ProductCode; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "patent-loan", label: "科创专利贷" },
  { id: "credit-loan", label: "科技信用贷" },
  { id: "hold", label: "暂缓" },
  { id: "investigate", label: "补充调查" },
  { id: "decline", label: "暂不建议" },
]

function blockerOf(item: Evaluation) {
  if (item.decision.product === "patent-loan") return "可进入下一步核验"
  if (item.decision.product === "credit-loan") {
    const gate = item.ruleChecks.find(
      (check) =>
        !check.pass &&
        (check.reasonCode === "PLEDGEABLE_COUNT" ||
          check.reasonCode === "PATENT_TECH_THRESHOLD" ||
          check.reasonCode === "PATENT_RISK_THRESHOLD" ||
          check.reasonCode === "PATENT_FINANCE_THRESHOLD"),
    )
    return gate?.label ?? "可进入下一步核验"
  }
  const matched = item.ruleChecks.find(
    (check) => !check.pass && check.reasonCode === item.decision.reasonCode,
  )
  return displayText(matched?.detail ?? item.decision.reason)
}

function scopeLabel(item: Evaluation) {
  return item.scoreScope === "innovation-only" ? "偿债待补" : "五维"
}

function decisionVariant(product: ProductCode) {
  if (product === "patent-loan") return "default" as const
  if (product === "hold") return "destructive" as const
  if (product === "decline") return "secondary" as const
  return "outline" as const
}

export function Queue({ items }: { items: Evaluation[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all")
  const [page, setPage] = useState(1)

  const visible = useMemo(() => {
    const keyword = query.trim()
    return items.filter((item) => {
      const blob = `${item.company.name}${item.company.city}${item.company.strategicSector}`
      const matchText = keyword.length === 0 || blob.includes(keyword)
      const matchFilter = filter === "all" || item.decision.product === filter
      return matchText && matchFilter
    })
  }, [filter, items, query])

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setPage(1)
  }, [query, filter])

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageItems = visible.slice(pageStart, pageStart + PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索企业、城市或产业"
          aria-label="搜索待预审企业"
          className="h-9 bg-white sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {filters.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={filter === item.id ? "default" : "outline"}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#ddcfc3] bg-white px-4 py-10 text-center text-sm text-[#6f655e]">
          没有匹配的企业。清空搜索，或换一个名称、城市、产业。
        </div>
      ) : (
        <div className="space-y-6">
          <ScoreGroup
            title="五维已评"
            hint="偿债材料已录入，分数可以互相比较。"
            items={pageItems.filter((item) => item.scoreScope !== "innovation-only")}
          />
          <ScoreGroup
            title="偿债待补"
            hint="财务维度未评分，不能和上面的五维分数横比。"
            items={pageItems.filter((item) => item.scoreScope === "innovation-only")}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#eadfd4] pt-4">
              <p className="text-xs text-[#6f655e]">
                共 {visible.length} 家企业，第 {currentPage}/{totalPages} 页
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  上一页
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === currentPage ? "default" : "outline"}
                    className="min-w-9"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreGroup({
  title,
  hint,
  items,
}: {
  title: string
  hint: string
  items: Evaluation[]
}) {
  if (items.length === 0) return null
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-[#6f655e]">{hint}</p>
      </div>
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[22%]">企业</TableHead>
              <TableHead className="w-[16%]">产业</TableHead>
              <TableHead className="w-[14%]">科技预评分</TableHead>
              <TableHead className="w-[14%]">预审结论</TableHead>
              <TableHead>主要卡点</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.company.id}>
                <TableCell>
                  <Link href={`/company/${item.company.id}`} className="font-medium hover:underline">
                    {item.company.shortName}
                  </Link>
                  <div className="text-xs text-[#6f655e]">
                    {item.company.city} · {item.company.name}
                  </div>
                </TableCell>
                <TableCell>{item.company.strategicSector}</TableCell>
                <TableCell>
                  <span className="font-semibold tabular-nums">{item.composite}</span>
                  <span className="ml-2 text-xs text-[#6f655e]">
                    {item.grade} · {scopeLabel(item)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={decisionVariant(item.decision.product)}>
                    {productLabel[item.decision.product]}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-normal text-[#3f342e]">{blockerOf(item)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="space-y-3 md:hidden">
        {items.map((item) => (
          <li key={item.company.id} className="rounded-xl bg-[#fbf6f1] p-4 ring-1 ring-[#eadfd4]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/company/${item.company.id}`} className="font-medium">
                  {item.company.shortName}
                </Link>
                <p className="text-xs text-[#6f655e]">
                  {item.company.city} · {item.company.strategicSector}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold tabular-nums">{item.composite}</div>
                <div className="text-xs text-[#6f655e]">
                  {item.grade} · {scopeLabel(item)}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <Badge variant={decisionVariant(item.decision.product)}>{item.decision.title}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#3f342e]">{blockerOf(item)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
