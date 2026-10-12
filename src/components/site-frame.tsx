import Link from "next/link"

function RadarLogo() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="size-8 rounded-md"
      role="img"
      aria-label="工银科创雷达"
    >
      {/* 品牌红底 */}
      <rect width="32" height="32" rx="6" fill="#9d1c2f" />
      {/* 雷达外圈与刻度环 */}
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="#f8f1ea" strokeWidth="1.4" opacity="0.9" />
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="#f8f1ea" strokeWidth="0.8" opacity="0.45" />
      {/* 十字刻度线 */}
      <line x1="16" y1="5.5" x2="16" y2="9" stroke="#f8f1ea" strokeWidth="0.8" opacity="0.5" />
      <line x1="16" y1="23" x2="16" y2="26.5" stroke="#f8f1ea" strokeWidth="0.8" opacity="0.5" />
      <line x1="5.5" y1="16" x2="9" y2="16" stroke="#f8f1ea" strokeWidth="0.8" opacity="0.5" />
      <line x1="23" y1="16" x2="26.5" y2="16" stroke="#f8f1ea" strokeWidth="0.8" opacity="0.5" />
      {/* 扫描扇面（金色） */}
      <path d="M16 16 L16 5.5 A10.5 10.5 0 0 1 23.4 9.1 Z" fill="#d9a441" opacity="0.85" />
      {/* 扫描指针 */}
      <line x1="16" y1="16" x2="23.4" y2="9.1" stroke="#f2c14e" strokeWidth="1.4" strokeLinecap="round" />
      {/* 圆心 */}
      <circle cx="16" cy="16" r="1.6" fill="#f8f1ea" />
      {/* 被扫描到的企业信号点 */}
      <circle cx="21.5" cy="19.5" r="1.5" fill="#f2c14e" />
      <circle cx="11" cy="21" r="1.1" fill="#f8f1ea" opacity="0.75" />
      <circle cx="12" cy="10.5" r="1.1" fill="#f8f1ea" opacity="0.75" />
    </svg>
  )
}

export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-[#f6f3ee] text-[#1f1a17]">
      <header className="border-b border-[#3a2a26] bg-[#1c1412] text-[#f8f1ea]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <RadarLogo />
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
