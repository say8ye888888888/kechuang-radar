import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

/**
 * JSON file-based persistent store. Zero native dependency, works on any
 * platform. The data file lives at ./data/kechuang-radar.json. Swapping to
 * SQLite/Postgres later means implementing the same EvaluationStore interface
 * against a real DB — callers stay unchanged.
 */

const DATA_DIR = join(process.cwd(), "data")
const DATA_FILE = join(DATA_DIR, "kechuang-radar.json")

export type StoredRecord = {
  id: string
  name: string
  shortName: string
  companyJson: string
  evaluationJson: string
  asOf: string
  createdAt: string
}

export type SearchHistoryEntry = {
  id: number
  queryName: string
  companyId: string | null
  status: string
  errorMessage: string | null
  createdAt: string
}

type DatabaseShape = {
  companies: StoredRecord[]
  searchHistory: SearchHistoryEntry[]
  nextHistoryId: number
}

function emptyDb(): DatabaseShape {
  return { companies: [], searchHistory: [], nextHistoryId: 1 }
}

/**
 * Read the database fresh from disk on every call. A short-lived in-memory
 * cache keyed by file mtime avoids redundant reads within the same request
 * but still picks up changes from other routes (e.g. the search API writing
 * a new company while the homepage renders).
 */
let cachedMtime = 0
let cachedData: DatabaseShape | null = null

function load(): DatabaseShape {
  try {
    if (!existsSync(DATA_FILE)) {
      cachedData = null
      return emptyDb()
    }
    const mtime = statSync(DATA_FILE).mtimeMs
    if (cachedData && mtime === cachedMtime) {
      return cachedData
    }
    const raw = readFileSync(DATA_FILE, "utf-8")
    const parsed = JSON.parse(raw) as DatabaseShape
    cachedData = { ...emptyDb(), ...parsed }
    cachedMtime = mtime
    return cachedData
  } catch {
    cachedData = null
    return emptyDb()
  }
}

function persist(data: DatabaseShape) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8")
  // Update cache so the same process sees the write immediately.
  try {
    cachedMtime = statSync(DATA_FILE).mtimeMs()
    cachedData = data
  } catch {
    // ignore
  }
}

export const db = {
  getCompanies(): StoredRecord[] {
    return load().companies
  },
  findCompanyById(id: string): StoredRecord | undefined {
    return load().companies.find((c) => c.id === id)
  },
  findCompanyByName(name: string): StoredRecord | undefined {
    const lower = name.trim().toLowerCase()
    return load().companies.find(
      (c) =>
        c.name.toLowerCase() === lower ||
        c.shortName.toLowerCase() === lower,
    )
  },
  upsertCompany(record: StoredRecord) {
    const data = load()
    const idx = data.companies.findIndex((c) => c.id === record.id)
    if (idx >= 0) {
      data.companies[idx] = record
    } else {
      data.companies.push(record)
    }
    persist(data)
  },
  addSearchHistory(entry: Omit<SearchHistoryEntry, "id" | "createdAt">) {
    const data = load()
    const record: SearchHistoryEntry = {
      ...entry,
      id: data.nextHistoryId++,
      createdAt: new Date().toISOString(),
    }
    data.searchHistory.push(record)
    persist(data)
    return record
  },
}
