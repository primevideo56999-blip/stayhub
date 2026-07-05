"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { authApi } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import toast from "react-hot-toast"
import { useState } from "react"
import { Home, User } from "lucide-react"

const schema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name:  z.string().min(1, "Required"),
  email:      z.string().email("Enter a valid email"),
  username:   z.string().min(3, "At least 3 characters"),
  password:   z.string().min(8, "At least 8 characters"),
  password2:  z.string(),
  role:       z.enum(["guest", "host"]),
}).refine((d) => d.password === d.password2, {
  message: "Passwords do not match",
  path: ["password2"],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const defaultRole  = (searchParams.get("role") === "host" ? "host" : "guest") as "guest" | "host"
  const [loading, setLoading] = useState(false)
  const router   = useRouter()
  const { fetchMe } = useAuthStore()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole },
  })

  const role = watch("role")

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { data: res } = await authApi.register(data)
      localStorage.setItem("access_token",  res.access)
      localStorage.setItem("refresh_token", res.refresh)
      useAuthStore.setState({ user: res.user, accessToken: res.access, refreshToken: res.refresh })
      toast.success("Account created!")
      router.push(data.role === "host" ? "/host/profile-setup" : "/")
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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Join StayHub today</p>
        </div>

        {/* Role toggle */}
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
