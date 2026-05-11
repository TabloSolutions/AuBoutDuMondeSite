import { Phone, MapPin } from 'lucide-react'

export function ContactPage() {
  return (
    <div className="pt-32 pb-24 bg-background">
      <div className="container px-4 mx-auto max-w-4xl">

        {/* Titre */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6">Nous Trouver</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Pour toute question, soirée privée ou réservation de groupe, notre équipe est disponible par téléphone.
          </p>
        </div>

        {/* Cartes info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 animate-fade-in">
          <div className="flex gap-4 p-6 glass rounded-2xl shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest mb-1 text-muted-foreground">Adresse</h3>
              <p className="font-medium">Au Bout du Monde<br/>Saint-Gilles-Croix-de-Vie, Vendée</p>
            </div>
          </div>

          <div className="flex gap-4 p-6 glass rounded-2xl shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Phone className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest mb-1 text-muted-foreground">Téléphone</h3>
              <p className="font-medium">02 XX XX XX XX</p>
            </div>
          </div>
        </div>

        {/* CTA appel */}
        <div className="glass rounded-[2rem] p-10 md:p-14 shadow-elegant text-center mb-10 animate-fade-in delay-100">
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-semibold mb-3">Nous appeler</p>
          <p className="text-4xl md:text-5xl font-bold mb-2 tracking-widest tabular-nums">02 XX XX XX XX</p>
          <p className="text-muted-foreground mb-8">Du mardi au dimanche · Service midi & soir · Lundi fermé</p>
          <a
            href="tel:0251935468"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-10 py-4 rounded-full text-lg font-semibold shadow-elegant hover:opacity-90 transition-opacity"
          >
            <Phone className="w-5 h-5" />
            Appeler maintenant
          </a>
        </div>

        {/* Carte Google Maps */}
        <div className="aspect-video w-full rounded-[2rem] overflow-hidden shadow-elegant grayscale-[0.5] hover:grayscale-0 transition-all duration-700 animate-fade-in delay-200">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2736.2416945674604!2d-1.973339523625151!3d46.70096557112108!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4804f8f21e64e8b5%3A0x84e36eb24dc85013!2s42%20Rue%20de%20la%20Padrelle%2C%2085270%20Saint-Hilaire-de-Riez!5e0!3m2!1sfr!2sfr!4v1777907743666!5m2!1sfr!2sfr"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

      </div>
    </div>
  )
}
