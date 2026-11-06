import { api } from './client'
import type {
  AuditView, Cards, ClosingView, ConfigView, CreateCorrectionRequest, CreateOrderRequest, DaySummary, HouseholdDetail,
  HouseholdInput, HouseholdSummary, LightType, Me, MemberInput, MemberView, NameList, OrderView, RebuildReport, Role,
  TaisuiView, UserView,
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

export const closings = {
  summary: (date?: string) => api<DaySummary>(`/api/closings/summary${date ? `?date=${date}` : ''}`),
  history: () => api<ClosingView[]>('/api/closings'),
  close: (countedCash: number, note: string, closingDate?: string) =>
    api<ClosingView>('/api/closings', { method: 'POST', json: { countedCash, note, closingDate: closingDate ?? null } }),
}

export const configs = {
  list: () => api<ConfigView[]>('/api/configs'),
  update: (key: string, value: string) => api<ConfigView>(`/api/configs/${key}`, { method: 'PUT', json: { value } }),
  taisui: (year?: number) => api<TaisuiView>(`/api/configs/taisui${year ? `?year=${year}` : ''}`),
}

export const print = {
  nameList: (lightTypeId: number, year?: number, all = false) =>
    api<NameList>(`/api/print/name-list?lightTypeId=${lightTypeId}${year ? `&year=${year}` : ''}&all=${all}`),
  cardsByYear: (lightTypeId: number, year?: number) =>
    api<Cards>(`/api/print/cards?lightTypeId=${lightTypeId}${year ? `&year=${year}` : ''}`),
  cardsByOrder: (orderId: number) => api<Cards>(`/api/print/cards?orderId=${orderId}`),
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
}
