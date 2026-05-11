import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { RestaurantProvider } from '@/contexts/RestaurantContext'
import { HomePage } from '@/pages/Home'
import { MenuPage } from '@/pages/Menu'
import { ContactPage } from '@/pages/Contact'
import { LegalPage } from '@/pages/Legal'
import { WidgetDemoPage } from '@/pages/WidgetDemo'
import { BookingEmbedPage } from '@/pages/BookingEmbed'
import { BookingWidget } from '@/components/BookingWidget'

// ─── Root (fournit RestaurantProvider à tout le monde) ───────────────────────

function AppRoot() {
  return (
    <RestaurantProvider>
      <Outlet />
    </RestaurantProvider>
  )
}

// ─── Layout principal : avec Navbar + Footer + Widget flottant ────────────────

function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BookingWidget />
      <Toaster position="bottom-right" />
    </div>
  )
}

// ─── Layout embed : sans Navbar / Footer / Widget flottant ───────────────────
// Utilisé pour /booking, conçu pour être intégré en iframe.

function EmbedLayout() {
  return <Outlet />
}

// ─── Arbre de routes ──────────────────────────────────────────────────────────

const rootRoute = createRootRoute({ component: AppRoot })

// Layout route "main" (sans path = layout parent uniquement)
const mainLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'main',
  component: MainLayout,
})

// Layout route "embed"
const embedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'embed',
  component: EmbedLayout,
})

// Pages sous le layout principal
const indexRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/',
  component: HomePage,
})

const menuRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/menu',
  component: MenuPage,
})

const contactRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/contact',
  component: ContactPage,
})

const legalRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/mentions-legales',
  component: LegalPage,
})

const widgetDemoRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/widget',
  component: WidgetDemoPage,
})

// Page sous le layout embed (pas de Navbar/Footer)
const bookingRoute = createRoute({
  getParentRoute: () => embedLayoutRoute,
  path: '/booking',
  component: BookingEmbedPage,
})

const routeTree = rootRoute.addChildren([
  mainLayoutRoute.addChildren([
    indexRoute,
    menuRoute,
    contactRoute,
    legalRoute,
    widgetDemoRoute,
  ]),
  embedLayoutRoute.addChildren([
    bookingRoute,
  ]),
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return <RouterProvider router={router} />
}
