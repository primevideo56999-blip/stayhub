// src/components/auth/AuthGuard.tsx
// Wrap any page that requires login with this component
// It waits for hydration before checking auth — prevents infinite redirect loop

"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { Loader2 } from "lucide-react"

interface Props {
  children: React.ReactNode
  redirectTo?: string   // where to send unauthenticated users (default: /login)
}

export function AuthGuard({ children, redirectTo = "/login" }: Props) {
  const { isAuthenticated } = useAuthStore()
  const router  = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Wait one tick for Zustand to rehydrate from localStorage
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready && !isAuthenticated()) {
      router.replace(redirectTo)
    }
  }, [ready, isAuthenticated, redirectTo, router])

  // Still hydrating — show spinner, don't redirect yet
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
      </div>
    )
  }

  // Not authenticated — show nothing while redirect happens
  if (!isAuthenticated()) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
