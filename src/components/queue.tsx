"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
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
import { productLabel } from "@/lib/labels"
import type { Evaluation, ProductCode } from "@/lib/types"

const filters: { id: "all" | ProductCode; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "patent-loan", label: "科创专利贷" },
  { id: "credit-loan", label: "科技信用贷" },
  { id: "hold", label: "暂缓" },
  { id: "investigate", label: "补充调查" },
  { id: "decline", label: "暂不建议" },
]

function decisionVariant(product: ProductCode) {
  if (product === "patent-loan") return "default" as const
  if (product === "hold") return "destructive" as const
  if (product === "decline") return "secondary" as const
  return "outline" as const
}

export function Queue({ items }: { items: Evaluation[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all")

  const visible = useMemo(() => {
    const keyword = query.trim()
    return items.filter((item) => {
      const blob = `${item.company.name}${item.company.city}${item.company.strategicSector}`
      const matchText = keyword.length === 0 || blob.includes(keyword)
      const matchFilter = filter === "all" || item.decision.product === filter
      return matchText && matchFilter
    })
  }, [filter, items, query])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索企业、城市或产业"
          aria-label="搜索预审队列"
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
          队列里没有匹配的企业。清空搜索，或换一个产业名。
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>企业</TableHead>
                  <TableHead>产业</TableHead>
                  <TableHead>科技信用分</TableHead>
                  <TableHead>预审结论</TableHead>
                  <TableHead>主要卡点</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((item) => (
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
                      <span className="ml-2 text-xs text-[#6f655e]">{item.grade}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={decisionVariant(item.decision.product)}>
                        {productLabel[item.decision.product]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs text-[#3f342e]">
                      {item.riskNotes[0]?.detail}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="space-y-3 md:hidden">
            {visible.map((item) => (
              <li key={item.company.id} className="rounded-xl bg-white p-4 ring-1 ring-[#eadfd4]">
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
                    <div className="text-xs text-[#6f655e]">等级 {item.grade}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <Badge variant={decisionVariant(item.decision.product)}>
                    {item.decision.title}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#3f342e]">{item.riskNotes[0]?.detail}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
