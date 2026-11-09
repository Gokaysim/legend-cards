import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useSavedField } from './useSavedField'

type Props = { stored: string }

function setup(
  initial: string,
  save: (value: string) => Promise<void> = () => Promise.resolve(),
  normalize?: (value: string) => string,
) {
  const onError = vi.fn()
  const saveSpy = vi.fn(save)
  const hook = renderHook(
    ({ stored }: Props) => useSavedField(stored, saveSpy, onError, normalize),
    { initialProps: { stored: initial } },
  )
  return { ...hook, save: saveSpy, onError }
}

function type(result: { current: ReturnType<typeof useSavedField> }, value: string) {
  act(() => result.current.onFocus())
  act(() => result.current.onChange(value))
}

describe('useSavedField', () => {
  it('follows the stored value live while the field is not edited', () => {
    const { result, rerender } = setup('eski')

    expect(result.current.value).toBe('eski')
    rerender({ stored: 'yeni' })
    expect(result.current.value).toBe('yeni')
  })

  it('keeps the draft while a live change arrives', () => {
    const { result, rerender } = setup('eski')

    type(result, 'benim metnim')
    rerender({ stored: 'başka cihazdan' })

    expect(result.current.value).toBe('benim metnim')
  })

  it('saves on blur and shows the saved value until the subscription confirms it', async () => {
    const { result, rerender, save } = setup('eski')

    type(result, 'yeni')
    await act(async () => {
      result.current.onBlur()
      await Promise.resolve()
    })

    expect(save).toHaveBeenCalledExactlyOnceWith('yeni')
    expect(result.current.value).toBe('yeni')
    rerender({ stored: 'yeni' })
    expect(result.current.value).toBe('yeni')
    rerender({ stored: 'sonra gelen' })
    expect(result.current.value).toBe('sonra gelen')
  })

  it('does not save when the text did not change', () => {
    const { result, save } = setup('aynı')

    type(result, 'aynı')
    act(() => result.current.onBlur())

    expect(save).not.toHaveBeenCalled()
  })

  it('does not save on a blur without a focus', () => {
    const { result, save } = setup('eski')

    act(() => result.current.onBlur())

    expect(save).not.toHaveBeenCalled()
  })

  it('normalizes the text before comparing and saving', () => {
    const { result, save } = setup('3', undefined, (value) => value.trim())

    type(result, ' 3 ')
    act(() => result.current.onBlur())
    expect(save).not.toHaveBeenCalled()

    type(result, ' 1 ')
    act(() => result.current.onBlur())
    expect(save).toHaveBeenCalledExactlyOnceWith('1')
  })

  it('shows the stored value again and reports the error after a failed save', async () => {
    const failure = new Error('denied')
    const { result, onError } = setup('eski', () => Promise.reject(failure))

    type(result, 'yeni')
    await act(async () => {
      result.current.onBlur()
      await Promise.resolve()
    })

    expect(onError).toHaveBeenCalledExactlyOnceWith(failure)
    expect(result.current.value).toBe('eski')
  })
})
