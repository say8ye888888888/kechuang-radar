import { getEvaluation, type ServiceOptions } from "./evaluation-service"

export async function getCompanyGraph(id: string, depth = 2, options: ServiceOptions = {}) {
  const evaluation = await getEvaluation(id, options)
  if (!evaluation) return null
  const company = evaluation.company
  const maxDepth = Math.max(1, Math.min(depth, 3))
  const graphNodes = [
    {
      id: `company:${company.id}`,
      type: "enterprise",
      label: company.shortName,
      evidenceIds: company.evidence?.map((item) => item.id) ?? [],
      level: 0,
    },
    {
      id: `industry:${company.strategicSector}`,
      type: "industry",
      label: company.strategicSector,
      evidenceIds: [`industry-${company.id}`],
      level: 1,
    },
    ...company.rights.map((right) => ({
      id: `patent:${right.id}`,
      type: right.kind,
      label: right.title,
      status: right.status,
      evidenceIds: right.evidenceIds ?? [right.id],
      level: 1,
    })),
    ...[...new Set(company.rights.map((right) => right.ipc))].map((ipc) => ({
      id: `ipc:${ipc}`,
      type: "technology",
      label: ipc,
      evidenceIds: company.rights.filter((right) => right.ipc === ipc).flatMap((right) => right.evidenceIds ?? [right.id]),
      level: 2,
    })),
  ]
  const visibleIds = new Set(graphNodes.filter((node) => node.level <= maxDepth).map((node) => node.id))
  const nodes = graphNodes
    .filter((node) => visibleIds.has(node.id))
    .map((node) => {
      const { level, ...publicNode } = node
      void level
      return publicNode
    })
  const edges = [
    { source: `company:${company.id}`, target: `industry:${company.strategicSector}`, type: "in_sector" },
    ...company.rights.flatMap((right) => [
      { source: `company:${company.id}`, target: `patent:${right.id}`, type: "owns" },
      { source: `patent:${right.id}`, target: `ipc:${right.ipc}`, type: "classified_as" },
    ]),
  ]
  return {
    companyId: company.id,
    depth: maxDepth,
    nodes,
    edges: edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    evidence: evaluation.evidencePack.evidenceRecords ?? [],
    meta: evaluation.meta,
  }
}
