import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Menu, X, Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Suppress unused import warning — useNavigate kept for openWidget
const _nav = useNavigate

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useRouterState({ select: (s) => s.location })

  const isHome = location.pathname === '/'
  const useWhiteText = isHome && !scrolled

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/menu', label: 'La Carte' },
    { to: '/contact', label: 'Contact' },
  ]

  const openWidget = () => {
    const btn = document.querySelector<HTMLButtonElement>('[aria-label="Réserver une table"]')
    btn?.click()
  }

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-background/95 backdrop-blur-md py-3 border-b border-border shadow-elegant'
        : isHome
          ? 'bg-transparent py-5'
          : 'bg-background/95 backdrop-blur-md py-4 border-b border-border'
    )}>
      <div className="container mx-auto px-4 flex items-center justify-between">

        {/* Logo textuel — style vintage doré */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full border border-primary/60 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-all">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 2L14.4 8.4L21 9.3L16.5 13.7L17.7 20.3L12 17.3L6.3 20.3L7.5 13.7L3 9.3L9.6 8.4L12 2Z"/>
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className={cn(
              "text-[10px] font-medium uppercase tracking-[0.25em] transition-colors",
              useWhiteText ? "text-white/70" : "text-muted-foreground"
            )}>
              Au
            </span>
            <span className={cn(
              "text-xl font-serif font-bold tracking-tight transition-colors",
              useWhiteText ? "text-white" : "text-foreground"
            )}>
              Bout du <span className="text-primary">Monde</span>
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "text-sm font-medium transition-colors relative group",
                useWhiteText
                  ? "text-white/90 hover:text-white"
                  : "text-foreground hover:text-primary"
              )}
            >
              {link.label}
              <span className={cn(
                "absolute -bottom-1 left-0 w-0 h-px transition-all group-hover:w-full",
                useWhiteText ? "bg-white" : "bg-primary"
              )} />
            </Link>
          ))}
          <Button
            onClick={openWidget}
            className="rounded-full px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-elegant hover:scale-105 transition-all font-medium"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Réserver
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          className={cn("md:hidden p-2 transition-colors", useWhiteText ? "text-white" : "text-foreground")}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <div className={cn(
        'md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border transition-all duration-300 overflow-hidden',
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className="text-lg font-medium text-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Button
            onClick={() => { setIsOpen(false); openWidget() }}
            className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Réserver une table
          </Button>
        </div>
      </div>
    </nav>
  )
}
