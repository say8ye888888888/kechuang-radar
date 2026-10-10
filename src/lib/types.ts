export type IpKind = "invention" | "utility" | "design" | "software"

export type IpStatus = "active" | "pending" | "lapsed" | "invalid"

/** `reported` means a source has been supplied; only `verified` clears a
 * legal-status gate for the demo collateral path. */
export type VerificationState = "verified" | "reported" | "unknown"

export type DatasetKind = "demo" | "public"

export type FinanceStatus = "complete" | "partial" | "missing"

export type EvidenceRecord = {
  id: string
  type: "patent" | "finance" | "qualification" | "industry" | "risk" | "note" | "rule"
  title: string
  fact: string
  sourceLabel: string
  sourceUrl?: string
  observedAt: string
  asOf: string
  status: VerificationState
  demo?: boolean
}

export type FinancialProfile = {
  revenueGrowth: number | null
  operatingCashFlow: number | null
  debtRatio: number | null
  currentRatio: number | null
  shortTermDebt: number | null
  receivablesRatio: number | null
  customerConcentration: number | null
  dueDebt: number | null
  interestDue: number | null
  asOf: string
  evidenceIds: string[]
  synthetic?: boolean
}

export type Qualification = "hightech" | "specialized" | "littleGiant"

export type RevenueBand = "unknown" | "lt20m" | "20to60m" | "60to150m" | "gt150m"

export type ProductCode =
  | "patent-loan"
  | "credit-loan"
  | "investigate"
  | "hold"
  | "decline"

export type IpRight = {
  id: string
  title: string
  kind: IpKind
  ipc: string
  ipcTitle: string
  year: number
  status: IpStatus
  citations: number
  family: number
  claims: number
  inventors: string[]
  annuityRisk: boolean
  ownershipClear: boolean
  remainingYears: number
  dispute?: string
  isCore?: boolean
  disputeSeverity?: "asset" | "enterprise"
  verificationState?: VerificationState
  evidenceIds?: string[]
}

export type Note = {
  id: string
  level: "info" | "watch" | "block"
  text: string
}

export type CompanyInput = {
  id: string
  name: string
  shortName: string
  city: string
  founded: number
  employees: number
  rdStaffRatio: number | null
  revenueBand: RevenueBand
  qualifications: Qualification[]
  strategicSector: string
  /** 忽略。行业分只从产业规则表读取，避免企业自行报分。 */
  sectorOutlook?: number
  summary: string
  rights: IpRight[]
  notes: Note[]
  dataset?: DatasetKind
  financials?: FinancialProfile
  evidence?: EvidenceRecord[]
}

export type Factor = {
  id: string
  label: string
  score: number
  weight: number
  detail: string
}

export type DimensionKey =
  | "tech"
  | "continuity"
  | "industry"
  | "finance"
  | "riskControl"

export type Dimension = {
  key: DimensionKey
  label: string
  weight: number
  score: number
  factors: Factor[]
  note?: string
}

export type RuleCheck = {
  id: string
  label: string
  pass: boolean
  detail: string
  reasonCode?: string
}

export type RiskNote = {
  id: string
  label: string
  points: number
  detail: string
}

export type Decision = {
  product: ProductCode
  title: string
  reason: string
  reasonCode?: string
  eligible?: boolean
  missingMaterials?: string[]
}

export type ReportParagraph = {
  text: string
  evidence: string[]
}

export type ReportBlock = {
  heading: string
  paragraphs: ReportParagraph[]
}

export type EvidencePack = {
  instruction: string
  company: string
  decision: string
  composite: number
  grade: string
  dimensions: { name: string; score: number; weight: number }[]
  pledgeable: { id: string; title: string }[]
  risks: string[]
  notes: string[]
  rights: {
    id: string
    title: string
    kind: string
    status: string
    ipc: string
    year: number
    dispute?: string
  }[]
  evaluationId?: string
  asOf?: string
  scoreVersion?: string
  ruleVersion?: string
  dataSnapshotId?: string
  scoreScope?: "full" | "innovation-only"
  financeStatus?: FinanceStatus
  missingMaterials?: string[]
  evidenceRecords?: EvidenceRecord[]
}

export type Evaluation = {
  company: CompanyInput
  dimensions: Dimension[]
  composite: number
  grade: "A" | "B" | "C" | "D"
  pledgeableIds: string[]
  ruleChecks: RuleCheck[]
  decision: Decision
  riskNotes: RiskNote[]
  report: ReportBlock[]
  actions: string[]
  evidencePack: EvidencePack
  meta?: {
    evaluationId: string
    asOf: string
    createdAt: string
    scoreVersion: string
    ruleVersion: string
    dataSnapshotId: string
    schemaVersion: string
    demo: boolean
  }
  evidenceStatus?: {
    coverage: number
    financeStatus: FinanceStatus
    unknownItems: string[]
    missingMaterials: string[]
    hardStops: string[]
  }
  scoreScope?: "full" | "innovation-only"
}
