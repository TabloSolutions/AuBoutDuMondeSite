import { useState } from 'react'

const isEmbed = new URLSearchParams(window.location.search).has('embed')
import jsPDF from 'jspdf'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Calendar as CalendarIcon, Users, Clock, ArrowRight, CheckCircle2,
  ChevronLeft, Loader2, AlertCircle, CreditCard, ShieldCheck,
  CalendarPlus, Download, FileDown, Phone,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, normalizePhone } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { useRestaurant } from '@/contexts/RestaurantContext'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

const NO_SHOW_FEE = 15 // € par personne
const SLOT_DURATION = 90 // minutes

const bookingSchema = z.object({
  customer_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  customer_email: z.string().email('Email invalide'),
  customer_phone: z.string().refine(
    v => normalizePhone(v).length >= 10,
    'Numéro de téléphone invalide'
  ),
  date: z.date({ required_error: 'Date requise' }),
  time: z.string().min(1, 'Horaire requis'),
  party_size: z.number().min(1).max(30),
  notes: z.string().optional()
})

type BookingFormData = z.infer<typeof bookingSchema>

interface Table { id: string; name: string; capacity: number; can_fuse: boolean }
interface Reservation { id: string; table_id: string | null; fused_table_ids: string[]; time: string; status: string; party_size: number }

type TableAssignment = { table_id: string; fused_table_ids: string[] }

function generateSlots(openHour: number, closeHour: number, closeMinute = 0): string[] {
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

function getSlotsForDay(date: Date): string[] {
  const day = date.getDay()
  if (day === 5) return generateSlots(10, 21, 0)
  if (day === 6) return generateSlots(10, 21, 30)
  return generateSlots(10, 20, 30)
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Vérifie si une table est occupée sur le créneau donné */
function isTableBusy(tableId: string, slotStart: number, slotEnd: number, reservations: Reservation[]): boolean {
  return reservations.some(r => {
    if (r.status === 'cancelled') return false
    const occupied = r.table_id === tableId || (r.fused_table_ids ?? []).includes(tableId)
    if (!occupied) return false
    const rStart = parseMinutes(r.time)
    return rStart < slotEnd && rStart + SLOT_DURATION > slotStart
  })
}

/** Trouve le groupe minimum de tables fusionnables libres couvrant partySize (N tables) */
function findFusionGroup(
  slot: string,
  partySize: number,
  tables: Table[],
  reservations: Reservation[]
): { tableA: Table; tableBs: Table[] } | null {
  const slotStart = parseMinutes(slot)
  const slotEnd = slotStart + SLOT_DURATION
  const freeFusable = tables.filter(t => t.can_fuse && !isTableBusy(t.id, slotStart, slotEnd, reservations))
  if (freeFusable.reduce((s, t) => s + t.capacity, 0) < partySize) return null

  function combos(arr: Table[], size: number): Table[][] {
    if (size === 1) return arr.map(t => [t])
    const result: Table[][] = []
    for (let i = 0; i <= arr.length - size; i++) {
      for (const rest of combos(arr.slice(i + 1), size - 1)) result.push([arr[i], ...rest])
    }
    return result
  }

  for (let groupSize = 2; groupSize <= freeFusable.length; groupSize++) {
    let best: Table[] | null = null
    let bestWaste = Infinity
    for (const combo of combos(freeFusable, groupSize)) {
      const cap = combo.reduce((s, t) => s + t.capacity, 0)
      if (cap >= partySize && cap - partySize < bestWaste) { bestWaste = cap - partySize; best = combo }
    }
    if (best) return { tableA: best[0], tableBs: best.slice(1) }
  }
  return null
}

function checkSlotAvailability(
  slot: string,
  partySize: number,
  tables: Table[],
  reservations: Reservation[]
): boolean {
  const slotStart = parseMinutes(slot)
  const slotEnd = slotStart + SLOT_DURATION
  // 1. Table unique suffisante
  if (tables.filter(t => t.capacity >= partySize).some(t => !isTableBusy(t.id, slotStart, slotEnd, reservations))) return true
  // 2. Fusion de N tables
  return !!findFusionGroup(slot, partySize, tables, reservations)
}

function findOptimalTable(
  slot: string,
  partySize: number,
  tables: Table[],
  reservations: Reservation[]
): TableAssignment | null {
  const slotStart = parseMinutes(slot)
  const slotEnd = slotStart + SLOT_DURATION
  // 1. Table unique (la plus petite qui convient)
  const single = tables
    .filter(t => t.capacity >= partySize)
    .sort((a, b) => a.capacity - b.capacity)
    .find(t => !isTableBusy(t.id, slotStart, slotEnd, reservations))
  if (single) return { table_id: single.id, fused_table_ids: [] }
  // 2. Fusion de N tables
  const group = findFusionGroup(slot, partySize, tables, reservations)
  if (group) return { table_id: group.tableA.id, fused_table_ids: group.tableBs.map(t => t.id) }
  return null
}

// ─── Utilitaires agenda & justificatif ───────────────────────────────────────

function buildCalTimes(date: Date, time: string) {
  const [h, m] = time.split(':').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const d = format(date, 'yyyyMMdd')
  const start = `${d}T${pad(h)}${pad(m)}00`
  const endMin = h * 60 + m + 90
  const end = `${d}T${pad(Math.floor(endMin / 60))}${pad(endMin % 60)}00`
  return { start, end }
}

function openGoogleCalendar(b: { name: string; date: Date; time: string; partySize: number }) {
  const { start, end } = buildCalTimes(b.date, b.time)
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Réservation au restaurant — ${b.partySize} pers.`,
    dates: `${start}/${end}`,
    details: `Réservation pour ${b.partySize} personne${b.partySize > 1 ? 's' : ''} au nom de ${b.name}.`,
    location: 'Adresse du restaurant',
  })
  window.open(`https://calendar.google.com/calendar/render?${p}`, '_blank')
}

function downloadICS(b: { name: string; date: Date; time: string; partySize: number }) {
  const { start, end } = buildCalTimes(b.date, b.time)
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Restaurant//FR',
    'BEGIN:VEVENT',
    `UID:resa-${Date.now()}@votre-restaurant.fr`,
    `DTSTART:${start}`, `DTEND:${end}`,
    'SUMMARY:Réservation au restaurant',
    `DESCRIPTION:Réservation pour ${b.partySize} personne${b.partySize > 1 ? 's' : ''} au nom de ${b.name}.`,
    `LOCATION:Adresse du restaurant`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'reservation-restaurant.ics' })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadReceiptPDF(b: { name: string; phone: string; email: string; date: Date; time: string; partySize: number; notes?: string }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 20
  const contentW = W - margin * 2

  // ── En-tête ──────────────────────────────────────────────────────────────
  doc.setFillColor(26, 107, 138)
  doc.rect(0, 0, W, 38, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('Votre Restaurant', W / 2, 16, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Adresse du restaurant', W / 2, 24, { align: 'center' })
  doc.text('Téléphone · Email du restaurant', W / 2, 30, { align: 'center' })

  // ── Badge confirmation ────────────────────────────────────────────────────
  doc.setFillColor(240, 253, 244)
  doc.setDrawColor(34, 197, 94)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, 44, contentW, 12, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(22, 101, 52)
  doc.text('Reservation confirmee', W / 2, 51.5, { align: 'center' })

  // ── Titre ─────────────────────────────────────────────────────────────────
  doc.setTextColor(26, 26, 46)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Justificatif de reservation', margin, 68)
  doc.setDrawColor(26, 107, 138)
  doc.setLineWidth(0.6)
  doc.line(margin, 71, margin + contentW, 71)

  // ── Lignes de détail ─────────────────────────────────────────────────────
  const rows: [string, string][] = [
    ['Nom', b.name],
    ['Date', format(b.date, 'd MMMM yyyy', { locale: fr })],
    ['Heure', b.time],
    ['Nombre de personnes', `${b.partySize} personne${b.partySize > 1 ? 's' : ''}`],
    ['Telephone', b.phone],
    ['Email', b.email],
    ...(b.notes ? [['Demandes particulieres', b.notes] as [string, string]] : []),
  ]

  let y = 82
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, y - 5, contentW, 10, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(130, 130, 150)
    doc.text(label, margin + 3, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 26, 46)
    doc.text(value, margin + contentW - 3, y, { align: 'right' })
    y += 12
  })

  // ── Séparateur ────────────────────────────────────────────────────────────
  doc.setDrawColor(220, 220, 230)
  doc.setLineWidth(0.3)
  doc.line(margin, y + 4, margin + contentW, y + 4)

  // ── Pied de page ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(160, 160, 175)
  doc.text("En cas d'annulation, merci de nous prevenir au moins 24h a l'avance.", W / 2, y + 14, { align: 'center' })
  doc.text(`Frais de no-show : ${NO_SHOW_FEE} EUR / personne.`, W / 2, y + 20, { align: 'center' })
  doc.text(`Document genere le ${new Date().toLocaleDateString('fr-FR')}`, W / 2, y + 26, { align: 'center' })

  // ── Filigrane bas de page ─────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setTextColor(200, 200, 210)
  doc.text('Votre Restaurant · Site de démonstration', W / 2, 287, { align: 'center' })

  doc.save(`reservation-restaurant-${format(b.date, 'dd-MM-yyyy')}.pdf`)
}

// ─── Formulaire interne (a accès aux hooks Stripe) ───────────────────────────

function BookingFormInner() {
  const stripe = useStripe()
  const elements = useElements()

  // ── Pré-remplissage depuis le widget (paramètres URL) ──────────────────────
  const params       = new URLSearchParams(window.location.search)
  const paramDate    = params.get('date')
  const paramTime    = params.get('time')
  const paramGuests  = params.get('guests')
  const paramZone    = params.get('zone') as 'main' | 'terrace' | null

  const initialDate      = paramDate   ? new Date(paramDate + 'T12:00:00') : new Date()
  const initialPartySize = paramGuests ? Math.max(1, parseInt(paramGuests, 10)) : 2
  const initialStep      = (paramDate && paramTime) ? 2 : 1

  const [step, setStep] = useState(initialStep)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedZone, setSelectedZone] = useState<'main' | 'terrace'>(paramZone ?? 'main')
  const [confirmedBooking, setConfirmedBooking] = useState<{
    name: string; phone: string; email: string
    date: Date; time: string; partySize: number; notes?: string
  } | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { party_size: initialPartySize, date: initialDate, time: paramTime ?? '' }
  })

  const selectedDate = watch('date')
  const selectedTime = watch('time')
  const selectedPartySize = watch('party_size')
  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null

  const timeSlots = selectedDate ? getSlotsForDay(selectedDate) : getSlotsForDay(new Date())
  const { restaurantId } = useRestaurant()

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['booking-tables', restaurantId],
    queryFn: async () => {
      const { data } = await supabase.from('tables').select('*').eq('restaurant_id', restaurantId)
      return data ?? []
    },
    enabled: !!restaurantId
  })

  const { data: existingReservations = [] } = useQuery<Reservation[]>({
    queryKey: ['booking-reservations', dateStr, restaurantId],
    queryFn: async () => {
      if (!dateStr) return []
      const { data } = await supabase
        .from('reservations')
        .select('id, table_id, fused_table_ids, time, status, party_size')
        .eq('restaurant_id', restaurantId)
        .eq('date', dateStr)
        .neq('status', 'cancelled')
      return data ?? []
    },
    enabled: !!dateStr && !!restaurantId
  })

  const { data: restaurantSettings } = useQuery({
    queryKey: ['booking-restaurant-settings', restaurantId],
    queryFn: async () => {
      // Priorité 1 : filtrer par restaurant_id
      const { data: byId } = await supabase
        .from('restaurant_settings')
        .select('max_party_size, restaurant_phone, has_terrasse, plan')
        .eq('restaurant_id', restaurantId)
        .maybeSingle()
      if (byId) return byId

      // Priorité 2 : fallback sans filtre (row créée sans restaurant_id)
      const { data: any } = await supabase
        .from('restaurant_settings')
        .select('max_party_size, restaurant_phone, has_terrasse, plan')
        .maybeSingle()
      return any ?? null
    },
    enabled: !!restaurantId,
  })
  const maxPartySize    = (restaurantSettings?.max_party_size  as number | null | undefined) ?? 10
  const restaurantPhone = (restaurantSettings?.restaurant_phone as string | null | undefined) ?? ''
  const hasTerrasse     = (restaurantSettings?.has_terrasse    as boolean | null | undefined) ?? false
  const restaurantPlan  = (restaurantSettings?.plan            as string | null | undefined)
  // No-show activé pour Pro et Pro Max ; désactivé pour Starter ; null = ancien compte → activé par défaut
  const noshowEnabled   = restaurantPlan !== 'starter'

  // Tables filtrées selon la zone choisie (si terrasse active)
  const zoneTables = hasTerrasse ? tables.filter((t: any) => t.zone === selectedZone) : tables

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()

  const isPastSlot = (slot: string) => {
    if (!selectedDate || format(selectedDate, 'yyyy-MM-dd') !== todayStr) return false
    const [h, m] = slot.split(':').map(Number)
    return h * 60 + m <= nowMinutes
  }

  const isSlotAvailable = (slot: string) =>
    !isPastSlot(slot) && checkSlotAvailability(slot, selectedPartySize, zoneTables, existingReservations)

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true)
    try {
      // Trouver la meilleure table disponible (simple ou fusionnée) dans la zone choisie
      const assignment = findOptimalTable(data.time, data.party_size, zoneTables, existingReservations)

      if (noshowEnabled) {
        // ── Chemin avec garantie bancaire (Pro / Pro Max) ──────────────────────
        if (!stripe || !elements) {
          toast.error('Chargement en cours, veuillez patienter')
          setIsSubmitting(false)
          return
        }
        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
          toast.error('Veuillez saisir vos informations de carte bancaire')
          setIsSubmitting(false)
          return
        }

        // 1. Créer le SetupIntent côté serveur
        const { data: siData, error: siError } = await supabase.functions.invoke('stripe-setup-intent', {
          body: { customer_email: data.customer_email, customer_name: data.customer_name }
        })
        if (siError || siData?.error) throw new Error(siData?.error || 'Erreur de configuration du paiement')

        // 2. Confirmer l'enregistrement de la carte
        const { setupIntent, error: cardError } = await stripe.confirmCardSetup(siData.client_secret, {
          payment_method: {
            card: cardElement,
            billing_details: { name: data.customer_name, email: data.customer_email }
          }
        })
        if (cardError) throw new Error(cardError.message)

        // 3. Sauvegarder la réservation avec les infos Stripe
        const { error } = await supabase.from('reservations').insert({
          restaurant_id: restaurantId,
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          customer_phone: normalizePhone(data.customer_phone),
          date: format(data.date, 'yyyy-MM-dd'),
          time: data.time,
          party_size: data.party_size,
          notes: data.notes || null,
          status: 'confirmed',
          table_id: assignment?.table_id ?? null,
          fused_table_ids: assignment?.fused_table_ids ?? [],
          stripe_customer_id: siData.customer_id,
          stripe_payment_method_id: setupIntent!.payment_method as string,
        })
        if (error) throw new Error(error.message)
      } else {
        // ── Chemin sans garantie bancaire (Starter) ────────────────────────────
        const { error } = await supabase.from('reservations').insert({
          restaurant_id: restaurantId,
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          customer_phone: normalizePhone(data.customer_phone),
          date: format(data.date, 'yyyy-MM-dd'),
          time: data.time,
          party_size: data.party_size,
          notes: data.notes || null,
          status: 'confirmed',
          table_id: assignment?.table_id ?? null,
          fused_table_ids: assignment?.fused_table_ids ?? [],
        })
        if (error) throw new Error(error.message)
      }

      setConfirmedBooking({
        name: data.customer_name,
        phone: normalizePhone(data.customer_phone),
        email: data.customer_email,
        date: data.date,
        time: data.time,
        partySize: data.party_size,
        notes: data.notes,
      })
      setStep(3)
      toast.success('Réservation enregistrée !')
    } catch (err: any) {
      toast.error(err.message || 'Une erreur inattendue est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (selectedPartySize > maxPartySize) {
      toast.error(`Pour des groupes de plus de ${maxPartySize} personnes, veuillez nous appeler directement.`)
      return
    }
    if (!selectedDate || !selectedTime) { toast.error('Veuillez choisir une date et un horaire'); return }
    if (!isSlotAvailable(selectedTime)) { toast.error('Ce créneau n\'est plus disponible pour ce nombre de convives'); return }
    setStep(2)
  }

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return
    setValue('date', date)
    setValue('time', '')
  }

  return (
    <div className={isEmbed ? "pt-6 pb-10 bg-transparent" : "pt-32 pb-24 bg-background min-h-screen"}>
      <div className="container px-4 mx-auto max-w-5xl">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">Réserver une table</h1>
          <p className="text-muted-foreground text-lg">Planifiez votre prochaine escapade gourmande face à l'océan.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all border-2",
                step === s ? "bg-primary border-primary text-white shadow-elegant scale-110" :
                step > s ? "bg-primary/10 border-primary text-primary" : "bg-muted border-muted text-muted-foreground"
              )}>
                {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
              </div>
              {s < 3 && <div className={cn("w-12 md:w-20 h-0.5 rounded-full", step > s ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>

        <div className="glass p-8 md:p-12 rounded-[2.5rem] shadow-elegant overflow-hidden">

          {/* ÉTAPE 1 — Date, horaire, couverts */}
          {step === 1 && (
            <div className="flex flex-col gap-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                <div className="flex flex-col gap-4">
                  <Label className="text-lg font-bold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    Choisir une date
                  </Label>
                  <div className="flex justify-start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateChange}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="rounded-2xl border shadow-sm"
                      locale={fr}
                      classNames={{
                        caption_label: "text-base font-semibold",
                        head_cell: "text-muted-foreground rounded-md w-10 font-normal text-sm",
                        cell: "h-10 w-10 text-center text-sm p-0 relative",
                        day: "h-10 w-10 p-0 font-normal rounded-md hover:bg-primary/10 transition-colors",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                        day_today: "bg-accent text-accent-foreground",
                        day_outside: "text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-30",
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  <div className="flex flex-col gap-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Nombre de convives
                      <span className="text-xs font-normal text-muted-foreground">(max. {maxPartySize} en ligne)</span>
                    </Label>
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="icon" className="rounded-full w-12 h-12 text-xl"
                        onClick={() => { setValue('party_size', Math.max(1, selectedPartySize - 1)); setValue('time', '') }}>−</Button>
                      <span className="text-3xl font-bold w-10 text-center">{selectedPartySize}</span>
                      <Button variant="outline" size="icon" className="rounded-full w-12 h-12 text-xl"
                        onClick={() => { setValue('party_size', Math.min(30, selectedPartySize + 1)); setValue('time', '') }}
                        disabled={selectedPartySize >= 30}>+</Button>
                    </div>
                  </div>

                  {/* ── Choix de la zone (terrasse active) ── */}
                  {hasTerrasse && selectedPartySize <= maxPartySize && (
                    <div className="flex flex-col gap-3">
                      <Label className="text-base font-bold">Choisir un espace</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => { setSelectedZone('main'); setValue('time', '') }}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all font-medium text-sm",
                            selectedZone === 'main'
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/40 text-muted-foreground"
                          )}
                        >
                          <span className="text-2xl">🏠</span>
                          Salle principale
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedZone('terrace'); setValue('time', '') }}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all font-medium text-sm",
                            selectedZone === 'terrace'
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/40 text-muted-foreground"
                          )}
                        >
                          <span className="text-2xl">☀️</span>
                          Terrasse
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Groupe trop grand : message d'appel ── */}
                  {selectedPartySize > maxPartySize ? (
                    <div className="flex flex-col items-center justify-center gap-5 py-8 px-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 text-center">
                      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                        <Phone className="w-8 h-8 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold text-amber-900 text-lg">
                          Réservation de groupe
                        </p>
                        <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                          Pour les groupes de plus de <strong>{maxPartySize} personnes</strong>,<br />
                          merci de nous contacter directement.
                        </p>
                      </div>
                      {restaurantPhone ? (
                        <a
                          href={`tel:${restaurantPhone.replace(/\s/g, '')}`}
                          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-full transition-colors text-lg"
                        >
                          <Phone className="w-5 h-5" />
                          {restaurantPhone}
                        </a>
                      ) : (
                        <p className="text-sm text-amber-700 italic">
                          Contactez-nous par email ou en personne.
                        </p>
                      )}
                    </div>
                  ) : (
                  /* ── Créneaux horaires ── */
                  <div className="flex flex-col gap-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Choisir un horaire
                      {selectedDate && (
                        <span className="text-xs font-normal text-muted-foreground">
                          — {format(selectedDate, 'EEEE', { locale: fr })}
                        </span>
                      )}
                    </Label>
                    <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                      {timeSlots.map((time) => {
                        const available = isSlotAvailable(time)
                        const isSelected = selectedTime === time
                        // Disponible uniquement via fusion (pas de table unique suffisante)
                        const isFusionOnly = available && !zoneTables.some(t =>
                          t.capacity >= selectedPartySize &&
                          !isTableBusy(t.id, parseMinutes(time), parseMinutes(time) + SLOT_DURATION, existingReservations)
                        )
                        return (
                          <button
                            key={time}
                            disabled={!available}
                            onClick={() => available && setValue('time', time)}
                            className={cn(
                              "h-10 rounded-xl transition-all text-sm font-medium border relative",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                : available
                                  ? isFusionOnly
                                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:scale-[1.02]"
                                    : "border-border hover:bg-primary/5 hover:border-primary/30 hover:scale-[1.02]"
                                  : "bg-red-50 border-red-200 text-red-300 cursor-not-allowed line-through opacity-60"
                            )}
                            title={isFusionOnly ? 'Tables fusionnées disponibles' : !available ? 'Créneau complet' : undefined}
                          >
                            {time}
                            {isFusionOnly && !isSelected && (
                              <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-amber-400 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">⇔</span>
                            )}
                            {!available && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-background border border-border inline-block" />
                        Disponible
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />
                        Complet
                      </span>
                    </div>
                    {selectedTime && !isSlotAvailable(selectedTime) && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Ce créneau est malheureusement complet pour {selectedPartySize} personne(s).
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>

              <div className="pt-8 border-t flex justify-end">
                <Button size="lg" className="rounded-full px-10 h-14 text-lg shadow-elegant" onClick={handleNext}>
                  Continuer <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 — Coordonnées + carte bancaire */}
          {step === 2 && (
            <div>
              <Button variant="ghost" className="mb-8 pl-0 hover:bg-transparent hover:text-primary flex items-center gap-1" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4" />Retour
              </Button>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="font-bold">Nom complet</Label>
                    <Input {...register('customer_name')} placeholder="Jean Dupont" className="h-14 rounded-xl" />
                    {errors.customer_name && <p className="text-xs text-destructive">{errors.customer_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Téléphone</Label>
                    <Input {...register('customer_phone')} placeholder="06 12 34 56 78" className="h-14 rounded-xl" />
                    {errors.customer_phone && <p className="text-xs text-destructive">{errors.customer_phone.message}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-bold">Email <span className="text-xs font-normal text-muted-foreground">(pour retrouver votre réservation)</span></Label>
                    <Input {...register('customer_email')} placeholder="jean.dupont@email.com" className="h-14 rounded-xl" />
                    {errors.customer_email && <p className="text-xs text-destructive">{errors.customer_email.message}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-bold">Demandes particulières (optionnel)</Label>
                    <Input {...register('notes')} placeholder="Allergies, anniversaire, préférence de table..." className="h-14 rounded-xl" />
                  </div>
                </div>

                {/* Récapitulatif */}
                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold block mb-1">Récapitulatif</span>
                  <span className="font-bold text-base">
                    {selectedPartySize} personne{selectedPartySize > 1 ? 's' : ''} — {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: fr }) : ''} à {selectedTime}
                  </span>
                </div>

                {/* Empreinte bancaire — uniquement pour les restaurants Pro/Pro Max */}
                {noshowEnabled && (
                  <div className="p-6 border border-border rounded-2xl bg-background space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <Label className="font-bold text-base cursor-default">Garantie de réservation</Label>
                    </div>
                    <div className="p-4 border rounded-xl bg-secondary/20">
                      <CardElement
                        options={{
                          style: {
                            base: {
                              fontSize: '16px',
                              color: '#1a1a2e',
                              fontFamily: 'inherit',
                              '::placeholder': { color: '#9ca3af' },
                            },
                            invalid: { color: '#ef4444' },
                          },
                          hidePostalCode: true,
                        }}
                      />
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground">Aucun débit immédiat.</strong> Votre carte est enregistrée à titre de garantie uniquement.
                        En cas d'absence non signalée 1h à l'avance, des frais de{' '}
                        <strong className="text-foreground">{NO_SHOW_FEE}€/pers.</strong> seront prélevés
                        ({selectedPartySize * NO_SHOW_FEE}€ pour votre réservation).
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex justify-end">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting || (noshowEnabled && !stripe)}
                    className="rounded-full px-12 h-16 text-lg shadow-elegant"
                  >
                    {isSubmitting
                      ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Traitement...</>
                      : 'Confirmer la réservation'
                    }
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ÉTAPE 3 — Confirmation */}
          {step === 3 && confirmedBooking && (
            <div className="flex flex-col items-center py-16 text-center gap-8">
              {/* Icône succès */}
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              {/* Titre + résumé */}
              <div className="space-y-3">
                <h2 className="text-3xl font-serif font-bold">Réservation confirmée !</h2>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Merci <strong>{confirmedBooking.name}</strong> ! Votre table pour{' '}
                  <strong>{confirmedBooking.partySize} personne{confirmedBooking.partySize > 1 ? 's' : ''}</strong> est réservée le{' '}
                  <strong>{format(confirmedBooking.date, 'd MMMM yyyy', { locale: fr })}</strong> à <strong>{confirmedBooking.time}</strong>.
                </p>
              </div>

              {/* Récapitulatif visuel */}
              <div className="w-full max-w-sm bg-primary/5 border border-primary/15 rounded-2xl p-5 text-left space-y-2.5">
                {[
                  ['Date', format(confirmedBooking.date, 'd MMMM yyyy', { locale: fr })],
                  ['Heure', confirmedBooking.time],
                  ['Personnes', `${confirmedBooking.partySize} personne${confirmedBooking.partySize > 1 ? 's' : ''}`],
                  ['Téléphone', confirmedBooking.phone],
                  ...(confirmedBooking.notes ? [['Note', confirmedBooking.notes]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              {/* Ajouter à l'agenda */}
              <div className="w-full max-w-sm space-y-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ajouter à mon agenda</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="rounded-xl h-12 gap-2 text-sm"
                    onClick={() => openGoogleCalendar(confirmedBooking)}
                  >
                    <CalendarPlus className="w-4 h-4 text-blue-600" />
                    Google Agenda
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl h-12 gap-2 text-sm"
                    onClick={() => downloadICS(confirmedBooking)}
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                    Apple / Outlook
                  </Button>
                </div>
              </div>

              {/* Justificatif PDF */}
              <div className="w-full max-w-sm space-y-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Justificatif</p>
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-12 gap-2 text-sm border-primary/30 hover:bg-primary/5 hover:border-primary"
                  onClick={() => downloadReceiptPDF(confirmedBooking)}
                >
                  <FileDown className="w-4 h-4 text-primary" />
                  Télécharger le justificatif PDF
                </Button>
              </div>

              {/* Retour */}
              <Button
                onClick={() => window.location.href = '/'}
                className="rounded-full px-10 h-12 text-base shadow-elegant"
              >
                Retour à l'accueil
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Export public : enveloppe le formulaire dans le provider Stripe ──────────

export function BookingPage() {
  // Mode widget (intégré sur un site externe) → formulaire direct
  if (isEmbed) {
    return (
      <Elements stripe={stripePromise}>
        <BookingFormInner />
      </Elements>
    )
  }

  // Mode normal (page du site) → iframe du widget
  const widgetUrl = `${window.location.origin}/booking?embed=true`
  return (
    <div className="pt-28 pb-16 bg-background min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold mb-3">Réserver une table</h1>
          <p className="text-muted-foreground">Réservation en ligne, confirmée instantanément.</p>
        </div>
        <iframe
          src={widgetUrl}
          width="100%"
          height="780"
          style={{ border: 'none', borderRadius: '16px', display: 'block' }}
          loading="lazy"
          title="Réservation en ligne"
        />
      </div>
    </div>
  )
}
