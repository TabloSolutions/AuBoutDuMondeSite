import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { Toaster } from 'react-hot-toast'
import { BookingSteps } from '@/components/BookingSteps'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

/**
 * Page de réservation en mode embed — conçue pour être intégrée en iframe
 * sur le site existant du restaurateur.
 *
 * URL : /booking
 * Pas de Navbar ni Footer, fond neutre, carte centrée.
 */
export function BookingEmbedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 pt-6 pb-10">
      <div className="w-full max-w-lg rounded-2xl shadow-xl overflow-hidden bg-white border border-gray-100">
        <Elements stripe={stripePromise}>
          <BookingSteps
            showHeader
            mode="embed"
            enabled
          />
        </Elements>
      </div>

      {/* Toast indépendant (pas de Toaster global dans EmbedRoot) */}
      <Toaster position="bottom-center" />
    </div>
  )
}
