import { Shield, ShieldCheck, Star } from "lucide-react"

type Tier = "basic" | "verified" | "superhost"

interface Props {
  isSuperhost: boolean
  isVerified: boolean
  size?: "sm" | "md"
}

export function VerificationBadge({ isSuperhost, isVerified, size = "md" }: Props) {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"
  const textSize = size === "sm" ? "text-xs" : "text-sm"

  if (isSuperhost) return (
    <div className={`flex items-center gap-1.5 ${textSize} font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full`}>
      <Star className={`${iconSize} fill-amber-500 text-amber-500`} />
      Superhost
    </div>
  )

  if (isVerified) return (
    <div className={`flex items-center gap-1.5 ${textSize} font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full`}>
      <ShieldCheck className={`${iconSize} text-brand-500`} />
      Verified
    </div>
  )

  return (
    <div className={`flex items-center gap-1.5 ${textSize} font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full`}>
      <Shield className={`${iconSize} text-gray-400`} />
      Basic
    </div>
  )
}
