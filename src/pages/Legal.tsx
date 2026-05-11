export function LegalPage() {
  return (
    <div className="pt-32 pb-24 bg-background">
      <div className="container px-4 mx-auto max-w-3xl">

        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">Mentions légales &amp; Confidentialité</h1>
          <p className="text-muted-foreground text-sm">Dernière mise à jour : [DATE À COMPLÉTER]</p>
        </div>

        <div className="space-y-12 animate-fade-in">

          {/* ── PARTIE 1 : MENTIONS LÉGALES ── */}
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6 pb-2 border-b">Mentions légales</h2>

            <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">

              <div>
                <h3 className="font-bold text-foreground mb-1">Éditeur du site</h3>
                <p>[Raison sociale]</p>
                <p>Forme juridique : [SARL / SAS / EI / autre]</p>
                <p>Capital social : [montant] €</p>
                <p>Siège social : Av. Maurice Perray, 85800 Saint-Gilles-Croix-de-Vie</p>
                <p>Numéro SIRET : [numéro]</p>
                <p>Numéro RCS : [ville] [numéro]</p>
                <p>Numéro TVA intracommunautaire : [numéro] <em>(si applicable)</em></p>
                <p className="mt-1">Téléphone : 02 51 93 54 68</p>
                <p>Directeur de la publication : [Nom Prénom]</p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-1">Hébergement</h3>
                <p>Ce site est hébergé par <strong>Vercel Inc.</strong></p>
                <p>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com</p>
                <p className="mt-1">Les données sont stockées via <strong>Supabase</strong> (Supabase Inc., 970 Trestle Glen Rd, Oakland, CA 94610, États-Unis — supabase.com), prestataire de base de données.</p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-1">Propriété intellectuelle</h3>
                <p>L'ensemble du contenu de ce site (textes, photos, logos, graphismes) est la propriété exclusive de [Raison sociale] ou de ses partenaires. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.</p>
              </div>

            </div>
          </section>

          {/* ── PARTIE 2 : POLITIQUE DE CONFIDENTIALITÉ ── */}
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6 pb-2 border-b">Politique de confidentialité</h2>

            <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">

              <div>
                <h3 className="font-bold text-foreground mb-1">1. Responsable du traitement</h3>
                <p>[Raison sociale]</p>
                <p>Av. Maurice Perray, 85800 Saint-Gilles-Croix-de-Vie</p>
                <p>Téléphone : 02 51 93 54 68</p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-2">2. Données collectées et finalités</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-secondary/40">
                        <th className="text-left p-3 border border-border font-semibold text-foreground">Données</th>
                        <th className="text-left p-3 border border-border font-semibold text-foreground">Pourquoi</th>
                        <th className="text-left p-3 border border-border font-semibold text-foreground">Base légale</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border border-border">Nom, prénom, téléphone, email, date, nombre de couverts</td>
                        <td className="p-3 border border-border">Gestion des réservations</td>
                        <td className="p-3 border border-border">Exécution d'un contrat</td>
                      </tr>
                      <tr className="bg-secondary/20">
                        <td className="p-3 border border-border">Données de connexion employés (email, planning, documents RH)</td>
                        <td className="p-3 border border-border">Gestion interne du personnel</td>
                        <td className="p-3 border border-border">Intérêt légitime / obligation légale</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-3">Nous ne collectons aucune donnée de paiement. Aucune donnée n'est vendue ou transmise à des tiers à des fins commerciales.</p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-1">3. Durée de conservation</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong className="text-foreground">Réservations</strong> : 1 an à compter de la date de réservation</li>
                  <li><strong className="text-foreground">Données employés</strong> : durée légale applicable au droit du travail (en général 5 ans après la fin du contrat)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-1">4. Destinataires des données</h3>
                <p>Les données sont accessibles uniquement :</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Au responsable de l'établissement</li>
                  <li>Aux prestataires techniques (Supabase, Vercel) dans le cadre strict de l'hébergement, soumis à des contrats de confidentialité</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-1">5. Transfert hors UE</h3>
                <p>Supabase et Vercel sont des sociétés américaines. Les transferts sont encadrés par les clauses contractuelles types de la Commission européenne (CCT) conformément au RGPD.</p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-1">6. Vos droits</h3>
                <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li><strong className="text-foreground">Accès</strong> à vos données</li>
                  <li><strong className="text-foreground">Rectification</strong> de données inexactes</li>
                  <li><strong className="text-foreground">Suppression</strong> de vos données</li>
                  <li><strong className="text-foreground">Opposition</strong> au traitement</li>
                  <li><strong className="text-foreground">Portabilité</strong> de vos données</li>
                  <li><strong className="text-foreground">Limitation</strong> du traitement</li>
                </ul>
                <p className="mt-2">Pour exercer ces droits, contactez-nous par téléphone au <strong className="text-foreground">02 51 93 54 68</strong> ou par courrier à l'adresse du restaurant.</p>
                <p className="mt-1">Vous pouvez également introduire une réclamation auprès de la <strong className="text-foreground">CNIL</strong> : cnil.fr</p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-1">7. Cookies</h3>
                <p>Ce site utilise des cookies techniques strictement nécessaires au fonctionnement (session de connexion). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.</p>
              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
