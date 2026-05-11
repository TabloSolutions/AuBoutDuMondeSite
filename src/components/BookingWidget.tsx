import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRestaurant } from '@/contexts/RestaurantContext'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { toCSSColor, getContrastColor } from '@/lib/booking-helpers'
import { BookingSteps } from '@/components/BookingSteps'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

// ─── Widget flottant (bouton latéral + panneau coulissant) ────────────────────

function BookingWidgetInner() {
  const { restaurant } = useRestaurant()
  const [open, setOpen] = useState(false)

  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()

  const handleClose = () => setOpen(false)

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center justify-center px-3 py-5 rounded-l-2xl shadow-2xl text-xs font-semibold tracking-wider transition-all hover:px-4"
        style={{ background: toCSSColor(primaryColor), color: getContrastColor(primaryColor) }}
        aria-label="Réserver une table"
      >
        <CalendarDays className="w-5 h-5 mb-2" />
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Réserver</span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
          onClick={handleClose}
        />
      )}

      {/* Panneau coulissant */}
      <div className={cn(
        'fixed right-0 top-0 bottom-0 z-50 w-[440px] flex flex-col shadow-2xl bg-white transition-all duration-300',
        open ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none',
      )}>
        <BookingSteps
          showHeader
          onClose={handleClose}
          mode="widget"
          enabled={open}
        />
      </div>
    </>
  )
}

// ─── Export : enveloppé dans le provider Stripe ───────────────────────────────

export function BookingWidget() {
  return (
    <Elements stripe={stripePromise}>
      <BookingWidgetInner />
    </Elements>
  )
}
