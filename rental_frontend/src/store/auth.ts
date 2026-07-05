import { create } from "zustand"
import { persist } from "zustand/middleware"
import { User } from "@/types"
import { authApi } from "@/lib/api"

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean

  login:  (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  setUser: (user: User) => void
  isAuthenticated: () => boolean
  isHost: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,

      isAuthenticated: () => !!get().accessToken,
      isHost: () => get().user?.role === "host",

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await authApi.login({ email, password })
          localStorage.setItem("access_token",  data.access)
          localStorage.setItem("refresh_token", data.refresh)
          set({
            user:         data.user,
            accessToken:  data.access,
            refreshToken: data.refresh,
            isLoading:    false,
          })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        const refresh = get().refreshToken
        if (refresh) {
          try { await authApi.logout(refresh) } catch {}
        }
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        set({ user: null, accessToken: null, refreshToken: null })
      },

      fetchMe: async () => {
        try {
          const { data } = await authApi.me()
          set({ user: data })
        } catch {}
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
