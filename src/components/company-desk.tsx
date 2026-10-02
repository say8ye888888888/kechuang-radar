"use client"

import Link from "next/link"
import { useState } from "react"
import { EvidenceGraph } from "@/components/evidence-graph"
import { ScoreRadar } from "@/components/score-radar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { kindLabel, productLabel, qualLabel, revenueLabel, statusLabel } from "@/lib/labels"
import { modelContract } from "@/lib/score"
import type { Evaluation, ProductCode } from "@/lib/types"

export type Peer = {
  id: string
  shortName: string
  composite: number
  grade: string
  product: ProductCode
  title: string
}

function decisionVariant(product: ProductCode) {
  if (product === "patent-loan") return "default" as const
  if (product === "hold") return "destructive" as const
  if (product === "decline") return "secondary" as const
  return "outline" as const
}

export function CompanyDesk({
  evaluation,
  peers,
}: {
  evaluation: Evaluation
  peers: Peer[]
}) {
  const [focus, setFocus] = useState<string | null>(null)
  const { company } = evaluation
  const pledgeable = new Set(evaluation.pledgeableIds)
  const focusedRight = company.rights.find((right) => right.id === focus)

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-[#9d1c2f] hover:underline">
        返回预审队列
      </Link>

      <header className="flex flex-col gap-4 rounded-2xl bg-[#1c1412] px-5 py-5 text-[#f8f1ea] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-wide text-[#d9c7ba]">客户经理预审</p>
          <h1 className="mt-1 text-2xl font-semibold">{company.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#eadfd4]">{company.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#d9c7ba]">
            <span>{company.city}</span>
            <span>成立于 {company.founded}</span>
            <span>{company.employees} 人</span>
            <span>{revenueLabel[company.revenueBand]}</span>
            <span>
              {company.qualifications.length
                ? company.qualifications.map((item) => qualLabel[item]).join("、")
                : "无公开资质"}
            </span>
          </div>
        </div>
        <div className="sm:text-right">
          <div className="text-4xl font-semibold tabular-nums">{evaluation.composite}</div>
          <div className="mt-1 text-sm text-[#d9c7ba]">科技信用分 · 等级 {evaluation.grade}</div>
          <div className="mt-3">
            <Badge variant={decisionVariant(evaluation.decision.product)}>
              {evaluation.decision.title}
            </Badge>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>五维评分</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreRadar
              data={evaluation.dimensions.map((dimension) => ({
                axis: dimension.label,
                score: dimension.score,
              }))}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {evaluation.dimensions.map((dimension) => (
                <button
                  key={dimension.key}
                  type="button"
                  onClick={() => setFocus(dimension.factors[0]?.id ?? dimension.key)}
                  className="rounded-lg border border-[#eadfd4] px-3 py-2 text-left hover:bg-[#fbf6f1]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">{dimension.label}</span>
                    <span className="font-semibold tabular-nums">{dimension.score}</span>
                  </div>
                  <div className="mt-1 text-xs text-[#6f655e]">
                    权重 {Math.round(dimension.weight * 100)}% · 贡献{" "}
                    {(dimension.score * dimension.weight).toFixed(1)} 分
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>规则结论</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-6">{evaluation.decision.reason}</p>
            <Separator />
            <p className="text-xs font-medium tracking-wide text-[#6f655e]">客户经理下一步</p>
            <ol className="list-decimal space-y-2 pl-4 text-sm leading-6">
              {evaluation.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>规则轨迹</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {evaluation.ruleChecks.map((check) => (
            <div
              key={check.id}
              className="flex flex-col gap-1 rounded-lg border border-[#eadfd4] px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <div className="text-sm font-medium">{check.label}</div>
                <p className="text-xs leading-5 text-[#6f655e]">{check.detail}</p>
              </div>
              <Badge variant={check.pass ? "secondary" : "destructive"}>
                {check.pass ? "通过" : "未过"}
              </Badge>
            </div>
          ))}
          <p className="text-xs leading-5 text-[#6f655e]">
            命中顺序：先看权属硬伤，再看科创专利贷四项条件，然后看科技信用贷，最后才是补充调查或暂不建议。分数高也不会跳过权属。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>企业—权利—技术领域</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <EvidenceGraph
            company={company}
            focus={focus}
            onFocus={(id) => setFocus((current) => (current === id ? null : id))}
          />
          <p className="text-sm leading-6 text-[#3f342e]">
            {focusedRight
              ? `${focusedRight.id}《${focusedRight.title}》。${kindLabel[focusedRight.kind]}，${statusLabel[focusedRight.status]}，${focusedRight.ipc} ${focusedRight.ipcTitle}。${
                  focusedRight.dispute ??
                  (pledgeable.has(focusedRight.id)
                    ? "这件权利进入了可质押清单。"
                    : "这件权利没有进入可质押清单。")
                }`
              : "点选图谱或下方编号，查看这件权利为什么进入或没有进入质押清单。红色描边表示权属争议，虚线色块表示在审或失效。"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>证据说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {evaluation.report.map((block) => (
            <section key={block.heading}>
              <h2 className="text-sm font-semibold">{block.heading}</h2>
              <div className="mt-2 space-y-3">
                {block.paragraphs.map((paragraph) => (
                  <div key={paragraph.text}>
                    <p className="text-sm leading-7">{paragraph.text}</p>
                    {paragraph.evidence.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {paragraph.evidence.map((id) => (
                          <button
                            key={`${paragraph.text}-${id}`}
                            type="button"
                            onClick={() => setFocus(id)}
                            className={`rounded-full border px-2 py-0.5 text-xs ${
                              focus === id
                                ? "border-[#9d1c2f] bg-[#9d1c2f] text-white"
                                : "border-[#eadfd4] text-[#6f655e]"
                            }`}
                          >
                            {id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          <Separator />
          <p className="text-xs leading-5 text-[#6f655e]">{modelContract}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>权利清单</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>编号</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>被引</TableHead>
                <TableHead>剩余年限</TableHead>
                <TableHead>质押口径</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.rights.map((right) => (
                <TableRow
                  key={right.id}
                  className={focus === right.id ? "bg-[#fff1f2]" : undefined}
                  onClick={() => setFocus(right.id)}
                >
                  <TableCell className="font-mono text-xs">{right.id}</TableCell>
                  <TableCell>
                    <div>{right.title}</div>
                    {right.dispute && (
                      <div className="mt-1 text-xs text-[#9d1c2f]">{right.dispute}</div>
                    )}
                  </TableCell>
                  <TableCell>{kindLabel[right.kind]}</TableCell>
                  <TableCell>{statusLabel[right.status]}</TableCell>
                  <TableCell className="tabular-nums">{right.citations}</TableCell>
                  <TableCell className="tabular-nums">{right.remainingYears}</TableCell>
                  <TableCell>{pledgeable.has(right.id) ? "可讨论" : "不纳入"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>维度拆解</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {evaluation.dimensions.map((dimension) => (
            <div key={dimension.key} className="rounded-lg border border-[#eadfd4] p-3">
              <div className="flex items-baseline justify-between">
                <h3 className="font-medium">{dimension.label}</h3>
                <span className="tabular-nums">{dimension.score}</span>
              </div>
              {dimension.note && (
                <p className="mt-1 text-xs leading-5 text-[#9d1c2f]">{dimension.note}</p>
              )}
              <ul className="mt-2 space-y-2">
                {dimension.factors.map((factor) => (
                  <li key={factor.id} className="text-sm leading-6">
                    <span className="font-medium">{factor.label}</span>
                    <span className="ml-2 tabular-nums text-[#6f655e]">
                      {factor.weight > 0 ? `权重 ${Math.round(factor.weight * 100)}% · ` : ""}
                      {factor.score}
                    </span>
                    <div className="text-xs leading-5 text-[#6f655e]">{factor.detail}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>队列对照</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {peers.map((peer) => (
            <Link
              key={peer.id}
              href={`/company/${peer.id}`}
              className={`rounded-lg border px-3 py-2 ${
                peer.id === company.id ? "border-[#9d1c2f] bg-[#fff6f6]" : "border-[#eadfd4]"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{peer.shortName}</span>
                <span className="tabular-nums">
                  {peer.composite} {peer.grade}
                </span>
              </div>
              <div className="mt-1 text-xs text-[#6f655e]">
                {productLabel[peer.product]} · {peer.title}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <details className="rounded-xl bg-white p-4 ring-1 ring-[#eadfd4]">
        <summary className="cursor-pointer text-sm font-medium">查看送入大模型的证据包</summary>
        <pre className="mt-3 overflow-x-auto text-xs leading-5 text-[#3f342e]">
          {JSON.stringify(evaluation.evidencePack, null, 2)}
        </pre>
      </details>
    </div>
  )
}
