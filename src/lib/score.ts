import { kindLabel, qualLabel, statusLabel } from "./labels"
import { freezeEvidencePack } from "./evidence"
import type {
  CompanyInput,
  Decision,
  Dimension,
  Evaluation,
  EvidencePack,
  EvidenceRecord,
  Factor,
  FinanceStatus,
  IpRight,
  ReportBlock,
  RiskNote,
  RuleCheck,
} from "./types"
import {
  AS_OF,
  DEMO_RULES,
  RULE_VERSION,
  SCORE_VERSION,
  SCORE_WEIGHTS,
  financeStatus as getFinanceStatus,
  missingFinanceMaterials,
} from "./rules"

const WEIGHTS = SCORE_WEIGHTS

export type EvaluateOptions = {
  asOf?: string
  evaluationId?: string
  dataSnapshotId?: string
  scoreVersion?: string
  ruleVersion?: string
}

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

function scoreTech(company: CompanyInput, asOf: string) {
  const patents = patentsOf(company)
  const inventions = company.rights.filter((right) => right.kind === "invention")
  const active = inventions.filter((right) => right.status === "active")
  const utilities = company.rights.filter((right) => right.kind === "utility")
  const software = company.rights.filter((right) => right.kind === "software")
  const pending = inventions.filter((right) => right.status === "pending")

  const countScore = active.length === 0 ? 12 : clamp(28 + active.length * 14)
  const asOfYear = Number(asOf.slice(0, 4))
  const citations = avg(active.map((right) => right.citations))
  const citationScores = active.map((right) => {
    const observedYears = Math.max(1, asOfYear - right.year + 1)
    const annualized = right.citations / observedYears
    return annualized >= 1.5 ? 90 : annualized >= 0.5 ? 68 : 42
  })
  const claims = avg(active.map((right) => right.claims))
  const family = avg(active.map((right) => right.family))
  const citeScore = active.length ? avg(citationScores) : 8
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
  const focusScore = patents.length
    ? hhi >= 0.4 && hhi <= 0.75
      ? 85
      : hhi > 0.75
        ? 68
        : 62
    : 30
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
        ? `有效发明篇均被引 ${citations.toFixed(1)} 次；按申请年龄折算为高、中、低三档。接入真实同业样本后改用同 IPC、同申请年分位数`
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
      detail: `专利 IPC 小类集中度 ${hhi.toFixed(2)}。适度聚焦计分，过高不继续加分并进入路线集中提示`,
    },
    {
      id: "tech-sw",
      label: "软著补充",
      score: round1(softwareScore),
      weight: 0.08,
      detail: `软件著作权 ${software.length} 件。软著只补充软件企业的权利证据，不替代发明质量`,
    },
  ]

  const score = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0)
  if (patents.length >= 4 && utilities.length / patents.length >= 0.6) {
    factors.push({
      id: "tech-util",
      label: "权利结构提示",
      score: 0,
      weight: 0,
      detail: `实用新型占专利 ${Math.round((utilities.length / patents.length) * 100)}%。类型本身不自动扣分，需结合主营相关性和法律状态核验`,
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

function scoreContinuity(company: CompanyInput, asOf: string) {
  const asOfYear = Number(asOf.slice(0, 4))
  const recentStart = asOfYear - 2
  const recent = company.rights.filter(
    (right) => right.year >= recentStart && right.year <= asOfYear,
  ).length
  const years = Array.from({ length: 5 }, (_, index) => asOfYear - 4 + index)
  const activeYears = years.filter((year) =>
    company.rights.some((right) => right.year === year),
  ).length
  const { top, stability } = inventorStats(company.rights)
  let teamScore = 45
  if (!top) teamScore = 30
  else if (stability >= 0.25 && stability <= 0.75) teamScore = 86
  else if (stability > 0.75) teamScore = 58
  const rdScore =
    company.rdStaffRatio == null ? 35 : clamp((company.rdStaffRatio / 0.35) * 100)
  let qualificationScore = 35
  if (company.qualifications.includes("hightech")) qualificationScore += 20
  if (company.qualifications.includes("specialized")) qualificationScore += 20
  if (company.qualifications.includes("littleGiant")) qualificationScore += 20
  qualificationScore = clamp(qualificationScore)

  const factors: Factor[] = [
    {
      id: "cont-recent",
      label: "近三年产出",
      score: round1(clamp((recent / 4) * 100)),
      weight: 0.3,
      detail: `${recentStart}–${asOfYear} 年新增权利 ${recent} 件`,
    },
    {
      id: "cont-years",
      label: "申请连续性",
      score: round1(clamp((activeYears / 4) * 100)),
      weight: 0.25,
      detail: `${years[0]}–${asOfYear} 年中有 ${activeYears} 个年份出现新权利`,
    },
    {
      id: "cont-team",
      label: "团队延续",
      score: teamScore,
      weight: 0.2,
      detail: top
        ? `出现最多的发明人是${top[0]}，覆盖 ${Math.round(stability * 100)}% 的权利；这只表示专利贡献集中，不代表人员在职状态`
        : "权利上没有发明人信息",
    },
    {
      id: "cont-rd",
      label: "研发投入代理",
      score: round1(rdScore),
      weight: 0.15,
      detail:
        company.rdStaffRatio == null
          ? "未披露研发人员占比，按弱证据计分"
          : `研发人员占员工 ${Math.round(company.rdStaffRatio * 100)}%`,
    },
    {
      id: "cont-qual",
      label: "创新资质",
      score: qualificationScore,
      weight: 0.1,
      detail: company.qualifications.length
        ? company.qualifications.map((item) => qualLabel[item]).join("、")
        : "没有录入高新或专精特新资质",
    },
  ]

  const score = round1(
    clamp(factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0)),
  )
  return { score, factors, stability }
}

function scoreFinance(company: CompanyInput, asOf: string) {
  const fieldStatus = getFinanceStatus(company.financials as Record<string, unknown> | undefined)
  const missingMaterials = missingFinanceMaterials(
    company.financials as Record<string, unknown> | undefined,
  )
  const financeAsOf = company.financials?.asOf
  const dateStatus =
    financeAsOf && /^\d{4}-\d{2}-\d{2}$/.test(financeAsOf) && financeAsOf <= asOf
      ? "ok"
      : financeAsOf && financeAsOf > asOf
        ? "future"
        : "missing"
  if (dateStatus === "missing") missingMaterials.push("财务材料时点")
  if (dateStatus === "future") missingMaterials.push("不晚于评估时点的财务材料")
  const financeEvidenceIds = company.financials?.evidenceIds ?? []
  const financeEvidence = (company.evidence ?? []).filter(
    (record) =>
      record.type === "finance" &&
      record.status !== "unknown" &&
      financeEvidenceIds.includes(record.id),
  )
  const evidenceComplete =
    fieldStatus === "complete" &&
    financeEvidenceIds.length > 0 &&
    financeEvidence.length === financeEvidenceIds.length
  const status: FinanceStatus =
    fieldStatus === "complete" && evidenceComplete && dateStatus === "ok"
      ? "complete"
      : fieldStatus === "missing" && dateStatus === "missing"
        ? "missing"
        : "partial"
  if (fieldStatus === "complete" && !evidenceComplete) {
    missingMaterials.push("财务材料证据记录")
  }
  const factors: Factor[] = []
  let score = 0
  const weak = status !== "complete"
  let note: string | undefined
  if (status === "complete" && company.financials) {
    const profile = company.financials
    const growthScore = clamp(((profile.revenueGrowth ?? 0) + 0.1) / 0.5 * 100)
    const cashScore = clamp(((profile.operatingCashFlow ?? 0) + 5) / 25 * 100)
    const leverageScore = clamp((1 - (profile.debtRatio ?? 1)) * 125)
    const liquidityScore = clamp(((profile.currentRatio ?? 0) - 0.5) / 1.5 * 100)
    const collectionScore = clamp(
      (1 - ((profile.receivablesRatio ?? 1) + (profile.customerConcentration ?? 1)) / 2) * 100,
    )
    const nearTermDebt = Math.max(profile.shortTermDebt ?? 0, profile.dueDebt ?? 0)
    const debtServiceCoverage =
      (profile.operatingCashFlow ?? 0) /
      Math.max(nearTermDebt + (profile.interestDue ?? 0), 1)
    const debtServiceScore = clamp((debtServiceCoverage / 2) * 100)
    const repaymentScore =
      growthScore * 0.1 +
      cashScore * 0.25 +
      leverageScore * 0.15 +
      liquidityScore * 0.15 +
      collectionScore * 0.15 +
      debtServiceScore * 0.2
    factors.push(
      {
        id: "fin-growth",
        label: "营收增速",
        score: round1(growthScore),
        weight: 0.1,
        detail: `近两年营收增速 ${Math.round((profile.revenueGrowth ?? 0) * 100)}%`,
      },
      {
        id: "fin-cashflow",
        label: "经营现金流",
        score: round1(cashScore),
        weight: 0.25,
        detail: `经营现金流 ${profile.operatingCashFlow}（演示口径）`,
      },
      {
        id: "fin-leverage",
        label: "负债水平",
        score: round1(leverageScore),
        weight: 0.15,
        detail: `资产负债率 ${Math.round((profile.debtRatio ?? 0) * 100)}%`,
      },
      {
        id: "fin-liquidity",
        label: "流动性",
        score: round1(liquidityScore),
        weight: 0.15,
        detail: `流动比率 ${profile.currentRatio}`,
      },
      {
        id: "fin-collection",
        label: "应收与客户集中",
        score: round1(collectionScore),
        weight: 0.15,
        detail: `应收占比 ${Math.round((profile.receivablesRatio ?? 0) * 100)}%，客户集中度 ${Math.round((profile.customerConcentration ?? 0) * 100)}%`,
      },
      {
        id: "fin-debt-service",
        label: "到期债务覆盖",
        score: round1(debtServiceScore),
        weight: 0.2,
        detail: `经营现金流 /（短期债务与近期到期债务取高值 + 应付利息）约 ${debtServiceCoverage.toFixed(2)} 倍`,
      },
    )
    score = repaymentScore
    note = profile.synthetic
      ? "偿债指标为演示材料，接入真实企业时必须替换为经授权并可核验的数据。"
      : undefined
  } else {
    factors.push({
      id: "fin-missing",
      label: "偿债材料状态",
      score: 0,
      weight: 1,
      detail: `待补：${missingMaterials.join("、")}`,
    })
    note =
      status === "missing"
        ? "未提供独立偿债材料。本维度不评分，产品路径转为补充调查。"
        : `偿债材料不完整，缺少：${missingMaterials.join("、")}。本维度不评分。`
  }
  return {
    score: round1(clamp(score)),
    factors,
    weak,
    note,
    status,
    missingMaterials,
  }
}

function scoreRisk(company: CompanyInput, stability: number, asOf: string) {
  const notes: RiskNote[] = []
  let penalty = 0
  const patents = patentsOf(company)
  const inventions = company.rights.filter((right) => right.kind === "invention")
  const active = inventions.filter((right) => right.status === "active")
  const disputes = company.rights.filter(
    (right) => right.dispute || !right.ownershipClear || right.disputeSeverity !== undefined,
  )
  const enterpriseDisputes = disputes.filter(
    (right) =>
      right.disputeSeverity === "enterprise" ||
      (right.disputeSeverity == null &&
        right.isCore !== false &&
        (right.isCore === true || right.kind === "invention") &&
        (Boolean(right.dispute) || !right.ownershipClear)),
  )
  const assetDisputes = disputes.filter((right) => !enterpriseDisputes.includes(right))
  const unknownRights = company.rights.filter(
    (right) => right.verificationState !== "verified",
  )
  const blockNotes = company.notes.filter((note) => note.level === "block")
  const annuity = company.rights.filter((right) => right.annuityRisk)
  const dead = patents.filter(
    (right) => right.status === "lapsed" || right.status === "invalid",
  )
  const pending = inventions.filter((right) => right.status === "pending")

  if (enterpriseDisputes.length) {
    penalty += 36
    notes.push({
      id: "risk-title",
      label: "核心权利或企业级争议",
      points: 36,
      detail: enterpriseDisputes
        .map((right) => right.dispute || `${right.title}权属不清`)
        .join("；"),
    })
  }
  if (blockNotes.length) {
    const points = enterpriseDisputes.length ? 0 : 36
    penalty += points
    notes.push({
      id: "risk-note-block",
      label: "人工硬阻断备注",
      points,
      detail: blockNotes.map((note) => note.text).join("；"),
    })
  }
  if (assetDisputes.length) {
    const points = Math.min(16, assetDisputes.length * 8)
    penalty += points
    notes.push({
      id: "risk-asset-title",
      label: "资产级权属瑕疵",
      points,
      detail: `${assetDisputes.map((right) => right.id).join("、")} 仅从质押候选中排除；不自动阻断企业信用融资`,
    })
  }
  if (unknownRights.length) {
    const points = Math.min(12, unknownRights.length * 3)
    penalty += points
    notes.push({
      id: "risk-unknown",
      label: "权利状态待核验",
      points,
      detail: `${unknownRights.map((right) => right.id).join("、")} 的法律或年费状态未知，不能按正常处理`,
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
  const asOfYear = Number(asOf.slice(0, 4))
  if (asOfYear - company.founded < 3) {
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
    id: `risk-factor-${note.id}`,
    label: note.label,
    score: note.points,
    weight: 0,
    detail: note.detail,
  }))
  return { score, factors, notes, disputes, enterpriseDisputes, assetDisputes, unknownRights, blockNotes }
}

function pledgeableRights(company: CompanyInput) {
  return company.rights.filter(
    (right) =>
      (DEMO_RULES.patent.allowedKinds as readonly string[]).includes(right.kind) &&
      right.status === "active" &&
      right.ownershipClear &&
      !right.dispute &&
      right.disputeSeverity === undefined &&
      !right.annuityRisk &&
      right.verificationState === "verified" &&
      right.remainingYears >= DEMO_RULES.patent.minRemainingYears,
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
  enterpriseRisks: number,
  unknownRights: number,
  financeStatus: FinanceStatus,
  missingMaterials: string[],
): { decision: Decision; ruleChecks: RuleCheck[] } {
  const qualified = company.qualifications.length > 0
  const ruleChecks: RuleCheck[] = [
    {
      id: "rule-title",
      label: "无企业级硬风险",
      pass: enterpriseRisks === 0,
      detail:
        enterpriseRisks === 0
          ? "未发现影响核心技术或持续经营的企业级硬风险；单项瑕疵仅排除对应资产"
          : `${enterpriseRisks} 项企业级硬风险信号待核，规则在这里停止产品推荐`,
      reasonCode: "ENTERPRISE_HARD_STOP",
    },
    {
      id: "rule-finance-complete",
      label: "偿债材料完整",
      pass: financeStatus === "complete",
      detail:
        financeStatus === "complete"
          ? "收入、现金流、负债、流动性、应收、客户集中度及到期债务材料已录入"
          : `偿债材料${financeStatus === "missing" ? "缺失" : "不完整"}，需补：${missingMaterials.join("、")}`,
      reasonCode: "FINANCE_INCOMPLETE",
    },
    {
      id: "rule-right-status",
      label: "权利状态已核验",
      pass: unknownRights === 0,
      detail:
        unknownRights === 0
          ? "权利状态均有记录"
          : `${unknownRights} 件权利缺少可核验的法律状态或权属状态`,
      reasonCode: "RIGHT_STATUS_UNKNOWN",
    },
    {
      id: "rule-pledge",
      label: `可质押发明不少于 ${DEMO_RULES.patent.minPledgeable} 件`,
      pass: pledgeable >= DEMO_RULES.patent.minPledgeable,
      detail: `满足 ${RULE_VERSION} 演示口径的有效发明 ${pledgeable} 件（有效、权属清楚、状态已核验、无年费风险、剩余保护期不少于 ${DEMO_RULES.patent.minRemainingYears} 年）`,
      reasonCode: "PLEDGEABLE_COUNT",
    },
    {
      id: "rule-tech",
      label: `技术竞争力不低于 ${DEMO_RULES.patent.minTech}`,
      pass: tech >= DEMO_RULES.patent.minTech,
      detail: `技术竞争力 ${tech}`,
      reasonCode: "PATENT_TECH_THRESHOLD",
    },
    {
      id: "rule-risk",
      label: `风险可控度不低于 ${DEMO_RULES.patent.minRisk}`,
      pass: riskControl >= DEMO_RULES.patent.minRisk,
      detail: `风险可控度 ${riskControl}`,
      reasonCode: "PATENT_RISK_THRESHOLD",
    },
    {
      id: "rule-finance",
      label: `财务证据不低于 ${DEMO_RULES.patent.minFinance}`,
      pass: financeStatus === "complete" && finance >= DEMO_RULES.patent.minFinance,
      detail: `财务能力 ${finance}`,
      reasonCode: "PATENT_FINANCE_THRESHOLD",
    },
    {
      id: "rule-qual",
      label: "具备高新或专精特新资质",
      pass: qualified,
      detail: qualified
        ? company.qualifications.map((item) => qualLabel[item]).join("、")
        : "没有公开资质",
      reasonCode: "QUALIFICATION_REQUIRED",
    },
    {
      id: "rule-credit-line",
      label: `技术分不低于 ${DEMO_RULES.credit.minTech} 且风险可控度不低于 ${DEMO_RULES.credit.minRisk}`,
      pass: tech >= DEMO_RULES.credit.minTech && riskControl >= DEMO_RULES.credit.minRisk,
      detail: `技术 ${tech}，风险可控度 ${riskControl}`,
      reasonCode: "CREDIT_SCORE_THRESHOLD",
    },
  ]

  if (enterpriseRisks > 0) {
    return {
      decision: {
        product: "hold",
        title: "暂缓核查",
        reason:
          "规则引擎发现影响核心技术或持续经营的企业级硬风险，停止产品匹配并转人工核查。",
        reasonCode: "ENTERPRISE_HARD_STOP",
        eligible: false,
      },
      ruleChecks,
    }
  }

  if (financeStatus !== "complete") {
    return {
      decision: {
        product: "investigate",
        title: "偿债材料待补",
        reason:
          "科技预评分可供调查排序，但缺少完整偿债材料，当前不推荐专利质押贷或科技信用贷。",
        reasonCode: "FINANCE_INCOMPLETE",
        eligible: false,
        missingMaterials,
      },
      ruleChecks,
    }
  }

  if (unknownRights > 0) {
    return {
      decision: {
        product: "investigate",
        title: "权利状态待核验",
        reason: "存在未核验的权利状态，先补充来源和法律状态材料，再重新评估产品路径。",
        reasonCode: "RIGHT_STATUS_UNKNOWN",
        eligible: false,
      },
      ruleChecks,
    }
  }

  if (
    pledgeable >= DEMO_RULES.patent.minPledgeable &&
    tech >= DEMO_RULES.patent.minTech &&
    riskControl >= DEMO_RULES.patent.minRisk &&
    finance >= DEMO_RULES.patent.minFinance
  ) {
    return {
      decision: {
        product: "patent-loan",
        title: "初步适配科创专利贷",
        reason:
          "可质押发明、技术分、风险可控度和偿债材料同时满足演示规则。仍需人工核验权属、评估价值和还款来源。",
        reasonCode: "PATENT_PATH_MATCHED",
        eligible: true,
      },
      ruleChecks,
    }
  }

  if (
    (!DEMO_RULES.credit.requireQualification || qualified) &&
    tech >= DEMO_RULES.credit.minTech &&
    riskControl >= DEMO_RULES.credit.minRisk
  ) {
    return {
      decision: {
        product: "credit-loan",
        title: "初步适配科技信用贷",
        reason:
          "资质、技术分、风险可控度和偿债材料满足演示观察线，可进入信用类产品人工预审。",
        reasonCode: "CREDIT_PATH_MATCHED",
        eligible: true,
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
        reasonCode: "MORE_INVESTIGATION_REQUIRED",
        eligible: false,
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
      reasonCode: "EVIDENCE_TOO_WEAK",
      eligible: false,
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
          text: `${company.shortName}科技预评分 ${composite}，等级 ${grade}。${decision.title}。${decision.reason}`,
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
          text: `偿债证据：${finance.factors.map((factor) => factor.detail).join("；")}。${finance.note ?? "偿债材料来自已录入的企业授权或公开披露字段，仍需人工核验。"}`,
          evidence: ["dim-finance"],
        },
        {
          text: `按演示质押口径，可进入质押讨论的发明有 ${pledgeable.length} 件${
            pledgeable.length
              ? `：${pledgeable.map((right) => right.id).join("、")}`
              : ""
          }。`,
          evidence: pledgeable.length
            ? pledgeable.map((right) => right.id)
            : ["dim-tech"],
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
              evidence: ["notes-empty"],
            },
          ],
    },
  ]
}

function buildActions(decision: Decision): string[] {
  if (decision.reasonCode === "FINANCE_INCOMPLETE") {
    return [
      ...(decision.missingMaterials ?? []).map((item) => `补充${item}`),
      "材料补齐前只保留科技预评分，不推荐专利质押贷或科技信用贷",
      "补件后以同一规则版本重新评估并保留前后快照",
    ]
  }
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
  options: Required<Pick<EvaluateOptions, "asOf" | "evaluationId" | "dataSnapshotId" | "scoreVersion" | "ruleVersion">>,
  financeStatus: FinanceStatus,
  missingMaterials: string[],
): EvidencePack {
  const generatedRightEvidence: EvidenceRecord[] = company.rights.map((right) => {
    const linkedSource = (company.evidence ?? []).find(
      (record) =>
        (right.evidenceIds?.length ? right.evidenceIds : [right.id]).includes(record.id) &&
        (record.type === "patent" || record.type === "risk"),
    )
    return {
      id: right.id,
      type: right.dispute || !right.ownershipClear ? "risk" : "patent",
      title: right.title,
      fact: `${right.id}：${statusLabel[right.status]}，IPC ${right.ipc}，申请年份 ${right.year}。`,
      sourceLabel: linkedSource?.sourceLabel ?? "企业提交的权利快照",
      ...(linkedSource?.sourceUrl ? { sourceUrl: linkedSource.sourceUrl } : {}),
      observedAt: options.asOf,
      asOf: options.asOf,
      status: right.verificationState ?? "unknown",
      demo: company.dataset === "demo",
    }
  })
  const generatedNoteEvidence: EvidenceRecord[] = company.notes.length
    ? company.notes.map((note) => ({
        id: note.id,
        type: note.level === "block" ? "risk" : "note",
        title: "人工备注",
        fact: note.text,
        sourceLabel: "人工核验记录",
        observedAt: options.asOf,
        asOf: options.asOf,
        status: "reported" as const,
        demo: company.dataset === "demo",
      }))
    : [
        {
          id: "notes-empty",
          type: "note" as const,
          title: "人工备注",
          fact: "本次评估未提交额外人工备注。",
          sourceLabel: "评估输入",
          observedAt: options.asOf,
          asOf: options.asOf,
          status: "reported" as const,
          demo: company.dataset === "demo",
        },
      ]
  const trustedDemoEvidence = company.dataset === "demo" ? company.evidence ?? [] : []
  const submittedEvidence = company.dataset === "demo" ? [] : company.evidence ?? []
  const rawEvidenceRecords: EvidenceRecord[] = [
    ...dimensions.flatMap((dimension) =>
      dimension.factors.map((factor) => ({
        id: factor.id,
        type: "rule" as const,
        title: factor.label,
        fact: factor.detail,
        sourceLabel: "评分引擎",
        observedAt: options.asOf,
        asOf: options.asOf,
        status: "reported" as const,
        demo: company.dataset === "demo",
      })),
    ),
    ...riskNotes.map((note) => ({
      id: note.id,
      type: "risk" as const,
      title: note.label,
      fact: note.detail,
      sourceLabel: "风险规则引擎",
      observedAt: options.asOf,
      asOf: options.asOf,
      status: "reported" as const,
      demo: company.dataset === "demo",
    })),
    ...dimensions.map((dimension) => ({
      id: `dim-${dimension.key}`,
      type: "rule" as const,
      title: dimension.label,
      fact: `${dimension.label} ${dimension.score} 分，权重 ${dimension.weight}`,
      sourceLabel: "评分卡",
      observedAt: options.asOf,
      asOf: options.asOf,
      status: "reported" as const,
      demo: company.dataset === "demo",
    })),
    {
      id: "decision",
      type: "rule" as const,
      title: "产品决策",
      fact: `${decision.title}：${decision.reason}`,
      sourceLabel: "产品匹配规则",
      observedAt: options.asOf,
      asOf: options.asOf,
      status: "reported" as const,
      demo: company.dataset === "demo",
    },
    ...trustedDemoEvidence,
    ...generatedRightEvidence,
    ...generatedNoteEvidence,
    // Generated records are authoritative for submitted/public IDs used by
    // the report. Checked-in demo snapshots are trusted; other user records
    // can add source material but cannot shadow computed facts.
    ...submittedEvidence,
  ]
  const evidenceById = new Map<string, EvidenceRecord>()
  for (const record of rawEvidenceRecords) {
    if (!evidenceById.has(record.id)) evidenceById.set(record.id, record)
  }
  const evidenceRecords = [...evidenceById.values()]
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
    evaluationId: options.evaluationId,
    asOf: options.asOf,
    scoreVersion: options.scoreVersion,
    ruleVersion: options.ruleVersion,
    dataSnapshotId: options.dataSnapshotId,
    scoreScope: financeStatus === "complete" ? "full" : "innovation-only",
    financeStatus,
    missingMaterials,
    evidenceRecords,
  }
}

function snapshotCompany(company: CompanyInput, asOf: string): CompanyInput {
  const asOfYear = Number(asOf.slice(0, 4))
  const evidence = company.evidence?.filter(
    (record) =>
      (!record.asOf || record.asOf <= asOf) &&
      (!record.observedAt || record.observedAt <= asOf),
  )
  const availableEvidenceIds = new Set(evidence?.map((record) => record.id) ?? [])
  const rights = company.rights
    .filter((right) => right.year <= asOfYear)
    .map((right) => {
      if (company.dataset !== "demo" || asOf >= AS_OF) return right
      const linkedIds = right.evidenceIds?.length ? right.evidenceIds : [right.id]
      return linkedIds.some((id) => availableEvidenceIds.has(id))
        ? right
        : { ...right, verificationState: "unknown" as const }
    })
  const snapshot: CompanyInput = { ...company, rights, ...(evidence ? { evidence } : {}) }
  if (company.financials?.asOf && company.financials.asOf > asOf) {
    // Do not let a later-period balance sheet or cash-flow snapshot enter an
    // earlier evaluation. The innovation profile can still be scored.
    snapshot.financials = undefined
  }
  return snapshot
}

export function evaluate(inputCompany: CompanyInput, inputOptions: EvaluateOptions = {}): Evaluation {
  const options = {
    asOf: inputOptions.asOf ?? AS_OF,
    evaluationId: inputOptions.evaluationId ?? `eval-${inputCompany.id}-${inputOptions.asOf ?? AS_OF}`,
    dataSnapshotId:
      inputOptions.dataSnapshotId ?? `snapshot-${inputCompany.id}-${inputOptions.asOf ?? AS_OF}`,
    scoreVersion: inputOptions.scoreVersion ?? SCORE_VERSION,
    ruleVersion: inputOptions.ruleVersion ?? RULE_VERSION,
  }
  const company = snapshotCompany(inputCompany, options.asOf)
  const tech = scoreTech(company, options.asOf)
  const continuity = scoreContinuity(company, options.asOf)
  const finance = scoreFinance(company, options.asOf)
  const risk = scoreRisk(company, continuity.stability, options.asOf)
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
  if (finance.status !== "complete") {
    const availableWeight = 1 - WEIGHTS.finance
    for (const dimension of dimensions) {
      dimension.weight =
        dimension.key === "finance" ? 0 : dimension.weight / availableWeight
    }
  }
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
    risk.enterpriseDisputes.length + risk.blockNotes.length,
    risk.unknownRights.length,
    finance.status,
    finance.missingMaterials,
  )

  const hardStops = [
    ...risk.enterpriseDisputes.map((right) => right.id),
    ...risk.blockNotes.map((note) => note.id),
  ]
  const evidencePack = freezeEvidencePack(buildPack(
    company,
    dimensions,
    composite,
    grade,
    decision,
    pledgeable,
    risk.notes,
    options,
    finance.status,
    finance.missingMaterials,
  ))
  const sourceEvidence = (evidencePack.evidenceRecords ?? []).filter((record) =>
    ["patent", "finance", "qualification", "industry", "note"].includes(record.type),
  )
  const coverage = Math.round(
    (sourceEvidence.filter((record) => record.status !== "unknown").length /
      Math.max(sourceEvidence.length, 1)) *
      100,
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
    evidencePack,
    meta: {
      evaluationId: options.evaluationId,
      asOf: options.asOf,
      createdAt: `${options.asOf}T00:00:00.000Z`,
      scoreVersion: options.scoreVersion,
      ruleVersion: options.ruleVersion,
      dataSnapshotId: options.dataSnapshotId,
      schemaVersion: "1.1",
      demo: company.dataset === "demo",
    },
    evidenceStatus: {
      coverage,
      financeStatus: finance.status,
      unknownItems: company.rights
        .filter(
          (right) =>
            right.verificationState !== "verified",
        )
        .map((right) => right.id),
      missingMaterials: finance.missingMaterials,
      hardStops,
    },
    scoreScope: finance.status === "complete" ? "full" : "innovation-only",
  }
}

export const modelContract = [
  "输入只有冻结后的评分卡、规则结论、权利清单和人工备注。",
  "每一句说明必须能回指证据编号；编号不在包内的句子丢弃。",
  "模型可以改写语序，不能改写产品结论，也不能生成授信额度。",
  "权属争议、失效、年费风险优先写入风险段，不能被优点段落盖过。",
  "演示环境用同一套证据包本地组装文字，用来展示契约。接入行内模型时只替换最后的语言组织。",
].join("\n")
