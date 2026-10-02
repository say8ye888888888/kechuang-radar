export type IpKind = "invention" | "utility" | "design" | "software"

export type IpStatus = "active" | "pending" | "lapsed" | "invalid"

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
  sectorOutlook: number
  summary: string
  rights: IpRight[]
  notes: Note[]
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
}
