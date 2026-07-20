"use client"
import { Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { authApi } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import toast from "react-hot-toast"
import { useState } from "react"
import { Home, User, MailCheck } from "lucide-react"
import { OtpInput } from "@/components/auth/OtpInput"

const schema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name:  z.string().min(1, "Required"),
  email:      z.string().email("Enter a valid email"),
  username:   z.string().min(3, "At least 3 characters"),
  phone:      z.string().optional()
                .refine((v) => !v || /^\+?[\d\s-]{7,20}$/.test(v), "Enter a valid phone number"),
  password:   z.string().min(8, "At least 8 characters"),
  password2:  z.string(),
  role:       z.enum(["guest", "host"]),
}).refine((d) => d.password === d.password2, {
  message: "Passwords do not match",
  path: ["password2"],
})
type FormData = z.infer<typeof schema>

// ← split into inner component so useSearchParams is inside Suspense
function RegisterForm() {
  const searchParams = useSearchParams()
  const defaultRole  = (searchParams.get("role") === "host" ? "host" : "guest") as "guest" | "host"
  const [loading, setLoading] = useState(false)
  // After account creation we show the verify-code step before redirecting
  const [verifyStep, setVerifyStep] = useState<{ email: string; role: string } | null>(null)
  const router   = useRouter()
  const { fetchMe } = useAuthStore()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole },
  })

  const role = watch("role")

  const finishRedirect = (r: string) =>
    router.push(r === "host" ? "/host/profile-setup" : "/")

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { data: res } = await authApi.register(data)
      // Refresh token arrives as an httpOnly cookie — only access is in the body
      localStorage.setItem("access_token", res.access)
      useAuthStore.setState({ user: res.user, accessToken: res.access })
      toast.success("Account created! Check your email for the code.")
      setVerifyStep({ email: data.email, role: data.role })
    } catch (err: any) {
      const errs = err?.response?.data
      if (errs) {
        Object.values(errs).flat().forEach((e: any) => toast.error(e))
      } else {
        toast.error("Something went wrong.")
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify the emailed code ─────────────────────────────────────
  if (verifyStep) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="card w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <MailCheck className="w-7 h-7 text-brand-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Verify your account</h1>
            <p className="text-gray-500 text-sm mt-1">
              We emailed a 6-digit code to <strong>{verifyStep.email}</strong>
            </p>
          </div>
          <OtpInput
            purpose="verify_account"
            onVerified={(user) => {
              if (user) useAuthStore.getState().setUser(user)
              else fetchMe()
              toast.success("Account verified!")
              finishRedirect(verifyStep.role)
            }}
          />
          <p className="text-center text-sm text-gray-400 mt-6">
            <button
              onClick={() => finishRedirect(verifyStep.role)}
              className="hover:text-gray-600 hover:underline"
            >
              Skip for now — verify later from your profile
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Join StayHub today</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(["guest", "host"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setValue("role", r)}
              className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all text-sm font-medium ${
                role === r
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {r === "guest" ? <User className="w-5 h-5" /> : <Home className="w-5 h-5" />}
              {r === "guest" ? "I'm a guest" : "I'm a host"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input {...register("first_name")} className="input" placeholder="Jane" />
              {errors.first_name && <p className="error-text">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="label">Last name</label>
              <input {...register("last_name")} className="input" placeholder="Doe" />
              {errors.last_name && <p className="error-text">{errors.last_name.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input {...register("email")} type="email" className="input" placeholder="you@example.com" />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Username</label>
            <input {...register("username")} className="input" placeholder="janedoe" />
            {errors.username && <p className="error-text">{errors.username.message}</p>}
          </div>
          <div>
            <label className="label">Mobile number <span className="text-gray-400 font-normal">(optional)</span></label>
            <input {...register("phone")} type="tel" className="input" placeholder="+91 98765 43210" />
            {errors.phone && <p className="error-text">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input {...register("password")} type="password" className="input" placeholder="Min. 8 characters" />
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input {...register("password2")} type="password" className="input" placeholder="••••••••" />
            {errors.password2 && <p className="error-text">{errors.password2.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

// ← default export wraps in Suspense
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  )
}