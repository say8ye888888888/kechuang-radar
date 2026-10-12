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
          每行输入一个企业名称。重复名称会先去掉，已入库的企业直接返回，新企业以两路并发收集
          专利、财务等信息并完成评分。单次最多 50 家，结果会逐条出现。
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-[#eadfd4]">
        <BatchImport />
      </section>
    </div>
  )
}
