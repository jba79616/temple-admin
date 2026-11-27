const FULLWIDTH_SPACE = '\u3000'

/**
 * 兩個字的姓名中間補一個全形空白，寬度和三個字的一樣；以字元計，避免拆開擴充區的罕用字。
 * 帖子名單有些兩字姓名已用兩個半形空白排版（「郭  妙」），HTML 會併成一個窄空白，所以兩字姓名先去掉原有空白；其他姓名的空白保留。
 */
export function printName(name: string | null): string {
  const trimmed = (name ?? '').trim()
  const chars = Array.from(trimmed.replace(/\s/g, ''))
  return chars.length === 2 ? chars.join(FULLWIDTH_SPACE) : trimmed
}

/** 嵌在句子裡的姓名不補空白，但和 printName 一樣先去掉兩字姓名原有的排版空白。 */
export function inlineName(name: string | null): string {
  const trimmed = (name ?? '').trim()
  const compact = trimmed.replace(/\s/g, '')
  return Array.from(compact).length === 2 ? compact : trimmed
}
