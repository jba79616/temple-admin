export const STEMS = '甲乙丙丁戊己庚辛壬癸'
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'

export const GANZHI_LIST: string[] = Array.from({ length: 60 }, (_, i) => STEMS[i % 10] + BRANCHES[i % 12])

export function ganzhiOfYear(year: number): string {
  const mod = (n: number, m: number) => ((n % m) + m) % m
  return STEMS[mod(year - 4, 10)] + BRANCHES[mod(year - 4, 12)]
}

export function isValidGanzhi(value: string): boolean {
  return GANZHI_LIST.includes(value)
}

export const rocYear = (year: number) => year - 1911

const pad = (n: number) => String(n).padStart(2, '0')

export function rocDate(iso?: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${Number(y) - 1911}/${m}/${d}`
}

export function rocDateTime(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  return `${rocYear(date.getFullYear())}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const money = (n: number) => (n < 0 ? '−' : '') + 'NT$ ' + Math.abs(n).toLocaleString('zh-Hant-TW')
