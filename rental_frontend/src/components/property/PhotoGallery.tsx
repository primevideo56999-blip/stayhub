"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, X, MapPin, Grid3X3 } from "lucide-react"
import { PropertyPhoto } from "@/types"

interface Props {
  photos: PropertyPhoto[]
  title:  string
}

export function PhotoGallery({ photos, title }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const touchStartX = useRef<number | null>(null)

  const count = photos.length
  const open  = openIndex !== null

  const close = useCallback(() => setOpenIndex(null), [])
  const prev  = useCallback(() => {
    setOpenIndex((i) => (i === null ? i : (i - 1 + count) % count))
  }, [count])
  const next  = useCallback(() => {
    setOpenIndex((i) => (i === null ? i : (i + 1) % count))
  }, [count])

  // Keyboard navigation + body scroll lock while the lightbox is open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")     close()
      if (e.key === "ArrowLeft")  prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, close, prev, next])

  // Preload neighbours so arrow navigation feels instant
  useEffect(() => {
    if (openIndex === null || count < 2) return
    ;[(openIndex + 1) % count, (openIndex - 1 + count) % count].forEach((i) => {
      const img = new window.Image()
      img.src = photos[i].image
    })
  }, [openIndex, count, photos])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 50) return
    dx > 0 ? prev() : next()
  }

  if (count === 0) {
    return (
      <div className="h-64 sm:h-80 bg-gray-100 rounded-2xl flex items-center justify-center mb-8">
        <MapPin className="w-12 h-12 text-gray-300" />
      </div>
    )
  }

  const current = openIndex !== null ? photos[openIndex] : null

  return (
    <>
      {/* ── Photo grid ──────────────────────────────────────────────── */}
      <div className="relative mb-8">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden h-64 sm:h-80">
          <button
            onClick={() => setOpenIndex(0)}
            className="col-span-4 sm:col-span-2 row-span-2 group focus:outline-none"
            aria-label={`View photo 1 of ${count} in full screen`}
          >
            <img
              src={photos[0]?.image}
              alt={title}
              className="w-full h-full object-cover group-hover:brightness-90 transition"
            />
          </button>
          {photos.slice(1, 5).map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setOpenIndex(i + 1)}
              className="hidden sm:block group focus:outline-none"
              aria-label={`View photo ${i + 2} of ${count} in full screen`}
            >
              <img
                src={photo.image}
                alt={photo.caption || ""}
                className="w-full h-full object-cover group-hover:brightness-90 transition"
              />
            </button>
          ))}
          {count < 5 && [...Array(5 - count)].map((_, i) => (
            <div key={`e-${i}`} className="hidden sm:block bg-gray-100" />
          ))}
        </div>

        {/* Show-all button (also the only entry to photos 2+ on mobile) */}
        <button
          onClick={() => setOpenIndex(0)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/95 hover:bg-white
                     text-gray-800 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg shadow-card
                     border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          {count > 1 ? `Show all ${count} photos` : "View photo"}
        </button>
      </div>

      {/* ── Fullscreen lightbox ─────────────────────────────────────── */}
      {open && current && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={close}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <span className="text-white/80 text-sm font-medium tabular-nums">
              {(openIndex ?? 0) + 1} / {count}
            </span>
            <button
              onClick={close}
              aria-label="Close photo viewer"
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Image area */}
          <div
            className="flex-1 relative flex items-center justify-center min-h-0 px-2 sm:px-16"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={current.image}
              alt={current.caption || title}
              className="max-w-full max-h-full object-contain select-none"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />

            {count > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prev() }}
                  aria-label="Previous photo"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full
                             bg-white/10 hover:bg-white/25 text-white backdrop-blur-sm
                             focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); next() }}
                  aria-label="Next photo"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full
                             bg-white/10 hover:bg-white/25 text-white backdrop-blur-sm
                             focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Caption */}
          <div className="flex-shrink-0 px-4 py-3 min-h-[2.5rem] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {current.caption && (
              <p className="text-white/70 text-sm text-center">{current.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
