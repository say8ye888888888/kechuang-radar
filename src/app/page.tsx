import Link from "next/link"
import { Queue } from "@/components/queue"
import { buttonVariants } from "@/components/ui/button"
import { listEvaluations } from "@/server/services/evaluation-service"

export default async function HomePage() {
  const catalog = await listEvaluations()
  const counts = {
    patent: catalog.filter((item) => item.decision.product === "patent-loan").length,
    credit: catalog.filter((item) => item.decision.product === "credit-loan").length,
    hold: catalog.filter((item) => item.decision.product === "hold").length,
    investigate: catalog.filter((item) => item.decision.product === "investigate").length,
    decline: catalog.filter((item) => item.decision.product === "decline").length,
  }
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#9d1c2f]">今日工作</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">待预审企业</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#3f342e]">
            打开一家企业，先看建议进科创专利贷、科技信用贷，还是先补材料、先核实权属。结论只依据已经录入的权利和偿债材料。
          </p>
          <Link href="/search" className={`${buttonVariants()} mt-4`}>
            搜索新企业 →
          </Link>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:min-w-[28rem]">
          <Stat label="待处理" value={`${catalog.length}`} />
          <Stat label="专利贷" value={`${counts.patent}`} />
          <Stat label="信用贷" value={`${counts.credit}`} />
          <Stat label="暂缓" value={`${counts.hold}`} />
          <Stat label="补调查" value={`${counts.investigate}`} />
          <Stat label="暂不建议" value={`${counts.decline}`} />
        </dl>
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-[#eadfd4] sm:p-5">
        <Queue items={catalog} />
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-[#eadfd4]">
      <dt className="text-xs text-[#6f655e]">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
