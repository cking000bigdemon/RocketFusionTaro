import { create } from 'zustand'

export const useStore = create((set, get) => ({
  user: null,
  loading: false,
  
  fetchUser: async () => {
    set({ loading: true })
    try {
      const response = await fetch('/api/user')
      const user = await response.json()
      set({ user, loading: false })
    } catch (error) {
      console.error('Failed to fetch user:', error)
      set({ loading: false })
    }
  },
  
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null })
}))