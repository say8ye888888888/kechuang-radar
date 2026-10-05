import { createHash } from "node:crypto"
import { validateEvaluation } from "@/lib/evidence"
import { evaluate, type EvaluateOptions } from "@/lib/score"
import { AS_OF, DEMO_RULES, RULE_VERSION, SCORE_VERSION, SCORE_WEIGHTS } from "@/lib/rules"
import type { CompanyInput, Evaluation } from "@/lib/types"
import { companyRepository } from "@/server/repositories/company-repository"

export type ServiceOptions = Pick<EvaluateOptions, "asOf">

export function validAsOf(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value <= AS_OF
  )
}

function stableId(prefix: string, company: CompanyInput, asOf: string) {
  const digest = createHash("sha256")
    .update(JSON.stringify({ company, asOf, score: SCORE_VERSION, rules: RULE_VERSION }))
    .digest("hex")
    .slice(0, 10)
  return `${prefix}-${company.id}-${digest}`
}

function evaluateStored(company: CompanyInput, options: ServiceOptions = {}) {
  const asOf = options.asOf ?? AS_OF
  return evaluate(company, {
    asOf,
    evaluationId: stableId("EV", company, asOf),
    dataSnapshotId: stableId("SNAP", company, asOf),
    scoreVersion: SCORE_VERSION,
    ruleVersion: RULE_VERSION,
  })
}

export async function listEvaluations(options: ServiceOptions = {}) {
  const companies = await companyRepository.list()
  return companies.map((company) => evaluateStored(company, options))
}

export async function getEvaluation(id: string, options: ServiceOptions = {}) {
  const company = await companyRepository.findById(id)
  return company ? evaluateStored(company, options) : null
}

export function evaluateSubmittedCompany(company: CompanyInput, options: ServiceOptions = {}) {
  const asOf = options.asOf ?? AS_OF
  const evidence = company.evidence ?? []
  const verifiedSourceIds = new Set(
    evidence
      .filter(
        (record) =>
          (record.type === "patent" || record.type === "risk") &&
          record.status === "verified" &&
          typeof record.sourceUrl === "string" &&
          /^https?:\/\//i.test(record.sourceUrl) &&
          record.asOf <= asOf &&
          record.observedAt <= asOf,
      )
      .map((record) => record.id),
  )
  const rights = company.rights.map((right) => {
    const linkedIds = [right.id, ...(right.evidenceIds ?? [])]
    const hasVerifiedSource = linkedIds.some((id) => verifiedSourceIds.has(id))
    return {
      ...right,
      // A public request cannot elevate a right on a bare flag. It must carry
      // a linked verified source URL; otherwise it stays in manual review.
      verificationState:
        right.verificationState === "verified" && hasVerifiedSource
          ? ("verified" as const)
          : right.verificationState === "reported"
            ? ("reported" as const)
            : ("unknown" as const),
    }
  })
  return evaluateStored({ ...company, dataset: "public", rights }, { ...options, asOf })
}

export async function findEvidence(id: string, companyId?: string) {
  const evaluations = companyId
    ? await getEvaluation(companyId).then((evaluation) => (evaluation ? [evaluation] : []))
    : await listEvaluations()
  return evaluations.flatMap((evaluation) => {
    const record = evaluation.evidencePack.evidenceRecords?.find((item) => item.id === id)
    return record
      ? [
          {
            record,
            evaluationId: evaluation.meta?.evaluationId,
            company: {
              id: evaluation.company.id,
              name: evaluation.company.name,
              shortName: evaluation.company.shortName,
            },
          },
        ]
      : []
  })
}

export function methodology() {
  return {
    scoreVersion: SCORE_VERSION,
    ruleVersion: RULE_VERSION,
    asOf: AS_OF,
    weights: SCORE_WEIGHTS,
    thresholds: DEMO_RULES,
    productOrder: [
      "enterprise-hard-stop",
      "finance-completeness",
      "patent-loan",
      "credit-loan",
      "investigate",
      "decline",
    ],
    reportValidation: [
      "每个报告句子必须引用证据包内编号",
      "模型不得改变产品结论、生成额度或估值",
      "引用缺失或数字不一致时回退本地模板",
    ],
    disclaimer: DEMO_RULES.disclaimer,
    updatedAt: `${AS_OF}T00:00:00.000Z`,
  }
}

export function catalogSize() {
  return 6
}

export function evaluationValidation(evaluation: Evaluation) {
  return validateEvaluation(evaluation)
}
