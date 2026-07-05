// src/lib/currency.ts
// Central currency formatter — change here to update everywhere

export const INR = (amount: string | number): string =>
  new Intl.NumberFormat("en-IN", {
    style:                 "currency",
    currency:              "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount))

// Short format: ₹1,20,000 → ₹1.2L
export const INRShort = (amount: string | number): string => {
  const n = Number(amount)
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`
  return INR(n)
}
