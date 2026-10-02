"use client"

import { Button } from "@/components/ui/button"

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-semibold">页面没有加载完成</h1>
      <p className="mt-2 text-sm leading-6 text-[#6f655e]">刷新一次。如果仍失败，从预审队列重新进入。</p>
      <Button className="mt-5" onClick={() => reset()}>
        重试
      </Button>
    </div>
  )
}
