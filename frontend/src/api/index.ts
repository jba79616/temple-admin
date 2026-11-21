import { api } from './client'
import type {
  AuditView, Cards, ClosingView, ConfigView, CreateCorrectionRequest, CreateOrderRequest, DayStatus, DaySummary, HouseholdDetail,
  HouseholdInput, HouseholdSummary, LightType, Me, MemberInput, MemberView, NameList, OrderView, RebuildReport, Role,
  TaisuiView, UserView, PageView, MemberRow, HouseholdRow, ApplicationForm, FormScope, LightCategory, LegacyImportReport,
  MailingImportReport, MailingInput, MailingView,
} from './types'

export const auth = {
  login: (username: string, password: string) => api<Me>('/api/auth/login', { method: 'POST', json: { username, password } }),
  logout: () => api<void>('/api/auth/logout', { method: 'POST' }),
  me: () => api<Me>('/api/auth/me'),
}

export const households = {
  search: (q: string) => api<HouseholdSummary[]>(`/api/households?q=${encodeURIComponent(q)}`),
  get: (id: number, year?: number) => api<HouseholdDetail>(`/api/households/${id}${year ? `?year=${year}` : ''}`),
  create: (input: HouseholdInput) => api<HouseholdDetail>('/api/households', { method: 'POST', json: input }),
  update: (id: number, input: HouseholdInput) => api<HouseholdDetail>(`/api/households/${id}`, { method: 'PUT', json: input }),
  addMember: (id: number, input: MemberInput) => api<MemberView>(`/api/households/${id}/members`, { method: 'POST', json: input }),
}

export const members = {
  get: (id: number) => api<MemberView>(`/api/members/${id}`),
  update: (id: number, input: MemberInput) => api<MemberView>(`/api/members/${id}`, { method: 'PUT', json: input }),
  remove: (id: number, reason: string, newHeadId?: number | null) =>
    api<void>(`/api/members/${id}`, { method: 'DELETE', json: { reason, newHeadId: newHeadId ?? null } }),
  setHead: (id: number) => api<MemberView>(`/api/members/${id}/head`, { method: 'POST' }),
  restore: (id: number) => api<MemberView>(`/api/members/${id}/restore`, { method: 'POST' }),
  move: (id: number, householdId: number) => api<MemberView>(`/api/members/${id}/move`, { method: 'POST', json: { householdId } }),
}

export const lightTypes = {
  list: (all = false) => api<LightType[]>(`/api/light-types${all ? '?all=true' : ''}`),
  create: (input: Omit<LightType, 'id'>) => api<LightType>('/api/light-types', { method: 'POST', json: input }),
  update: (id: number, input: Omit<LightType, 'id'>) => api<LightType>(`/api/light-types/${id}`, { method: 'PUT', json: input }),
}

export const orders = {
  byHousehold: (householdId: number) => api<OrderView[]>(`/api/orders?householdId=${householdId}`),
  unsettled: () => api<OrderView[]>('/api/orders?unsettled=true'),
  get: (id: number) => api<OrderView>(`/api/orders/${id}`),
  create: (req: CreateOrderRequest) => api<OrderView>('/api/orders', { method: 'POST', json: req }),
  void: (id: number, reason: string) => api<OrderView>(`/api/orders/${id}/void`, { method: 'POST', json: { reason } }),
  correct: (id: number, req: CreateCorrectionRequest) => api<OrderView>(`/api/orders/${id}/corrections`, { method: 'POST', json: req }),
}

export const registry = {
  members: (page: number, lit: boolean, size = 10) => api<PageView<MemberRow>>(`/api/registry/members?page=${page}&size=${size}&lit=${lit}`),
  households: (page: number, lit: boolean, size = 10) => api<PageView<HouseholdRow>>(`/api/registry/households?page=${page}&size=${size}&lit=${lit}`),
}

export const closings = {
  status: () => api<DayStatus>('/api/closings/status'),
  summary: (date?: string) => api<DaySummary>(`/api/closings/summary${date ? `?date=${date}` : ''}`),
  history: () => api<ClosingView[]>('/api/closings'),
  close: (countedCash: number, note: string, closingDate?: string) =>
    api<ClosingView>('/api/closings', { method: 'POST', json: { countedCash, note, closingDate: closingDate ?? null } }),
  amend: (date: string, countedCash: number, reason: string) =>
    api<ClosingView>(`/api/closings/${date}`, { method: 'PUT', json: { countedCash, reason } }),
}

export const configs = {
  list: () => api<ConfigView[]>('/api/configs'),
  update: (key: string, value: string) => api<ConfigView>(`/api/configs/${key}`, { method: 'PUT', json: { value } }),
  taisui: (year?: number) => api<TaisuiView>(`/api/configs/taisui${year ? `?year=${year}` : ''}`),
}

export type LightSelection = { lightTypeId: number } | { category: LightCategory }
const lightQuery = (sel: LightSelection) => ('lightTypeId' in sel ? `lightTypeId=${sel.lightTypeId}` : `category=${sel.category}`)
export const lightSelectionFrom = (params: URLSearchParams): LightSelection | null => {
  const lightTypeId = params.get('lightTypeId')
  const category = params.get('category')
  if (lightTypeId) return { lightTypeId: Number(lightTypeId) }
  if (category === 'GENERAL' || category === 'BAGUA') return { category }
  return null
}

export const print = {
  nameList: (sel: LightSelection, year?: number) =>
    api<NameList>(`/api/print/name-list?${lightQuery(sel)}${year ? `&year=${year}` : ''}`),
  cardsByYear: (sel: LightSelection, year?: number) =>
    api<Cards>(`/api/print/cards?${lightQuery(sel)}${year ? `&year=${year}` : ''}`),
  cardsByOrder: (orderId: number) => api<Cards>(`/api/print/cards?orderId=${orderId}`),
  applicationForm: (scope: FormScope, year?: number) =>
    api<ApplicationForm>(`/api/print/application-form?scope=${scope}${year ? `&year=${year}` : ''}`),
}

export const mailing = {
  list: () => api<MailingView[]>('/api/mailing'),
  byHousehold: (householdId: number) => api<MailingView[]>(`/api/mailing?householdId=${householdId}`),
  create: (input: MailingInput) => api<MailingView>('/api/mailing', { method: 'POST', json: input }),
  update: (id: number, input: MailingInput) => api<MailingView>(`/api/mailing/${id}`, { method: 'PUT', json: input }),
  setActive: (id: number, active: boolean) => api<MailingView>(`/api/mailing/${id}/active`, { method: 'PUT', json: { active } }),
  remove: (id: number) => api<void>(`/api/mailing/${id}`, { method: 'DELETE' }),
}

export const users = {
  list: () => api<UserView[]>('/api/users'),
  create: (input: { username: string; password: string; displayName: string; role: Role }) =>
    api<UserView>('/api/users', { method: 'POST', json: input }),
  update: (id: number, input: { displayName: string; role: Role; active: boolean }) =>
    api<UserView>(`/api/users/${id}`, { method: 'PUT', json: input }),
  resetPassword: (id: number, password: string) => api<void>(`/api/users/${id}/password`, { method: 'POST', json: { password } }),
}

export const audit = {
  list: (table?: string, rowId?: number) =>
    api<AuditView[]>(`/api/audit-logs?${table ? `table=${encodeURIComponent(table)}` : ''}${rowId ? `&rowId=${rowId}` : ''}`),
}

export const admin = {
  rebuild: (fix: boolean) => api<RebuildReport>(`/api/admin/rebuild?fix=${fix}`, { method: 'POST' }),
  legacyImport: (file: File, commit: boolean) => {
    const form = new FormData()
    form.append('file', file)
    return api<LegacyImportReport>(`/api/admin/legacy-import?commit=${commit}`, { method: 'POST', form })
  },
  mailingImport: (file: File, commit: boolean) => {
    const form = new FormData()
    form.append('file', file)
    return api<MailingImportReport>(`/api/admin/mailing-import?commit=${commit}`, { method: 'POST', form })
  },
}
