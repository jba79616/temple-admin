export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Init = Omit<RequestInit, 'body' | 'headers'> & { json?: unknown; headers?: Record<string, string> }

export async function api<T>(path: string, init: Init = {}): Promise<T> {
  const { json, headers, ...rest } = init
  const res = await fetch(path, {
    ...rest,
    credentials: 'same-origin',
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) message = body.message
    } catch {
      // 非 JSON 錯誤回應，沿用狀態碼訊息
    }
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event('temple:unauthorized'))
    }
    throw new ApiError(res.status, message)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
