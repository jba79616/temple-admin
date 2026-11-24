import { describe, expect, it } from 'vitest'
import type { ItemView, OrderView } from '../api/types'
import { hasCardsToPrint } from './orders'

const item = (action: ItemView['action'], reversal = false) => ({ action, reversal }) as ItemView
const order = (over: Partial<Pick<OrderView, 'kind' | 'status' | 'items'>>) =>
  ({ kind: 'CORRECTION', status: 'ACTIVE', items: [item('ADD')], ...over }) as Pick<OrderView, 'kind' | 'status' | 'items'>

describe('hasCardsToPrint', () => {
  it('prints when the order adds a lamp', () => {
    expect(hasCardsToPrint(order({}))).toBe(true)
    expect(hasCardsToPrint(order({ kind: 'COUNTER', items: [item('REMOVE'), item('ADD')] }))).toBe(true)
  })

  it('has nothing to print for removals, reversals, voided or imported orders', () => {
    expect(hasCardsToPrint(order({ items: [item('REMOVE')] }))).toBe(false)
    expect(hasCardsToPrint(order({ items: [item('ADD', true)] }))).toBe(false)
    expect(hasCardsToPrint(order({ status: 'VOIDED' }))).toBe(false)
    expect(hasCardsToPrint(order({ kind: 'IMPORT' }))).toBe(false)
  })
})
