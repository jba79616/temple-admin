import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { configs as configsApi } from '../api'
import type { ConfigView } from '../api/types'
import { ganzhiOfYear, rocYear } from './roc'

interface ConfigState {
  configs: ConfigView[]
  loadError: string
  currentYear: number
  templeName: string
  yearLabel: string
  reload: () => Promise<void>
}

const ConfigContext = createContext<ConfigState | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<ConfigView[]>([])
  const [loadError, setLoadError] = useState('')

  const reload = useCallback(async () => {
    try {
      setConfigs(await configsApi.list())
      setLoadError('')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '讀取設定失敗')
      throw e
    }
  }, [])

  useEffect(() => {
    reload().catch(() => {})
  }, [reload])

  const value = useMemo(() => {
    const get = (key: string) => configs.find((c) => c.key === key)?.value ?? ''
    const currentYear = Number(get('current_year')) || new Date().getFullYear()
    return {
      configs,
      loadError,
      currentYear,
      templeName: get('temple_name') || '安燈系統',
      yearLabel: `民國 ${rocYear(currentYear)} 年 ${ganzhiOfYear(currentYear)}`,
      reload,
    }
  }, [configs, loadError, reload])

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig(): ConfigState {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig 必須在 ConfigProvider 內使用')
  return ctx
}
