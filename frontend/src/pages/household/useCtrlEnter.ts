import { useEffect, useRef } from 'react'

/** 監聽整頁的 Ctrl/Cmd+Enter；handler 每次 render 更新，不必重新註冊。 */
export function useCtrlEnter(handler: () => void) {
  const latest = useRef(handler)
  latest.current = handler
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); latest.current() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}
