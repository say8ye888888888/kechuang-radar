"use client"

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts"

export function ScoreRadar({
  data,
}: {
  data: { axis: string; score: number }[]
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="68%">
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
            fill="#9d1c2f"
            fillOpacity={0.28}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
