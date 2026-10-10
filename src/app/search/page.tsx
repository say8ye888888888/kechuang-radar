import Link from "next/link"
import { CompanySearch } from "@/components/company-search"
import { buttonVariants } from "@/components/ui/button"

export const metadata = {
  title: "搜索企业 — 工银科创雷达",
}

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-medium tracking-[0.18em] text-[#9d1c2f]">交互预审</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">搜索企业</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#3f342e]">
          输入企业名称，系统先查已有数据库。若为新企业，由大模型联网收集专利、财务等
          信息，自动完成五维评分并生成评估详情页。已搜索过的企业再次搜索会直接返回
          已有评估。
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-[#eadfd4]">
        <CompanySearch />
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-[#eadfd4]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">批量导入</h2>
            <p className="mt-1 text-xs text-[#6f655e]">
              一次粘贴多个企业名称，系统逐个收集并存入数据库
            </p>
          </div>
          <Link href="/search/batch" className={buttonVariants({ variant: "outline" })}>
            批量导入 →
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-[#ddcfc3] bg-white px-4 py-6 text-sm text-[#6f655e]">
        <p className="font-medium text-[#3f342e]">流程说明</p>
        <ol className="mt-2 space-y-1 list-decimal pl-5">
          <li>输入企业名称并提交</li>
          <li>系统在数据库中查找已有评估（命中即跳转详情页）</li>
          <li>未命中则由 DeepSeek 大模型收集企业信息</li>
          <li>自动调用五维评分引擎完成评估</li>
          <li>评估结果持久化存储，下次搜索同一企业直接返回</li>
        </ol>
      </section>
    </div>
  )
}
