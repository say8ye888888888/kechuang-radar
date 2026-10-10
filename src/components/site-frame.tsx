import Link from "next/link"

export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-[#f6f3ee] text-[#1f1a17]">
      <header className="border-b border-[#3a2a26] bg-[#1c1412] text-[#f8f1ea]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-md bg-[#9d1c2f] text-sm font-semibold text-white">
              科
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-wide">工银科创雷达</span>
              <span className="block text-xs text-[#d9c7ba]">科技企业授信预审</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/" className="rounded-md px-3 py-1.5 text-[#d9c7ba] transition-colors hover:bg-[#2a1d1a] hover:text-[#f8f1ea]">
              待预审
            </Link>
            <Link href="/search" className="rounded-md px-3 py-1.5 text-[#d9c7ba] transition-colors hover:bg-[#2a1d1a] hover:text-[#f8f1ea]">
              搜索企业
            </Link>
            <Link href="/method" className="rounded-md px-3 py-1.5 text-[#d9c7ba] transition-colors hover:bg-[#2a1d1a] hover:text-[#f8f1ea]">
              方法
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-xs leading-5 text-[#6f655e]">
        预审建议供进件前参考，不构成授信审批、额度或估值意见。科创专利贷、科技信用贷沿用工行知识产权质押和科技信用类贷款的业务口径。
      </footer>
    </div>
  )
}
