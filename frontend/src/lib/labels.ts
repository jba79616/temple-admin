import type { ItemAction, LegacyIssueKind, LightCategory, MailingIssueKind, OrderKind, OrderStatus, PaymentKind, Role, Settlement } from '../api/types'

export const ORDER_KIND: Record<OrderKind, string> = { COUNTER: '櫃台', CORRECTION: '更正', IMPORT: '匯入' }
export const ORDER_STATUS: Record<OrderStatus, string> = { ACTIVE: '有效', VOIDED: '已作廢' }
export const PAYMENT_KIND: Record<PaymentKind, string> = { CASH: '現金', FORFEIT: '轉功德金', IMPORT: '匯入' }
export const SETTLEMENT: Record<Settlement, string> = { CASH: '現金', FORFEIT: '轉功德金', PENDING: '待處理' }
export const ITEM_ACTION: Record<ItemAction, string> = { ADD: '新增', REMOVE: '取消' }
export const ROLE: Record<Role, string> = { ADMIN: '管理員', STAFF: '櫃台' }
export const GENDER: Record<string, string> = { M: '男', F: '女' }
export const genderLabel = (g: string | null | undefined, fallback = '—') => (g ? GENDER[g] ?? g : fallback)
export const LIGHT_CATEGORY: Record<LightCategory, string> = { GENERAL: '一般燈', BAGUA: '八卦轉運斗' }
export const LEGACY_ISSUE: Record<LegacyIssueKind, string> = {
  ADDRESS: '地址拆不出縣市', DISTRICT: '地址缺鄉鎮市區', HEAD: '戶長', BIRTH: '生辰', PERSON: '姓名與性別', ORDER: '成員順序',
}
export const MAILING_ISSUE: Record<MailingIssueKind, string> = { HOUSEHOLD: '戶號', REQUIRED: '缺姓名或地址', TOO_LONG: '欄位太長', ZIP: '郵遞區號', DUPLICATE: '重複' }
export const AUDIT_ACTION: Record<string, string> = { INSERT: '新增', UPDATE: '修改', DELETE: '刪除' }
export const TABLE_NAME: Record<string, string> = {
  households: '戶', members: '成員', light_types: '燈種', light_orders: '單據', light_order_items: '單據明細',
  annual_light_records: '年度安燈', payments: '收款', daily_closings: '日結', system_configs: '設定', users: '使用者',
  mailing_recipients: '帖子名單',
}
