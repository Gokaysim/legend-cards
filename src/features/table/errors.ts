/**
 * A card movement, draw or balance change that the server refused because a pack is open: the whole table waits
 * for it. Thrown by the feature apis after `explainDenial`.
 */
export class TableBusyError extends Error {
  override readonly name = 'TableBusyError'
  /** The open pack's `draws/{id}`. */
  readonly openPackId: string

  constructor(openPackId: string) {
    super(`The table is waiting for pack ${openPackId}`)
    this.openPackId = openPackId
  }
}

/** The message of a refused action while a pack is open. */
export const TABLE_BUSY_MESSAGE =
  'Şu anda açık bir Pack var: seçim yapılana kadar kart ve bakiye işlemleri bekler.'

/** The note next to a control that is disabled while a pack is open. */
export const TABLE_BUSY_NOTE = 'Bir Pack açık: seçim bekleniyor.'
