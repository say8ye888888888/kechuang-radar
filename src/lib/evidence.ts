import type { EvidencePack, Evaluation, EvidenceRecord } from "./types"

export type EvidenceValidation = {
  valid: boolean
  missingIds: string[]
  unsupportedClaims: string[]
}

export function evidenceRecords(pack: EvidencePack): EvidenceRecord[] {
  return pack.evidenceRecords ?? []
}

export function validateEvidencePack(pack: EvidencePack): EvidenceValidation {
  const records = new Set(evidenceRecords(pack).map((record) => record.id))
  const references = new Set<string>()
  for (const risk of pack.risks) {
    const match = evidenceRecords(pack).find((record) => risk.includes(record.fact))
    if (match) references.add(match.id)
  }
  for (const right of pack.pledgeable) references.add(right.id)
  const missingIds = [...references].filter((id) => !records.has(id))
  const unsupportedClaims: string[] = []
  if (!pack.company || !pack.decision) unsupportedClaims.push("缺少企业或决策字段")
  if (pack.scoreScope === "innovation-only" && pack.decision.includes("授信")) {
    unsupportedClaims.push("偿债证据不完整时不得生成确定性授信结论")
  }
  return { valid: missingIds.length === 0 && unsupportedClaims.length === 0, missingIds, unsupportedClaims }
}

export function validateEvaluation(evaluation: Evaluation): EvidenceValidation {
  const result = validateEvidencePack(evaluation.evidencePack)
  const ids = new Set(evidenceRecords(evaluation.evidencePack).map((record) => record.id))
  const reportRefs = evaluation.report.flatMap((block) =>
    block.paragraphs.flatMap((paragraph) => paragraph.evidence),
  )
  const missingReportIds = reportRefs.filter((id) => !ids.has(id))
  return {
    valid: result.valid && missingReportIds.length === 0,
    missingIds: [...new Set([...result.missingIds, ...missingReportIds])],
    unsupportedClaims: result.unsupportedClaims,
  }
}

export function freezeEvidencePack(pack: EvidencePack): EvidencePack {
  return JSON.parse(JSON.stringify(pack)) as EvidencePack
}
