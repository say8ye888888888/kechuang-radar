import { NextResponse } from "next/server"
import { catalogSize } from "@/server/services/evaluation-service"
import { RULE_VERSION, SCORE_VERSION } from "@/lib/rules"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json({
    data: {
      status: "ok",
      service: "kechuang-radar",
      scoreVersion: SCORE_VERSION,
      ruleVersion: RULE_VERSION,
      demoCompanies: catalogSize(),
      time: new Date().toISOString(),
    },
  })
}
