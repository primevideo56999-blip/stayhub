import Link from "next/link"
import { Search, Star, Shield, CreditCard } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center">
          <p className="text-brand-200 text-sm font-medium uppercase tracking-widest mb-4">
            Subscription-based hosting
          </p>
          <h1 className="font-display text-5xl sm:text-6xl font-bold leading-tight mb-6">
            Your space, your terms.<br />
            <span className="text-brand-200">Earn more, worry less.</span>
          </h1>
          <p className="text-brand-100 text-lg max-w-2xl mx-auto mb-10">
            Hosts pay one flat subscription. Guests book instantly. No hidden commission surprises.
          </p>

          {/* Quick search */}
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-float p-2 flex gap-2">
            <input
              type="text"
              placeholder="Where do you want to go?"
              className="flex-1 px-4 py-3 text-gray-800 text-sm rounded-xl focus:outline-none placeholder:text-gray-400"
            />
            <Link
              href="/search"
              className="btn-primary flex items-center gap-2 shrink-0"
            >
              <Search className="w-4 h-4" />
              Search
            </Link>
          </div>
        </div>
      </section>

      {/* Why StayHub */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="font-display text-3xl font-bold text-center text-gray-900 mb-3">
          Why hosts choose StayHub
        </h2>
        <p className="text-gray-500 text-center mb-12">One subscription, unlimited listings.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <CreditCard className="w-6 h-6 text-brand-500" />,
              title: "Flat monthly fee",
              desc:  "No per-booking commission. Pay one subscription and keep more of what you earn.",
            },
            {
              icon: <Shield className="w-6 h-6 text-brand-500" />,
              title: "Verified guests",
              desc:  "Every guest is verified before booking. Your property is in safe hands.",
            },
            {
              icon: <Star className="w-6 h-6 text-brand-500" />,
              title: "Superhost recognition",
              desc:  "Consistently great ratings unlock Superhost status and priority listing placement.",
            },
          ].map((f) => (
            <div key={f.title} className="card p-8 text-center hover:shadow-card-hover transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
                {f.icon}
              </div>
              <h3 className="font-display font-semibold text-lg text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sand-100 border-y border-sand-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Ready to start hosting?
            </h2>
            <p className="text-gray-500">List your first property in under 10 minutes.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/register?role=host" className="btn-primary">
              Become a host
            </Link>
            <Link href="/search" className="btn-secondary">
              Browse stays
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
