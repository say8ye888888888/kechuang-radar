import { kindLabel, qualLabel, revenueLabel, statusLabel } from "./labels"
import type {
  CompanyInput,
  Decision,
  Dimension,
  Evaluation,
  EvidencePack,
  Factor,
  IpRight,
  ReportBlock,
  RiskNote,
  RuleCheck,
} from "./types"

const WEIGHTS = {
  tech: 0.3,
  continuity: 0.2,
  industry: 0.15,
  finance: 0.2,
  riskControl: 0.15,
} as const

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function avg(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function patentsOf(company: CompanyInput) {
  return company.rights.filter((right) => right.kind !== "software")
}

function scoreTech(company: CompanyInput) {
  const patents = patentsOf(company)
  const inventions = company.rights.filter((right) => right.kind === "invention")
  const active = inventions.filter((right) => right.status === "active")
  const utilities = company.rights.filter((right) => right.kind === "utility")
  const software = company.rights.filter((right) => right.kind === "software")
  const pending = inventions.filter((right) => right.status === "pending")

  const countScore = active.length === 0 ? 12 : clamp(28 + active.length * 14)
  const citations = avg(active.map((right) => right.citations))
  const claims = avg(active.map((right) => right.claims))
  const family = avg(active.map((right) => right.family))
  const citeScore = active.length ? clamp((citations / 6) * 100) : 8
  const claimScore = active.length ? clamp((claims / 12) * 100) : 8
  const familyScore = active.length ? clamp((family / 4) * 100) : 8

  const ipc = new Map<string, number>()
  for (const right of patents) {
    const key = right.ipc.slice(0, 4)
    ipc.set(key, (ipc.get(key) ?? 0) + 1)
  }
  let hhi = 0
  const total = patents.length || 1
  for (const count of ipc.values()) hhi += (count / total) ** 2
  const focusScore = patents.length ? clamp(hhi * 100) : 30
  const softwareScore = clamp((software.length / 5) * 100)

  const factors: Factor[] = [
    {
      id: "tech-count",
      label: "有效发明",
      score: round1(countScore),
      weight: 0.36,
      detail: `有效发明 ${active.length} 件，在审发明 ${pending.length} 件`,
    },
    {
      id: "tech-cite",
      label: "被引强度",
      score: round1(citeScore),
      weight: 0.18,
      detail: active.length
        ? `有效发明篇均被引 ${citations.toFixed(1)} 次`
        : "没有有效发明，被引按低分计",
    },
    {
      id: "tech-claim",
      label: "权利要求",
      score: round1(claimScore),
      weight: 0.14,
      detail: active.length
        ? `有效发明平均权利要求 ${claims.toFixed(1)} 项`
        : "没有有效发明可供评估权利要求",
    },
    {
      id: "tech-family",
      label: "同族布局",
      score: round1(familyScore),
      weight: 0.12,
      detail: active.length
        ? `有效发明平均同族 ${family.toFixed(1)} 件`
        : "没有有效发明可供评估同族",
    },
    {
      id: "tech-focus",
      label: "技术聚焦",
      score: round1(focusScore),
      weight: 0.12,
      detail: `专利 IPC 小类集中度 ${hhi.toFixed(2)}，越高表示技术方向越集中`,
    },
    {
      id: "tech-sw",
      label: "软著补充",
      score: round1(softwareScore),
      weight: 0.08,
      detail: `软件著作权 ${software.length} 件。软著只补充软件企业的权利证据，不替代发明质量`,
    },
  ]

  let score = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0)
  if (patents.length >= 4 && utilities.length / patents.length >= 0.6) {
    const penalty = round1((utilities.length / patents.length - 0.45) * 28)
    score -= penalty
    factors.push({
      id: "tech-util",
      label: "实用新型堆量",
      score: -penalty,
      weight: 0,
      detail: `实用新型占专利 ${Math.round((utilities.length / patents.length) * 100)}%，从技术分扣 ${penalty} 分`,
    })
  }

  return { score: round1(clamp(score)), factors }
}

function inventorStats(rights: IpRight[]) {
  const counts = new Map<string, number>()
  for (const right of rights) {
    for (const inventor of right.inventors) {
      counts.set(inventor, (counts.get(inventor) ?? 0) + 1)
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const top = ranked[0]
  const stability = top && rights.length ? top[1] / rights.length : 0
  return { top, stability, ranked }
}

function scoreContinuity(company: CompanyInput) {
  const recent = company.rights.filter((right) => right.year >= 2024).length
  const years = [2022, 2023, 2024, 2025, 2026]
  const activeYears = years.filter((year) =>
    company.rights.some((right) => right.year === year),
  ).length
  const { top, stability } = inventorStats(company.rights)
  let teamScore = 45
  if (!top) teamScore = 30
  else if (stability >= 0.25 && stability <= 0.75) teamScore = 86
  else if (stability > 0.75) teamScore = 58

  const factors: Factor[] = [
    {
      id: "cont-recent",
      label: "近三年产出",
      score: round1(clamp((recent / 4) * 100)),
      weight: 0.45,
      detail: `2024–2026 年新增权利 ${recent} 件`,
    },
    {
      id: "cont-years",
      label: "申请连续性",
      score: round1(clamp((activeYears / 4) * 100)),
      weight: 0.35,
      detail: `2022–2026 年中有 ${activeYears} 个年份出现新权利`,
    },
    {
      id: "cont-team",
      label: "团队延续",
      score: teamScore,
      weight: 0.2,
      detail: top
        ? `出现最多的发明人是${top[0]}，覆盖 ${Math.round(stability * 100)}% 的权利`
        : "权利上没有发明人信息",
    },
  ]

  const score = round1(
    clamp(factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0)),
  )
  return { score, factors, stability }
}

function scoreFinance(company: CompanyInput) {
  const revenueScore = {
    unknown: 42,
    lt20m: 48,
    "20to60m": 66,
    "60to150m": 80,
    gt150m: 88,
  }[company.revenueBand]
  const rdScore =
    company.rdStaffRatio == null
      ? 42
      : clamp((company.rdStaffRatio / 0.35) * 100)
  let qualScore = 42
  if (company.qualifications.includes("hightech")) qualScore += 18
  if (company.qualifications.includes("specialized")) qualScore += 16
  if (company.qualifications.includes("littleGiant")) qualScore += 16
  qualScore = clamp(qualScore)

  const factors: Factor[] = [
    {
      id: "fin-revenue",
      label: "营收区间",
      score: revenueScore,
      weight: 0.4,
      detail: revenueLabel[company.revenueBand],
    },
    {
      id: "fin-rd",
      label: "研发人员占比",
      score: round1(rdScore),
      weight: 0.3,
      detail:
        company.rdStaffRatio == null
          ? "未披露研发人员占比，按弱证据计分"
          : `研发人员占员工 ${Math.round(company.rdStaffRatio * 100)}%`,
    },
    {
      id: "fin-qual",
      label: "公开资质",
      score: qualScore,
      weight: 0.3,
      detail: company.qualifications.length
        ? company.qualifications.map((item) => qualLabel[item]).join("、")
        : "没有高新或专精特新资质",
    },
  ]

  let score = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0)
  const weak = company.revenueBand === "unknown" || company.rdStaffRatio == null
  let note: string | undefined
  if (weak) {
    score = Math.min(score, 58)
    note = "营收或研发人员占比缺失。财务分封顶 58，避免用空数据堆出高分。"
  }
  return { score: round1(clamp(score)), factors, weak, note }
}

function scoreRisk(company: CompanyInput, stability: number) {
  const notes: RiskNote[] = []
  let penalty = 0
  const patents = patentsOf(company)
  const inventions = company.rights.filter((right) => right.kind === "invention")
  const active = inventions.filter((right) => right.status === "active")
  const disputes = company.rights.filter((right) => right.dispute || !right.ownershipClear)
  const annuity = company.rights.filter((right) => right.annuityRisk)
  const dead = patents.filter(
    (right) => right.status === "lapsed" || right.status === "invalid",
  )
  const pending = inventions.filter((right) => right.status === "pending")

  if (disputes.length) {
    penalty += 36
    notes.push({
      id: "risk-title",
      label: "权属或争议",
      points: 36,
      detail: disputes
        .map((right) => right.dispute || `${right.title}权属不清`)
        .join("；"),
    })
  }
  if (annuity.length) {
    const points = Math.min(18, annuity.length * 8)
    penalty += points
    notes.push({
      id: "risk-annuity",
      label: "年费或维持",
      points,
      detail: `${annuity.map((right) => right.id).join("、")} 存在年费或权利维持风险`,
    })
  }
  if (patents.length && dead.length / patents.length >= 0.25) {
    penalty += 12
    notes.push({
      id: "risk-dead",
      label: "失效占比",
      points: 12,
      detail: `失效或无效专利 ${dead.length} 件，占专利 ${Math.round((dead.length / patents.length) * 100)}%`,
    })
  }
  if (stability > 0.8 && company.rights.length >= 4) {
    penalty += 10
    notes.push({
      id: "risk-person",
      label: "关键人集中",
      points: 10,
      detail: "单一发明人覆盖过高，人员变动会直接冲击权利延续",
    })
  }
  if (2026 - company.founded < 3) {
    penalty += 8
    notes.push({
      id: "risk-age",
      label: "存续较短",
      points: 8,
      detail: `企业成立于 ${company.founded} 年，经营历史短于 3 年`,
    })
  }
  if (
    inventions.length > 0 &&
    pending.length / inventions.length >= 0.5 &&
    active.length <= 1
  ) {
    penalty += 8
    notes.push({
      id: "risk-pending",
      label: "核心权利未稳",
      points: 8,
      detail: `发明中 ${pending.length}/${inventions.length} 件仍在审，质押条件不成熟`,
    })
  }
  if (!notes.length) {
    notes.push({
      id: "risk-clear",
      label: "未发现硬性瑕疵",
      points: 0,
      detail: "样本内未见权属争议、年费逾期或大面积失效。这只覆盖已录入字段",
    })
  }

  const score = round1(clamp(100 - penalty))
  const factors: Factor[] = notes.map((note) => ({
    id: note.id,
    label: note.label,
    score: note.points,
    weight: 0,
    detail: note.detail,
  }))
  return { score, factors, notes, disputes }
}

function pledgeableRights(company: CompanyInput) {
  return company.rights.filter(
    (right) =>
      right.kind === "invention" &&
      right.status === "active" &&
      right.ownershipClear &&
      !right.dispute &&
      !right.annuityRisk &&
      right.remainingYears >= 8,
  )
}

function buildDecision(
  company: CompanyInput,
  tech: number,
  continuity: number,
  industry: number,
  finance: number,
  riskControl: number,
  pledgeable: number,
  disputes: number,
): { decision: Decision; ruleChecks: RuleCheck[] } {
  const qualified = company.qualifications.length > 0
  const ruleChecks: RuleCheck[] = [
    {
      id: "rule-title",
      label: "无权属硬伤",
      pass: disputes === 0,
      detail:
        disputes === 0
          ? "已录入权利没有权属争议"
          : `${disputes} 件权利存在权属争议或权属不清，规则在这里停止产品推荐`,
    },
    {
      id: "rule-pledge",
      label: "可质押发明不少于 3 件",
      pass: pledgeable >= 3,
      detail: `满足演示质押口径的有效发明 ${pledgeable} 件（有效、权属清楚、无年费风险、剩余保护期不少于 8 年）`,
    },
    {
      id: "rule-tech",
      label: "技术竞争力不低于 72",
      pass: tech >= 72,
      detail: `技术竞争力 ${tech}`,
    },
    {
      id: "rule-risk",
      label: "风险可控度不低于 70",
      pass: riskControl >= 70,
      detail: `风险可控度 ${riskControl}`,
    },
    {
      id: "rule-finance",
      label: "财务证据不低于 60",
      pass: finance >= 60,
      detail: `财务能力 ${finance}`,
    },
    {
      id: "rule-qual",
      label: "具备高新或专精特新资质",
      pass: qualified,
      detail: qualified
        ? company.qualifications.map((item) => qualLabel[item]).join("、")
        : "没有公开资质",
    },
    {
      id: "rule-credit-line",
      label: "技术分不低于 62 且风险可控度不低于 62",
      pass: tech >= 62 && riskControl >= 62,
      detail: `技术 ${tech}，风险可控度 ${riskControl}`,
    },
  ]

  if (disputes > 0) {
    return {
      decision: {
        product: "hold",
        title: "暂缓准入",
        reason:
          "规则引擎发现权属硬伤后停止产品匹配。技术分可以很高，但不能在争议未核清时进入科创专利贷或科技信用贷。",
      },
      ruleChecks,
    }
  }

  if (pledgeable >= 3 && tech >= 72 && riskControl >= 70 && finance >= 60) {
    return {
      decision: {
        product: "patent-loan",
        title: "建议匹配科创专利贷",
        reason:
          "可质押发明、技术分、风险可控度和财务证据同时过线。额度仍要按知识产权评估价值和经营情况核定，本系统不输出金额。",
      },
      ruleChecks,
    }
  }

  if (qualified && tech >= 62 && riskControl >= 62) {
    return {
      decision: {
        product: "credit-loan",
        title: "建议匹配科技信用贷",
        reason:
          "资质、技术分和风险可控度达到信用类科创贷款观察线。可质押发明不足或质押条件未齐，先走信用类产品，不把软著或在审专利直接当成质押物。",
      },
      ruleChecks,
    }
  }

  if (
    (continuity >= 70 && industry >= 75 && riskControl >= 60 && tech >= 30) ||
    (tech >= 50 && riskControl >= 60)
  ) {
    return {
      decision: {
        product: "investigate",
        title: "补充调查后再评",
        reason:
          "产业方向或创新节奏有线索，但权利稳定性、存续时间或财务证据还不够形成产品建议。",
      },
      ruleChecks,
    }
  }

  return {
    decision: {
      product: "decline",
      title: "暂不建议纳入科创授信",
      reason:
        "公开技术证据偏弱，或权利质量不足以支持科技信用判断。保留观察即可，不占用授信资源。",
    },
    ruleChecks,
  }
}

function topRightIds(company: CompanyInput) {
  return company.rights
    .filter((right) => right.kind === "invention" && right.status === "active")
    .slice(0, 3)
    .map((right) => right.id)
}

function buildReport(
  company: CompanyInput,
  dimensions: Dimension[],
  composite: number,
  grade: Evaluation["grade"],
  decision: Decision,
  pledgeable: IpRight[],
  riskNotes: RiskNote[],
): ReportBlock[] {
  const byKey = Object.fromEntries(dimensions.map((dimension) => [dimension.key, dimension]))
  const tech = byKey.tech
  const finance = byKey.finance
  const industry = byKey.industry
  const continuity = byKey.continuity
  const evidenceIds = topRightIds(company)

  return [
    {
      heading: "预审结论",
      paragraphs: [
        {
          text: `${company.shortName}科技信用分 ${composite}，等级 ${grade}。${decision.title}。${decision.reason}`,
          evidence: ["decision"],
        },
      ],
    },
    {
      heading: "为什么形成这个判断",
      paragraphs: [
        {
          text: `${tech.factors[0].detail}。${tech.factors[1].detail}。${tech.factors[4].detail}。`,
          evidence: evidenceIds.length ? evidenceIds : ["dim-tech"],
        },
        {
          text: `${continuity.factors[0].detail}。${continuity.factors[2].detail}。`,
          evidence: ["dim-continuity"],
        },
        {
          text: `${company.strategicSector}在产业规则表中的档位是 ${industry.score}。${industry.factors[0].detail}`,
          evidence: ["dim-industry"],
        },
        {
          text: `财务证据：${finance.factors.map((factor) => factor.detail).join("；")}。${finance.note ?? "财务材料来自企业披露的区间和公开资质，不是审计报表。"}`,
          evidence: ["dim-finance"],
        },
        {
          text: `按演示质押口径，可进入质押讨论的发明有 ${pledgeable.length} 件${
            pledgeable.length
              ? `：${pledgeable.map((right) => right.id).join("、")}`
              : ""
          }。`,
          evidence: pledgeable.map((right) => right.id),
        },
      ],
    },
    {
      heading: "主要风险",
      paragraphs: riskNotes.map((note) => ({
        text: `${note.label}：${note.detail}。`,
        evidence: [note.id],
      })),
    },
    {
      heading: "人工备注",
      paragraphs: company.notes.length
        ? company.notes.map((note) => ({
            text: note.text,
            evidence: [note.id],
          }))
        : [
            {
              text: "这条样本没有额外人工备注。",
              evidence: [],
            },
          ],
    },
  ]
}

function buildActions(decision: Decision): string[] {
  if (decision.product === "patent-loan") {
    return [
      "到国家知识产权局核实质押登记路径，确认没有在先质押、独占许可和共有限制",
      "核对剩余保护期是否覆盖拟授信期限，演示口径为不少于 8 年",
      "请评估机构单独出具价值意见，本页分数不能当作质押价值",
      "核对近两年回款和研发支出，确认贷款用于经营与研发而不是股东周转",
    ]
  }
  if (decision.product === "credit-loan") {
    return [
      "核验高新或专精特新证书的有效期和认定机关",
      "补齐近两年财务报表、纳税证明和主要客户回款",
      "访谈核心技术人员，确认职务发明归属和竞业安排",
      "软著只证明软件成果，不直接作为质押物推进",
    ]
  }
  if (decision.product === "hold") {
    return [
      "先取权属争议、无效宣告或共有权材料，未核清前不匹配产品",
      "核对接任发明人、离职协议和职务发明奖励约定",
      "争议权利从可质押清单剔除，避免用有瑕疵的专利做增信",
    ]
  }
  if (decision.product === "investigate") {
    return [
      "跟踪在审发明的审查意见，授权前不进入质押讨论",
      "补齐订单、回款和股东背景，弥补公开财务证据不足",
      "对成立不满三年的企业，提高实际控制人和技术带头人访谈权重",
    ]
  }
  return [
    "放入观察名单，不进入本次授信排期",
    "若后续出现与主营一致的授权发明，再重新跑评分卡",
    "不用实用新型数量或软著数量单独改写结论",
  ]
}

function buildPack(
  company: CompanyInput,
  dimensions: Dimension[],
  composite: number,
  grade: Evaluation["grade"],
  decision: Decision,
  pledgeable: IpRight[],
  riskNotes: RiskNote[],
): EvidencePack {
  return {
    instruction:
      "只根据本包中的字段组织三段说明：判断依据、主要风险、建议动作。不得新增诉讼、订单、额度或估值，不得推翻 decision。",
    company: company.name,
    decision: decision.title,
    composite,
    grade,
    dimensions: dimensions.map((dimension) => ({
      name: dimension.label,
      score: dimension.score,
      weight: dimension.weight,
    })),
    pledgeable: pledgeable.map((right) => ({ id: right.id, title: right.title })),
    risks: riskNotes.map((note) => `${note.label}：${note.detail}`),
    notes: company.notes.map((note) => note.text),
    rights: company.rights.map((right) => ({
      id: right.id,
      title: right.title,
      kind: kindLabel[right.kind],
      status: statusLabel[right.status],
      ipc: right.ipc,
      year: right.year,
      dispute: right.dispute,
    })),
  }
}

export function evaluate(company: CompanyInput): Evaluation {
  const tech = scoreTech(company)
  const continuity = scoreContinuity(company)
  const finance = scoreFinance(company)
  const risk = scoreRisk(company, continuity.stability)
  const industryFactors: Factor[] = [
    {
      id: "ind-rule",
      label: "战新产业规则档",
      score: company.sectorOutlook,
      weight: 1,
      detail: `${company.strategicSector}由人工规则表维护，分值 ${company.sectorOutlook}。这不是产业预测模型。`,
    },
  ]
  const dimensions: Dimension[] = [
    {
      key: "tech",
      label: "技术竞争力",
      weight: WEIGHTS.tech,
      score: tech.score,
      factors: tech.factors,
    },
    {
      key: "continuity",
      label: "创新持续性",
      weight: WEIGHTS.continuity,
      score: continuity.score,
      factors: continuity.factors,
    },
    {
      key: "industry",
      label: "行业前景",
      weight: WEIGHTS.industry,
      score: company.sectorOutlook,
      factors: industryFactors,
    },
    {
      key: "finance",
      label: "财务能力",
      weight: WEIGHTS.finance,
      score: finance.score,
      factors: finance.factors,
      note: finance.note,
    },
    {
      key: "riskControl",
      label: "风险可控",
      weight: WEIGHTS.riskControl,
      score: risk.score,
      factors: risk.factors,
      note: "风险项以扣分进入可控度。可控度越高，雷达图向外越满。",
    },
  ]

  const composite = round1(
    dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0),
  )
  const grade: Evaluation["grade"] =
    composite >= 82 ? "A" : composite >= 70 ? "B" : composite >= 60 ? "C" : "D"
  const pledgeable = pledgeableRights(company)
  const { decision, ruleChecks } = buildDecision(
    company,
    tech.score,
    continuity.score,
    company.sectorOutlook,
    finance.score,
    risk.score,
    pledgeable.length,
    risk.disputes.length,
  )

  return {
    company,
    dimensions,
    composite,
    grade,
    pledgeableIds: pledgeable.map((right) => right.id),
    ruleChecks,
    decision,
    riskNotes: risk.notes,
    report: buildReport(
      company,
      dimensions,
      composite,
      grade,
      decision,
      pledgeable,
      risk.notes,
    ),
    actions: buildActions(decision),
    evidencePack: buildPack(
      company,
      dimensions,
      composite,
      grade,
      decision,
      pledgeable,
      risk.notes,
    ),
  }
}

export const modelContract = [
  "输入只有评分卡、规则结论、权利清单和人工备注。",
  "每一句说明必须能回指证据编号；编号不在包内的句子丢弃。",
  "模型可以改写语序，不能改写产品结论，也不能生成授信额度。",
  "权属争议、失效、年费风险优先写入风险段，不能被优点段落盖过。",
  "演示环境用同一套证据包本地组装文字，用来展示契约。接入行内模型时只替换最后的语言组织。",
].join("\n")
