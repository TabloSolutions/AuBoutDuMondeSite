import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import jsPDF from 'jspdf'

// ─── Constantes ───────────────────────────────────────────────────────────────

export const SLOT_DURATION = 90
export const NO_SHOW_FEE   = 15

// ─── Conversion couleur (hex, hex sans #, HSL shadcn) → CSS valide ───────────

export function toCSSColor(color: string): string {
  if (!color) return '#1a3a6b'
  const t = color.trim()
  if (t.startsWith('#') || t.startsWith('hsl(') || t.startsWith('rgb')) return t
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t}`
  if (/^\d+\s+\d+%\s+\d+%$/.test(t)) return `hsl(${t})`
  return t
}

// ─── Contraste texte auto ─────────────────────────────────────────────────────

export function getContrastColor(color: string): string {
  const css = toCSSColor(color)
  if (css.startsWith('#')) {
    const clean = css.replace('#', '')
    if (clean.length !== 6) return 'white'
    const r = parseInt(clean.slice(0, 2), 16) / 255
    const g = parseInt(clean.slice(2, 4), 16) / 255
    const b = parseInt(clean.slice(4, 6), 16) / 255
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    return lum > 0.55 ? '#1a1a2e' : 'white'
  }
  const m = css.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/)
  if (m) {
    const l = parseInt(m[3]) / 100
    return l > 0.55 ? '#1a1a2e' : 'white'
  }
  return 'white'
}

// ─── Helpers créneaux ─────────────────────────────────────────────────────────

export function generateSlots(openHour: number, closeHour: number, closeMinute = 0): string[] {
  const slots: string[] = []
  for (let h = openHour; h <= closeHour; h++) {
    for (const m of [0, 30]) {
      if (h === closeHour && m > closeMinute) break
      if (h === closeHour && closeMinute === 0 && m === 0) break
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

export function getSlotsForDay(date: Date): string[] {
  const day = date.getDay()
  if (day === 5) return generateSlots(10, 21, 0)
  if (day === 6) return generateSlots(10, 21, 30)
  return generateSlots(10, 20, 30)
}

export function parseMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// ─── Types tables & réservations ─────────────────────────────────────────────

export interface Table {
  id: string
  capacity: number
  can_fuse: boolean
  zone?: string
}

export interface Reservation {
  id: string
  table_id: string | null
  fused_table_ids: string[]
  time: string
  status: string
  party_size?: number
}

// ─── Disponibilité ────────────────────────────────────────────────────────────

export function isTableBusy(tableId: string, slotStart: number, slotEnd: number, reservations: Reservation[]) {
  return reservations.some(r => {
    if (r.status === 'cancelled') return false
    const occupied = r.table_id === tableId || (r.fused_table_ids ?? []).includes(tableId)
    if (!occupied) return false
    const rStart = parseMinutes(r.time)
    return rStart < slotEnd && rStart + SLOT_DURATION > slotStart
  })
}

export function checkSlotAvailability(
  slot: string,
  partySize: number,
  tables: Table[],
  reservations: Reservation[],
): boolean {
  const slotStart = parseMinutes(slot)
  const slotEnd   = slotStart + SLOT_DURATION
  if (tables.filter(t => t.capacity >= partySize).some(t => !isTableBusy(t.id, slotStart, slotEnd, reservations))) return true
  const freeFusable = tables.filter(t => t.can_fuse && !isTableBusy(t.id, slotStart, slotEnd, reservations))
  return freeFusable.reduce((s, t) => s + t.capacity, 0) >= partySize
}

export function isFusionOnly(
  slot: string,
  partySize: number,
  tables: Table[],
  reservations: Reservation[],
): boolean {
  const slotStart  = parseMinutes(slot)
  const slotEnd    = slotStart + SLOT_DURATION
  const hasSingle  = tables.filter(t => t.capacity >= partySize).some(t => !isTableBusy(t.id, slotStart, slotEnd, reservations))
  return !hasSingle && checkSlotAvailability(slot, partySize, tables, reservations)
}

export function findOptimalTable(
  slot: string,
  partySize: number,
  tables: Table[],
  reservations: Reservation[],
) {
  const slotStart   = parseMinutes(slot)
  const slotEnd     = slotStart + SLOT_DURATION
  const single      = tables.filter(t => t.capacity >= partySize).sort((a, b) => a.capacity - b.capacity)
    .find(t => !isTableBusy(t.id, slotStart, slotEnd, reservations))
  if (single) return { table_id: single.id, fused_table_ids: [] }
  const freeFusable = tables.filter(t => t.can_fuse && !isTableBusy(t.id, slotStart, slotEnd, reservations))
  if (freeFusable.reduce((s, t) => s + t.capacity, 0) >= partySize) {
    return { table_id: freeFusable[0].id, fused_table_ids: freeFusable.slice(1).map(t => t.id) }
  }
  return null
}

// ─── Agenda & PDF ─────────────────────────────────────────────────────────────

export interface BookingInfo {
  name: string
  phone: string
  email: string
  date: Date
  time: string
  partySize: number
  notes?: string
}

function buildCalTimes(date: Date, time: string) {
  const [h, m] = time.split(':').map(Number)
  const pad    = (n: number) => String(n).padStart(2, '0')
  const d      = format(date, 'yyyyMMdd')
  const start  = `${d}T${pad(h)}${pad(m)}00`
  const endMin = h * 60 + m + 90
  const end    = `${d}T${pad(Math.floor(endMin / 60))}${pad(endMin % 60)}00`
  return { start, end }
}

export function openGoogleCalendar(b: BookingInfo, restaurantName: string) {
  const { start, end } = buildCalTimes(b.date, b.time)
  const p = new URLSearchParams({
    action:  'TEMPLATE',
    text:    `Réservation ${restaurantName} — ${b.partySize} pers.`,
    dates:   `${start}/${end}`,
    details: `Réservation pour ${b.partySize} personne${b.partySize > 1 ? 's' : ''} au nom de ${b.name}.`,
  })
  window.open(`https://calendar.google.com/calendar/render?${p}`, '_blank')
}

export function downloadICS(b: BookingInfo, restaurantName: string) {
  const { start, end } = buildCalTimes(b.date, b.time)
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'BEGIN:VEVENT',
    `UID:resa-${Date.now()}`,
    `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:Réservation ${restaurantName} — ${b.partySize} pers.`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = 'reservation.ics'; a.click()
  URL.revokeObjectURL(url)
}

export function downloadReceiptPDF(b: BookingInfo, restaurantName: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210; const margin = 20; const contentW = W - margin * 2
  doc.setFillColor(26, 58, 107); doc.rect(0, 0, W, 50, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(22)
  doc.text(restaurantName, margin, 28)
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 215, 240)
  doc.text('Justificatif de réservation', margin, 40)
  doc.setTextColor(26, 26, 46); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text('Détails de la réservation', margin, 68)
  const rows: [string, string][] = [
    ['Nom',       b.name],
    ['Date',      format(b.date, 'd MMMM yyyy', { locale: fr })],
    ['Heure',     b.time],
    ['Personnes', `${b.partySize} personne${b.partySize > 1 ? 's' : ''}`],
    ['Téléphone', b.phone],
    ['Email',     b.email],
    ...(b.notes ? [['Note', b.notes] as [string, string]] : []),
  ]
  let y = 82
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 5, contentW, 10, 'F') }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(130, 130, 150)
    doc.text(label, margin + 3, y)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 46)
    doc.text(value, margin + contentW - 3, y, { align: 'right' })
    y += 12
  })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(160, 160, 175)
  doc.text("En cas d'annulation, merci de nous prévenir au moins 24h à l'avance.", W / 2, y + 14, { align: 'center' })
  doc.save(`reservation-${format(b.date, 'dd-MM-yyyy')}.pdf`)
}
