import { useState } from 'react'

export const PAGE_SIZES = [10, 20, 50, 100]
const PAGE_SIZE_KEY = 'mailing.pageSize'

function storedPageSize(): number {
  try {
    const n = Number(localStorage.getItem(PAGE_SIZE_KEY))
    return PAGE_SIZES.includes(n) ? n : PAGE_SIZES[0]
  } catch {
    return PAGE_SIZES[0]
  }
}

export function usePageSize() {
  const [pageSize, setPageSize] = useState(storedPageSize)

  function changePageSize(n: number) {
    setPageSize(n)
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(n))
    } catch {
      // 私密視窗存不了就只記在這次畫面
    }
  }

  return [pageSize, changePageSize] as const
}
