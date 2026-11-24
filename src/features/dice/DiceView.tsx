import { Component, type ErrorInfo, lazy, type ReactNode, Suspense, useEffect, useRef } from 'react'

import { cn } from '@/lib/cn'
import { useReducedMotion } from '@/lib/useReducedMotion'

import { FlatDice, NaturalMarkLabel } from './FlatDice'
import { rollView } from './rollView'
import type { DiceRoll } from './schema'
import { canDraw3d } from './webgl'

const DiceStage = lazy(() =>
  import('./stage/DiceStage').then((module) => ({ default: module.DiceStage })),
)

export type DiceViewProps = {
  roll: DiceRoll
  /** Play the throw; otherwise show the dice at rest. */
  playing: boolean
  /** A new value plays the throw again. */
  playKey?: number
  sound?: boolean
  /** "Zarları 3D göster" on this device. Off, the dice show flat and the 3D part never loads. On by default. */
  show3d?: boolean
  /** Called once the dice lie at rest, or at once when they show flat. */
  onRest?: () => void
  className?: string
}

type BoundaryProps = { fallback: ReactNode; children: ReactNode }

/** Shows `fallback` when the 3D part fails: a failed load, a lost WebGL context, a missing asset. */
class StageBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.warn('Dice stage failed; showing the dice flat', error, info.componentStack)
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** The most results the flat strip shows large. */
const FLAT_LARGE_MAX = 12

/** The roll's results as numbers, for a device without 3D. Tells the caller at once that the dice are at rest. */
function FlatStage({
  roll,
  playKey = 0,
  onRest,
}: Pick<DiceViewProps, 'roll' | 'playKey' | 'onRest'>) {
  const onRestRef = useRef(onRest)
  useEffect(() => {
    onRestRef.current = onRest
  })
  // At rest at once, for each roll and each playback: "Tekrar izle" on the roll already shown rests again.
  useEffect(() => {
    onRestRef.current?.()
  }, [roll.id, playKey])
  if (!roll.content) return null
  const view = rollView(roll.content)
  // Up to twelve results show large; more show at the channel's size, so sixty fit the strip. A narrow strip scrolls,
  // and "safe" centring keeps the first row reachable below the strip's labels (design D6 of
  // dice-formula-and-sixty-dice).
  const size = view.results.length > FLAT_LARGE_MAX ? 'sm' : 'lg'
  return (
    <div
      data-testid="flat-dice"
      data-size={size}
      className="flex size-full flex-wrap [align-content:safe_center] items-center justify-center gap-2 overflow-y-auto px-2 pt-12 pb-2"
    >
      <FlatDice view={view} style={roll.content.style} size={size} className="justify-center" />
      <NaturalMarkLabel view={view} />
    </div>
  )
}

/**
 * A roll's dice (design D7, D8): the lazily loaded 3D stage, or the flat dice when the roll has no motion, the browser
 * has no WebGL, the device turned "Zarları 3D göster" off (design D5 of dice-formula-and-sixty-dice), or the 3D part
 * fails to load. With reduced motion the stage shows the recorded rests at once.
 */
export function DiceView({
  roll,
  playing,
  playKey = 0,
  sound = false,
  show3d = true,
  onRest,
  className,
}: DiceViewProps) {
  const isReduced = useReducedMotion()
  const motion = roll.content?.motion ?? null
  const flat = <FlatStage roll={roll} playKey={playKey} onRest={onRest} />
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {motion && show3d && canDraw3d() ? (
        <StageBoundary key={roll.id} fallback={flat}>
          <Suspense fallback={<span className="sr-only">Zarlar yükleniyor</span>}>
            <DiceStage
              roll={roll}
              motion={motion}
              playing={playing && !isReduced}
              playKey={playKey}
              sound={sound}
              onRest={onRest}
            />
          </Suspense>
        </StageBoundary>
      ) : (
        flat
      )}
    </div>
  )
}
