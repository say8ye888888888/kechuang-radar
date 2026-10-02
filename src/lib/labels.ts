import type {
  IpKind,
  IpStatus,
  ProductCode,
  Qualification,
  RevenueBand,
} from "./types"

export const kindLabel: Record<IpKind, string> = {
  invention: "发明专利",
  utility: "实用新型",
  design: "外观设计",
  software: "软件著作权",
}

export const statusLabel: Record<IpStatus, string> = {
  active: "有效",
  pending: "在审",
  lapsed: "失效",
  invalid: "无效",
}

export const qualLabel: Record<Qualification, string> = {
  hightech: "高新技术企业",
  specialized: "专精特新",
  littleGiant: "专精特新小巨人",
}

export const revenueLabel: Record<RevenueBand, string> = {
  unknown: "营收未披露",
  lt20m: "2000 万元以下",
  "20to60m": "2000 万–6000 万元",
  "60to150m": "6000 万–1.5 亿元",
  gt150m: "1.5 亿元以上",
}

export const productLabel: Record<ProductCode, string> = {
  "patent-loan": "科创专利贷",
  "credit-loan": "科技信用贷",
  investigate: "补充调查",
  hold: "暂缓准入",
  decline: "暂不建议",
}

export const dimensionWeight: Record<string, string> = {
  tech: "30%",
  continuity: "20%",
  industry: "15%",
  finance: "20%",
  riskControl: "15%",
}
