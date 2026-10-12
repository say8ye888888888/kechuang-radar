import { db, type SearchHistoryEntry } from "@/server/db/database"
import type { CompanyInput, Evaluation } from "@/lib/types"

type SearchHistoryInput = Omit<SearchHistoryEntry, "id" | "createdAt">

/**
 * Persistent evaluation store backed by the JSON file database. Mirrors the
 * interface in the plan so a SQLite/Postgres implementation can replace this
 * module without touching any caller.
 */
export interface EvaluationStore {
  save(
    company: CompanyInput,
    evaluation: Evaluation,
    asOf: string,
    history?: SearchHistoryInput,
  ): Promise<void>
  findEvaluation(companyId: string): Promise<Evaluation | null>
  findByName(name: string): Promise<{ companyId: string; company: CompanyInput } | null>
  listEvaluations(): Promise<Evaluation[]>
}

class JsonEvaluationStore implements EvaluationStore {
  async save(
    company: CompanyInput,
    evaluation: Evaluation,
    asOf: string,
    history?: SearchHistoryInput,
  ): Promise<void> {
    db.upsertCompany(
      {
        id: company.id,
        name: company.name,
        shortName: company.shortName,
        companyJson: JSON.stringify(company),
        evaluationJson: JSON.stringify(evaluation),
        asOf,
        createdAt: new Date().toISOString(),
      },
      history,
    )
  }

  async findEvaluation(companyId: string): Promise<Evaluation | null> {
    const record = db.findCompanyById(companyId)
    if (!record) return null
    try {
      return JSON.parse(record.evaluationJson) as Evaluation
    } catch {
      return null
    }
  }

  async findByName(
    name: string,
  ): Promise<{ companyId: string; company: CompanyInput } | null> {
    const record = db.findCompanyByName(name)
    if (!record) return null
    try {
      const company = JSON.parse(record.companyJson) as CompanyInput
      return { companyId: record.id, company }
    } catch {
      return null
    }
  }

  async listEvaluations(): Promise<Evaluation[]> {
    return db.getCompanies().map((record) => {
      try {
        return JSON.parse(record.evaluationJson) as Evaluation
      } catch {
        return null
      }
    }).filter((e): e is Evaluation => e !== null)
  }
}

export const evaluationStore: EvaluationStore = new JsonEvaluationStore()
