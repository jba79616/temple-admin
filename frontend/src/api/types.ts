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
  deletedMembers: DeletedMemberView[]
}

export interface DeletedMemberView {
  id: number
  name: string
  gender: string | null
  birthText: string
  deletedAt: string
  deleteReason: string | null
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
  reversal: boolean
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
  from: string | null
  systemCash: number
  closed: boolean
  closedThrough: string | null
  payments: PaymentRow[]
}

export interface DayStatus {
  date: string
  closed: boolean
  closedThrough: string | null
  payments: number
  systemCash: number
}

export interface ClosingView {
  closingDate: string
  systemCash: number
  countedCash: number
  difference: number
  closedBy: string
  closedAt: string
  note: string | null
  originalCountedCash: number | null
  amendReason: string | null
  amendedBy: string | null
  amendedAt: string | null
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
  birthYear: string
  birthMonth: string
  birthDay: string
  birthHour: string
  address: string
}

export interface HouseholdGroup {
  householdNumber: number
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
  groups: HouseholdGroup[]
}

export interface Card {
  recordId: number
  orderItemId: number
  shortName: string
  detail: string | null
  name: string
  cityDistrict: string
  address: string
}

export interface PrintedCard {
  recordId: number
  orderItemId: number
}

export interface Cards {
  templeName: string
  year: number
  rocYear: number
  lightTypeName: string | null
  householdNumber: number | null
  cards: Card[]
  /** 本單點過、但後來被取消或改由其他單處理的燈數，只有依單據列印時才會大於 0。 */
  excludedCount: number
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

export type LegacyIssueKind = 'ADDRESS' | 'DISTRICT' | 'HEAD' | 'BIRTH' | 'PERSON' | 'ORDER'

export interface LegacyIssue {
  kind: LegacyIssueKind
  householdNumber: number | null
  name: string | null
  detail: string
}

export interface LegacyYearCount {
  year: number
  rocYear: number
  guangming: number
  wenchang: number
  taisui: number
  bagua: number
}

export interface LegacyCounts {
  people: number
  deleted: number
  households: number
  householdsCreated: number
  householdsUpdated: number
  membersCreated: number
  membersUpdated: number
  orders: number
  items: number
  deletedItems: number
  payments: number
  recordsExisting: number
  addressesSplit: number
  addressesPartial: number
  addressesUnparsed: number
}

export interface LegacyImportReport {
  committed: boolean
  counts: LegacyCounts
  years: LegacyYearCount[]
  issues: LegacyIssue[]
}

export interface MailingView {
  id: number
  householdId: number | null
  householdNumber: number | null
  headName: string | null
  recipientName: string | null
  name: string | null
  zip: string | null
  city: string | null
  district: string | null
  address: string | null
  active: boolean
  overseas: boolean
  version: number
  source: string | null
  note: string | null
}

export interface MailingInput {
  householdNumber?: number | null
  recipientName?: string | null
  zip?: string | null
  address?: string | null
  note?: string | null
  active?: boolean
  version?: number | null
}

export type MailingIssueKind = 'HOUSEHOLD' | 'REQUIRED' | 'TOO_LONG' | 'ZIP' | 'DUPLICATE'

export interface MailingIssue {
  line: number
  kind: MailingIssueKind
  name: string | null
  detail: string
}

export interface MailingImportReport {
  committed: boolean
  rows: number
  linked: number
  standalone: number
  skipped: number
  issues: MailingIssue[]
}

export interface PageView<T> {
  items: T[]
  page: number
  size: number
  total: number
  totalPages: number
}

export interface MemberRow {
  id: number
  householdId: number
  householdNumber: number
  name: string
  gender: string | null
  head: boolean
  birthText: string
  zodiac: string | null
  taisui: string | null
  cityDistrict: string
  address: string
  phone: string | null
  lanterns: string[]
}

export interface HouseholdRow {
  id: number
  householdNumber: number
  headId: number | null
  headName: string | null
  headBirthText: string | null
  headZodiac: string | null
  headTaisui: string | null
  cityDistrict: string
  address: string | null
  phone: string | null
  memberCount: number
  lanternCount: number
  members: MemberRow[]
}

export type FormScope = 'ALL' | 'LIT' | 'BAGUA'

export interface FormPerson {
  name: string
  gender: string | null
  ganzhi: string | null
  leap: boolean
  month: number | null
  day: number | null
  hour: string | null
}

export interface FormHousehold {
  householdNumber: number
  headName: string | null
  address: string
  people: FormPerson[]
}

export interface BaguaType {
  code: string | null
  name: string
}

export interface ApplicationForm {
  templeName: string
  year: number
  rocYear: number
  scope: FormScope
  title: string
  baguaTypes: BaguaType[]
  households: FormHousehold[]
}

export interface WenshuPerson {
  memberId: number
  householdNumber: number | null
  name: string
  gender: string | null
  ganzhi: string | null
  leap: boolean
  month: number | null
  day: number | null
  hour: string | null
  cityDistrict: string
  address: string
}

/** 整批印跨很多戶時 householdNumber 是 null，看每個人的 householdNumber。 */
export interface Wenshu {
  templeName: string
  templeAddress: string
  householdNumber: number | null
  year: number
  ganzhiYear: string
  prayerMonth: string
  people: WenshuPerson[]
}
