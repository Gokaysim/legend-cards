import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import {
  confirmUseLabel,
  initialEntered,
  planUsePayment,
  type UsePayer,
  type UsePaymentPlan,
} from './paymentPlan'
import { UsePayment } from './UsePayment'

const ayla = (lp: number): UsePayer => ({ name: 'Ayla', lp })

/** The payment part of a use step with its confirm label, as a use step holds it. */
function Step({
  cost,
  payer,
  isDm,
}: {
  cost: string | null
  payer: UsePayer | null
  isDm: boolean
}) {
  const [entered, setEntered] = useState(initialEntered(cost, isDm))
  const plan = planUsePayment({ cost, payer, isDm, entered })
  return (
    <>
      <UsePayment
        plan={plan}
        payer={payer}
        cost={cost}
        entered={entered}
        onEnteredChange={setEntered}
      />
      <button type="button" disabled={!plan.canConfirm}>
        {confirmUseLabel(plan.amount)}
      </button>
    </>
  )
}

function setup(cost: string | null, payer: UsePayer | null, isDm = false) {
  const user = userEvent.setup()
  render(<Step cost={cost} payer={payer} isDm={isDm} />)
  return { user, confirm: () => screen.getByRole('button', { name: /Kullanımı onayla/ }) }
}

describe('planUsePayment', () => {
  const plan = (input: Partial<Parameters<typeof planUsePayment>[0]>): UsePaymentPlan =>
    planUsePayment({ cost: '2', payer: ayla(5), isDm: false, entered: '', ...input })

  it("pays a player's fixed price as it is", () => {
    expect(plan({})).toMatchObject({ field: null, amount: 2, isShort: false, canConfirm: true })
  })

  it('waits for a die from 1 to 6, and for a chosen amount from 0', () => {
    expect(plan({ cost: 'd6' })).toMatchObject({ field: 'die', amount: null, canConfirm: false })
    expect(plan({ cost: 'd6', entered: '0' })).toMatchObject({ amount: null })
    expect(plan({ cost: 'd6', entered: '4' })).toMatchObject({ amount: 4, canConfirm: true })
    expect(plan({ cost: 'X', entered: '0' })).toMatchObject({ field: 'chosen', amount: 0 })
    expect(plan({ cost: 'X', entered: '1.5' })).toMatchObject({ amount: null })
  })

  it("lets the DM enter any amount up to the player's LP, starting at the price", () => {
    expect(initialEntered('2', true)).toBe('2')
    expect(initialEntered('X', true)).toBe('')
    expect(initialEntered('2', false)).toBe('')
    expect(plan({ isDm: true, entered: '0' })).toMatchObject({ field: 'dm', amount: 0 })
    expect(plan({ isDm: true, entered: '6' })).toMatchObject({ isShort: true, canConfirm: false })
  })

  it('asks nothing and pays nothing without LP', () => {
    expect(plan({ payer: null, isDm: true })).toMatchObject({
      field: null,
      amount: 0,
      canConfirm: true,
    })
  })

  it('cannot be confirmed with too little LP', () => {
    expect(plan({ cost: '3', payer: ayla(1) })).toMatchObject({ isShort: true, canConfirm: false })
  })
})

describe('UsePayment', () => {
  it('shows a fixed price and the LP before and after', () => {
    const { confirm } = setup('2', ayla(5))

    expect(screen.getByText('2 LP')).toBeInTheDocument()
    expect(screen.getByText('5 LP → 3 LP')).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(confirm()).toHaveTextContent('Kullanımı onayla (2 LP)')
    expect(confirm()).toBeEnabled()
  })

  it('asks for the die of a d6 card and waits for it', async () => {
    const { user, confirm } = setup('d6', ayla(5))

    expect(confirm()).toBeDisabled()
    await user.type(screen.getByLabelText('Zar sonucu (1–6)'), '4')

    expect(screen.getByText('5 LP → 1 LP')).toBeInTheDocument()
    expect(confirm()).toHaveTextContent('Kullanımı onayla (4 LP)')
    expect(confirm()).toBeEnabled()
  })

  it('asks how much to pay for an X card', async () => {
    const { user, confirm } = setup('X', ayla(5))

    expect(screen.getByText('X: sen belirle')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Kaç LP ödenecek?'), '0')

    expect(confirm()).toHaveTextContent(/^Kullanımı onayla$/)
    expect(confirm()).toBeEnabled()
  })

  it("gives the DM the amount from the player's LP, starting at the price", async () => {
    const { user, confirm } = setup('2', ayla(5), true)

    const field = screen.getByLabelText("Tutar (Ayla'nın LP'sinden)")
    expect(field).toHaveValue(2)
    expect(screen.getByText('0 = ücretsiz')).toBeInTheDocument()
    await user.clear(field)
    await user.type(field, '6')

    expect(confirm()).toBeDisabled()
    expect(screen.getByText("Bu kullanım 6 LP tutuyor; Ayla'nın 5 LP'si var.")).toBeInTheDocument()
  })

  it("asks the DM for an amount up to the DM's own LP on the DM's own card", async () => {
    const user = userEvent.setup()
    const { confirm } = setup('2', { name: 'Dana', lp: 4 }, true)

    const field = screen.getByRole('spinbutton')
    expect(field).toHaveValue(2)
    expect(confirm()).toHaveTextContent('Kullanımı onayla (2 LP)')
    await user.clear(field)
    await user.type(field, '5')
    expect(confirm()).toBeDisabled()
    expect(screen.getByText("Bu kullanım 5 LP tutuyor; Dana'nın 4 LP'si var.")).toBeInTheDocument()
  })

  it('shows nothing for a hand without a profile, which pays nothing', () => {
    const { confirm } = setup('2', null, true)

    expect(screen.queryByText('Bedel')).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(confirm()).toHaveTextContent(/^Kullanımı onayla$/)
  })

  it('shows no amount for a Blessed card, which has no cost', () => {
    const { confirm } = setup(null, ayla(5))

    expect(screen.queryByText('Bedel')).not.toBeInTheDocument()
    expect(confirm()).toHaveTextContent(/^Kullanımı onayla$/)
    expect(confirm()).toBeEnabled()
  })

  it('cannot be confirmed with too little LP, and says why', () => {
    const { confirm } = setup('3', ayla(1))

    expect(confirm()).toBeDisabled()
    expect(screen.getByText("Bu kullanım 3 LP tutuyor; Ayla'nın 1 LP'si var.")).toBeInTheDocument()
    // No balance below 0 is shown, only the LP there is.
    expect(screen.getByText('1 LP')).toBeInTheDocument()
    expect(screen.queryByText(/→/)).not.toBeInTheDocument()
  })
})
