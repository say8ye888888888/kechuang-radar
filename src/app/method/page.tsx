import type { Metadata } from "next"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "方法与边界",
}

const steps = [
  {
    title: "只服务一个动作",
    text: "支行客户经理在进件前判断：这家企业进科创专利贷、科技信用贷，还是先补调查、先查权属。不在这一步做自动审批和额度测算。",
  },
  {
    title: "先做小样本，再谈全库",
    text: "三人团队先手工整理一个城市、一个产业的 30 家企业。字段来自专利公布公告、专精特新和高新公示。演示用的六家企业是虚构样本，用来把规则跑通。",
  },
  {
    title: "评分卡公开权重",
    text: "完整材料路径的基础权重为技术竞争力 30%、创新持续性 20%、行业前景 15%、财务能力 20%、风险可控 15%。财务材料不完整时只对其余四个维度重新归一化。行业前景按产业名称查阅同一张规则表，不由企业自行报分，也不伪装成预测模型。",
  },
  {
    title: "规则对齐已有产品",
    text: "可质押发明需有效、权属清楚、状态已核验、无年费风险、剩余保护期不少于 8 年，且不少于 3 件，同时技术分、风险可控度和财务能力过线，才初步适配科创专利贷。无效宣告或职务发明权属争议整户暂缓；共有、未同意出质只把该件权利移出质押清单。信用贷还要求资质、技术分、风险可控度和财务能力达到观察线，且可质押发明不足。金额以百万元计，经营现金流零分对应 -5、满分对应 20。",
  },
  {
    title: "大模型放在最后",
    text: "证据包里只有分数、规则结论、权利清单和人工备注。模型可以组织语言，不能新增诉讼、订单和额度，也不能推翻规则。本演示用同一套证据包本地生成说明。",
  },
]

export default function MethodPage() {
  return (
    <article className="space-y-8">
      <header>
        <p className="text-xs font-medium tracking-[0.18em] text-[#9d1c2f]">方法与边界</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">把科创雷达收成一条可复核的预审链</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#3f342e]">
          科技型中小企业的困难是技术看得见、传统财务不够用。银行要的不是另一份企业画像，而是进件前能复核的判断：为什么值得跟，风险卡在哪件权利，对应哪一种已经在办的贷款。
        </p>
      </header>

      <ol className="grid gap-3 md:grid-cols-2">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-xl bg-white p-4 ring-1 ring-[#eadfd4]">
            <p className="text-xs text-[#9d1c2f]">0{index + 1}</p>
            <h2 className="mt-1 font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#3f342e]">{step.text}</p>
          </li>
        ))}
      </ol>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">数据什么能进，什么不能进</h2>
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-[#eadfd4]">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-[#6f655e]">
              <tr>
                <th className="px-4 py-3 font-medium">字段</th>
                <th className="px-4 py-3 font-medium">来源</th>
                <th className="px-4 py-3 font-medium">在评分里的位置</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["专利法律状态、IPC、权利要求、同族、被引", "专利公布公告", "技术竞争力、可质押清单"],
                ["申请年份、发明人复现", "专利著录项", "创新持续性；过度集中记入风险"],
                ["软著名称与登记人", "软著登记公告", "只给软件企业少量补充分"],
                ["高新、专精特新", "主管部门公示", "创新持续性中的资质证据"],
                ["营收增速、经营现金流、负债、流动性、应收、客户集中度及到期债务", "企业授权材料或可核验披露", "财务能力，金额以百万元计；材料不完整则不评分并转补充调查"],
                ["产业档位", "团队维护的规则表", "行业前景，按季修订"],
                ["未经授权的非上市企业审计报表、论文全文、发明人社保", "不接入", "不参与评分，也不让模型补写"],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-[#f0e6dc]">
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-3 align-top leading-6">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">三人团队怎么往下做</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-[#3f342e]">
          <li>选定一个支行和一个产业，例如杭州的第三代半导体，或苏州的工业软件。</li>
          <li>用公开著录项整理 30 家企业，字段和本演示的权利清单一致，先不要上图数据库。</li>
          <li>把规则阈值交给信贷人员改一版。学生团队负责算得清，业务人员负责门槛像不像该行产品。</li>
          <li>接入行内或私有化模型时，只替换说明文字那一步，并加一道编号校验：句子里的证据编号必须存在于证据包。</li>
          <li>试点指标用“无效进件是否减少、预审备注是否被客户经理采用”，不用模型准确率代替信贷结果。</li>
        </ol>
      </section>

      <section className="rounded-xl bg-[#1c1412] px-5 py-5 text-[#f8f1ea]">
        <h2 className="text-lg font-semibold">八分钟演示顺序</h2>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-[#eadfd4]">
          <li>用澄川半导体走通科创专利贷，点开可质押发明。</li>
          <li>用织衡软件说明分数不低，但软著和两件发明不够质押，转到科技信用贷。</li>
          <li>用岚析生物说明技术分高仍然暂缓，核心技术的企业级争议触发硬停止。</li>
          <li>打开本页，说明偿债材料门槛、产业规则表，以及模型不能新造事实。</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/company/chengchuan" className={buttonVariants()}>
            澄川半导体
          </Link>
          <Link href="/company/zhiheng" className={buttonVariants({ variant: "outline" })}>
            织衡软件
          </Link>
          <Link href="/company/lanxi" className={buttonVariants({ variant: "outline" })}>
            岚析生物
          </Link>
        </div>
      </section>
    </article>
  )
}
