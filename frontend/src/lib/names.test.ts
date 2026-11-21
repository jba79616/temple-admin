import { describe, expect, it } from 'vitest'
import { printName } from './names'

describe('printName', () => {
  it('pads two-character names to the width of three', () => {
    expect(printName('王明')).toBe('王　明')
    expect(printName('林𡘙')).toBe('林　𡘙')
  })

  it('replaces existing spacing in two-character names', () => {
    expect(printName('郭  妙')).toBe('郭　妙')
    expect(printName('郭　妙')).toBe('郭　妙')
    expect(printName(' 王小明 ')).toBe('王小明')
  })

  it('leaves other names as they are', () => {
    expect(printName('王小明')).toBe('王小明')
    expect(printName('歐陽小明')).toBe('歐陽小明')
    expect(printName('王')).toBe('王')
    expect(printName('Mary Lee')).toBe('Mary Lee')
    expect(printName('王大明 闔家')).toBe('王大明 闔家')
    expect(printName(null)).toBe('')
  })
})
