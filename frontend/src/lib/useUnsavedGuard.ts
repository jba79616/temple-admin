import { useEffect } from 'react'
import { useBlocker } from 'react-router'

const DEFAULT_MESSAGE = '有尚未存檔的變更，離開會遺失。確定要離開？'

export function useUnsavedGuard(dirty: boolean, message = DEFAULT_MESSAGE) {
  const blocker = useBlocker(dirty)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(message)) blocker.proceed()
    else blocker.reset()
  }, [blocker, message])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
}
