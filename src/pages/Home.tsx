import { Button } from '@/components/ui/button'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, Sparkles, MapPin, Coffee } from 'lucide-react'
import { useEffect, useRef } from 'react'

const openWidget = () =>
  document.querySelector<HTMLButtonElement>('[aria-label="Réserver une table"]')?.click()

export function HomePage() {
  const navigate = useNavigate()
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('animate-in') }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach((el) => observerRef.current?.observe(el))
    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <div className="flex flex-col w-full">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[12s] hover:scale-105"
          style={{ backgroundImage: 'url("/images/facade.jpg")' }}
        >
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Grain subtil */}
        <div className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />

        <div className="container relative z-10 px-4 text-center text-white">
          <div className="reveal opacity-0 translate-y-10 transition-all duration-700">

            {/* Ligne décorative */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-16 bg-primary/60" />
              <span className="text-[10px] uppercase tracking-[0.35em] text-primary font-medium">Cocktails · Brunch · Bistronomie</span>
              <div className="h-px w-16 bg-primary/60" />
            </div>

            <h1 className="text-6xl md:text-9xl font-serif font-bold mb-4 leading-[0.9] tracking-tight">
              Au Bout<br />
              <span className="text-primary italic">du Monde</span>
            </h1>

            <p className="text-base md:text-lg mt-8 mb-10 max-w-xl mx-auto font-light text-white/80 leading-relaxed tracking-wide">
              Bar à cocktails & restaurant bistronomique face au port.<br />
              Une adresse au bord de l'Atlantique, entre phare et horizon.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={openWidget}
                className="rounded-full px-10 h-14 text-base font-medium shadow-xl hover:scale-105 transition-transform bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Réserver une table
              </Button>
              <Button
                size="lg"
                onClick={() => navigate({ to: '/menu' })}
                variant="outline"
                className="rounded-full px-10 h-14 text-base font-medium border-white/40 text-white hover:bg-white/10 hover:border-white transition-all"
              >
                Découvrir la carte
              </Button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-50">
          <span className="text-[9px] uppercase tracking-[0.25em] text-white/70">Descendre</span>
          <ChevronRight className="rotate-90 text-white/70 w-4 h-4" />
        </div>
      </section>

      {/* ── À Propos ─────────────────────────────────────────────────── */}
      <section id="about" className="py-28 bg-background">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

            <div className="reveal opacity-0 -translate-x-10 transition-all duration-700">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px w-12 bg-primary" />
                <span className="text-xs font-medium uppercase tracking-[0.3em] text-primary">Notre Adresse</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8 leading-tight text-foreground">
                L'endroit où le monde<br />
                <span className="italic text-primary">s'arrête au bord de l'eau.</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Installé face au port de Saint-Gilles-Croix-de-Vie, Au Bout du Monde est bien plus qu'un restaurant — c'est un moment hors du temps, entre cocktails créatifs, brunch généreux et cuisine bistronomique.
              </p>
              <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                Nos pandas veillent sur la terrasse, le phare guide les marins, et nos barmen composent vos rêves en verre. Bienvenue au bout du monde.
              </p>
              <button
                onClick={() => navigate({ to: '/contact' })}
                className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium group transition-colors text-sm uppercase tracking-widest"
              >
                Nous trouver
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <div className="reveal opacity-0 translate-x-10 transition-all duration-700 delay-200 relative">
              {/* Photo principale */}
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img
                  src="/images/terrasse.jpg"
                  alt="Terrasse vue phare"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Photo superposée */}
              <div className="absolute -bottom-8 -left-8 w-56 h-56 rounded-2xl overflow-hidden border-4 border-background shadow-2xl ring-1 ring-white/10 hidden md:block">
                <img
                  src="/images/apero.jpg"
                  alt="Apéritif en terrasse"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Badge */}
              <div className="absolute top-6 right-6 bg-primary text-primary-foreground rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest shadow-lg">
                Vue sur le Port
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 Piliers ────────────────────────────────────────────────── */}
      <section className="py-24 bg-card border-y border-border">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16 reveal opacity-0 translate-y-10 transition-all duration-700">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground">L'Expérience</h2>
            <div className="h-px w-20 bg-primary mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Sparkles className="w-7 h-7" />,
                title: "Cocktails Signature",
                desc: "Des créations uniques imaginées par nos barmen — spiritueux premium, fruits frais et associations surprenantes."
              },
              {
                icon: <Coffee className="w-7 h-7" />,
                title: "Brunch du Weekend",
                desc: "Œufs brouillés, avocado toast, granola maison, jus pressés… Le brunch comme on l'aime, face à l'océan."
              },
              {
                icon: <MapPin className="w-7 h-7" />,
                title: "Face au Port & au Phare",
                desc: "Une terrasse ouverte sur le port, à deux pas du phare de Saint-Gilles. Vue imprenable, été comme hiver."
              }
            ].map((item, i) => (
              <div key={i} className="reveal opacity-0 translate-y-10 transition-all duration-700 group p-8 glass rounded-2xl hover:ring-1 hover:ring-primary/30 transition-all">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  {item.icon}
                </div>
                <h3 className="text-xl font-serif font-bold mb-3 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Galerie ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-background">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-14 reveal opacity-0 translate-y-10 transition-all duration-700">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-3 text-foreground">Notre Univers</h2>
            <p className="text-muted-foreground">Brunch, cocktails, terrasse & instants de vie</p>
          </div>

          {/* Grille asymétrique */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Grande image à gauche */}
            <div className="col-span-2 row-span-2 reveal opacity-0 translate-y-10 transition-all duration-700">
              <div className="h-full min-h-[320px] rounded-2xl overflow-hidden group">
                <img src="/images/brunch.jpg" alt="Brunch" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>
            {/* Cocktail 1 */}
            <div className="reveal opacity-0 translate-y-10 transition-all duration-700 delay-75">
              <div className="aspect-square rounded-2xl overflow-hidden group">
                <img src="/images/cocktail1.jpg" alt="Cocktail signature" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>
            {/* Cocktail 2 */}
            <div className="reveal opacity-0 translate-y-10 transition-all duration-700 delay-100">
              <div className="aspect-square rounded-2xl overflow-hidden group">
                <img src="/images/cocktail2.jpg" alt="Gin cocktail" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>
            {/* Plat 1 */}
            <div className="reveal opacity-0 translate-y-10 transition-all duration-700 delay-150">
              <div className="aspect-square rounded-2xl overflow-hidden group">
                <img src="/images/plat_tartare.jpg" alt="Tartare" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>
            {/* Plat 2 */}
            <div className="reveal opacity-0 translate-y-10 transition-all duration-700 delay-200">
              <div className="aspect-square rounded-2xl overflow-hidden group">
                <img src="/images/plat_pasta.jpg" alt="Pâtes fraîches" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>
          </div>

          {/* Rangée du bas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {[
              { src: '/images/plat_poisson.jpg', alt: 'Poisson grillé' },
              { src: '/images/port.jpg',         alt: 'Bar au port' },
              { src: '/images/plat_curry.jpg',   alt: 'Curry maison' },
            ].map((img, i) => (
              <div key={i} className={`reveal opacity-0 translate-y-10 transition-all duration-700 delay-[${i*75}ms]`}>
                <div className="aspect-video rounded-2xl overflow-hidden group">
                  <img src={img.src} alt={img.alt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden">
        {/* Fond image avec overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("/images/facade.jpg")' }}
        >
          <div className="absolute inset-0 bg-black/75" />
        </div>

        <div className="container px-4 mx-auto text-center relative z-10">
          <div className="reveal opacity-0 translate-y-10 transition-all duration-700 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-12 bg-primary/60" />
              <span className="text-[10px] uppercase tracking-[0.35em] text-primary">Réservez votre table</span>
              <div className="h-px w-12 bg-primary/60" />
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-white">
              Une soirée <span className="text-primary italic">inoubliable</span><br />vous attend.
            </h2>
            <p className="text-white/70 text-lg mb-10 leading-relaxed">
              Cocktails créatifs, cuisine bistronomique et coucher de soleil sur le port.<br />
              Réservez maintenant — les places en terrasse partent vite.
            </p>
            <Button
              size="lg"
              onClick={openWidget}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-14 h-16 text-lg font-medium shadow-2xl hover:scale-105 transition-all"
            >
              Réserver en ligne
            </Button>
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .reveal { transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .animate-in { opacity: 1 !important; transform: translate(0) scale(1) !important; }
      `}} />
    </div>
  )
}
