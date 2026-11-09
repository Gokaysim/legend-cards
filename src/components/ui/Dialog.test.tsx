import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Dialog } from './Dialog'

describe('Dialog', () => {
  it('opens as a modal when it mounts and focuses the field marked data-autofocus', () => {
    render(
      <Dialog title="Kart ver" onClose={vi.fn()}>
        <input aria-label="Kart" data-autofocus />
      </Dialog>,
    )

    expect(screen.getByRole('dialog', { name: 'Kart ver' })).toHaveAttribute('open')
    expect(screen.getByRole('textbox', { name: 'Kart' })).toHaveFocus()
  })

  it('calls onClose from its close button, with the label it was given', async () => {
    const onClose = vi.fn()
    render(
      <Dialog title="Pack" onClose={onClose} closeLabel="Küçült">
        <p>İçerik</p>
      </Dialog>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Küçült' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('stays closed instead of throwing when it mounts outside the document', () => {
    const detached = document.createElement('div')

    render(
      <Dialog title="Pack" onClose={vi.fn()}>
        <p>İçerik</p>
      </Dialog>,
      { container: detached },
    )

    expect(detached.isConnected).toBe(false)
    expect(detached.querySelector('dialog')).not.toHaveAttribute('open')
  })
})
