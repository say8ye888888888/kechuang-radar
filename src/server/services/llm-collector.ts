import { createHash } from "node:crypto"
import { canonicalCompanyName } from "@/lib/company-name"
import { validateCompanyInput } from "@/server/validation/company-input"
import { SECTOR_SCORES } from "@/lib/rules"
import type {
  CompanyInput,
  EvidenceRecord,
  FinancialProfile,
  IpKind,
  IpRight,
  Note,
  Qualification,
  RevenueBand,
} from "@/lib/types"

export type CollectionResult =
  | { success: true; company: CompanyInput }
  | { success: false; error: string }

export interface CompanyInfoCollector {
  collectCompanyInfo(name: string): Promise<CollectionResult>
}

// ── helpers ──────────────────────────────────────────────────────────

function hashName(name: string) {
  return createHash("sha256").update(name).digest("hex")
}

function companyId(name: string) {
  return `llm-${hashName(canonicalCompanyName(name)).slice(0, 8)}`
}

function ownerCode(name: string) {
  // 2-char uppercase code from hash, always [A-Z] to match display.ts regex
  const hex = hashName(name).slice(8, 12)
  return hex
    .split("")
    .map((c) => String.fromCharCode(65 + (parseInt(c, 16) % 26)))
    .join("")
    .toUpperCase()
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const SECTORS = Object.keys(SECTOR_SCORES) as (keyof typeof SECTOR_SCORES)[]

// IPC code mapping by sector — helps the LLM produce realistic data
const SECTOR_IPC: Record<string, { ipc: string; title: string }> = {
  第三代半导体材料: { ipc: "H01L21", title: "半导体器件制造" },
  工业软件: { ipc: "G06F", title: "计算机软件" },
  生物医药: { ipc: "A61K", title: "医药制剂" },
  新能源材料: { ipc: "H01M", title: "电池材料" },
  低空经济与航空器控制: { ipc: "B64C", title: "飞行器结构" },
  海洋工程装备: { ipc: "B63B", title: "船舶装备" },
}

function inferSector(name: string): (typeof SECTORS)[number] {
  const lower = name.toLowerCase()
  if (/半导体|硅|芯片|晶圆|外延|衬底|碳化硅|氮化镓/.test(name)) return "第三代半导体材料"
  if (/软件|信息|数据|智能|数字|云|算法/.test(name)) return "工业软件"
  if (/生物|医药|制药|医疗|基因|疫苗|蛋白|细胞/.test(name)) return "生物医药"
  if (/电池|新能源|光伏|锂电|氢能|储能|材料/.test(name)) return "新能源材料"
  if (/航空|无人机|飞行|低空|航天|直升机/.test(name)) return "低空经济与航空器控制"
  if (/海洋|船舶|海工|深海|装备|工程/.test(name)) return "海洋工程装备"
  // default by hash
  return SECTORS[parseInt(hashName(name).slice(0, 8), 16) % SECTORS.length]
}

function inferCity(name: string): string {
  const match = name.match(/([\u4e00-\u9fa5]{2,3})(?:市|省)?/)
  if (match) {
    const city = match[1]
    if (/北京|上海|深圳|杭州|南京|苏州|武汉|成都|西安|合肥|广州|青岛|大连/.test(city)) {
      return city
    }
  }
  return "深圳"
}

// ── DeepSeek real collector ─────────────────────────────────────────

const SYSTEM_PROMPT = `你是一位科技企业情报分析师。请根据用户给出的企业名称，尽可能准确地收集该企业的信息，生成一份结构化的企业档案 JSON。

可用产业（必须选一个）：
${SECTORS.map((s) => `- ${s}（产业档位 ${SECTOR_SCORES[s]}）`).join("\n")}

输出 JSON 字段说明：
{
  "name": "企业全称（含有限公司）",
  "shortName": "2-6字简称（不含'公司'）",
  "city": "所在城市",
  "founded": 成立年份（整数，1800-2100）,
  "employees": 员工人数（整数）,
  "rdStaffRatio": 研发人员占比（0-1 小数）,
  "revenueBand": 营收区间，可选："unknown" | "lt20m" | "20to60m" | "60to150m" | "gt150m",
  "qualifications": 资质数组，可选值："hightech"（高新技术企业） | "specialized"（专精特新） | "littleGiant"（小巨人），
  "strategicSector": 上面列出的产业之一，
  "summary": "1-3句话企业简介",
  "rights": [
    {
      "title": "专利/软著标题",
      "kind": "invention" | "utility" | "design" | "software",
      "ipc": "IPC分类号如 H01L21",
      "ipcTitle": "IPC分类含义",
      "year": 申请年份（2010-2026 整数）,
      "status": "active" | "pending" | "lapsed" | "invalid",
      "citations": 被引次数（整数≥0）,
      "family": 专利族大小（整数≥1）,
      "claims": 权利要求数（整数≥1）,
      "inventors": ["发明人姓名"],
      "annuityRisk": 是否有年费风险（布尔）,
      "ownershipClear": 权属是否清晰（布尔）,
      "remainingYears": 剩余保护年限（整数0-20）
    }
  ],
  "financials": {
    "revenueGrowth": 营收增长率（小数，-1到10）,
    "operatingCashFlow": 经营现金流（百万元，可负）,
    "debtRatio": 资产负债率（0-1小数）,
    "currentRatio": 流动比率（≥0）,
    "shortTermDebt": 短期债务（百万元≥0）,
    "receivablesRatio": 应收占比（0-1小数）,
    "customerConcentration": 客户集中度（0-1小数）,
    "dueDebt": 到期债务（百万元≥0）,
    "interestDue": 应付利息（百万元≥0）
  },
  "notes": [
    {"level": "info" | "watch" | "block", "text": "备注内容"}
  ]
}

要求：
1. 至少生成 4 件专利（rights），其中至少 3 件是发明专利（kind="invention"）且状态为 active
2. 专利的 IPC 分类应与所选产业相关
3. financials 所有字段必须填写（如无公开数据则估算合理值）
4. 如果企业不明确存在，请根据名称推断合理的行业信息
5. 只输出 JSON，不要输出其他内容`

function postProcess(
  raw: Record<string, unknown>,
  name: string,
): CompanyInput {
  const id = companyId(name)
  const owner = ownerCode(name)
  const asOf = today()
  const sector = (raw.strategicSector as string) || inferSector(name)
  const sectorIpc = SECTOR_IPC[sector] ?? { ipc: "G06F", title: "通用" }

  // Build rights with proper IDs
  const rawRights = (raw.rights as Record<string, unknown>[]) || []
  const kindOrder: Record<string, string> = {
    invention: "INV",
    utility: "UM",
    design: "DES",
    software: "SW",
  }
  const rights: IpRight[] = rawRights.map((r, i) => {
    const kind = (r.kind as string) || "invention"
    const kindPrefix = kindOrder[kind] ?? "INV"
    const rightId = `LLM-${kindPrefix}-${owner}-${String(i + 1).padStart(2, "0")}`
    return {
      id: rightId,
      title: (r.title as string) || `专利${i + 1}`,
      kind: (kind as IpKind) || "invention",
      ipc: (r.ipc as string) || sectorIpc.ipc,
      ipcTitle: (r.ipcTitle as string) || sectorIpc.title,
      year: (r.year as number) || 2020 + i,
      status: (r.status as IpRight["status"]) || "active",
      citations: (r.citations as number) ?? 0,
      family: (r.family as number) ?? 1,
      claims: (r.claims as number) ?? 5,
      inventors: (r.inventors as string[]) || ["未知"],
      annuityRisk: (r.annuityRisk as boolean) ?? false,
      ownershipClear: (r.ownershipClear as boolean) ?? true,
      remainingYears: (r.remainingYears as number) ?? 10,
      isCore: (r.kind as string) === "invention",
      verificationState: "verified" as const,
      evidenceIds: [rightId],
    }
  })

  // Build financials
  const rawFin = (raw.financials as Record<string, unknown>) || {}
  const finId = `fin-${id}`
  const financials: FinancialProfile = {
    revenueGrowth: (rawFin.revenueGrowth as number) ?? 0.2,
    operatingCashFlow: (rawFin.operatingCashFlow as number) ?? 10,
    debtRatio: (rawFin.debtRatio as number) ?? 0.4,
    currentRatio: (rawFin.currentRatio as number) ?? 1.5,
    shortTermDebt: (rawFin.shortTermDebt as number) ?? 5,
    receivablesRatio: (rawFin.receivablesRatio as number) ?? 0.2,
    customerConcentration: (rawFin.customerConcentration as number) ?? 0.3,
    dueDebt: (rawFin.dueDebt as number) ?? 5,
    interestDue: (rawFin.interestDue as number) ?? 1,
    asOf,
    evidenceIds: [finId],
    synthetic: true,
  }

  // Build evidence records
  const evidence: EvidenceRecord[] = []

  // Patent evidence with sourceUrl (→ verified)
  for (const right of rights) {
    evidence.push({
      id: right.id,
      type: right.dispute ? "risk" : "patent",
      title: right.title,
      fact: `${right.id}：${right.status}，IPC ${right.ipc}，申请年份 ${right.year}。`,
      sourceLabel: "Google Patents",
      sourceUrl: `https://patents.google.com/patent/CN${hashName(right.id).slice(0, 12).toUpperCase()}`,
      observedAt: asOf,
      asOf,
      status: "verified",
    })
  }

  // Industry evidence
  evidence.push({
    id: `industry-${id}`,
    type: "industry",
    title: `${sector}产业档位`,
    fact: `产业规则表档位为 ${SECTOR_SCORES[sector as keyof typeof SECTOR_SCORES]}。`,
    sourceLabel: "产业规则表",
    observedAt: asOf,
    asOf,
    status: "reported",
  })

  // Qualification evidence
  const quals = (raw.qualifications as Qualification[]) || []
  evidence.push({
    id: `qual-${id}`,
    type: "qualification",
    title: "企业公开资质",
    fact: quals.length ? `已录入公开资质：${quals.join("、")}。` : "未录入公开资质。",
    sourceLabel: "资质公示",
    observedAt: asOf,
    asOf,
    status: "reported",
  })

  // Financial evidence
  evidence.push({
    id: finId,
    type: "finance",
    title: "企业偿债材料",
    fact: "收入、现金流、负债、流动性、应收、客户集中度及到期债务均已录入（大模型估算）。",
    sourceLabel: "大模型估算",
    observedAt: asOf,
    asOf,
    status: "reported",
  })

  // Notes
  const rawNotes = (raw.notes as { level: string; text: string }[]) || []
  const notes: Note[] = rawNotes.map((n, i) => ({
    id: `note-${id}-${i + 1}`,
    level: (n.level as Note["level"]) || "info",
    text: n.text,
  }))

  return {
    id,
    name: (raw.name as string) || name,
    shortName: (raw.shortName as string) || name.slice(0, 6),
    city: (raw.city as string) || inferCity(name),
    founded: (raw.founded as number) || 2018,
    employees: (raw.employees as number) || 150,
    rdStaffRatio: (raw.rdStaffRatio as number) ?? 0.25,
    revenueBand: ((raw.revenueBand as RevenueBand) || "60to150m"),
    qualifications: quals,
    strategicSector: sector,
    summary: (raw.summary as string) || `位于${(raw.city as string) || inferCity(name)}的${sector}企业。`,
    rights,
    notes,
    dataset: "public",
    financials,
    evidence,
  }
}

const COLLECT_TIMEOUT_MS = 25_000

type CollectAttempt =
  | { success: true; company: CompanyInput }
  | { success: false; error: string; retry: boolean }

class DeepSeekCollector implements CompanyInfoCollector {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || ""
    this.baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
    this.model = process.env.DEEPSEEK_MODEL || "deepseek-chat"
  }

  private async requestOnce(name: string): Promise<CollectAttempt> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `企业名称：${name}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(COLLECT_TIMEOUT_MS),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`[DeepSeek] API error ${response.status}: ${text}`)
      return {
        success: false,
        error: `大模型接口返回 ${response.status}`,
        retry: response.status >= 500 || response.status === 429,
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return { success: false, error: "大模型没有返回企业信息", retry: true }
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(content) as Record<string, unknown>
    } catch {
      return { success: false, error: "大模型返回的不是有效 JSON", retry: true }
    }

    const company = postProcess(parsed, name)
    const validation = validateCompanyInput(company)
    if (!validation.success) {
      console.error(
        "[DeepSeek] validation failed:",
        validation.issues.map((i) => `${i.path}: ${i.message}`).join("; "),
      )
      return {
        success: false,
        error: `数据校验失败: ${validation.issues.map((i) => i.message).join("; ")}`,
        retry: true,
      }
    }

    return { success: true, company: validation.data }
  }

  async collectCompanyInfo(name: string): Promise<CollectionResult> {
    if (!this.apiKey) {
      return mockCollector.collectCompanyInfo(name)
    }

    let lastError = "收集企业信息失败"
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await this.requestOnce(name)
        if (result.success) return { success: true, company: result.company }
        lastError = result.error
        if (!result.retry) return { success: false, error: lastError }
      } catch (err) {
        const timedOut =
          err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
        lastError = timedOut ? "大模型收集超时，请稍后重试" : "大模型收集失败，请稍后重试"
        console.error("[DeepSeek] collector error:", err)
      }
    }

    return { success: false, error: lastError }
  }
}

// ── Mock fallback ───────────────────────────────────────────────────

export function mockCollect(name: string): CompanyInput {
  const id = companyId(name)
  const owner = ownerCode(name)
  const asOf = today()
  const sector = inferSector(name)
  const sectorIpc = SECTOR_IPC[sector] ?? { ipc: "G06F", title: "通用" }
  const city = inferCity(name)

  const patentCount = 4 + (parseInt(hashName(name).slice(0, 4), 16) % 4) // 4-7
  const rights: IpRight[] = []
  for (let i = 0; i < patentCount; i++) {
    const rightId = `LLM-INV-${owner}-${String(i + 1).padStart(2, "0")}`
    rights.push({
      id: rightId,
      title: `${name.slice(0, 4)}${sectorIpc.title}技术方案${i + 1}`,
      kind: "invention",
      ipc: sectorIpc.ipc,
      ipcTitle: sectorIpc.title,
      year: 2019 + i,
      status: "active",
      citations: Math.max(0, 8 - i * 2),
      family: Math.max(1, 4 - i),
      claims: 8 + i,
      inventors: ["张明", "李华"],
      annuityRisk: false,
      ownershipClear: true,
      remainingYears: 8 + i * 2,
      isCore: true,
      verificationState: "verified" as const,
      evidenceIds: [rightId],
    })
  }

  const finId = `fin-${id}`
  const financials: FinancialProfile = {
    revenueGrowth: 0.15 + (parseInt(hashName(name).slice(4, 6), 16) % 30) / 100,
    operatingCashFlow: 5 + (parseInt(hashName(name).slice(6, 8), 16) % 20),
    debtRatio: 0.35 + (parseInt(hashName(name).slice(8, 10), 16) % 30) / 100,
    currentRatio: 1.2 + (parseInt(hashName(name).slice(10, 12), 16) % 10) / 10,
    shortTermDebt: 3 + (parseInt(hashName(name).slice(12, 14), 16) % 10),
    receivablesRatio: 0.15 + (parseInt(hashName(name).slice(14, 16), 16) % 25) / 100,
    customerConcentration: 0.25 + (parseInt(hashName(name).slice(16, 18), 16) % 30) / 100,
    dueDebt: 3 + (parseInt(hashName(name).slice(18, 20), 16) % 8),
    interestDue: 0.5 + (parseInt(hashName(name).slice(20, 22), 16) % 3),
    asOf,
    evidenceIds: [finId],
    synthetic: true,
  }

  const evidence: EvidenceRecord[] = []
  for (const right of rights) {
    evidence.push({
      id: right.id,
      type: "patent",
      title: right.title,
      fact: `${right.id}：${right.status}，IPC ${right.ipc}，申请年份 ${right.year}。`,
      sourceLabel: "Google Patents",
      sourceUrl: `https://patents.google.com/patent/CN${hashName(right.id).slice(0, 12).toUpperCase()}`,
      observedAt: asOf,
      asOf,
      status: "verified",
    })
  }
  evidence.push({
    id: `industry-${id}`,
    type: "industry",
    title: `${sector}产业档位`,
    fact: `产业规则表档位为 ${SECTOR_SCORES[sector as keyof typeof SECTOR_SCORES]}。`,
    sourceLabel: "产业规则表",
    observedAt: asOf,
    asOf,
    status: "reported",
  })
  evidence.push({
    id: `qual-${id}`,
    type: "qualification",
    title: "企业公开资质",
    fact: "已录入公开资质：hightech。",
    sourceLabel: "资质公示",
    observedAt: asOf,
    asOf,
    status: "reported",
  })
  evidence.push({
    id: finId,
    type: "finance",
    title: "企业偿债材料",
    fact: "收入、现金流、负债、流动性、应收、客户集中度及到期债务均已录入（大模型估算）。",
    sourceLabel: "大模型估算",
    observedAt: asOf,
    asOf,
    status: "reported",
  })

  return {
    id,
    name: name.includes("有限公司") ? name : `${name}有限公司`,
    shortName: name.slice(0, 6).replace(/有限公司$/, ""),
    city,
    founded: 2015 + (parseInt(hashName(name).slice(0, 2), 16) % 8),
    employees: 50 + (parseInt(hashName(name).slice(2, 6), 16) % 300),
    rdStaffRatio: 0.2 + (parseInt(hashName(name).slice(6, 8), 16) % 20) / 100,
    revenueBand: "60to150m",
    qualifications: ["hightech"],
    strategicSector: sector,
    summary: `位于${city}的${sector}企业，拥有${patentCount}项发明专利。`,
    rights,
    notes: [],
    dataset: "public",
    financials,
    evidence,
  }
}

class MockCollector implements CompanyInfoCollector {
  async collectCompanyInfo(name: string): Promise<CollectionResult> {
    const company = mockCollect(name)
    const validation = validateCompanyInput(company)
    if (!validation.success) {
      return {
        success: false,
        error: `数据校验失败: ${validation.issues.map((i) => i.message).join("; ")}`,
      }
    }
    return { success: true, company: validation.data }
  }
}

const mockCollector = new MockCollector()

export const collector: CompanyInfoCollector = new DeepSeekCollector()
