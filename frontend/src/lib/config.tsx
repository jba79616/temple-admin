import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { configs as configsApi } from '../api'
import type { ConfigView } from '../api/types'
import { ganzhiOfYear, rocYear } from './roc'

interface ConfigState {
  configs: ConfigView[]
  currentYear: number
  templeName: string
  yearLabel: string
  reload: () => Promise<void>
}

const ConfigContext = createContext<ConfigState | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<ConfigView[]>([])

  const reload = useCallback(async () => {
    setConfigs(await configsApi.list())
  }, [])

  useEffect(() => {
    reload().catch(() => setConfigs([]))
  }, [reload])

  const value = useMemo(() => {
    const get = (key: string) => configs.find((c) => c.key === key)?.value ?? ''
    const currentYear = Number(get('current_year')) || new Date().getFullYear()
    return {
      configs,
      currentYear,
      templeName: get('temple_name') || '安燈系統',
      yearLabel: `民國 ${rocYear(currentYear)} 年 ${ganzhiOfYear(currentYear)}`,
      reload,
    }
  }, [configs, reload])

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig(): ConfigState {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig 必須在 ConfigProvider 內使用')
  return ctx
}
