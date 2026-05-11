import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface Restaurant {
  id: string
  slug: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  description: string | null
  logo_url: string | null
  primary_color: string | null
}

interface RestaurantContextValue {
  restaurantId: string | null
  restaurant: Restaurant | null
  isLoading: boolean
}

const RestaurantContext = createContext<RestaurantContextValue>({
  restaurantId: null,
  restaurant: null,
  isLoading: true,
})

interface RestaurantProviderProps {
  children: ReactNode
}

export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const slug = import.meta.env.VITE_RESTAURANT_SLUG
    if (!slug) {
      setIsLoading(false)
      return
    }

    supabase
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setResolvedId(data.id)
        } else {
          setIsLoading(false)
        }
      })
  }, [])

  useEffect(() => {
    if (!resolvedId) return

    supabase
      .from('restaurants')
      .select('*')
      .eq('id', resolvedId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setRestaurant(data as Restaurant)
        setIsLoading(false)
      })
  }, [resolvedId])

  return (
    <RestaurantContext.Provider value={{ restaurantId: resolvedId, restaurant, isLoading }}>
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  return useContext(RestaurantContext)
}
