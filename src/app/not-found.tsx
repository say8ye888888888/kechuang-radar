import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-semibold">没有这家企业</h1>
      <p className="mt-2 text-sm leading-6 text-[#6f655e]">
        预审队列里只有六家演示样本。回到队列重新选择。
      </p>
      <Link href="/" className={`${buttonVariants()} mt-5`}>
        返回预审队列
      </Link>
    </div>
  )
}
