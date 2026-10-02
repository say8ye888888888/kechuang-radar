import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CompanyDesk } from "@/components/company-desk"
import { catalog, getEvaluation } from "@/lib/catalog"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const evaluation = getEvaluation(id)
  if (!evaluation) return { title: "未找到企业" }
  return { title: evaluation.company.shortName }
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const evaluation = getEvaluation(id)
  if (!evaluation) notFound()

  const peers = catalog.map((item) => ({
    id: item.company.id,
    shortName: item.company.shortName,
    composite: item.composite,
    grade: item.grade,
    product: item.decision.product,
    title: item.decision.title,
  }))

  return <CompanyDesk evaluation={evaluation} peers={peers} />
}
