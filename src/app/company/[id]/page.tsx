import type { Metadata } from "next"
import Link from "next/link"
import { CompanyDesk } from "@/components/company-desk"
import { buttonVariants } from "@/components/ui/button"
import { getEvaluation, listEvaluations } from "@/server/services/evaluation-service"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const evaluation = await getEvaluation(id)
  if (!evaluation) return { title: "未找到企业" }
  return { title: evaluation.company.shortName }
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const evaluation = await getEvaluation(id)
  if (!evaluation) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-semibold">没有这家企业</h1>
        <p className="mt-2 text-sm leading-6 text-[#6f655e]">
          预审队列里只有六家演示样本。回到队列重新选择。
        </p>
        <Link href="/" className={`${buttonVariants()} mt-5`}>
          返回预审队列
        </Link>
      </div>
    )
  }

  const peers = (await listEvaluations()).map((item) => ({
    id: item.company.id,
    shortName: item.company.shortName,
    composite: item.composite,
    grade: item.grade,
    product: item.decision.product,
    title: item.decision.title,
  }))

  return <CompanyDesk evaluation={evaluation} peers={peers} />
}
