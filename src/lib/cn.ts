import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Joins class names conditionally; later Tailwind classes win over conflicting earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
