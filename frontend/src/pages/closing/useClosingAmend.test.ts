import { describe, expect, it, vi } from 'vitest'
import { largeDifferenceConfirmText } from '../../lib/closing'
import { amendIfConfirmed } from './useClosingAmend'

const change = (countedCash: number) => ({ date: '2026-11-26', countedCash, systemCash: 15_000, reason: '實點打錯' })

describe('amendIfConfirmed', () => {
  it('amends without asking when the amended cash is close to system cash', async () => {
    const ask = vi.fn(() => false)
    const amend = vi.fn(async () => undefined)
    expect(await amendIfConfirmed(change(15_500), ask, amend)).toBe(true)
    expect(ask).not.toHaveBeenCalled()
    expect(amend).toHaveBeenCalledExactlyOnceWith('2026-11-26', 15_500, '實點打錯')
  })

  it('asks with the amended cash and amends once the clerk confirms', async () => {
    const ask = vi.fn(() => true)
    const amend = vi.fn(async () => undefined)
    expect(await amendIfConfirmed(change(155_000), ask, amend)).toBe(true)
    expect(ask).toHaveBeenCalledExactlyOnceWith(largeDifferenceConfirmText(155_000, 15_000))
    expect(amend).toHaveBeenCalledExactlyOnceWith('2026-11-26', 155_000, '實點打錯')
  })

  it('does not amend when the clerk cancels', async () => {
    const amend = vi.fn(async () => undefined)
    expect(await amendIfConfirmed(change(1_500), () => false, amend)).toBe(false)
    expect(amend).not.toHaveBeenCalled()
  })
})
