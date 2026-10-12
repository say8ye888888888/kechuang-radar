const LEGAL_SUFFIXES = ["股份有限公司", "有限责任公司", "有限公司"] as const

/** Trim, fold full-width characters, and drop spaces or brackets. */
export function normalizeCompanyName(name: string): string {
  let value = name.trim()
  value = value.replace(/[\uFF01-\uFF5E]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  )
  value = value.replace(/\u3000/g, "")
  value = value.replace(/[()[\]【】（）]/g, "")
  value = value.replace(/\s+/g, "")
  return value.toLowerCase()
}

export function stripLegalSuffix(normalized: string): string {
  for (const suffix of LEGAL_SUFFIXES) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length) {
      return normalized.slice(0, -suffix.length)
    }
  }
  return normalized
}

/** Stable key for ids and de-duplication. Keeps the core name, without a legal suffix. */
export function canonicalCompanyName(name: string): string {
  const normalized = normalizeCompanyName(name)
  const stripped = stripLegalSuffix(normalized)
  return stripped.length >= 2 ? stripped : normalized
}

export function uniqueCompanyNames(names: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const name of names) {
    const trimmed = name.trim()
    const key = canonicalCompanyName(trimmed)
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(trimmed)
  }
  return unique
}

type NamedRecord = { name: string; shortName: string }

/**
 * Prefer an exact normalized name or short name. Otherwise match after
 * removing 有限公司 / 股份有限公司 / 有限责任公司.
 */
export function matchCompanyRecord<T extends NamedRecord>(
  query: string,
  records: readonly T[],
): T | undefined {
  const queryNorm = normalizeCompanyName(query)
  if (!queryNorm) return undefined
  const queryStripped = stripLegalSuffix(queryNorm)
  let suffixMatch: T | undefined

  for (const record of records) {
    for (const field of [record.name, record.shortName]) {
      const norm = normalizeCompanyName(field)
      if (norm && norm === queryNorm) return record
    }
    if (suffixMatch || queryStripped.length < 2) continue
    for (const field of [record.name, record.shortName]) {
      const stripped = stripLegalSuffix(normalizeCompanyName(field))
      if (stripped.length >= 2 && stripped === queryStripped) {
        suffixMatch = record
        break
      }
    }
  }

  return suffixMatch
}
