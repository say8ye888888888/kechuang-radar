import { db } from "@/server/db/database"
import { evaluationStore } from "@/server/repositories/evaluation-store"
import { companyRepository } from "@/server/repositories/company-repository"
import { evaluateSubmittedCompany } from "@/server/services/evaluation-service"
import { collector } from "@/server/services/llm-collector"

export type SearchStatus = "found_demo" | "found_collected" | "collected_by_llm" | "failed"

export type SearchResult =
  | { status: "found_demo" | "found_collected" | "collected_by_llm"; companyId: string }
  | { status: "failed"; companyId: null; error: string }

function today() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Search orchestration:
 * 1. Check the JSON store for a previously collected company by name
 * 2. Check demo repository by name
 * 3. Call LLM collector to gather company info
 * 4. Evaluate via evaluateSubmittedCompany (bypasses AS_OF with today)
 * 5. Persist to the JSON store
 * Cache hits return immediately. History is recorded only for a new collection or a failure.
 */
export async function searchCompany(name: string): Promise<SearchResult> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { status: "failed", companyId: null, error: "企业名称不能为空" }
  }

  const asOf = today()

  // 1. Check the JSON store (previously collected by LLM)
  const stored = await evaluationStore.findByName(trimmed)
  if (stored) {
    return { status: "found_collected", companyId: stored.companyId }
  }

  // 2. Check demo repository
  const demoCompany = await companyRepository.findByName(trimmed)
  if (demoCompany) {
    return { status: "found_demo", companyId: demoCompany.id }
  }

  // 3. Call LLM collector
  const collection = await collector.collectCompanyInfo(trimmed)
  if (!collection.success) {
    db.addSearchHistory({
      queryName: trimmed,
      companyId: null,
      status: "failed",
      errorMessage: collection.error,
    })
    return { status: "failed", companyId: null, error: collection.error }
  }

  // 4. Evaluate (bypasses AS_OF — uses today as the evaluation date)
  const evaluation = evaluateSubmittedCompany(collection.company, { asOf })

  // 5. Persist the company and the miss log in one write
  await evaluationStore.save(collection.company, evaluation, asOf, {
    queryName: trimmed,
    companyId: collection.company.id,
    status: "collected_by_llm",
    errorMessage: null,
  })

  return { status: "collected_by_llm", companyId: collection.company.id }
}
