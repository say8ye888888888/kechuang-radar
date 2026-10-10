import type { CompanyInput, EvidenceRecord, FinancialProfile, IpRight } from "./types"
import { AS_OF, sectorScore } from "./rules"

const financials: Record<string, FinancialProfile | undefined> = {
  chengchuan: {
    revenueGrowth: 0.28,
    operatingCashFlow: 18.4,
    debtRatio: 0.38,
    currentRatio: 1.72,
    shortTermDebt: 8.2,
    receivablesRatio: 0.19,
    customerConcentration: 0.31,
    dueDebt: 8.2,
    interestDue: 1.4,
    asOf: AS_OF,
    evidenceIds: ["fin-chengchuan"],
    synthetic: true,
  },
  zhiheng: {
    revenueGrowth: 0.34,
    operatingCashFlow: 6.1,
    debtRatio: 0.44,
    currentRatio: 1.38,
    shortTermDebt: 3.4,
    receivablesRatio: 0.27,
    customerConcentration: 0.42,
    dueDebt: 3.4,
    interestDue: 0.8,
    asOf: AS_OF,
    evidenceIds: ["fin-zhiheng"],
    synthetic: true,
  },
  lanxi: {
    revenueGrowth: 0.12,
    operatingCashFlow: 2.4,
    debtRatio: 0.61,
    currentRatio: 0.96,
    shortTermDebt: 5.8,
    receivablesRatio: 0.46,
    customerConcentration: 0.55,
    dueDebt: 5.8,
    interestDue: 1.1,
    asOf: AS_OF,
    evidenceIds: ["fin-lanxi"],
    synthetic: true,
  },
  jingmai: {
    revenueGrowth: 0.19,
    operatingCashFlow: 4.6,
    debtRatio: 0.49,
    currentRatio: 1.21,
    shortTermDebt: 4.2,
    receivablesRatio: 0.32,
    customerConcentration: 0.39,
    dueDebt: 4.2,
    interestDue: 0.9,
    asOf: AS_OF,
    evidenceIds: ["fin-jingmai"],
    synthetic: true,
  },
  // This sample deliberately demonstrates the P0 material-completeness path.
  hengshi: undefined,
  haiyu: {
    revenueGrowth: -0.04,
    operatingCashFlow: -2.1,
    debtRatio: 0.78,
    currentRatio: 0.72,
    shortTermDebt: 12.5,
    receivablesRatio: 0.61,
    customerConcentration: 0.74,
    dueDebt: 12.5,
    interestDue: 2.2,
    asOf: AS_OF,
    evidenceIds: ["fin-haiyu"],
    synthetic: true,
  },
}

function evidenceFor(company: CompanyInput): EvidenceRecord[] {
  const records: EvidenceRecord[] = company.rights.map((right) => ({
    id: right.id,
    type: right.dispute ? "risk" : "patent",
    title: right.title,
    fact: `${right.id}：${right.status}，IPC ${right.ipc}，申请年份 ${right.year}。`,
    sourceLabel: "专利登记快照",
    observedAt: AS_OF,
    asOf: AS_OF,
    status: right.verificationState ?? "verified",
    demo: true,
  }))
  records.push({
    id: `industry-${company.id}`,
    type: "industry",
    title: `${company.strategicSector}产业档位`,
    fact: `产业规则表档位为 ${sectorScore(company.strategicSector) ?? "未列入"}。`,
    sourceLabel: "产业规则表",
    observedAt: AS_OF,
    asOf: AS_OF,
    status: "reported",
    demo: true,
  })
  records.push({
    id: `qual-${company.id}`,
    type: "qualification",
    title: "企业公开资质",
    fact: company.qualifications.length ? "已录入公开资质。" : "未录入公开资质。",
    sourceLabel: "资质公示",
    observedAt: AS_OF,
    asOf: AS_OF,
    status: "reported",
    demo: true,
  })
  const profile = financials[company.id]
  if (profile) {
    records.push({
      id: profile.evidenceIds[0],
      type: "finance",
      title: "企业偿债材料",
      fact: "收入、现金流、负债、流动性、应收、客户集中度及到期债务均已录入。",
      sourceLabel: "企业授权材料",
      observedAt: AS_OF,
      asOf: AS_OF,
      status: "reported",
      demo: true,
    })
  }
  records.push(
    ...company.notes.map((note) => ({
      id: note.id,
      type: note.level === "block" ? ("risk" as const) : ("note" as const),
      title: "人工备注",
      fact: note.text,
      sourceLabel: "人工核验记录",
      observedAt: AS_OF,
      asOf: AS_OF,
      status: "reported" as const,
      demo: true,
    })),
  )
  return records
}

function inferDisputeSeverity(right: IpRight) {
  if (right.disputeSeverity) return right.disputeSeverity
  if (!right.dispute && right.ownershipClear) return undefined
  const text = right.dispute ?? ""
  if (/无效宣告|职务发明/.test(text)) return "enterprise" as const
  return "asset" as const
}

export function enrichDemoCompany(company: CompanyInput): CompanyInput {
  const rights = company.rights.map((right) => ({
    ...right,
    isCore: right.isCore ?? Boolean(right.kind === "invention"),
    disputeSeverity: right.disputeSeverity ?? inferDisputeSeverity(right),
    verificationState: right.verificationState ?? "verified",
    evidenceIds: right.evidenceIds ?? [right.id],
  }))
  const enriched: CompanyInput = {
    ...company,
    dataset: "demo",
    financials: financials[company.id],
    rights,
  }
  return { ...enriched, evidence: evidenceFor(enriched) }
}
