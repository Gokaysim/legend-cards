import { useId } from 'react'

import { Button } from '@/components/ui/Button'
import { DRAW_COST_MAX, parseDrawPrice } from '@/features/table/playerDraw'

export type DrawPriceControlProps = {
  /** The text in the box: what the drawer typed, or the last step of "−" and "+". */
  value: string
  onChange: (value: string) => void
}

/**
 * The price of the next draw while the player draw mode is on (spec: card-draws, "The draw price while the mode is
 * on"; design D5 of adjustable-draw-price): "−", a box for any whole number of LP from 0 to 1,000,000, and "+". The
 * dialog disables its draw control while the box holds no valid price.
 */
export function DrawPriceControl({ value, onChange }: DrawPriceControlProps) {
  const ids = useId()
  const price = parseDrawPrice(value)
  const step = (by: number) => {
    if (price === null) return
    onChange(String(Math.min(DRAW_COST_MAX, Math.max(0, price + by))))
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <label htmlFor={`${ids}-price`} className="text-sm font-medium text-ink">
        Fiyat
      </label>
      <div className="flex items-center gap-1.5">
        <Button
          aria-label="Fiyatı azalt"
          disabled={price === null || price === 0}
          onClick={() => step(-1)}
          className="size-9 px-0 text-base"
        >
          −
        </Button>
        <input
          id={`${ids}-price`}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          aria-invalid={price === null}
          aria-describedby={`${ids}-note`}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (price !== null) onChange(String(price))
          }}
          className="h-9 w-20 rounded-lg border border-control-line bg-control px-2 text-center text-sm text-ink tabular-nums aria-invalid:border-danger-line"
        />
        <Button
          aria-label="Fiyatı artır"
          disabled={price === null || price === DRAW_COST_MAX}
          onClick={() => step(1)}
          className="size-9 px-0 text-base"
        >
          +
        </Button>
        <span className="text-sm text-ink-muted">LP</span>
      </div>
      <p id={`${ids}-note`} className="text-xs text-ink-muted">
        {price === null ? '0 ile 1.000.000 arasında bir tam sayı yaz.' : '0 = ücretsiz'}
      </p>
    </div>
  )
}
