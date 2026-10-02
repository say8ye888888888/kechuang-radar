"use client"

import { useEffect, useRef, useState } from "react"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts"

export function ScoreRadar({
  data,
}: {
  data: { axis: string; score: number }[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(480)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const update = () => setWidth(node.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="h-72 w-full">
      <RadarChart
          width={Math.max(width, 280)}
          height={288}
          data={data}
          cx="50%"
          cy="50%"
          outerRadius="68%"
        >
          <PolarGrid stroke="#e4d5c8" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#3f342e", fontSize: 12 }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#8a7b72", fontSize: 10 }}
            stroke="#e4d5c8"
          />
          <Radar
            name="得分"
            dataKey="score"
            stroke="#9d1c2f"
            strokeWidth={2}
            fill="#9d1c2f"
            fillOpacity={0.45}
          />
      </RadarChart>
    </div>
  )
}
