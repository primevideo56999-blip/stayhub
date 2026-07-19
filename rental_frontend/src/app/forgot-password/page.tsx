"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authApi } from "@/lib/api"
import toast from "react-hot-toast"
import { KeyRound, Loader2, ChevronLeft } from "lucide-react"

const CODE_LENGTH = 6

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep]         = useState<1 | 2 | 3>(1)
  const [email, setEmail]       = useState("")
  const [code, setCode]         = useState("")
  const [password, setPassword]   = useState("")
  const [password2, setPassword2] = useState("")
  const [loading, setLoading]   = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const sendCode = async () => {
    if (!email.trim()) { toast.error("Enter your email"); return }
    setLoading(true)
    try {
      await authApi.forgotPassword(email.trim())
      toast.success("If that account exists, a code was emailed")
      setStep(2)
      setCooldown(60)
      setTimeout(() => codeRef.current?.focus(), 50)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const submitReset = async () => {
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return }
    if (password !== password2) { toast.error("Passwords do not match"); return }
    setLoading(true)
    try {
      await authApi.resetPassword({ email: email.trim(), code: code.trim(), new_password: password })
      toast.success("Password reset! Sign in with your new password.")
      router.push("/login")
    } catch (e: any) {
      const errs = e?.response?.data
      if (errs?.detail) toast.error(errs.detail)
      else if (errs) Object.values(errs).flat().forEach((m: any) => toast.error(m))
      else toast.error("Reset failed — try again")
      // Wrong/expired code → let them re-enter it
      if (errs?.detail?.toLowerCase?.().includes("code")) setStep(2)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-7 h-7 text-brand-500" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 1 && "Enter your account email and we'll send a code"}
            {step === 2 && <>Enter the 6-digit code sent to <strong>{email}</strong></>}
            {step === 3 && "Choose a new password"}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
                type="email"
                className="input"
                placeholder="you@example.com"
                autoFocus
              />
            </div>
            <button onClick={sendCode} disabled={loading} className="btn-primary w-full">
              {loading ? "Sending…" : "Send code"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="label">Verification code</label>
              <input
                ref={codeRef}
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH)
                  setCode(v)
                  if (v.length === CODE_LENGTH) setStep(3)
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="input text-center text-xl font-bold tracking-[0.5em]"
                placeholder="••••••"
              />
            </div>
            <p className="text-center text-sm text-gray-500">
              Didn&apos;t get it?{" "}
              <button
                onClick={sendCode}
                disabled={loading || cooldown > 0}
                className="text-brand-600 font-medium hover:underline disabled:text-gray-300 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </p>
            <button onClick={() => setStep(1)} className="btn-ghost w-full text-sm flex items-center justify-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Different email
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="label">New password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="input"
                placeholder="Min. 8 characters"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitReset()}
                type="password"
                className="input"
                placeholder="••••••••"
              />
            </div>
            <button onClick={submitReset} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Resetting…" : "Reset password"}
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Remembered it?{" "}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
