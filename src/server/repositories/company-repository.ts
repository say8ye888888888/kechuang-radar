import { matchCompanyRecord } from "@/lib/company-name"
import { companies } from "@/lib/companies"
import { enrichDemoCompany } from "@/lib/demo-data"
import type { CompanyInput } from "@/lib/types"

const preferredOrder = [
  "chengchuan",
  "zhiheng",
  "lanxi",
  "hengshi",
  "jingmai",
  "haiyu",
]

/**
 * Keeps storage concerns behind one small interface. The demo currently reads
 * checked-in data; a SQLite/PostgreSQL implementation can replace this module
 * without changing pages, route handlers, or scoring code.
 */
export interface CompanyRepository {
  list(): Promise<CompanyInput[]>
  findById(id: string): Promise<CompanyInput | null>
  findByName(name: string): Promise<CompanyInput | null>
}

function cloneCompany(company: CompanyInput): CompanyInput {
  return structuredClone(company)
}

function storedCompany(company: CompanyInput): CompanyInput {
  // The checked-in records are deliberately minimal. Enrichment adds the
  // demo-only finance/evidence snapshot while keeping repository callers
  // independent of where those fields are stored later.
  return enrichDemoCompany(company)
}

class DemoCompanyRepository implements CompanyRepository {
  async list() {
    const rank = new Map(preferredOrder.map((id, index) => [id, index]))
    return companies
      .toSorted(
        (left, right) =>
          (rank.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (rank.get(right.id) ?? Number.MAX_SAFE_INTEGER),
      )
      .map((company) => cloneCompany(storedCompany(company)))
  }

  async findById(id: string) {
    const company = companies.find((item) => item.id === id)
    return company ? cloneCompany(storedCompany(company)) : null
  }

  async findByName(name: string) {
    const company = matchCompanyRecord(name, companies)
    return company ? cloneCompany(storedCompany(company)) : null
  }
}

export const companyRepository: CompanyRepository = new DemoCompanyRepository()
