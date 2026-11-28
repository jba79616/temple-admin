// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Wenshu, WenshuPerson } from '../../api/types'
import WenshuPrint from './WenshuPrint'

const { wenshu } = vi.hoisted(() => ({ wenshu: vi.fn() }))
vi.mock('../../api', () => ({ print: { wenshu } }))

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const person = (memberId: number, householdNumber: number, name: string): WenshuPerson => ({
  memberId, householdNumber, name, gender: 'M', ganzhi: '壬辰', leap: false, month: 1, day: 1, hour: '子', cityDistrict: '臺北市大安區', address: '復興南路1號',
})
const batch: Wenshu = {
  templeName: '無極聖殿', templeAddress: '', householdNumber: null, year: 2026, ganzhiYear: '丙午', prayerMonth: '十',
  people: [person(1, 3, '林戶長'), person(2, 3, '林女兒'), person(3, 8, '郭安斗')],
}

let container: HTMLDivElement
let root: Root
let search = ''

function Search() {
  search = useLocation().search
  return null
}

beforeEach(() => {
  Object.defineProperty(document, 'fonts', { value: { ready: Promise.resolve() }, configurable: true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  wenshu.mockReset()
  vi.restoreAllMocks()
})

async function renderAt(url: string) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[url]}>
        <Routes><Route path="/print/wenshu" element={<><WenshuPrint /><Search /></>} /></Routes>
      </MemoryRouter>,
    )
  })
}

describe('WenshuPrint', () => {
  it('prints every person of the households in the chosen scope, one sheet each', async () => {
    wenshu.mockResolvedValue(batch)
    await renderAt('/print/wenshu?scope=BAGUA&year=2026')

    expect(wenshu).toHaveBeenCalledWith({ scope: 'BAGUA', year: 2026 })
    expect(container.querySelector('.wenshu-toolbar')?.textContent).toContain('民國 115 年安斗的戶 · 3 張')
    const sheets = [...container.querySelectorAll<HTMLElement>('.wenshu-sheet')]
    expect(sheets.map((s) => s.dataset.label)).toEqual(['第 3 戶林戶長', '第 3 戶林女兒', '第 8 戶郭安斗'])
    expect(document.title).toBe('制星補運文疏 民國 115 年安斗的戶')
  })

  it('keeps the date toolbar in its own block outside the scrolling preview', async () => {
    wenshu.mockResolvedValue(batch)
    await renderAt('/print/wenshu?scope=ALL&year=2026')

    const controls = container.querySelector('.wenshu-controls')!
    const preview = container.querySelector('.wenshu-preview')!
    expect(controls.querySelector('.wenshu-toolbar')).not.toBeNull()
    expect(controls.contains(preview) || preview.contains(controls)).toBe(false)
    expect(controls.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(preview.querySelectorAll('.wenshu-sheet')).toHaveLength(3)
  })

  it('writes a composed 天運 year into the URL only after the IME finishes', async () => {
    wenshu.mockResolvedValue(batch)
    await renderAt('/print/wenshu?scope=BAGUA&year=2026')
    const input = container.querySelector<HTMLInputElement>('input[aria-label="天運年"]')!
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    const typeText = (text: string) => act(() => {
      setValue.call(input, text)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    act(() => { input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })) })
    typeText('丙午ㄧ')
    expect(input.value).toBe('丙午ㄧ')
    expect(new URLSearchParams(search).get('petitionYear')).toBeNull()

    typeText('丙午一')
    await act(async () => { input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '一' })) })
    expect(new URLSearchParams(search).get('petitionYear')).toBe('丙午一')
    expect(input.value).toBe('丙午一')
  })

  it('lists only the first few cut sheets so the notice does not push the preview away', async () => {
    const people = Array.from({ length: 7 }, (_, i) => person(i + 1, 10 + i, `王${i + 1}`))
    wenshu.mockResolvedValue({ ...batch, people })
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return { left: this.classList.contains('ws-body') ? 0 : -10 } as DOMRect
    })
    await renderAt('/print/wenshu?scope=ALL&year=2026')

    expect(container.querySelector('.wenshu-controls .print-notice')?.textContent)
      .toMatch(/^第 10 戶王1、第 11 戶王2、第 12 戶王3、第 13 戶王4、第 14 戶王5 等 7 張 的文疏太長/)
  })

  it('says so when the scope has nobody to print', async () => {
    wenshu.mockResolvedValue({ ...batch, people: [] })
    await renderAt('/print/wenshu?scope=LIT&year=2026')

    expect(container.querySelector('.wenshu-preview .page')?.textContent).toBe('這個範圍沒有要印的人')
  })

  it('rejects a URL without a valid scope, household or member', async () => {
    await renderAt('/print/wenshu?scope=NOPE&year=2026')

    expect(wenshu).not.toHaveBeenCalled()
    expect(container.textContent).toBe('網址缺少列印範圍、戶或成員')
  })
})
