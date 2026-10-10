const kindName: Record<string, string> = {
  INV: "发明",
  UM: "实用新型",
  SW: "软著",
  DES: "外观",
}

const ownerName: Record<string, string> = {
  CC: "澄川",
  ZH: "织衡",
  LX: "岚析",
  JM: "晶脉",
  HS: "衡石",
  HY: "海屿",
}

export function displayRightId(id: string) {
  const match = /^DEMO-(INV|UM|SW|DES)-([A-Z]+)-(\d+)$/.exec(id)
  if (!match) return id
  const kind = kindName[match[1]] ?? match[1]
  const owner = ownerName[match[2]] ?? match[2]
  return `${owner}·${kind}${Number(match[3])}`
}

export function displayText(text: string) {
  return text.replace(/DEMO-(?:INV|UM|SW|DES)-[A-Z]+-\d+/g, (id) => displayRightId(id))
}
