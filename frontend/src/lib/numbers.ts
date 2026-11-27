/** 金額、單價、排序、戶號在資料表都是 INT，超過就會被後端拒絕。 */
export const MAX_INT = 2_147_483_647

export function toHalfWidthDigits(input: string): string {
  return input.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
}

function normalized(input: string): string {
  return toHalfWidthDigits(input).trim()
}

/** 只收 0–9（全形先轉半形），不收正負號、小數點、千分位或科學記號。 */
export function parseWholeNumber(input: string | null | undefined, max = MAX_INT): number | null {
  if (input == null) return null
  const digits = normalized(input)
  if (!/^\d+$/.test(digits)) return null
  const value = Number(digits)
  return value <= max ? value : null
}

/** 空白不算錯（交給必填檢查）；其他不合格的輸入回傳要顯示的錯誤訊息。 */
export function wholeNumberError(input: string, label: string, max = MAX_INT): string | null {
  const digits = normalized(input)
  if (digits === '') return null
  if (!/^\d+$/.test(digits)) return `${label}只能輸入數字，不含小數點、正負號或其他符號`
  return Number(digits) > max ? `${label}不能超過 ${max.toLocaleString('en-US')}` : null
}
