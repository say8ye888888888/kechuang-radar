"use client"

import { kindLabel, statusLabel } from "@/lib/labels"
import type { CompanyInput } from "@/lib/types"

function tone(kind: string, status: string, dispute?: string) {
  if (dispute) return { fill: "#fff1f2", stroke: "#9d1c2f" }
  if (status === "pending") return { fill: "#fff8ef", stroke: "#9a7040" }
  if (status === "lapsed" || status === "invalid") return { fill: "#f4f1ee", stroke: "#b3aaa4" }
  if (kind === "software") return { fill: "#f7f1e6", stroke: "#7a6248" }
  return { fill: "#fffdfb", stroke: "#2c241f" }
}

export function EvidenceGraph({
  company,
  focus,
  onFocus,
}: {
  company: CompanyInput
  focus: string | null
  onFocus: (id: string) => void
}) {
  const rights = company.rights
  const ipcs = [...new Map(rights.map((right) => [right.ipc, right.ipcTitle])).entries()]
  const inventorCounts = new Map<string, number>()
  for (const right of rights) {
    for (const name of right.inventors) {
      inventorCounts.set(name, (inventorCounts.get(name) ?? 0) + 1)
    }
  }
  const inventors = [...inventorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const row = 62
  const height = Math.max(280, 36 + rights.length * row)
  const yOf = (index: number) => 28 + index * row
  const ipcY = (index: number) =>
    28 + index * ((height - 56) / Math.max(ipcs.length - 1, 1))

  const active =
    focus == null
      ? null
      : {
          rights: new Set(
            rights
              .filter(
                (right) =>
                  right.id === focus ||
                  right.inventors.some((name) => focus === `inv:${name}`) ||
                  focus === `ipc:${right.ipc}`,
              )
              .map((right) => right.id),
          ),
          ipcs: new Set(
            rights
              .filter((right) => right.id === focus || focus === `ipc:${right.ipc}`)
              .map((right) => right.ipc),
          ),
          inventors: new Set(
            rights
              .filter((right) => right.id === focus)
              .flatMap((right) => right.inventors),
          ),
        }

  if (focus?.startsWith("inv:")) active?.inventors.add(focus.slice(4))
  if (focus?.startsWith("ipc:")) active?.ipcs.add(focus.slice(4))

  const dim = (id: string) => focus != null && focus !== id && !(active && isOn(id))
  function isOn(id: string) {
    if (!active || !focus) return false
    if (id === "company" || id === "sector") return true
    if (id.startsWith("inv:")) return active.inventors.has(id.slice(4))
    if (id.startsWith("ipc:")) return active.ipcs.has(id.slice(4))
    return active.rights.has(id)
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 980 ${height}`} className="h-auto min-w-[760px]" role="img">
        <title>{company.shortName}的专利知识图谱</title>
        <line
          x1="188"
          y1="48"
          x2="250"
          y2={height / 2}
          stroke="#e4d5c8"
          strokeWidth="1.4"
        />
        {inventors.map((item, index) => (
          <line
            key={item[0]}
            x1="188"
            y1={132 + index * 36}
            x2="250"
            y2={height / 2}
            stroke="#e4d5c8"
          />
        ))}
        {rights.map((right, index) => (
          <line
            key={right.id}
            x1="430"
            y1={height / 2}
            x2="500"
            y2={yOf(index) + 18}
            stroke={focus === right.id ? "#9d1c2f" : "#e4d5c8"}
            strokeWidth={focus === right.id ? 2 : 1.2}
          />
        ))}
        {rights.map((right, index) => {
          const ipcIndex = ipcs.findIndex((item) => item[0] === right.ipc)
          return (
            <line
              key={`${right.id}-ipc`}
              x1="760"
              y1={yOf(index) + 18}
              x2="800"
              y2={ipcY(ipcIndex) + 16}
              stroke="#eadfd4"
            />
          )
        })}

        <Node
          x={16}
          y={24}
          w={172}
          h={44}
          title={company.strategicSector}
          subtitle="产业方向"
          fill="#fffdfb"
          stroke="#2c241f"
          muted={dim("sector")}
          onClick={() => onFocus("sector")}
        />
        <Node
          x={250}
          y={height / 2 - 28}
          w={180}
          h={56}
          title={company.shortName}
          subtitle={company.city}
          fill="#9d1c2f"
          stroke="#9d1c2f"
          light
          muted={false}
          onClick={() => onFocus("company")}
        />
        {inventors.map(([name, count], index) => (
          <Node
            key={name}
            x={16}
            y={120 + index * 36}
            w={172}
            h={30}
            title={name}
            subtitle={`参与 ${count} 件`}
            fill="#fffdfb"
            stroke="#7a6248"
            muted={dim(`inv:${name}`)}
            onClick={() => onFocus(`inv:${name}`)}
          />
        ))}
        {rights.map((right, index) => {
          const color = tone(right.kind, right.status, right.dispute)
          return (
            <Node
              key={right.id}
              x={500}
              y={yOf(index)}
              w={260}
              h={48}
              title={right.title}
              subtitle={`${right.id} · ${kindLabel[right.kind]} · ${statusLabel[right.status]}`}
              fill={color.fill}
              stroke={color.stroke}
              muted={dim(right.id)}
              onClick={() => onFocus(right.id)}
            />
          )
        })}
        {ipcs.map(([ipc, title], index) => (
          <Node
            key={ipc}
            x={800}
            y={ipcY(index)}
            w={164}
            h={40}
            title={ipc}
            subtitle={title}
            fill="#fffdfb"
            stroke="#2c241f"
            muted={dim(`ipc:${ipc}`)}
            onClick={() => onFocus(`ipc:${ipc}`)}
          />
        ))}
      </svg>
    </div>
  )
}

function Node({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  fill,
  stroke,
  light,
  muted,
  onClick,
}: {
  x: number
  y: number
  w: number
  h: number
  title: string
  subtitle: string
  fill: string
  stroke: string
  light?: boolean
  muted: boolean
  onClick: () => void
}) {
  const ink = light ? "#fff8f6" : "#1f1a17"
  const sub = light ? "#f0d2d6" : "#6f655e"
  return (
    <g onClick={onClick} className="cursor-pointer" opacity={muted ? 0.28 : 1}>
      <title>{`${title} ${subtitle}`}</title>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} />
      <text x={x + 10} y={y + (h > 40 ? 20 : 14)} fill={ink} fontSize="12">
        {title.length > 16 ? `${title.slice(0, 16)}…` : title}
      </text>
      <text x={x + 10} y={y + (h > 40 ? 36 : 28)} fill={sub} fontSize="10">
        {subtitle.length > 22 ? `${subtitle.slice(0, 22)}…` : subtitle}
      </text>
    </g>
  )
}
