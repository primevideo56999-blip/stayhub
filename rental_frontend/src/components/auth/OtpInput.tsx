"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { authApi } from "@/lib/api"

interface Props {
  purpose: "verify_account" | "change_phone"
  // Extra payload for verify (e.g. { phone } for change_phone)
  verifyExtra?: Record<string, string>
  onVerified: (user?: any) => void
  // Send a code automatically when the component mounts
  autoSend?: boolean
}

const LENGTH = 6

export function OtpInput({ purpose, verifyExtra, onVerified, autoSend = false }: Props) {
  const [digits, setDigits]     = useState<string[]>(Array(LENGTH).fill(""))
  const [verifying, setVerifying] = useState(false)
  const [sending, setSending]     = useState(false)
  const [cooldown, setCooldown]   = useState(0)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const sentOnceRef = useRef(false)

  const sendCode = useCallback(async () => {
    setSending(true)
    try {
      await authApi.otpSend({ purpose })
      toast.success("Code sent — check your email")
      setCooldown(60)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Could not send code")
    } finally {
      setSending(false)
    }
  }, [purpose])

  useEffect(() => {
    if (autoSend && !sentOnceRef.current) {
      sentOnceRef.current = true
      sendCode()
    }
  }, [autoSend, sendCode])

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const submit = useCallback(async (code: string) => {
    setVerifying(true)
    try {
      const res = await authApi.otpVerify({ purpose, code, ...verifyExtra })
      onVerified(res.data?.user)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Invalid code")
      setDigits(Array(LENGTH).fill(""))
      inputsRef.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }, [purpose, verifyExtra, onVerified])

  const setDigit = (i: number, val: string) => {
    // Support paste of the full code into any box
    const chars = val.replace(/\D/g, "")
    if (!chars) {
      setDigits((d) => { const n = [...d]; n[i] = ""; return n })
      return
    }
    const next = [...digits]
    for (let k = 0; k < chars.length && i + k < LENGTH; k++) next[i + k] = chars[k]
    setDigits(next)
    inputsRef.current[Math.min(i + chars.length, LENGTH - 1)]?.focus()
    if (next.every((c) => c !== "")) submit(next.join(""))
  }

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={LENGTH}
            disabled={verifying}
            className="w-11 sm:w-12 h-12 text-center text-lg font-bold border border-gray-200
                       rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400
                       focus:border-transparent disabled:opacity-50"
          />
        ))}
      </div>

      {verifying && (
        <p className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
        </p>
      )}

      <p className="text-center text-sm text-gray-500">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          onClick={sendCode}
          disabled={sending || cooldown > 0}
          className="text-brand-600 font-medium hover:underline disabled:text-gray-300 disabled:no-underline"
        >
          {sending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
    </div>
  )
}
