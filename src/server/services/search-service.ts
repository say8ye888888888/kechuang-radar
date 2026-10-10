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
 * 1. Check SQLite store for previously collected company by name
 * 2. Check demo repository by name
 * 3. Call LLM collector to gather company info
 * 4. Evaluate via evaluateSubmittedCompany (bypasses AS_OF with today)
 * 5. Persist to SQLite store
 * 6. Log search history
 */
export async function searchCompany(name: string): Promise<SearchResult> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { status: "failed", companyId: null, error: "企业名称不能为空" }
  }

  const asOf = today()

  // 1. Check SQLite store (previously collected by LLM)
  const stored = await evaluationStore.findByName(trimmed)
  if (stored) {
    db.addSearchHistory({
      queryName: trimmed,
      companyId: stored.companyId,
      status: "found_collected",
      errorMessage: null,
    })
    return { status: "found_collected", companyId: stored.companyId }
  }

  // 2. Check demo repository
  const demoCompany = await companyRepository.findByName(trimmed)
  if (demoCompany) {
    db.addSearchHistory({
      queryName: trimmed,
      companyId: demoCompany.id,
      status: "found_demo",
      errorMessage: null,
    })
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

  // 5. Persist to SQLite
  await evaluationStore.save(collection.company, evaluation, asOf)

  // 6. Log
  db.addSearchHistory({
    queryName: trimmed,
    companyId: collection.company.id,
    status: "collected_by_llm",
    errorMessage: null,
  })

  return { status: "collected_by_llm", companyId: collection.company.id }
}
