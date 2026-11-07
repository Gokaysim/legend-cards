import { cn } from '@/lib/cn'

export type AvatarProps = {
  name: string
  photoURL: string | null
  size?: 'sm' | 'md'
}

/** A user's round picture, or the first letter of their name when they have none. Decorative only. */
export function Avatar({ name, photoURL, size = 'md' }: AvatarProps) {
  const sizeClass = size === 'sm' ? 'size-6 text-xs' : 'size-9 text-sm'
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt=""
        referrerPolicy="no-referrer"
        className={cn('shrink-0 rounded-full border border-line', sizeClass)}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border border-line bg-pane-raised font-semibold text-gold',
        sizeClass,
      )}
    >
      {name.charAt(0).toLocaleUpperCase('tr')}
    </span>
  )
}
