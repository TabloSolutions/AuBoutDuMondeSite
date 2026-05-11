import { Link } from '@tanstack/react-router'
import { Phone, MapPin, Facebook, Instagram } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-card pt-20 pb-10 border-t border-border">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

        {/* Identité */}
        <div className="flex flex-col gap-6">
          <Link to="/" className="flex items-center gap-3 group w-fit">
            <div className="w-12 h-12 rounded-full border border-primary/60 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-all">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M12 2L14.4 8.4L21 9.3L16.5 13.7L17.7 20.3L12 17.3L6.3 20.3L7.5 13.7L3 9.3L9.6 8.4L12 2Z"/>
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-muted-foreground">Au</span>
              <span className="text-xl font-serif font-bold text-foreground">
                Bout du <span className="text-primary">Monde</span>
              </span>
            </div>
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            Bar à cocktails & restaurant bistronomique face au port. Une adresse unique au bord de l'Atlantique.
          </p>
          <div className="flex items-center gap-3">
            <a href="#" className="p-2 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="#" className="p-2 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
              <Instagram className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Liens */}
        <div className="flex flex-col gap-6">
          <h4 className="font-serif text-lg font-bold text-foreground">Liens Rapides</h4>
          <nav className="flex flex-col gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Accueil</Link>
            <Link to="/menu" className="text-sm text-muted-foreground hover:text-primary transition-colors">La Carte</Link>
            <Link to="/booking" className="text-sm text-muted-foreground hover:text-primary transition-colors">Réservations</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link>
          </nav>
        </div>

        {/* Horaires */}
        <div className="flex flex-col gap-6">
          <h4 className="font-serif text-lg font-bold text-foreground">Horaires</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {[
              { jour: 'Lundi',    heure: '09:30 – 00:00' },
              { jour: 'Mardi',    heure: '09:30 – 00:00' },
              { jour: 'Mercredi', heure: '09:30 – 00:00' },
              { jour: 'Jeudi',    heure: '09:30 – 00:00' },
              { jour: 'Vendredi', heure: '09:30 – 00:00' },
              { jour: 'Samedi',   heure: '09:30 – 00:00' },
              { jour: 'Dimanche', heure: '09:30 – 00:00' },
            ].map(({ jour, heure }) => (
              <div key={jour} className="flex justify-between border-b border-border/40 pb-1">
                <span className={heure === 'Fermé' ? 'opacity-40' : ''}>{jour}</span>
                <span className={heure === 'Fermé' ? 'opacity-40 italic' : 'text-primary/80 font-medium'}>{heure}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-6">
          <h4 className="font-serif text-lg font-bold text-foreground">Nous Trouver</h4>
          <div className="flex flex-col gap-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span>Au Bout du Monde,<br />Saint-Gilles-Croix-de-Vie, Vendée</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-primary shrink-0" />
              <span>02 XX XX XX XX</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
        <p>© {currentYear} Au Bout du Monde. Tous droits réservés.</p>
        <div className="flex gap-6">
          <Link to="/mentions-legales" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })} className="hover:text-primary transition-colors">Mentions légales</Link>
          <a href="https://app.tablo.fr" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Espace Pro</a>
        </div>
      </div>
    </footer>
  )
}
