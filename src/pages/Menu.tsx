import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/contexts/RestaurantContext'
import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Utensils, ChefHat, Coffee, Wine, Sparkles, GlassWater, Star, Beef } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Category { id: string; name: string; order_index: number; parent_id: string | null }
interface MenuItem  { id: string; category_id: string; name: string; description: string; price: number; image_url: string; is_available: boolean }

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=80&fit=crop`

const STATIC_CATEGORIES: Category[] = [
  { id:'brunch',          name:'Brunch',      order_index:0, parent_id: null },
  { id:'parent_carte',   name:'La Carte',    order_index:1, parent_id: null },
  { id:'parent_cocktails',name:'Cocktails',  order_index:2, parent_id: null },
  { id:'parent_boissons', name:'Boissons',   order_index:3, parent_id: null },

  // Sous-catégories La Carte
  { id:'entrees',   name:'Entrées',          order_index:11, parent_id:'parent_carte' },
  { id:'plats',     name:'Plats',            order_index:12, parent_id:'parent_carte' },
  { id:'desserts',  name:'Desserts',         order_index:13, parent_id:'parent_carte' },

  // Sous-catégories Cocktails
  { id:'signature', name:'Signature',        order_index:21, parent_id:'parent_cocktails' },
  { id:'classics',  name:'Classiques',       order_index:22, parent_id:'parent_cocktails' },
  { id:'sans_alcool',name:'Sans Alcool',     order_index:23, parent_id:'parent_cocktails' },

  // Sous-catégories Boissons
  { id:'softs',     name:'Softs & Cafés',    order_index:31, parent_id:'parent_boissons' },
  { id:'vins',      name:'Vins',             order_index:32, parent_id:'parent_boissons' },
  { id:'bieres',    name:'Bières',           order_index:33, parent_id:'parent_boissons' },
]

const STATIC_ITEMS: MenuItem[] = [
  // ── Brunch ──
  { id:'b1', category_id:'brunch', is_available:true,
    name:'Brunch Complet',
    description:"Le plateau signature :\nŒufs brouillés · Avocado toast · Granola maison yaourt & fruits rouges · Jus d'orange pressé · Café ou thé\n\nServi le samedi et le dimanche de 10h à 14h30",
    price:24.00, image_url:U('1551183823-06d0cdd20-3b84a5d4') },
  { id:'b2', category_id:'brunch', is_available:true,
    name:'Avocado Toast Saumon',
    description:'Pain de campagne grillé, avocat crémeux, saumon fumé Label Rouge, câpres, aneth, œuf poché, citron',
    price:16.00, image_url:U('1547592166-23ac88fee07-a3c8aa70') },
  { id:'b3', category_id:'brunch', is_available:true,
    name:'Œufs Brouillés & Jambon',
    description:'Œufs fermiers brouillés à la crème, jambon de pays, toast artisanal, salade',
    price:13.00, image_url:U('1482049016688-2d3e1b311543') },
  { id:'b4', category_id:'brunch', is_available:true,
    name:'Granola Bowl',
    description:'Granola maison, yaourt grec, compotée de fruits rouges, miel, graines de chia',
    price:10.00, image_url:U('1547592180-85f173990554') },
  { id:'b5', category_id:'brunch', is_available:true,
    name:'Jus & Smoothies',
    description:'Orange pressée 5€ · Smoothie fruits rouges 6€ · Green detox (concombre, pomme, gingembre) 6€',
    price:5.00,  image_url:U('1543362906-acfc16c67564') },

  // ── Entrées ──
  { id:'e1', category_id:'entrees', is_available:true,
    name:'Tartare de Homard & Avocat',
    description:'Homard breton, avocat crémeux, toast grillé, vinaigrette agrumes, graines de sésame',
    price:18.00, image_url:U('1519984388953-d2406bc725e1') },
  { id:'e2', category_id:'entrees', is_available:true,
    name:'Velouté de Courgette',
    description:'Courgettes rôties, crème de chèvre, pignons de pin, huile de basilic',
    price:10.00, image_url:U('1547592166-23ac88fee07-a3c8aa70') },
  { id:'e3', category_id:'entrees', is_available:true,
    name:'Tapenade & Houmous Maison',
    description:'Assortiment maison — tapenades olive/tomates séchées, houmous au piment fumé, pain artisanal',
    price:12.00, image_url:U('1585325701-3b7c9ddc1e0e') },

  // ── Plats ──
  { id:'p1', category_id:'plats', is_available:true,
    name:'Pappardelles Courgettes & Citron',
    description:'Pâtes fraîches maison, courgettes sautées à l\'huile d\'olive, zeste de citron confit, parmesan, herbes',
    price:18.00, image_url:U('1565299585323-38d6b0865b47') },
  { id:'p2', category_id:'plats', is_available:true,
    name:'Filet de Poisson du Jour',
    description:'Selon arrivage du matin — hummus maison, légumes croquants, jus de cuisson au vin blanc',
    price:22.00, image_url:U('1519708227418-c8fd9a32b7a2') },
  { id:'p3', category_id:'plats', is_available:true,
    name:'Curry de Poulet Maison',
    description:'Filets de poulet fermier, sauce curry coconut lait de coco, riz basmati & lentilles corail, coriandre',
    price:19.00, image_url:U('1596040033229-a9821ebd058d') },
  { id:'p4', category_id:'plats', is_available:true,
    name:'Burger Au Bout du Monde',
    description:'Pain brioché, steak haché charolais, cheddar affiné, oignons caramélisés, sauce maison, frites',
    price:20.00, image_url:U('1568901346375-23c9450c58cd') },

  // ── Desserts ──
  { id:'d1', category_id:'desserts', is_available:true,
    name:'Mousse Chocolat Noir 70%',
    description:'Chocolat grand cru, tuile croustillante, fleur de sel, crème fouettée légère',
    price:8.00,  image_url:U('1542124948-dc391252a940') },
  { id:'d2', category_id:'desserts', is_available:true,
    name:'Tarte Fine Fruits de Saison',
    description:'Pâte feuilletée croustillante, crème d\'amande, fruits de saison, glace vanille',
    price:9.00,  image_url:U('1568571780765-9276ac8b75a2') },

  // ── Cocktails Signature ──
  { id:'cs1', category_id:'signature', is_available:true,
    name:'Le Bout du Monde',
    description:'Vodka premium, litchi, eau de rose, citron vert, mousse de fruits rouges — notre création signature',
    price:13.00, image_url:U('1551024601-bec78aea704b') },
  { id:'cs2', category_id:'signature', is_available:true,
    name:'Acrobate Verde',
    description:'Gin L\'Acrobate bio, liqueur melon, citron vert, concombre, mousse de basilic',
    price:13.00, image_url:U('1551024601-bec78aea704b') },
  { id:'cs3', category_id:'signature', is_available:true,
    name:'Sunset Vendée',
    description:'Rhum arrangé passion-mangue, gingembre, lime, sirop d\'hibiscus, écume de coco',
    price:12.00, image_url:U('1551024601-bec78aea704b') },
  { id:'cs4', category_id:'signature', is_available:true,
    name:'Panda Spritz',
    description:'Aperol, Prosecco, yuzu, feuilles de menthe, sirop de groseille, rondelle d\'orange',
    price:11.00, image_url:U('1551024601-bec78aea704b') },

  // ── Cocktails Classiques ──
  { id:'cc1', category_id:'classics', is_available:true,
    name:'Mojito',         description:'Rhum blanc, menthe fraîche, citron vert, sucre de canne, eau gazeuse',                    price:11.00, image_url:U('1551024601-bec78aea704b') },
  { id:'cc2', category_id:'classics', is_available:true,
    name:'Negroni',        description:'Gin, Campari, Vermouth rosso — servi sur glaçon, zeste d\'orange',                         price:11.00, image_url:U('1558618047-3c8c76ca7d56') },
  { id:'cc3', category_id:'classics', is_available:true,
    name:'Espresso Martini',description:'Vodka, café espresso, Kahlúa, sirop de sucre — servi très frais',                        price:12.00, image_url:U('1509042239860-f550ce710b93') },
  { id:'cc4', category_id:'classics', is_available:true,
    name:'Gin Tonic Maison',description:'Gin sélection du bar, tonic premium, garniture fraîche selon le gin choisi',             price:10.00, image_url:U('1551024601-bec78aea704b') },

  // ── Sans Alcool ──
  { id:'sa1', category_id:'sans_alcool', is_available:true,
    name:'Virgin Sunset',  description:'Jus de mangue, grenadine, ginger beer, citron vert, menthe',                              price:8.00,  image_url:U('1543362906-acfc16c67564') },
  { id:'sa2', category_id:'sans_alcool', is_available:true,
    name:'Green Detox',    description:'Concombre, pomme verte, gingembre, citron, eau pétillante',                                price:7.00,  image_url:U('1543362906-acfc16c67564') },

  // ── Softs & Cafés ──
  { id:'so1', category_id:'softs', is_available:true, name:'Café Expresso',     description:'Simple ou double',                                  price:2.50, image_url:U('1509042239860-f550ce710b93') },
  { id:'so2', category_id:'softs', is_available:true, name:'Cappuccino / Latte',description:'Mousse de lait maison',                             price:4.00, image_url:U('1509042239860-f550ce710b93') },
  { id:'so3', category_id:'softs', is_available:true, name:'Sodas & Eaux',      description:'Coca 3,60€ · Perrier 3,50€ · Eau 50cl 3,00€',     price:3.00, image_url:U('1548839140-29a749e1cf4d') },
  { id:'so4', category_id:'softs', is_available:true, name:'Jus Pressés',       description:'Orange, pamplemousse ou citron — 25cl',             price:5.00, image_url:U('1543362906-acfc16c67564') },

  // ── Vins ──
  { id:'v1', category_id:'vins', is_available:true, name:'Muscadet Sèvre et Maine',   description:'Blanc sec · 12cl 4€ — 75cl 20€',      price:4.00,  image_url:U('1474722883778-792e7990302f') },
  { id:'v2', category_id:'vins', is_available:true, name:'Côtes de Provence Rosé',    description:'Rosé · 12cl 4,50€ — 75cl 22€',        price:4.50,  image_url:U('1558618047-3c8c76ca7d56') },
  { id:'v3', category_id:'vins', is_available:true, name:'Fief Vendéen Rouge',        description:'Rouge · 12cl 4€ — 75cl 19€',          price:4.00,  image_url:U('1510812431401-41d2bd2722f3') },
  { id:'v4', category_id:'vins', is_available:true, name:'Champagne Brut',            description:'Coupe 10€ — Bouteille 75cl 48€',       price:10.00, image_url:U('1560169897-fc0cdbdfa4d5') },

  // ── Bières ──
  { id:'bi1', category_id:'bieres', is_available:true, name:'Bière Pression',     description:'Blonde 5° — 25cl 3,50€ / 50cl 6€',           price:3.50, image_url:U('1558618666-fcd25c85cd64') },
  { id:'bi2', category_id:'bieres', is_available:true, name:'Bières Artisanales', description:'Sélection locale — 33cl 6,50€',              price:6.50, image_url:U('1535958601776-8b60de820de4') },
  { id:'bi3', category_id:'bieres', is_available:true, name:'Sans Alcool',        description:'Bière artisanale sans alcool — 33cl 5,50€',   price:5.50, image_url:U('1535958601776-8b60de820de4') },
]

function getMainTabIcon(name: string): React.ReactNode {
  const n = name.toLowerCase()
  if (n.includes('brunch'))    return <Coffee className="w-4 h-4" />
  if (n.includes('carte'))     return <Utensils className="w-4 h-4" />
  if (n.includes('cocktail'))  return <Sparkles className="w-4 h-4" />
  if (n.includes('boisson'))   return <GlassWater className="w-4 h-4" />
  return <ChefHat className="w-4 h-4" />
}

interface SubConfig { icon: React.ReactNode; badgeClass: string; cardRingClass: string; tabActiveClass: string; note: string | null }

function getSubConfig(name: string): SubConfig {
  const n = name.toLowerCase()
  if (n.includes('entrée'))    return { icon:<Star className="w-4 h-4"/>,        badgeClass:'bg-primary text-primary-foreground',          cardRingClass:'ring-1 ring-primary/20',     tabActiveClass:'',                                    note:null }
  if (n.includes('plat'))      return { icon:<Beef className="w-4 h-4"/>,        badgeClass:'bg-amber-700 text-white',                     cardRingClass:'ring-1 ring-amber-600/20',   tabActiveClass:'!bg-amber-700 !text-white',            note:null }
  if (n.includes('dessert'))   return { icon:<Star className="w-4 h-4"/>,        badgeClass:'bg-rose-600 text-white',                      cardRingClass:'ring-1 ring-rose-400/20',    tabActiveClass:'!bg-rose-600 !text-white',             note:null }
  if (n.includes('signature')) return { icon:<Sparkles className="w-4 h-4"/>,   badgeClass:'bg-primary text-primary-foreground',          cardRingClass:'ring-1 ring-primary/30',     tabActiveClass:'',                                    note:'Créations exclusives de nos barmen' }
  if (n.includes('classique')) return { icon:<GlassWater className="w-4 h-4"/>, badgeClass:'bg-zinc-700 text-white',                      cardRingClass:'ring-1 ring-white/10',       tabActiveClass:'!bg-zinc-700 !text-white',             note:null }
  if (n.includes('sans'))      return { icon:<GlassWater className="w-4 h-4"/>, badgeClass:'bg-emerald-600 text-white',                   cardRingClass:'ring-1 ring-emerald-400/20', tabActiveClass:'!bg-emerald-600 !text-white',          note:'Toute la créativité, sans alcool' }
  if (n.includes('soft'))      return { icon:<Coffee className="w-4 h-4"/>,      badgeClass:'bg-amber-800 text-white',                     cardRingClass:'ring-1 ring-amber-700/20',   tabActiveClass:'!bg-amber-800 !text-white',            note:null }
  if (n.includes('vin'))       return { icon:<Wine className="w-4 h-4"/>,        badgeClass:'bg-purple-700 text-white',                    cardRingClass:'ring-1 ring-purple-500/20',  tabActiveClass:'!bg-purple-700 !text-white',           note:'Prix par verre 12cl ou bouteille 75cl' }
  if (n.includes('bière'))     return { icon:<GlassWater className="w-4 h-4"/>, badgeClass:'bg-amber-600 text-white',                     cardRingClass:'ring-1 ring-amber-400/20',   tabActiveClass:'!bg-amber-600 !text-white',            note:null }
  return { icon:<ChefHat className="w-4 h-4"/>, badgeClass:'bg-primary text-primary-foreground', cardRingClass:'', tabActiveClass:'', note:null }
}

export function MenuPage() {
  const [activeMain, setActiveMain] = useState<string>('')
  const [activeSub,  setActiveSub]  = useState<string | null>(null)
  const { restaurantId } = useRestaurant()

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('menu_categories').select('*').eq('restaurant_id', restaurantId).order('order_index', { ascending: true })
      if (error) throw error
      return (data ?? []) as Category[]
    },
    enabled: !!restaurantId,
  })

  const { data: menuItems } = useQuery({
    queryKey: ['menuItems', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).eq('is_available', true).order('order_index', { ascending: true })
      if (error) throw error
      return (data ?? []) as MenuItem[]
    },
    enabled: !!restaurantId,
  })

  const effectiveCategories = categoriesRaw?.length ? categoriesRaw : STATIC_CATEGORIES
  const effectiveItems      = menuItems?.length      ? menuItems     : STATIC_ITEMS

  const parentCategories = useMemo(
    () => effectiveCategories.filter(c => !c.parent_id).sort((a, b) => a.order_index - b.order_index),
    [effectiveCategories]
  )

  useEffect(() => {
    if (parentCategories.length > 0 && (!activeMain || !parentCategories.find(c => c.id === activeMain))) {
      setActiveMain(parentCategories[0].id)
    }
  }, [parentCategories.map(c => c.id).join(',')])

  const activeMainCat = parentCategories.find(c => c.id === activeMain) ?? parentCategories[0]

  const subCats = useMemo(
    () => effectiveCategories.filter(c => c.parent_id === activeMainCat?.id).sort((a, b) => a.order_index - b.order_index),
    [activeMainCat?.id, effectiveCategories]
  )
  const hasSubs = subCats.length > 0

  useEffect(() => {
    if (hasSubs && subCats.length > 0) {
      if (!subCats.some(c => c.id === activeSub)) setActiveSub(subCats[0].id)
    } else {
      setActiveSub(null)
    }
  }, [activeMain, subCats.map(c => c.id).join(',')])

  const activeConfig = useMemo<SubConfig | null>(() => {
    if (hasSubs && activeSub) {
      const cat = effectiveCategories.find(c => c.id === activeSub)
      return cat ? getSubConfig(cat.name) : null
    }
    return null
  }, [activeMain, activeSub, effectiveCategories, hasSubs])

  const filteredItems = useMemo(() => {
    if (!activeMainCat) return []
    if (hasSubs && activeSub) return effectiveItems.filter(item => item.category_id === activeSub)
    if (hasSubs) return effectiveItems.filter(item => subCats.some(c => c.id === item.category_id))
    return effectiveItems.filter(item => item.category_id === activeMainCat.id)
  }, [activeMain, activeSub, effectiveItems, subCats, hasSubs, activeMainCat])

  return (
    <div className="pt-32 pb-24 bg-background min-h-screen">
      <div className="container px-4 mx-auto">

        <div className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-12 bg-primary/50" />
            <span className="text-xs uppercase tracking-[0.3em] text-primary font-medium">Bar · Restaurant</span>
            <div className="h-px w-12 bg-primary/50" />
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 text-foreground">La Carte</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Brunch du weekend, cocktails signature, bistronomie créative — une carte qui change au fil des saisons.
          </p>
        </div>

        {/* Onglets principaux */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6 animate-fade-in">
          {parentCategories.map(tab => (
            <Button key={tab.id}
              variant={activeMain === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveMain(tab.id)}
              className={cn(
                'rounded-full px-7 h-12 text-sm font-medium transition-all gap-2',
                activeMain === tab.id
                  ? 'bg-primary text-primary-foreground shadow-elegant scale-105'
                  : 'border-border text-foreground hover:border-primary hover:text-primary'
              )}>
              {getMainTabIcon(tab.name)}{tab.name}
            </Button>
          ))}
        </div>

        {/* Sous-onglets */}
        {hasSubs && subCats.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6 animate-fade-in">
            {subCats.map(cat => {
              const cfg = getSubConfig(cat.name)
              const isActive = activeSub === cat.id
              return (
                <Button key={cat.id}
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() => setActiveSub(cat.id)}
                  className={cn(
                    'rounded-full px-5 h-9 text-xs font-medium transition-all gap-1.5',
                    isActive
                      ? cn('shadow-md scale-105', cfg.tabActiveClass || 'bg-primary text-primary-foreground')
                      : 'border-border text-muted-foreground hover:border-primary hover:text-primary opacity-80'
                  )}>
                  {cfg.icon}{cat.name}
                </Button>
              )
            })}
          </div>
        )}

        {activeConfig?.note && (
          <p className="text-center text-sm text-muted-foreground italic mb-10 animate-fade-in">
            {activeConfig.note}
          </p>
        )}

        {/* Grille */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <p className="text-muted-foreground italic">Catégorie temporairement indisponible.</p>
            </div>
          ) : filteredItems.map((item, i) => {
            const isMultiline = item.description.includes('\n')
            const badge = activeConfig?.badgeClass ?? 'bg-primary text-primary-foreground'
            const ring  = activeConfig?.cardRingClass ?? ''
            return (
              <div key={item.id}
                className={cn(
                  'group reveal-item flex flex-col gap-4 p-4 rounded-2xl glass border border-border/50 hover:border-primary/30 hover:scale-[1.02] transition-all',
                  ring,
                  isMultiline && 'md:col-span-2 lg:col-span-3'
                )}
                style={{ animationDelay: `${i * 60}ms` }}>
                {isMultiline ? (
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-full md:w-64 aspect-video rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                    </div>
                    <div className="flex flex-col justify-center gap-3 flex-1 py-2">
                      <h3 className="text-2xl font-serif font-bold text-foreground group-hover:text-primary transition-colors">{item.name}</h3>
                      <p className="text-muted-foreground text-sm whitespace-pre-line leading-relaxed">{item.description}</p>
                      {item.price > 0 && (
                        <span className={cn('self-start px-3 py-1 rounded-full text-sm font-bold mt-1', badge)}>
                          {item.price.toFixed(2).replace('.', ',')} €
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="aspect-video rounded-xl overflow-hidden relative bg-secondary">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                        : <div className="w-full h-full flex items-center justify-center"><Utensils className="w-10 h-10 opacity-20"/></div>}
                      {item.price > 0 && (
                        <div className={cn('absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-bold shadow-lg', badge)}>
                          {item.price.toFixed(2).replace('.', ',')} €
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 px-1 pb-1">
                      <h3 className="text-lg font-serif font-bold text-foreground group-hover:text-primary transition-colors">{item.name}</h3>
                      {item.description && <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">{item.description}</p>}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        .reveal-item{animation:slideUp .45s ease-out both}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      `}}/>
    </div>
  )
}
