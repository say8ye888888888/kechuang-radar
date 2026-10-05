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
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#9d1c2f]">科技金融 · 授信预审</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">先判断进哪一种贷款，再解释为什么</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#3f342e]">
            客户经理面对轻资产科创企业时，专利件数解决不了审批问题。这个工作台用公开权利、五维评分卡和规则引擎，在进件前给出科创专利贷、科技信用贷、补充调查或暂缓。说明文字只复述已经算出的证据。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/company/chengchuan" className={buttonVariants()}>
              从澄川半导体看起
            </Link>
            <Link href="/method" className={buttonVariants({ variant: "outline" })}>
              查看方法与边界
            </Link>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-4 ring-1 ring-[#eadfd4]">
          <Stat label="演示样本" value={`${catalog.length}`} />
          <Stat label="科创专利贷" value={`${counts.patent}`} />
          <Stat label="科技信用贷" value={`${counts.credit}`} />
          <Stat label="暂缓准入" value={`${counts.hold}`} />
          <Stat label="补充调查" value={`${counts.investigate}`} />
          <Stat label="暂不建议" value={`${counts.decline}`} />
        </dl>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Point title="评分卡出结论" text="技术、持续、产业、财务、风险五维加权。偿债材料不完整时只输出 innovation-only 科技预评分，并转补充调查。" />
        <Point title="图谱留证据" text="企业、专利、IPC、发明人和产业方向连在同一张图上。每条产品建议都能点回具体权利。" />
        <Point title="模型不改结论" text="大模型只接收证据包。核心技术的企业级争议会挡住高分企业，单项资产瑕疵只排除对应质押物。" />
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-[#eadfd4] sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">今日预审队列</h2>
            <p className="text-sm text-[#6f655e]">六家虚构企业覆盖五种结论，方便对照规则而不是展示单一样本。</p>
          </div>
        </div>
        <Queue items={catalog} />
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#fbf6f1] px-3 py-2">
      <dt className="text-xs text-[#6f655e]">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function Point({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-[#eadfd4]">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#3f342e]">{text}</p>
    </div>
  )
}
