export type Role = 'ADMIN' | 'STAFF'

export interface Me {
  id: number
  username: string
  displayName: string
  role: Role
}

export interface UserView extends Me {
  active: boolean
}

export interface HouseholdSummary {
  id: number
  householdNumber: number
  headName: string | null
  cityDistrict: string
  memberCount: number
  lanternCount: number
  phone: string | null
}

export interface MemberView {
  id: number
  householdId: number
  name: string
  gender: string | null
  head: boolean
  sortOrder: number
  city: string | null
  district: string | null
  address: string | null
  phone: string | null
  birthGanzhi: string | null
  birthBranch: string | null
  birthMonth: number | null
  birthMonthIsLeap: boolean
  birthDay: number | null
  birthHourBranch: string | null
  zodiac: string | null
  taisui: string | null
  birthText: string
  deleted: boolean
}

export interface MemberInput {
  name: string
  gender?: string | null
  city?: string | null
  district?: string | null
  address?: string | null
  phone?: string | null
  birthGanzhi?: string | null
  birthMonth?: number | null
  birthMonthIsLeap?: boolean
  birthDay?: number | null
  birthHourBranch?: string | null
  sortOrder?: number | null
}

export interface HouseholdInput {
  city?: string | null
  district?: string | null
  address?: string | null
  phone?: string | null
  contactNote?: string | null
  notes?: string | null
  head?: MemberInput
}

export interface RecordView {
  memberId: number
  lightTypeId: number
  unitPrice: number
}

export interface HouseholdDetail {
  id: number
  householdNumber: number
  city: string | null
  district: string | null
  address: string | null
  phone: string | null
  contactNote: string | null
  notes: string | null
  year: number
  members: MemberView[]
  records: RecordView[]
}

export type LightCategory = 'GENERAL' | 'BAGUA'

export interface LightType {
  id: number
  category: LightCategory
  name: string
  shortName: string
  price: number
  taisui: boolean
  sortOrder: number
  active: boolean
  legacyCode: string | null
}

export type ItemAction = 'ADD' | 'REMOVE'
export type OrderKind = 'COUNTER' | 'CORRECTION' | 'IMPORT'
export type OrderStatus = 'ACTIVE' | 'VOIDED'
export type PaymentKind = 'CASH' | 'FORFEIT' | 'IMPORT'
export type Settlement = 'CASH' | 'FORFEIT' | 'PENDING'

export interface ItemInput {
  memberId: number
  lightTypeId: number
  action: ItemAction
  unitPrice?: number | null
  overrideReason?: string | null
}

export interface CreateOrderRequest {
  year?: number | null
  householdId: number
  registeredOn?: string | null
  receivedOn?: string | null
  note?: string | null
  items: ItemInput[]
}

export interface CreateCorrectionRequest {
  householdId?: number | null
  registeredOn?: string | null
  receivedOn?: string | null
  reason: string
  settlement: Settlement
  items: ItemInput[]
}

export interface ItemView {
  id: number
  memberId: number
  memberName: string
  lightTypeId: number
  lightTypeName: string
  action: ItemAction
  unitPrice: number
  overrideReason: string | null
  createdAt: string
}

export interface PaymentView {
  id: number
  kind: PaymentKind
  amount: number
  receivedOn: string
  postedOn: string
  receivedBy: string | null
  note: string | null
  createdAt: string
}

export interface OrderView {
  id: number
  kind: OrderKind
  status: OrderStatus
  year: number
  householdId: number
  householdNumber: number
  headName: string | null
  registeredOn: string
  postedOn: string
  totalDue: number
  paid: number
  balance: number
  correctsOrderId: number | null
  correctedByOrderIds: number[]
  note: string | null
  createdBy: string | null
  createdAt: string
  voidedBy: string | null
  voidedAt: string | null
  voidReason: string | null
  closed: boolean
  items: ItemView[]
  payments: PaymentView[]
}

export interface PaymentRow {
  id: number
  createdAt: string
  orderId: number
  orderKind: OrderKind
  householdNumber: number
  headName: string | null
  kind: PaymentKind
  amount: number
  receivedOn: string
  receivedBy: string | null
  note: string | null
}

export interface DaySummary {
  date: string
  systemCash: number
  closed: boolean
  closedThrough: string | null
  payments: PaymentRow[]
}

export interface ClosingView {
  closingDate: string
  systemCash: number
  countedCash: number
  difference: number
  closedBy: string
  closedAt: string
  note: string | null
}

export interface ConfigView {
  key: string
  value: string
  description: string | null
}

export interface TaisuiView {
  year: number
  rocYear: number
  ganzhi: string
  yearBranch: string
  enabled: string[]
  flaggedBranches: Record<string, string>
}

export interface PersonRow {
  name: string
  gender: string | null
  birthText: string
  address: string
}

export interface HouseholdGroup {
  householdNumber: number
  headName: string | null
  rows: PersonRow[]
}

export interface NameList {
  templeName: string
  year: number
  rocYear: number
  ganzhiYear: string
  lightTypeName: string
  title: string
  prayerMonth: string
  all: boolean
  groups: HouseholdGroup[]
}

export interface Card {
  shortName: string
  name: string
  cityDistrict: string
  address: string
}

export interface Cards {
  templeName: string
  year: number
  rocYear: number
  lightTypeName: string | null
  cards: Card[]
}

export interface AuditView {
  id: number
  tableName: string
  rowId: number
  action: string
  before: string | null
  after: string | null
  changedBy: number | null
  changedAt: string
}

export interface RebuildReport {
  ordersChecked: number
  totalDueMismatches: string[]
  recordsChecked: number
  recordMismatches: string[]
  closingsChecked: number
  closingMismatches: string[]
  fixed: boolean
}
