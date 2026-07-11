"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { Home, Menu, X, User, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"

function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}

export function Navbar() {
  const { user, logout, isAuthenticated, isHost } = useAuthStore()
  const [open, setOpen] = useState(false)
  const hydrated = useHydrated()
  const pathname = usePathname()
  const router   = useRouter()

  const handleLogout = async () => {
    await logout()
    toast.success("Logged out")
    router.push("/")
  }

  const link = (href: string, label: string) => (
    <Link href={href} className={`btn-ghost text-sm ${pathname === href ? "text-brand-600 bg-brand-50" : ""}`}>
      {label}
    </Link>
  )

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">

        <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl text-brand-700">
          <Home className="w-5 h-5 text-brand-500" />
          StayHub
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {link("/search", "Explore")}

          {!hydrated ? (
            <div className="flex items-center gap-2 ml-1">
              <div className="h-8 w-16 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-8 w-20 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          ) : isAuthenticated() ? (
            <>
              {isHost() && (
                <>
                  {link("/host/dashboard", "Dashboard")}
                  {link("/host/bookings", "Bookings")}
                  {link("/host/calendar", "Calendar")}
                  {link("/host/analytics", "Analytics")}
                  {link("/chat", "Messages")}
                </>
              )}
              {!isHost() && (
                <>
                  {link("/trips", "My Trips")}
                  {link("/saved", "Saved")}
                </>
              )}
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <Link href="/profile" className="flex items-center gap-2 btn-ghost text-sm">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-brand-200" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-brand-600" />
                  </div>
                )}
                <span>{user?.first_name}</span>
              </Link>
              <button onClick={handleLogout} className="btn-ghost text-sm text-gray-400 hover:text-red-500">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login"    className="btn-ghost text-sm">Log in</Link>
              <Link href="/register" className="btn-primary text-sm">Sign up</Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden btn-ghost p-2">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1">
          <Link href="/search" className="block btn-ghost w-full text-left" onClick={() => setOpen(false)}>
            Explore
          </Link>

          {!hydrated ? null : isAuthenticated() ? (
            <>
              {isHost() && (
                <>
                  <Link href="/host/dashboard"      className="block btn-ghost w-full text-left" onClick={() => setOpen(false)}>Dashboard</Link>
                  <Link href="/host/bookings"       className="block btn-ghost w-full text-left" onClick={() => setOpen(false)}>Bookings</Link>
                  <Link href="/host/calendar"       className="block btn-ghost w-full text-left" onClick={() => setOpen(false)}>Calendar</Link>
                  <Link href="/host/analytics"      className="block btn-ghost w-full text-left" onClick={() => setOpen(false)}>Analytics</Link>
                  <Link href="/host/properties/new" className="block btn-ghost w-full text-left" onClick={() => setOpen(false)}>Add listing</Link>
                </>
              )}
              {!isHost() && (
                <>
                  <Link href="/trips" className="block btn-ghost w-full text-left" onClick={() => setOpen(false)}>My Trips</Link>
                  <Link href="/saved" className="block btn-ghost w-full text-left" onClick={() => setOpen(false)}>Saved</Link>
                </>
              )}
              <Link href="/profile" className="block btn-ghost w-full text-left" onClick={() => setOpen(false)}>Profile</Link>
              <button onClick={handleLogout} className="block btn-ghost w-full text-left text-red-500">Log out</button>
            </>
          ) : (
            <>
              <Link href="/login"    className="block btn-ghost w-full text-left" onClick={() => setOpen(false)}>Log in</Link>
              <Link href="/register" className="block btn-primary w-full text-center mt-2" onClick={() => setOpen(false)}>Sign up</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
