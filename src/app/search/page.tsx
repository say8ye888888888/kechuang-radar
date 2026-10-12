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
          输入你想了解的企业名称，即可获得一份科创资质预审报告，涵盖技术、持续性、产业、
          财务与风控五个维度的评分详情。报告生成后随时可再次查看。
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
              一次粘贴多个企业名称，批量生成各家的预审报告
            </p>
          </div>
          <Link href="/search/batch" className={buttonVariants({ variant: "outline" })}>
            批量导入 →
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-[#ddcfc3] bg-white px-4 py-6 text-sm text-[#6f655e]">
        <p className="font-medium text-[#3f342e]">使用小贴士</p>
        <ol className="mt-2 space-y-1 list-decimal pl-5">
          <li>输入企业全称或常用简称都可以，无需担心空格和全角字符</li>
          <li>已收录的企业会立即打开评分详情页</li>
          <li>尚未收录的企业请稍等片刻，我们正在为你准备一份新的预审报告</li>
          <li>报告中包含五维评分雷达图、专利知识图谱与产品适配建议</li>
          <li>下次再搜同一家企业时，可即时查看此前生成的报告</li>
        </ol>
      </section>
    </div>
  )
}
