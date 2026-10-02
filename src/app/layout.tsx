import type { Metadata } from "next"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SiteFrame } from "@/components/site-frame"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "工银科创雷达",
    template: "%s · 工银科创雷达",
  },
  description:
    "面向银行客户经理的科技企业授信预审工作台。评分卡给出结论，知识图谱提供证据，大模型只组织已有事实。",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <TooltipProvider>
          <SiteFrame>{children}</SiteFrame>
        </TooltipProvider>
      </body>
    </html>
  )
}
