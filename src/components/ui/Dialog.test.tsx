import { act, fireEvent, render, screen } from '@testing-library/react'
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

  it('closes alone when it is inside another dialog, and the outer one still closes itself', () => {
    const onCloseOuter = vi.fn()
    const onCloseInner = vi.fn()
    render(
      <Dialog title="Kart" onClose={onCloseOuter}>
        <Dialog title="Büyük görünüm" onClose={onCloseInner}>
          <p>Kart görseli</p>
        </Dialog>
      </Dialog>,
    )
    const outer = screen.getByRole<HTMLDialogElement>('dialog', { name: 'Kart' })
    const inner = screen.getByRole<HTMLDialogElement>('dialog', { name: 'Büyük görünüm' })

    // As Escape does: the browser closes the inner dialog, which fires its `close` event.
    inner.close()

    expect(onCloseInner).toHaveBeenCalledOnce()
    expect(onCloseOuter).not.toHaveBeenCalled()

    outer.close()

    expect(onCloseOuter).toHaveBeenCalledOnce()
    expect(onCloseInner).toHaveBeenCalledOnce()
  })

  describe('with closeOnBackdrop', () => {
    /** Gives the dialog a box from (100, 100) to (500, 600), as a browser lays it out. */
    function renderDialog(onClose = vi.fn()) {
      render(
        <Dialog title="Büyük görünüm" onClose={onClose} closeOnBackdrop>
          <p>Kart görseli</p>
        </Dialog>,
      )
      const dialog = screen.getByRole<HTMLDialogElement>('dialog', { name: 'Büyük görünüm' })
      dialog.getBoundingClientRect = () => new DOMRect(100, 100, 400, 500)
      return { dialog, onClose }
    }
    const press = (target: Element, clientX: number, clientY: number) => {
      fireEvent.pointerDown(target, { clientX, clientY })
      fireEvent.click(target, { clientX, clientY })
    }

    it('closes with a click outside it, on the backdrop', () => {
      const { dialog, onClose } = renderDialog()

      press(dialog, 20, 20)

      expect(onClose).toHaveBeenCalledOnce()
    })

    it('stays open for a click inside it, and on its own scrollbar', () => {
      const { dialog, onClose } = renderDialog()

      press(screen.getByText('Kart görseli'), 300, 300)
      press(dialog, 495, 300)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('stays open when a press starts inside it and ends outside', () => {
      const { dialog, onClose } = renderDialog()

      fireEvent.pointerDown(screen.getByText('Kart görseli'), { clientX: 300, clientY: 300 })
      fireEvent.click(dialog, { clientX: 20, clientY: 20 })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('closes only the inner dialog for a click on its backdrop', () => {
      const onCloseOuter = vi.fn()
      const onCloseInner = vi.fn()
      render(
        <Dialog title="Kart" onClose={onCloseOuter} closeOnBackdrop>
          <Dialog title="Büyük görünüm" onClose={onCloseInner} closeOnBackdrop>
            <p>Kart görseli</p>
          </Dialog>
        </Dialog>,
      )

      press(screen.getByRole('dialog', { name: 'Büyük görünüm' }), 20, 20)

      expect(onCloseInner).toHaveBeenCalledOnce()
      expect(onCloseOuter).not.toHaveBeenCalled()
    })
  })

  describe('bare', () => {
    function renderBare(onClose = vi.fn()) {
      render(
        <Dialog title="Night Owl" onClose={onClose} closeOnBackdrop bare>
          <button type="button" aria-label="Kapat" onClick={onClose}>
            ✕
          </button>
          <p>Kart görseli</p>
        </Dialog>,
      )
      const dialog = screen.getByRole<HTMLDialogElement>('dialog', { name: 'Night Owl' })
      dialog.getBoundingClientRect = () => new DOMRect(100, 100, 400, 500)
      return { dialog, onClose }
    }

    it('shows only its content, named by its title for screen readers', () => {
      const { dialog } = renderBare()

      expect(dialog).toHaveAttribute('open')
      expect(dialog).toHaveAccessibleName('Night Owl')
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '✕ Kapat' })).not.toBeInTheDocument()
      expect(screen.getByText('Kart görseli')).toBeInTheDocument()
    })

    it("closes with its content's own control, with Escape, and with a press on the backdrop", async () => {
      const { dialog, onClose } = renderBare()

      await userEvent.click(screen.getByRole('button', { name: 'Kapat' }))
      expect(onClose).toHaveBeenCalledTimes(1)

      fireEvent.pointerDown(dialog, { clientX: 20, clientY: 20 })
      fireEvent.click(dialog, { clientX: 20, clientY: 20 })
      expect(onClose).toHaveBeenCalledTimes(2)

      // jsdom does not close a native dialog on Escape: `close()` fires `close` as Escape would.
      act(() => dialog.close())
      expect(onClose).toHaveBeenCalledTimes(3)
    })
  })

  it('does not close with a click outside it by default', () => {
    const onClose = vi.fn()
    render(
      <Dialog title="Kart ver" onClose={onClose}>
        <p>İçerik</p>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Kart ver' })
    dialog.getBoundingClientRect = () => new DOMRect(100, 100, 400, 500)

    fireEvent.pointerDown(dialog, { clientX: 20, clientY: 20 })
    fireEvent.click(dialog, { clientX: 20, clientY: 20 })

    expect(onClose).not.toHaveBeenCalled()
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
