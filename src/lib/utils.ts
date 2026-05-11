import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalise un numéro de téléphone en supprimant espaces, tirets, points
 * et parenthèses. "06 45 63 14 00" → "0645631400"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\.\(\)]/g, '')
}
