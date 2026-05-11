import { useState } from 'react'
import { Check, Copy, Code2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

// URL de la page de réservation embed (sans Navbar ni Footer)
const BOOKING_URL = `${window.location.origin}/booking`

const SNIPPET = `<!-- Widget Réservation — propulsé par Tablo -->
<div id="tablo-booking"></div>
<script>
  (function () {
    var iframe = document.createElement('iframe');
    iframe.src = '${window.location.origin}/booking';
    iframe.style.cssText = 'width:100%;height:720px;border:none;border-radius:16px;display:block';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', 'Réservation en ligne');
    iframe.setAttribute('allowtransparency', 'true');
    document.getElementById('tablo-booking').appendChild(iframe);
  })();
</script>`

export function WidgetDemoPage() {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')

  const handleCopy = () => {
    navigator.clipboard.writeText(SNIPPET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="pt-28 pb-24 bg-background min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Intégration widget
          </span>
          <h1 className="text-4xl font-serif font-bold mb-3">
            Réservation en ligne sur votre site
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Copiez le snippet ci-dessous et collez-le sur votre site existant (WordPress, Wix, Squarespace…).
            Le widget s'adapte automatiquement à la largeur de votre page.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="w-4 h-4" />
            Aperçu
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'code'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Code à copier
          </button>
        </div>

        {/* Preview tab */}
        {activeTab === 'preview' && (
          <div className="rounded-2xl border border-border overflow-hidden shadow-lg">
            {/* Fausse barre de navigateur */}
            <div className="bg-muted/60 border-b border-border px-4 py-2.5 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-background rounded-md px-3 py-1 text-xs text-muted-foreground border border-border">
                www.votre-restaurant.fr/reservation
              </div>
            </div>

            {/* Faux site client */}
            <div className="bg-white">
              {/* Faux header site client */}
              <div className="bg-stone-900 text-white px-8 py-4 flex items-center justify-between">
                <span className="font-serif text-xl font-bold">Mon Restaurant</span>
                <div className="hidden sm:flex gap-6 text-sm text-white/70">
                  <span>Accueil</span>
                  <span>La Carte</span>
                  <span className="text-white font-medium underline underline-offset-4">Réserver</span>
                  <span>Contact</span>
                </div>
              </div>

              {/* Titre de section */}
              <div className="px-8 pt-10 pb-6 text-center">
                <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">
                  Réservez votre table
                </h2>
                <p className="text-stone-500 text-sm">
                  Disponible 7j/7 — Réservation confirmée instantanément
                </p>
              </div>

              {/* Widget iframe */}
              <div className="px-4 sm:px-8 pb-10">
                <iframe
                  src={BOOKING_URL}
                  width="100%"
                  height="720"
                  style={{ border: 'none', borderRadius: '16px', display: 'block' }}
                  loading="lazy"
                  title="Réservation en ligne"
                />
              </div>

              {/* Faux footer */}
              <div className="bg-stone-900 text-white/40 px-8 py-5 text-xs text-center">
                © 2025 Mon Restaurant — Tous droits réservés
              </div>
            </div>
          </div>
        )}

        {/* Code tab */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="flex items-center justify-between bg-muted/60 border-b border-border px-5 py-3">
                <span className="text-sm font-medium text-muted-foreground">HTML — à coller sur votre site</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full h-8 gap-2 text-xs"
                  onClick={handleCopy}
                >
                  {copied
                    ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copié !</>
                    : <><Copy className="w-3.5 h-3.5" /> Copier</>
                  }
                </Button>
              </div>
              <pre className="p-6 text-sm overflow-x-auto bg-stone-950 text-emerald-300 leading-relaxed">
                <code>{SNIPPET}</code>
              </pre>
            </div>

            {/* Instructions */}
            <div className="rounded-2xl border border-border p-6 space-y-4">
              <h3 className="font-semibold text-base">Comment l'intégrer ?</h3>
              <ol className="space-y-3 text-sm text-muted-foreground list-none">
                {[
                  { n: '1', text: 'Copiez le snippet ci-dessus en cliquant sur "Copier".' },
                  { n: '2', text: 'Sur WordPress : allez dans la page de votre choix → ajoutez un bloc "HTML personnalisé" → collez le code.' },
                  { n: '3', text: 'Sur Wix : Ajoutez un élément "Embed HTML" → collez le code dans l\'éditeur.' },
                  { n: '4', text: 'Sur Squarespace : Ajoutez un bloc "Code" → collez le snippet.' },
                  { n: '5', text: 'Le widget s\'adapte automatiquement à la largeur de votre page. Vous pouvez ajuster la hauteur (720px par défaut) selon votre mise en page.' },
                ].map(({ n, text }) => (
                  <li key={n} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {n}
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Note technique */}
            <div className="rounded-2xl bg-muted/40 border border-border p-5 text-sm text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Note technique</p>
              <p>
                Le widget se connecte directement à votre compte Tablo. Toutes les réservations
                apparaissent en temps réel dans votre tableau de bord, avec les mêmes règles
                de disponibilité que sur votre site Tablo.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
