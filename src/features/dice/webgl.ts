let supported: boolean | null = null

/** Whether this browser can draw WebGL, checked once. Without it the dice show flat (spec: "Dice without motion"). */
export function canDraw3d(): boolean {
  if (supported !== null) return supported
  try {
    const canvas = document.createElement('canvas')
    supported = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    supported = false
  }
  return supported
}
