// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WenshuBatch } from '../../api/types'
import { lunarDateOf } from '../../lib/wenshu'
import WenshuSection, { batchLabel } from './WenshuSection'

const { wenshuBatches, byNumber } = vi.hoisted(() => ({ wenshuBatches: vi.fn(), byNumber: vi.fn() }))
vi.mock('../../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api')>()),
  print: { wenshuBatches },
  households: { byNumber },
}))
const config = vi.hoisted(() => ({ currentYear: 2027 }))
vi.mock('../../lib/config', () => ({
  useConfig: () => ({ currentYear: config.currentYear, configs: [{ key: 'prayer_month', value: '十' }] }),
}))

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const batch = (fromNumber: number, toNumber: number, households: number, people: number): WenshuBatch => ({ fromNumber, toNumber, households, people })
const ALL_BATCHES = [batch(1, 215, 200, 1150), batch(216, 430, 200, 1180), batch(431, 512, 75, 410)]
const yearOptions = [2027, 2026].map((y) => <option key={y} value={y}>{y}</option>)

let container: HTMLDivElement
let root: Root
let open: ReturnType<typeof vi.fn<(path: string) => void>>

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  open = vi.fn()
  wenshuBatches.mockImplementation((scope: string) => Promise.resolve(scope === 'ALL' ? ALL_BATCHES : [batch(3, 980, 196, 1150)]))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.resetAllMocks()
  vi.useRealTimers()
  config.currentYear = 2027
})

async function render(busy = false) {
  await act(async () => {
    root.render(<WenshuSection yearOptions={yearOptions} busy={busy} open={open} />)
  })
}

const field = <T extends HTMLElement>(label: string) =>
  [...container.querySelectorAll('label')].find((l) => l.firstChild?.textContent === label)!.querySelector<T>('select, input')!
const input = (ariaLabel: string) => container.querySelector<HTMLInputElement>(`input[aria-label="${ariaLabel}"]`)!
const printButton = () => [...container.querySelectorAll('button')].find((b) => b.textContent === '印文疏')!

async function choose(select: HTMLSelectElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function type(el: HTMLInputElement, text: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const status = () => container.querySelector('[role="status"]')?.textContent

async function waitDebounce() {
  await act(async () => vi.advanceTimersByTime(300))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

const household = (id: number, householdNumber: number, headName: string, memberCount: number) => ({ id, householdNumber, headName, memberCount })

function openedQuery() {
  const [path] = open.mock.lastCall!
  expect(path.startsWith('/print/wenshu?')).toBe(true)
  return new URLSearchParams(path.slice(path.indexOf('?') + 1))
}

describe('WenshuSection', () => {
  it('defaults to the lantern year, its ganzhi and the prayer month, and carries the dates into the page URL', async () => {
    await render()

    expect(field<HTMLSelectElement>('年度').value).toBe('2027')
    expect(wenshuBatches).toHaveBeenCalledWith('BAGUA', 2027)
    expect(input('天運年').value).toBe('丁未')
    expect(input('天運月').value).toBe('十')
    await type(input('天運日'), '初八')
    await act(async () => printButton().click())

    const query = openedQuery()
    const today = lunarDateOf(new Date())
    expect(Object.fromEntries(query)).toEqual({
      scope: 'BAGUA', year: '2027', from: '3', to: '980',
      ritualYear: today.year, ritualMonth: today.month, ritualDay: today.day,
      petitionYear: '丁未', petitionMonth: '十', petitionDay: '初八',
    })
  })

  it('splits all households into batches labeled by household number and prints only the chosen one', async () => {
    await render()
    await choose(field('範圍'), 'ALL')

    expect(wenshuBatches).toHaveBeenLastCalledWith('ALL', 2027)
    const batchSelect = field<HTMLSelectElement>('批次')
    expect([...batchSelect.options].map((o) => o.text)).toEqual([
      '第 1–215 戶（200 戶、1150 張）', '第 216–430 戶（200 戶、1180 張）', '第 431–512 戶（75 戶、410 張）',
    ])
    await choose(batchSelect, '1')
    await act(async () => printButton().click())

    expect(openedQuery().get('from')).toBe('216')
    expect(openedQuery().get('to')).toBe('430')
  })

  it('cannot print a scope with no households', async () => {
    wenshuBatches.mockResolvedValue([])
    await render()

    expect(field<HTMLSelectElement>('批次').textContent).toBe('這個範圍沒有要印的戶')
    expect(printButton().disabled).toBe(true)
  })

  it('looks up the household number, shows its head and prints it by id with the chosen year', async () => {
    vi.useFakeTimers()
    byNumber.mockImplementation((n: number) => n === 12 ? Promise.resolve(household(34, 12, '林戶長', 4)) : Promise.reject(new Error(`找不到第 ${n} 戶`)))
    await render()
    await choose(field('範圍'), 'HOUSEHOLD')
    await choose(field('年度'), '2026')
    expect(printButton().disabled).toBe(true)

    await type(field('戶號'), '１２')
    expect(status()).toBe('查詢中…')
    await waitDebounce()

    expect(byNumber).toHaveBeenCalledExactlyOnceWith(12)
    expect(status()).toBe('第 12 戶，戶長 林戶長，在籍 4 人')
    await act(async () => printButton().click())
    const query = openedQuery()
    expect(query.get('householdId')).toBe('34')
    expect(query.get('year')).toBe('2026')
    expect(query.get('petitionYear')).toBe('丙午')
    expect(query.has('scope')).toBe(false)

    await type(field('戶號'), '99')
    await waitDebounce()
    expect(status()).toBe('找不到第 99 戶')
    expect(printButton().disabled).toBe(true)
  })

  it.each([
    ['12a', '戶號只能輸入數字，不含小數點、正負號或其他符號'],
    ['1e3', '戶號只能輸入數字，不含小數點、正負號或其他符號'],
    ['3000000000', '戶號不能超過 2,147,483,647'],
    ['0', '戶號從 1 開始'],
  ])('does not look up the malformed household number %s', async (text, message) => {
    vi.useFakeTimers()
    await render()
    await choose(field('範圍'), 'HOUSEHOLD')
    await type(field('戶號'), text)
    await waitDebounce()

    expect(byNumber).not.toHaveBeenCalled()
    expect(status()).toBe(message)
    expect(printButton().disabled).toBe(true)
  })

  it('cannot print a household with nobody left in it', async () => {
    vi.useFakeTimers()
    byNumber.mockResolvedValue(household(40, 15, '王戶長', 0))
    await render()
    await choose(field('範圍'), 'HOUSEHOLD')
    await type(field('戶號'), '15')
    await waitDebounce()

    expect(status()).toBe('第 15 戶，戶長 王戶長，沒有在籍成員，不用印')
    expect(printButton().disabled).toBe(true)
  })

  it('ignores the answer for a household number that was already changed', async () => {
    vi.useFakeTimers()
    const late = deferred<ReturnType<typeof household>>()
    byNumber.mockImplementation((n: number) => n === 12 ? late.promise : Promise.resolve(household(35, 13, '陳戶長', 2)))
    await render()
    await choose(field('範圍'), 'HOUSEHOLD')
    await type(field('戶號'), '12')
    await waitDebounce()
    await type(field('戶號'), '13')
    await waitDebounce()
    await act(async () => late.resolve(household(34, 12, '林戶長', 4)))

    expect(status()).toBe('第 13 戶，戶長 陳戶長，在籍 2 人')
    await act(async () => printButton().click())
    expect(openedQuery().get('householdId')).toBe('35')
  })

  it('ignores the batches of a scope that was already changed', async () => {
    const late = deferred<WenshuBatch[]>()
    wenshuBatches.mockImplementation((scope: string) => scope === 'ALL' ? late.promise : Promise.resolve([batch(5, 90, 40, 120)]))
    await render()
    await choose(field('範圍'), 'ALL')
    await choose(field('範圍'), 'LIT')
    await act(async () => late.resolve(ALL_BATCHES))

    expect([...field<HTMLSelectElement>('批次').options].map((o) => o.text)).toEqual(['第 5–90 戶（40 戶、120 張）'])
  })

  it('shows a failed batch lookup next to the select and loads again on retry', async () => {
    wenshuBatches.mockRejectedValueOnce(new Error('伺服器忙線'))
    await render()

    expect(field<HTMLSelectElement>('批次').textContent).toBe('讀不到批次')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('伺服器忙線')
    expect(printButton().disabled).toBe(true)
    await act(async () => [...container.querySelectorAll('button')].find((b) => b.textContent === '重試')!.click())

    expect(wenshuBatches).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(printButton().disabled).toBe(false)
  })

  it('takes today at print time when the page was left open past midnight', async () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 27, 23, 50) })
    const yesterday = lunarDateOf(new Date())
    await render()
    vi.setSystemTime(new Date(2026, 10, 28, 0, 10))
    const today = lunarDateOf(new Date())
    expect(today.day).not.toBe(yesterday.day)

    await act(async () => printButton().click())
    expect(openedQuery().get('ritualDay')).toBe(today.day)
    expect(input('今涓日').value).toBe(today.day)
  })

  it('follows the lantern year once the config loads and drops a 天運 year typed before it', async () => {
    config.currentYear = 2026
    await render()
    await type(input('天運年'), '戊申')
    config.currentYear = 2027
    await render()

    expect(field<HTMLSelectElement>('年度').value).toBe('2027')
    expect(input('天運年').value).toBe('丁未')
    expect(wenshuBatches).toHaveBeenLastCalledWith('BAGUA', 2027)
  })

  it('resets an edited 天運 year to the new year\'s ganzhi but keeps the other edited dates', async () => {
    await render()
    await type(input('天運年'), '戊申')
    await type(input('今涓日'), '十五')
    await choose(field('年度'), '2026')

    expect(input('天運年').value).toBe('丙午')
    expect(input('今涓日').value).toBe('十五')
  })

  it('waits while the server is converting a PDF', async () => {
    await render(true)

    expect(printButton().disabled).toBe(true)
  })

  it('labels a one-household batch without a range', () => {
    expect(batchLabel(batch(7, 7, 1, 3))).toBe('第 7 戶（1 戶、3 張）')
  })
})
