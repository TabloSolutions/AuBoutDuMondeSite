import React, { useState } from 'react'
import {
  Users, Clock, Phone, ArrowRight, AlertCircle, Loader2, CalendarDays,
  ChevronLeft, CreditCard, ShieldCheck, CheckCircle2, CalendarPlus, Download, FileDown, X,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { cn, normalizePhone } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/contexts/RestaurantContext'
import { useQuery } from '@tanstack/react-query'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { toast } from 'react-hot-toast'
import {
  toCSSColor, getContrastColor,
  getSlotsForDay, parseMinutes,
  checkSlotAvailability, isFusionOnly, findOptimalTable,
  openGoogleCalendar, downloadICS, downloadReceiptPDF,
  NO_SHOW_FEE,
} from '@/lib/booking-helpers'
import type { Table, Reservation, BookingInfo } from '@/lib/booking-helpers'

// ─── Schéma formulaire ────────────────────────────────────────────────────────

const bookingSchema = z.object({
  customer_name:  z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  customer_email: z.string().email('Email invalide'),
  customer_phone: z.string().refine(v => normalizePhone(v).length >= 10, 'Numéro invalide'),
  notes:          z.string().optional(),
})
type BookingFormData = z.infer<typeof bookingSchema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface BookingStepsProps {
  /** Affiche le header coloré (nom du resto + étape + bouton fermer) */
  showHeader?: boolean
  /** Callback du bouton X dans le header — si absent, pas de bouton X */
  onClose?: () => void
  /** 'widget' = dans le panneau flottant | 'embed' = page pleine */
  mode?: 'widget' | 'embed'
  /** Activer les requêtes Supabase (false quand le widget est fermé) */
  enabled?: boolean
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function BookingSteps({
  showHeader = false,
  onClose,
  mode = 'widget',
  enabled = true,
}: BookingStepsProps) {
  const stripe   = useStripe()
  const elements = useElements()
  const { restaurant, restaurantId } = useRestaurant()

  const [step, setStep]           = useState(1)
  const [partySize, setPartySize] = useState(2)
  const [date, setDate]           = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState('')
  const [zone, setZone]           = useState<'main' | 'terrace'>('main')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState<BookingInfo | null>(null)

  const primaryColor   = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
  const restaurantName = 'Votre Restaurant'
  const dateStr        = format(date, 'yyyy-MM-dd')
  const todayStr       = format(new Date(), 'yyyy-MM-dd')
  const nowMinutes     = new Date().getHours() * 60 + new Date().getMinutes()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  })

  // ── Données Supabase ────────────────────────────────────────────────────────

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['booking-tables', restaurantId],
    queryFn: async () => {
      const { data } = await supabase.from('tables').select('id, capacity, can_fuse, zone').eq('restaurant_id', restaurantId)
      return data ?? []
    },
    enabled: !!restaurantId && enabled,
  })

  const { data: reservations = [], isFetching: loadingSlots } = useQuery<Reservation[]>({
    queryKey: ['booking-reservations', dateStr, restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('reservations')
        .select('id, table_id, fused_table_ids, time, status, party_size')
        .eq('restaurant_id', restaurantId)
        .eq('date', dateStr)
        .neq('status', 'cancelled')
      return data ?? []
    },
    enabled: !!restaurantId && enabled,
  })

  const { data: settings } = useQuery({
    queryKey: ['booking-settings', restaurantId],
    queryFn: async () => {
      const { data: byId } = await supabase
        .from('restaurant_settings')
        .select('max_party_size, restaurant_phone, has_terrasse, plan')
        .eq('restaurant_id', restaurantId)
        .maybeSingle()
      if (byId) return byId
      const { data: fallback } = await supabase
        .from('restaurant_settings')
        .select('max_party_size, restaurant_phone, has_terrasse, plan')
        .maybeSingle()
      return fallback ?? null
    },
    enabled: !!restaurantId && enabled,
  })

  const maxPartySize    = (settings?.max_party_size   as number  | null | undefined) ?? 10
  const restaurantPhone = (settings?.restaurant_phone as string  | null | undefined) ?? ''
  const hasTerrasse     = (settings?.has_terrasse     as boolean | null | undefined) ?? false
  const restaurantPlan  = (settings?.plan             as string  | null | undefined)
  const noshowEnabled   = restaurantPlan !== 'starter'

  const zoneTables  = hasTerrasse ? tables.filter(t => t.zone === zone) : tables
  const isPastSlot  = (slot: string) => dateStr === todayStr && parseMinutes(slot) <= nowMinutes
  const isAvailable = (slot: string) => !isPastSlot(slot) && checkSlotAvailability(slot, partySize, zoneTables, reservations)
  const timeSlots   = getSlotsForDay(date)

  // ── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true)
    try {
      const assignment = findOptimalTable(selectedTime, partySize, zoneTables, reservations)

      if (noshowEnabled) {
        if (!stripe || !elements) { toast.error('Chargement en cours…'); setIsSubmitting(false); return }
        const cardElement = elements.getElement(CardElement)
        if (!cardElement) { toast.error('Veuillez saisir vos informations de carte'); setIsSubmitting(false); return }

        const { data: siData, error: siError } = await supabase.functions.invoke('stripe-setup-intent', {
          body: { customer_email: data.customer_email, customer_name: data.customer_name },
        })
        if (siError || siData?.error) throw new Error(siData?.error || 'Erreur de configuration du paiement')

        const { setupIntent, error: cardError } = await stripe.confirmCardSetup(siData.client_secret, {
          payment_method: { card: cardElement, billing_details: { name: data.customer_name, email: data.customer_email } },
        })
        if (cardError) throw new Error(cardError.message)

        const { error } = await supabase.from('reservations').insert({
          restaurant_id: restaurantId,
          customer_name: data.customer_name, customer_email: data.customer_email,
          customer_phone: normalizePhone(data.customer_phone),
          date: dateStr, time: selectedTime, party_size: partySize,
          notes: data.notes || null, status: 'confirmed',
          table_id: assignment?.table_id ?? null,
          fused_table_ids: assignment?.fused_table_ids ?? [],
          stripe_customer_id: siData.customer_id,
          stripe_payment_method_id: setupIntent!.payment_method as string,
        })
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('reservations').insert({
          restaurant_id: restaurantId,
          customer_name: data.customer_name, customer_email: data.customer_email,
          customer_phone: normalizePhone(data.customer_phone),
          date: dateStr, time: selectedTime, party_size: partySize,
          notes: data.notes || null, status: 'confirmed',
          table_id: assignment?.table_id ?? null,
          fused_table_ids: assignment?.fused_table_ids ?? [],
        })
        if (error) throw new Error(error.message)
      }

      setConfirmedBooking({
        name: data.customer_name, phone: normalizePhone(data.customer_phone),
        email: data.customer_email, date, time: selectedTime, partySize, notes: data.notes,
      })
      setStep(3)
      toast.success('Réservation confirmée !')
    } catch (err: any) {
      toast.error(err.message || 'Une erreur inattendue est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleContinue = () => {
    if (partySize > maxPartySize) return
    if (!selectedTime || !isAvailable(selectedTime)) { toast.error('Veuillez choisir un créneau disponible'); return }
    setStep(2)
  }

  const handleBack = () => setStep(1)

  const handleDone = () => {
    setStep(1); setPartySize(2); setDate(new Date()); setSelectedTime(''); setZone('main')
    setConfirmedBooking(null); reset()
    if (onClose) onClose()
  }

  const handleDateChange   = (d: Date | undefined) => { if (!d) return; setDate(d); setSelectedTime('') }
  const handleZoneChange   = (z: 'main' | 'terrace') => { setZone(z); setSelectedTime('') }
  const handlePartySizeChange = (delta: number) => {
    setPartySize(p => Math.max(1, Math.min(30, p + delta))); setSelectedTime('')
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────

  const stepLabels = ['', 'Date & horaire', 'Vos coordonnées', 'Confirmation']

  return (
    <div className="flex flex-col h-full">

      {/* ── Header (optionnel) ─────────────────────────────────────────────── */}
      {showHeader && (
        <div
          className="shrink-0 flex items-center justify-between px-6 py-5"
          style={{ background: toCSSColor(primaryColor), color: getContrastColor(primaryColor) }}
        >
          <div>
            <p className="text-[11px] uppercase tracking-widest opacity-70 mb-0.5">
              {step === 1 ? 'Réservation en ligne' : step === 2 ? 'Vos coordonnées' : 'Confirmation'}
            </p>
            <p className="font-semibold text-lg">{restaurantName}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ── Stepper ───────────────────────────────────────────────────────── */}
      {step < 3 && (
        <div className="shrink-0 flex items-center px-6 py-3 bg-gray-50 border-b gap-3">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step === s ? 'text-white' : step > s ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400',
                )}
                style={step === s ? { background: toCSSColor(primaryColor) } : undefined}
              >
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <span className={cn('text-xs font-medium', step === s ? 'text-gray-800' : 'text-gray-400')}>
                {s === 1 ? 'Date & horaire' : 'Vos infos'}
              </span>
              {s < 2 && <div className={cn('flex-1 h-px w-8', step > s ? 'bg-emerald-300' : 'bg-gray-200')} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Corps scrollable ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ════ ÉTAPE 1 ════ */}
        {step === 1 && (
          <div className="p-6 space-y-6">

            {/* Convives */}
            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: toCSSColor(primaryColor) }} />
                Nombre de convives
                <span className="text-xs font-normal text-muted-foreground">(max. {maxPartySize} en ligne)</span>
              </Label>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="rounded-full w-10 h-10 text-xl shrink-0"
                  onClick={() => handlePartySizeChange(-1)} disabled={partySize <= 1}>−</Button>
                <span className="text-3xl font-bold w-10 text-center">{partySize}</span>
                <Button variant="outline" size="icon" className="rounded-full w-10 h-10 text-xl shrink-0"
                  onClick={() => handlePartySizeChange(1)} disabled={partySize >= 30}>+</Button>
              </div>
            </div>

            {/* Message groupe trop grand */}
            {partySize > maxPartySize ? (
              <div className="flex flex-col items-center gap-4 py-6 px-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                  <Phone className="w-7 h-7 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-amber-900">Réservation de groupe</p>
                  <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                    Pour les groupes de plus de <strong>{maxPartySize} personnes</strong>,<br />
                    merci de nous contacter directement.
                  </p>
                </div>
                {restaurantPhone
                  ? <a href={`tel:${restaurantPhone.replace(/\s/g, '')}`}
                      className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-full transition-colors">
                      <Phone className="w-4 h-4" />{restaurantPhone}
                    </a>
                  : <p className="text-sm text-amber-700 italic">Contactez-nous par email ou en personne.</p>
                }
              </div>
            ) : (
              <>
                {/* Calendrier */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" style={{ color: toCSSColor(primaryColor) }} />
                    Choisir une date
                  </Label>
                  <Calendar
                    mode="single" selected={date} onSelect={handleDateChange} locale={fr}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-2xl border shadow-sm w-full"
                    classNames={{
                      caption_label: 'text-sm font-semibold',
                      head_cell:     'text-muted-foreground rounded-md w-9 font-normal text-xs',
                      cell:          'h-9 w-9 text-center text-sm p-0 relative',
                      day:           'h-9 w-9 p-0 font-normal rounded-md hover:bg-primary/10 transition-colors',
                      day_selected:  'bg-primary text-primary-foreground hover:bg-primary',
                      day_today:     'bg-accent text-accent-foreground',
                      day_outside:   'text-muted-foreground opacity-50',
                      day_disabled:  'text-muted-foreground opacity-30',
                    }}
                  />
                </div>

                {/* Zone */}
                {hasTerrasse && (
                  <div className="space-y-3">
                    <Label className="text-sm font-bold">Choisir un espace</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: 'main',    label: 'Salle principale', emoji: '🏠' },
                        { key: 'terrace', label: 'Terrasse',         emoji: '☀️' },
                      ] as const).map(({ key, label, emoji }) => (
                        <button key={key} type="button" onClick={() => handleZoneChange(key)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-sm font-medium',
                            zone === key
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border hover:border-primary/40 text-muted-foreground',
                          )}>
                          <span className="text-xl">{emoji}</span>{label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Créneaux */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: toCSSColor(primaryColor) }} />
                    Choisir un horaire
                    <span className="text-xs font-normal text-muted-foreground">— {format(date, 'EEEE d MMM', { locale: fr })}</span>
                  </Label>

                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Chargement…</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map(slot => {
                        const avail      = isAvailable(slot)
                        const isSelected = selectedTime === slot
                        const fusion     = avail && isFusionOnly(slot, partySize, zoneTables, reservations)

                        const slotStyle: React.CSSProperties = isSelected
                          ? { background: toCSSColor(primaryColor), borderColor: toCSSColor(primaryColor), color: getContrastColor(primaryColor), transform: 'scale(1.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                          : !avail
                            ? { background: '#fef2f2', borderColor: '#fecaca', color: '#fca5a5', cursor: 'not-allowed', textDecoration: 'line-through', opacity: 0.6 }
                            : fusion
                              ? { background: '#fffbeb', borderColor: '#fcd34d', color: '#b45309' }
                              : { background: 'white', borderColor: '#e5e7eb', color: '#374151' }

                        return (
                          <button
                            key={slot}
                            disabled={!avail}
                            onClick={() => avail && setSelectedTime(isSelected ? '' : slot)}
                            className="h-10 rounded-xl text-xs font-medium border relative"
                            style={slotStyle}
                            title={fusion ? 'Tables fusionnées' : !avail ? 'Complet' : undefined}
                          >
                            {slot}
                            {fusion && !isSelected && (
                              <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-amber-400 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">⇔</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-border inline-block" />Disponible</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />Complet</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />Fusion</span>
                  </div>

                  {selectedTime && !isAvailable(selectedTime) && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Ce créneau est complet pour {partySize} personne(s).
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ ÉTAPE 2 ════ */}
        {step === 2 && (
          <div className="p-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>

            {/* Récapitulatif */}
            <div className="p-4 rounded-2xl border mb-6 bg-muted/40">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Votre réservation</p>
              <p className="font-bold text-base">
                {partySize} personne{partySize > 1 ? 's' : ''} · {format(date, 'd MMMM yyyy', { locale: fr })} à {selectedTime}
              </p>
              {hasTerrasse && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {zone === 'main' ? '🏠 Salle principale' : '☀️ Terrasse'}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-sm">Nom complet</Label>
                <Input {...register('customer_name')} placeholder="Jean Dupont" className="h-12 rounded-xl" />
                {errors.customer_name && <p className="text-xs text-destructive">{errors.customer_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-sm">Téléphone</Label>
                <Input {...register('customer_phone')} placeholder="06 12 34 56 78" className="h-12 rounded-xl" />
                {errors.customer_phone && <p className="text-xs text-destructive">{errors.customer_phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-sm">Email</Label>
                <Input {...register('customer_email')} placeholder="jean@email.com" className="h-12 rounded-xl" />
                {errors.customer_email && <p className="text-xs text-destructive">{errors.customer_email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-sm">
                  Demandes particulières{' '}
                  <span className="font-normal text-muted-foreground">(optionnel)</span>
                </Label>
                <Input {...register('notes')} placeholder="Allergies, anniversaire…" className="h-12 rounded-xl" />
              </div>

              {/* Garantie bancaire */}
              {noshowEnabled && (
                <div className="p-4 border border-border rounded-2xl space-y-3 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" style={{ color: toCSSColor(primaryColor) }} />
                    <Label className="font-bold text-sm cursor-default">Garantie de réservation</Label>
                  </div>
                  <div className="p-3 border rounded-xl bg-white">
                    <CardElement options={{
                      style: {
                        base:    { fontSize: '15px', color: '#1a1a2e', fontFamily: 'inherit', '::placeholder': { color: '#9ca3af' } },
                        invalid: { color: '#ef4444' },
                      },
                      hidePostalCode: true,
                    }} />
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Aucun débit immédiat.</strong> Garantie uniquement.
                      En cas d'absence non signalée : <strong className="text-foreground">{NO_SHOW_FEE}€/pers.</strong>
                      ({partySize * NO_SHOW_FEE}€ pour votre réservation).
                    </span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 rounded-full text-base font-semibold shadow-md mt-2"
                style={{ background: toCSSColor(primaryColor), color: getContrastColor(primaryColor) }}
                disabled={isSubmitting || (noshowEnabled && !stripe)}
              >
                {isSubmitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Traitement…</>
                  : <>Confirmer la réservation <ArrowRight className="ml-2 w-4 h-4" /></>
                }
              </Button>
            </form>
          </div>
        )}

        {/* ════ ÉTAPE 3 ════ */}
        {step === 3 && confirmedBooking && (
          <div className="p-6 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">Réservation confirmée !</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Merci <strong>{confirmedBooking.name}</strong> !<br />
                Votre table pour <strong>{confirmedBooking.partySize} personne{confirmedBooking.partySize > 1 ? 's' : ''}</strong> est réservée<br />
                le <strong>{format(confirmedBooking.date, 'd MMMM yyyy', { locale: fr })}</strong> à <strong>{confirmedBooking.time}</strong>.
              </p>
            </div>

            <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-2.5">
              {([
                ['Date',      format(confirmedBooking.date, 'd MMMM yyyy', { locale: fr })],
                ['Heure',     confirmedBooking.time],
                ['Personnes', `${confirmedBooking.partySize} pers.`],
                ['Tél.',      confirmedBooking.phone],
                ...(confirmedBooking.notes ? [['Note', confirmedBooking.notes]] : []),
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>

            <div className="w-full space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ajouter à mon agenda</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-xl h-11 gap-2 text-xs"
                  onClick={() => openGoogleCalendar(confirmedBooking, restaurantName)}>
                  <CalendarPlus className="w-4 h-4 text-blue-600" />Google Agenda
                </Button>
                <Button variant="outline" className="rounded-xl h-11 gap-2 text-xs"
                  onClick={() => downloadICS(confirmedBooking, restaurantName)}>
                  <Download className="w-4 h-4 text-gray-600" />Apple / Outlook
                </Button>
              </div>
              <Button variant="outline" className="w-full rounded-xl h-11 gap-2 text-xs"
                onClick={() => downloadReceiptPDF(confirmedBooking, restaurantName)}>
                <FileDown className="w-4 h-4" style={{ color: toCSSColor(primaryColor) }} />
                Télécharger le justificatif PDF
              </Button>
            </div>

            <Button
              className="w-full rounded-full h-11"
              style={{ background: toCSSColor(primaryColor), color: getContrastColor(primaryColor) }}
              onClick={handleDone}
            >
              {mode === 'embed' ? 'Nouvelle réservation' : 'Fermer'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Footer : bouton Continuer (étape 1 uniquement) ────────────────── */}
      {step === 1 && partySize <= maxPartySize && (
        <div className="shrink-0 p-4 border-t bg-white">
          <Button
            className="w-full h-12 rounded-full text-base font-semibold"
            disabled={!selectedTime}
            onClick={handleContinue}
            style={{
              background: selectedTime ? toCSSColor(primaryColor) : undefined,
              color:      selectedTime ? getContrastColor(primaryColor) : undefined,
            }}
          >
            Continuer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          {!selectedTime && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Sélectionnez un créneau pour continuer
            </p>
          )}
        </div>
      )}
    </div>
  )
}
