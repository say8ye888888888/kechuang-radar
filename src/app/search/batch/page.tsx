import { BatchImport } from "@/components/batch-import"

export const metadata = {
  title: "批量导入企业 — 工银科创雷达",
}

export default function BatchImportPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-medium tracking-[0.18em] text-[#9d1c2f]">批量操作</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">批量导入企业</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#3f342e]">
          每行输入一个企业名称，系统逐个调用大模型收集专利、财务等信息，自动完成五维评分并
          存入数据库。已有企业会直接跳过收集环节。单次最多 50 家。
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-[#eadfd4]">
        <BatchImport />
      </section>
    </div>
  )
}
