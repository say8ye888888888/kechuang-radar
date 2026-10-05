import type { FinanceStatus } from "./types"

export const SCORE_VERSION = "demo-score-2.1"
export const RULE_VERSION = "demo-rules-2.1"
export const AS_OF = "2026-10-05"

export const SCORE_WEIGHTS = {
  tech: 0.3,
  continuity: 0.2,
  industry: 0.15,
  finance: 0.2,
  riskControl: 0.15,
} as const

export const DEMO_RULES = {
  patent: {
    minPledgeable: 3,
    minTech: 72,
    minRisk: 70,
    minFinance: 60,
    minRemainingYears: 8,
    allowedKinds: ["invention"] as const,
  },
  credit: {
    minTech: 62,
    minRisk: 62,
    requireQualification: true,
  },
  financialRequired: [
    "revenueGrowth",
    "operatingCashFlow",
    "debtRatio",
    "currentRatio",
    "shortTermDebt",
    "receivablesRatio",
    "customerConcentration",
    "dueDebt",
    "interestDue",
  ] as const,
  disclaimer: "演示口径，非工行制度；产品适配不等于授信通过，不输出额度或估值。",
} as const

export type ScoreConfig = typeof DEMO_RULES

export function financeStatus(
  financials: Record<string, unknown> | undefined,
): FinanceStatus {
  if (!financials) return "missing"
  const required = DEMO_RULES.financialRequired
  const present = required.filter((key) => financials[key] !== null && financials[key] !== undefined)
  if (present.length === 0) return "missing"
  return present.length === required.length ? "complete" : "partial"
}

export function missingFinanceMaterials(financials: Record<string, unknown> | undefined) {
  const labels: Record<string, string> = {
    revenueGrowth: "近两年营收及增速",
    operatingCashFlow: "经营现金流",
    debtRatio: "资产负债率",
    currentRatio: "流动比率",
    shortTermDebt: "短期债务与到期安排",
    receivablesRatio: "应收账款及账龄",
    customerConcentration: "客户集中度与回款证明",
    dueDebt: "近期到期债务",
    interestDue: "应付利息",
  }
  return DEMO_RULES.financialRequired
    .filter((key) => !financials || financials[key] === null || financials[key] === undefined)
    .map((key) => labels[key])
}
