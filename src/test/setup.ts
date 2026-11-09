import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup()
})

// jsdom has <dialog> but not its modal methods. A minimal stand-in: open and close toggle the `open` attribute,
// showModal() throws outside the document and close() fires the `close` event, as browsers do. Escape and the top
// layer are not simulated.
if (typeof HTMLDialogElement !== 'undefined' && !('showModal' in HTMLDialogElement.prototype)) {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      if (!this.isConnected) {
        throw new DOMException(
          "Failed to execute 'showModal' on 'HTMLDialogElement': The element is not in a Document.",
          'InvalidStateError',
        )
      }
      this.setAttribute('open', '')
    },
    close(this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
}
