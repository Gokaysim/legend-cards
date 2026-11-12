import { describe, expect, it } from 'vitest'

import { faceGlow } from './display'

describe('faceGlow', () => {
  const none = { isActive: false, isSelected: false, isRevealed: false, isHeld: false }

  it('makes a selected hand card glow gold', () => {
    expect(faceGlow('common', { ...none, isSelected: true })).toBe('selected')
    expect(faceGlow('rare', { ...none, isSelected: true })).toBe('selected')
  })

  it.each([
    ['common', 'active'],
    ['cursed', 'active-cursed'],
    ['blessed', 'active-blessed'],
  ] as const)('keeps the active glow of a selected active %s card', (frame, glow) => {
    expect(faceGlow(frame, { ...none, isActive: true, isSelected: true })).toBe(glow)
  })

  it('gives an unselected inactive hand card no glow', () => {
    expect(faceGlow('common', none)).toBeNull()
  })
})
