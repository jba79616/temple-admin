/** 排序、戶號、日結實點現金在資料表是 INT，超過就會被後端拒絕。 */
export const MAX_INT = 2_147_483_647

/** 單筆金額（單價、燈種價格）的業務上限，後端 DTO 用同一個數字擋。 */
export const MAX_AMOUNT = 1_000_000

export const AMOUNT_TOO_LARGE = `金額不能超過 ${MAX_AMOUNT.toLocaleString('en-US')}`

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

export function parseAmount(input: string | null | undefined): number | null {
  return parseWholeNumber(input, MAX_AMOUNT)
}

function malformedError(digits: string, label: string): string | null {
  return /^\d+$/.test(digits) ? null : `${label}只能輸入數字，不含小數點、正負號或其他符號`
}

/** 空白不算錯（交給必填檢查）；其他不合格的輸入回傳要顯示的錯誤訊息。 */
export function wholeNumberError(input: string, label: string, max = MAX_INT): string | null {
  const digits = normalized(input)
  if (digits === '') return null
  return malformedError(digits, label) ?? (Number(digits) > max ? `${label}不能超過 ${max.toLocaleString('en-US')}` : null)
}

export function amountError(input: string, label: string): string | null {
  const digits = normalized(input)
  if (digits === '') return null
  return malformedError(digits, label) ?? (Number(digits) > MAX_AMOUNT ? AMOUNT_TOO_LARGE : null)
}
