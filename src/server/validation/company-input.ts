import type {
  CompanyInput,
  IpKind,
  IpStatus,
  Qualification,
  RevenueBand,
} from "@/lib/types"

export type ValidationResult =
  | { success: true; data: CompanyInput }
  | { success: false; issues: { path: string; message: string }[] }

const ipKinds = new Set<IpKind>(["invention", "utility", "design", "software"])
const ipStatuses = new Set<IpStatus>(["active", "pending", "lapsed", "invalid"])
const qualifications = new Set<Qualification>(["hightech", "specialized", "littleGiant"])
const revenueBands = new Set<RevenueBand>([
  "unknown",
  "lt20m",
  "20to60m",
  "60to150m",
  "gt150m",
])
const datasets = new Set(["demo", "public"])
const verificationStates = new Set(["verified", "reported", "unknown"])
const disputeSeverities = new Set(["asset", "enterprise"])
const evidenceTypes = new Set([
  "patent",
  "finance",
  "qualification",
  "industry",
  "risk",
  "note",
  "rule",
])
const reservedEvidenceIds = new Set([
  "decision",
  "notes-empty",
  "dim-tech",
  "dim-continuity",
  "dim-industry",
  "dim-finance",
  "dim-riskControl",
  "tech-count",
  "tech-cite",
  "tech-claim",
  "tech-family",
  "tech-focus",
  "tech-sw",
  "tech-util",
  "cont-recent",
  "cont-years",
  "cont-team",
  "cont-rd",
  "cont-qual",
  "ind-rule",
  "fin-growth",
  "fin-cashflow",
  "fin-leverage",
  "fin-liquidity",
  "fin-collection",
  "fin-debt-service",
  "fin-missing",
  "risk-title",
  "risk-asset-title",
  "risk-unknown",
  "risk-annuity",
  "risk-dead",
  "risk-person",
  "risk-age",
  "risk-pending",
  "risk-clear",
  "risk-note-block",
])

function isReservedEvidenceId(id: string) {
  return reservedEvidenceIds.has(id) || id.startsWith("risk-factor-")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isStringArray(value: unknown, maxItems: number) {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => typeof item === "string" && item.length > 0 && item.length <= 200)
  )
}

export function validateCompanyInput(input: unknown): ValidationResult {
  const issues: { path: string; message: string }[] = []

  if (!isRecord(input)) {
    return {
      success: false,
      issues: [{ path: "company", message: "必须是企业对象" }],
    }
  }

  const stringFields = [
    "id",
    "name",
    "shortName",
    "city",
    "strategicSector",
    "summary",
  ] as const
  for (const field of stringFields) {
    const value = input[field]
    if (typeof value !== "string" || value.trim().length === 0) {
      issues.push({ path: `company.${field}`, message: "必须是非空字符串" })
    } else if (value.length > (field === "summary" ? 2_000 : 200)) {
      issues.push({ path: `company.${field}`, message: "内容过长" })
    }
  }

  if (
    typeof input.id === "string" &&
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(input.id)
  ) {
    issues.push({ path: "company.id", message: "仅允许字母、数字、下划线和连字符" })
  }

  for (const field of ["founded", "employees", "sectorOutlook"] as const) {
    if (typeof input[field] !== "number" || !Number.isFinite(input[field])) {
      issues.push({ path: `company.${field}`, message: "必须是有限数字" })
    }
  }
  if (
    typeof input.founded === "number" &&
    (!Number.isInteger(input.founded) || input.founded < 1800 || input.founded > 2100)
  ) {
    issues.push({ path: "company.founded", message: "年份超出允许范围" })
  }
  if (
    typeof input.employees === "number" &&
    (!Number.isInteger(input.employees) || input.employees < 0 || input.employees > 10_000_000)
  ) {
    issues.push({ path: "company.employees", message: "员工人数超出允许范围" })
  }
  if (
    typeof input.sectorOutlook === "number" &&
    (input.sectorOutlook < 0 || input.sectorOutlook > 100)
  ) {
    issues.push({ path: "company.sectorOutlook", message: "必须在 0 到 100 之间" })
  }
  if (
    input.rdStaffRatio !== null &&
    (typeof input.rdStaffRatio !== "number" ||
      !Number.isFinite(input.rdStaffRatio) ||
      input.rdStaffRatio < 0 ||
      input.rdStaffRatio > 1)
  ) {
    issues.push({ path: "company.rdStaffRatio", message: "必须为空或 0 到 1 之间的数字" })
  }

  if (!revenueBands.has(input.revenueBand as RevenueBand)) {
    issues.push({ path: "company.revenueBand", message: "营收区间无效" })
  }
  if (input.dataset !== undefined && !datasets.has(String(input.dataset))) {
    issues.push({ path: "company.dataset", message: "数据集类型无效" })
  }

  if (!Array.isArray(input.qualifications)) {
    issues.push({ path: "company.qualifications", message: "必须是数组" })
  } else {
    input.qualifications.forEach((value, index) => {
      if (!qualifications.has(value as Qualification)) {
        issues.push({
          path: `company.qualifications.${index}`,
          message: "企业资质无效",
        })
      }
    })
  }

  if (!Array.isArray(input.rights)) {
    issues.push({ path: "company.rights", message: "必须是权利数组" })
  } else if (input.rights.length > 200) {
    issues.push({ path: "company.rights", message: "单次最多评估 200 项权利" })
  } else {
    const ids = new Set<string>()
    input.rights.forEach((right, index) => {
      const path = `company.rights.${index}`
      if (!isRecord(right)) {
        issues.push({ path, message: "必须是权利对象" })
        return
      }
      for (const field of ["id", "title", "ipc", "ipcTitle"] as const) {
        if (typeof right[field] !== "string" || right[field].trim().length === 0) {
          issues.push({ path: `${path}.${field}`, message: "必须是非空字符串" })
        }
      }
      if (typeof right.id === "string") {
        if (right.id.length > 128) {
          issues.push({ path: `${path}.id`, message: "权利编号过长" })
        }
        if (isReservedEvidenceId(right.id)) {
          issues.push({ path: `${path}.id`, message: "权利编号与系统证据编号冲突" })
        }
        if (ids.has(right.id)) {
          issues.push({ path: `${path}.id`, message: "权利编号不能重复" })
        }
        ids.add(right.id)
      }
      if (!ipKinds.has(right.kind as IpKind)) {
        issues.push({ path: `${path}.kind`, message: "权利类型无效" })
      }
      if (!ipStatuses.has(right.status as IpStatus)) {
        issues.push({ path: `${path}.status`, message: "权利状态无效" })
      }
      for (const field of ["year", "citations", "family", "claims", "remainingYears"] as const) {
        if (typeof right[field] !== "number" || !Number.isFinite(right[field]) || right[field] < 0) {
          issues.push({ path: `${path}.${field}`, message: "必须是非负有限数字" })
        }
      }
      if (
        typeof right.year === "number" &&
        (!Number.isInteger(right.year) || right.year < 1800 || right.year > 2100)
      ) {
        issues.push({ path: `${path}.year`, message: "年份超出允许范围" })
      }
      if (!Array.isArray(right.inventors) || right.inventors.some((name) => typeof name !== "string")) {
        issues.push({ path: `${path}.inventors`, message: "必须是发明人姓名数组" })
      } else if (
        right.inventors.length > 100 ||
        right.inventors.some((name) => name.length === 0 || name.length > 100)
      ) {
        issues.push({ path: `${path}.inventors`, message: "发明人列表或姓名过长" })
      }
      for (const field of ["annuityRisk", "ownershipClear"] as const) {
        if (typeof right[field] !== "boolean") {
          issues.push({ path: `${path}.${field}`, message: "必须是布尔值" })
        }
      }
      if (right.isCore !== undefined && typeof right.isCore !== "boolean") {
        issues.push({ path: `${path}.isCore`, message: "必须是布尔值" })
      }
      if (
        right.disputeSeverity !== undefined &&
        !disputeSeverities.has(String(right.disputeSeverity))
      ) {
        issues.push({ path: `${path}.disputeSeverity`, message: "争议级别无效" })
      }
      if (
        right.verificationState !== undefined &&
        !verificationStates.has(String(right.verificationState))
      ) {
        issues.push({ path: `${path}.verificationState`, message: "核验状态无效" })
      }
      if (
        right.dispute !== undefined &&
        (typeof right.dispute !== "string" || right.dispute.length === 0 || right.dispute.length > 2_000)
      ) {
        issues.push({ path: `${path}.dispute`, message: "争议说明必须是 1 到 2000 字的字符串" })
      }
      if (right.evidenceIds !== undefined && !isStringArray(right.evidenceIds, 100)) {
        issues.push({ path: `${path}.evidenceIds`, message: "证据编号必须是有效字符串数组" })
      }
    })
  }

  if (!Array.isArray(input.notes)) {
    issues.push({ path: "company.notes", message: "必须是备注数组" })
  } else if (input.notes.length > 100) {
    issues.push({ path: "company.notes", message: "单次最多提交 100 条备注" })
  } else {
    const sourceIds = new Set<string>()
    if (Array.isArray(input.rights)) {
      input.rights.forEach((right) => {
        if (isRecord(right) && typeof right.id === "string") sourceIds.add(right.id)
      })
    }
    input.notes.forEach((note, index) => {
      const path = `company.notes.${index}`
      if (!isRecord(note)) {
        issues.push({ path, message: "必须是备注对象" })
        return
      }
      if (typeof note.id !== "string" || note.id.length === 0) {
        issues.push({ path: `${path}.id`, message: "必须是非空字符串" })
      } else {
        if (isReservedEvidenceId(note.id)) {
          issues.push({ path: `${path}.id`, message: "备注编号与系统证据编号冲突" })
        }
        if (sourceIds.has(note.id)) {
          issues.push({ path: `${path}.id`, message: "备注编号不能与其他来源编号重复" })
        }
        sourceIds.add(note.id)
      }
      if (!new Set(["info", "watch", "block"]).has(String(note.level))) {
        issues.push({ path: `${path}.level`, message: "备注级别无效" })
      }
      if (typeof note.text !== "string" || note.text.length === 0 || note.text.length > 2_000) {
        issues.push({ path: `${path}.text`, message: "必须是 1 到 2000 字的字符串" })
      }
    })
  }

  if (input.financials !== undefined) {
    const path = "company.financials"
    if (!isRecord(input.financials)) {
      issues.push({ path, message: "必须是财务材料对象" })
    } else {
      const financials = input.financials
      const numericFields = [
        "revenueGrowth",
        "operatingCashFlow",
        "debtRatio",
        "currentRatio",
        "shortTermDebt",
        "receivablesRatio",
        "customerConcentration",
        "dueDebt",
        "interestDue",
      ] as const
      for (const field of numericFields) {
        const value = financials[field]
        if (value !== undefined && value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
          issues.push({ path: `${path}.${field}`, message: "必须为空或有限数字" })
        }
      }
      for (const field of ["debtRatio", "receivablesRatio", "customerConcentration"] as const) {
        const value = financials[field]
        if (typeof value === "number" && (value < 0 || value > 1)) {
          issues.push({ path: `${path}.${field}`, message: "必须在 0 到 1 之间" })
        }
      }
      if (
        typeof financials.revenueGrowth === "number" &&
        (financials.revenueGrowth < -1 || financials.revenueGrowth > 10)
      ) {
        issues.push({ path: `${path}.revenueGrowth`, message: "必须在 -1 到 10 之间" })
      }
      for (const field of ["currentRatio", "shortTermDebt", "dueDebt", "interestDue"] as const) {
        const value = financials[field]
        if (typeof value === "number" && value < 0) {
          issues.push({ path: `${path}.${field}`, message: "不能为负数" })
        }
      }
      if (financials.asOf === undefined) {
        issues.push({ path: `${path}.asOf`, message: "财务材料必须包含有效的 YYYY-MM-DD 时点" })
      } else if (!isDateString(financials.asOf)) {
        issues.push({ path: `${path}.asOf`, message: "必须是有效的 YYYY-MM-DD 日期" })
      }
      if (financials.evidenceIds !== undefined && !isStringArray(financials.evidenceIds, 100)) {
        issues.push({ path: `${path}.evidenceIds`, message: "证据编号必须是有效字符串数组" })
      }
      if (financials.synthetic !== undefined && typeof financials.synthetic !== "boolean") {
        issues.push({ path: `${path}.synthetic`, message: "必须是布尔值" })
      }
    }
  }

  if (input.evidence !== undefined) {
    const path = "company.evidence"
    // Evidence commonly shares a stable identifier with the right or note it
    // documents. Preserve that link while keeping rule-engine IDs reserved.
    const entityKinds = new Map<string, "right" | "note">()
    if (Array.isArray(input.rights)) {
      input.rights.forEach((right) => {
        if (isRecord(right) && typeof right.id === "string") entityKinds.set(right.id, "right")
      })
    }
    if (Array.isArray(input.notes)) {
      input.notes.forEach((note) => {
        if (isRecord(note) && typeof note.id === "string") entityKinds.set(note.id, "note")
      })
    }
    if (!Array.isArray(input.evidence)) {
      issues.push({ path, message: "必须是证据记录数组" })
    } else if (input.evidence.length > 1_000) {
      issues.push({ path, message: "单次最多提交 1000 条证据记录" })
    } else {
      const ids = new Set<string>()
      input.evidence.forEach((record, index) => {
        const recordPath = `${path}.${index}`
        if (!isRecord(record)) {
          issues.push({ path: recordPath, message: "必须是证据记录对象" })
          return
        }
        for (const field of ["id", "title", "fact", "sourceLabel"] as const) {
          const value = record[field]
          if (typeof value !== "string" || value.length === 0 || value.length > 4_000) {
            issues.push({ path: `${recordPath}.${field}`, message: "必须是非空且长度合规的字符串" })
          }
        }
        if (typeof record.id === "string") {
          if (record.id.length > 128) {
            issues.push({ path: `${recordPath}.id`, message: "证据编号过长" })
          }
          if (isReservedEvidenceId(record.id)) {
            issues.push({ path: `${recordPath}.id`, message: "证据编号属于系统保留编号" })
          }
          const entityKind = entityKinds.get(record.id)
          if (
            (entityKind === "right" && !new Set(["patent", "risk"]).has(String(record.type))) ||
            (entityKind === "note" && !new Set(["note", "risk"]).has(String(record.type)))
          ) {
            issues.push({
              path: `${recordPath}.type`,
              message:
                entityKind === "right"
                  ? "专利关联证据的类型应为 patent 或 risk"
                  : "备注关联证据的类型应为 note 或 risk",
            })
          }
          if (ids.has(record.id)) {
            issues.push({ path: `${recordPath}.id`, message: "证据编号不能重复" })
          }
          ids.add(record.id)
        }
        if (!evidenceTypes.has(String(record.type))) {
          issues.push({ path: `${recordPath}.type`, message: "证据类型无效" })
        }
        if (!verificationStates.has(String(record.status))) {
          issues.push({ path: `${recordPath}.status`, message: "证据状态无效" })
        }
        for (const field of ["observedAt", "asOf"] as const) {
          if (!isDateString(record[field])) {
            issues.push({ path: `${recordPath}.${field}`, message: "必须是有效的 YYYY-MM-DD 日期" })
          }
        }
        if (
          record.sourceUrl !== undefined &&
          (typeof record.sourceUrl !== "string" ||
            record.sourceUrl.length === 0 ||
            record.sourceUrl.length > 2_000 ||
            !/^https?:\/\//i.test(record.sourceUrl))
        ) {
          issues.push({ path: `${recordPath}.sourceUrl`, message: "来源链接无效或过长" })
        }
        if (record.demo !== undefined && typeof record.demo !== "boolean") {
          issues.push({ path: `${recordPath}.demo`, message: "必须是布尔值" })
        }
      })
    }
  }

  return issues.length
    ? { success: false, issues }
    : { success: true, data: structuredClone(input) as CompanyInput }
}
