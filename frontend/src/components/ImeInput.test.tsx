// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ImeInput from './ImeInput'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const lettersOnly = (raw: string) => raw.replace(/[^\p{L}\p{N}]/gu, '')
const setNativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(value: string, onValue: (v: string) => void) {
  act(() => root.render(<ImeInput value={value} normalize={lettersOnly} onValue={onValue} aria-label="年" />))
  return container.querySelector('input')!
}

function type(input: HTMLInputElement, text: string) {
  act(() => {
    setNativeValue.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function compose(input: HTMLInputElement, event: 'compositionstart' | 'compositionend', data = '') {
  act(() => {
    input.dispatchEvent(new CompositionEvent(event, { bubbles: true, data }))
  })
}

describe('ImeInput', () => {
  it('keeps the bopomofo on screen while composing and reports only the finished, normalized text', () => {
    const onValue = vi.fn()
    const input = render('丙', onValue)

    compose(input, 'compositionstart')
    type(input, '丙ㄨ')
    type(input, '丙ㄨˇ')
    expect(input.value).toBe('丙ㄨˇ')
    expect(onValue).not.toHaveBeenCalled()

    type(input, '丙午 ')
    compose(input, 'compositionend', '午')
    expect(onValue).toHaveBeenCalledExactlyOnceWith('丙午')
    expect(input.value).toBe('丙午')
  })

  it('does not overwrite the text being composed when the value changes from outside', () => {
    const onValue = vi.fn()
    const input = render('丙', onValue)

    compose(input, 'compositionstart')
    type(input, '丙ㄨ')
    render('乙', onValue)
    expect(input.value).toBe('丙ㄨ')

    type(input, '丙午')
    compose(input, 'compositionend', '午')
    expect(input.value).toBe('丙午')
    expect(onValue).toHaveBeenLastCalledWith('丙午')
  })

  it('settles on the same value when WebKit sends one more input after compositionend', () => {
    const onValue = vi.fn()
    const input = render('', onValue)

    compose(input, 'compositionstart')
    type(input, 'ㄕˊ')
    compose(input, 'compositionend', '十')
    type(input, '十')
    expect(input.value).toBe('十')
    expect(onValue).toHaveBeenLastCalledWith('十')
  })

  it('normalizes plain typing right away and follows later outside changes', () => {
    const onValue = vi.fn()
    const input = render('十', onValue)

    type(input, '十一*')
    expect(onValue).toHaveBeenLastCalledWith('十一')
    expect(input.value).toBe('十一')

    render('十二', onValue)
    expect(input.value).toBe('十二')
  })
})
