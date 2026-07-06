"use client"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { propertiesApi } from "@/lib/api"
import { ChevronLeft, ChevronRight, X, Lock, CheckCircle } from "lucide-react"
import toast from "react-hot-toast"

interface Props {
  propertyId: number
  isHost?: boolean        // host sees block/unblock controls
  onRangeSelect?: (checkIn: string, checkOut: string) => void  // guest mode — selects range
  selectedCheckIn?: string
  selectedCheckOut?: string
}

type DayStatus = "available" | "blocked" | "booked" | "selected" | "in-range" | "past"

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export function AvailabilityCalendar({
  propertyId,
  isHost = false,
  onRangeSelect,
  selectedCheckIn,
  selectedCheckOut,
}: Props) {
  const today      = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [selecting, setSelecting]     = useState<"checkin" | "checkout" | null>(null)
  const [localCheckIn, setLocalCheckIn]   = useState(selectedCheckIn || "")
  const [localCheckOut, setLocalCheckOut] = useState(selectedCheckOut || "")

  // Host: multi-select for bulk blocking
  const [blockStart, setBlockStart] = useState<string | null>(null)
  const [blockEnd,   setBlockEnd]   = useState<string | null>(null)
  const [blockMode,  setBlockMode]  = useState(false)

  const qc = useQueryClient()

  const { data: blockedDates = [] } = useQuery({
    queryKey: ["availability", propertyId],
    queryFn:  () => propertiesApi.availability(propertyId).then((r) => r.data),
  })

  const blockedSet = new Set<string>(
    blockedDates.map((d: any) => d.date)
  )
  const bookedSet = new Set<string>(
    blockedDates.filter((d: any) => d.reason === "booked").map((d: any) => d.date)
  )

  const blockMutation = useMutation({
    mutationFn: (date: string) => propertiesApi.blockDate(propertyId, date),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["availability", propertyId] }),
    onError:    () => toast.error("Failed to block date"),
  })

  const unblockMutation = useMutation({
    mutationFn: (date: string) => propertiesApi.unblockDate(propertyId, date),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["availability", propertyId] }),
    onError:    () => toast.error("Failed to unblock date"),
  })

  const blockRangeMutation = useMutation({
    mutationFn: async ({ start, end }: { start: string; end: string }) => {
      const dates: string[] = []
      const cur = new Date(start)
      const last = new Date(end)
      while (cur <= last) {
        const iso = cur.toISOString().split("T")[0]
        if (!blockedSet.has(iso)) dates.push(iso)
        cur.setDate(cur.getDate() + 1)
      }
      for (const d of dates) {
        await propertiesApi.blockDate(propertyId, d)
      }
    },
    onSuccess: () => {
      toast.success("Dates blocked")
      qc.invalidateQueries({ queryKey: ["availability", propertyId] })
      setBlockStart(null); setBlockEnd(null); setBlockMode(false)
    },
  })

  const unblockRangeMutation = useMutation({
    mutationFn: async ({ start, end }: { start: string; end: string }) => {
      const cur = new Date(start)
      const last = new Date(end)
      while (cur <= last) {
        const iso = cur.toISOString().split("T")[0]
        if (blockedSet.has(iso) && !bookedSet.has(iso)) {
          await propertiesApi.unblockDate(propertyId, iso)
        }
        cur.setDate(cur.getDate() + 1)
      }
    },
    onSuccess: () => {
      toast.success("Dates unblocked")
      qc.invalidateQueries({ queryKey: ["availability", propertyId] })
      setBlockStart(null); setBlockEnd(null)
    },
  })

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const firstDay  = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayIso  = today.toISOString().split("T")[0]

  const getDayStatus = (iso: string): DayStatus => {
    if (iso < todayIso) return "past"
    if (bookedSet.has(iso)) return "booked"
    if (blockedSet.has(iso)) return "blocked"

    // Guest selection range
    const ci = localCheckIn || selectedCheckIn || ""
    const co = localCheckOut || selectedCheckOut || ""
    if (iso === ci || iso === co) return "selected"
    if (ci && co && iso > ci && iso < co) return "in-range"

    // Hover preview (guest)
    if (!isHost && ci && !co && hoveredDate && iso > ci && iso <= hoveredDate) return "in-range"

    // Host block range preview
    if (isHost && blockStart && !blockEnd && hoveredDate) {
      const s = blockStart < hoveredDate ? blockStart : hoveredDate
      const e = blockStart < hoveredDate ? hoveredDate : blockStart
      if (iso >= s && iso <= e) return "in-range"
    }
    if (isHost && blockStart && blockEnd) {
      const s = blockStart < blockEnd ? blockStart : blockEnd
      const e = blockStart < blockEnd ? blockEnd : blockStart
      if (iso >= s && iso <= e) return "in-range"
    }

    return "available"
  }

  const handleDayClick = (iso: string, status: DayStatus) => {
    if (status === "past") return

    // ── Host mode ────────────────────────────────────────────────────────────
    if (isHost) {
      if (!blockStart) {
        setBlockStart(iso)
        return
      }
      if (blockStart && !blockEnd) {
        setBlockEnd(iso)
        return
      }
      setBlockStart(iso); setBlockEnd(null)
      return
    }

    // ── Guest mode ───────────────────────────────────────────────────────────
    if (status === "booked" || status === "blocked") return
    if (!localCheckIn || (localCheckIn && localCheckOut)) {
      setLocalCheckIn(iso); setLocalCheckOut("")
      return
    }
    if (iso <= localCheckIn) { setLocalCheckIn(iso); return }
    setLocalCheckOut(iso)
    onRangeSelect?.(localCheckIn, iso)
  }

  const dayStyles: Record<DayStatus, string> = {
    available: "hover:bg-brand-50 hover:text-brand-700 cursor-pointer text-gray-900",
    blocked:   "bg-gray-100 text-gray-400 cursor-pointer line-through",
    booked:    "bg-red-50 text-red-300 cursor-not-allowed",
    selected:  "bg-brand-600 text-white font-bold rounded-full",
    "in-range":"bg-brand-100 text-brand-700",
    past:      "text-gray-300 cursor-not-allowed",
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const clearSelection = () => {
    setLocalCheckIn(""); setLocalCheckOut("")
    setBlockStart(null); setBlockEnd(null)
  }

  return (
    <div className="w-full select-none">

      {/* Host controls */}
      {isHost && (
        <div className="flex flex-wrap gap-2 mb-4">
          {blockStart && (
            <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2 text-sm">
              <span className="text-brand-700 font-medium">
                {blockStart}{blockEnd ? ` → ${blockEnd}` : " → select end date"}
              </span>
              {blockStart && blockEnd && (
                <>
                  <button
                    onClick={() => blockRangeMutation.mutate({ start: blockStart < blockEnd ? blockStart : blockEnd, end: blockStart < blockEnd ? blockEnd : blockStart })}
                    disabled={blockRangeMutation.isPending}
                    className="px-2 py-0.5 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-700"
                  >
                    {blockRangeMutation.isPending ? "Blocking…" : "Block range"}
                  </button>
                  <button
                    onClick={() => unblockRangeMutation.mutate({ start: blockStart < blockEnd ? blockStart : blockEnd, end: blockStart < blockEnd ? blockEnd : blockStart })}
                    disabled={unblockRangeMutation.isPending}
                    className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                  >
                    {unblockRangeMutation.isPending ? "Unblocking…" : "Unblock range"}
                  </button>
                </>
              )}
              <button onClick={clearSelection}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
          )}
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="btn-ghost p-2 rounded-xl">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-display font-semibold text-gray-900 text-lg">
          {MONTHS[month]} {year}
        </h3>
        <button onClick={nextMonth} className="btn-ghost p-2 rounded-xl">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells before first day */}
        {[...Array(firstDay)].map((_, i) => <div key={`e-${i}`} />)}

        {/* Day cells */}
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1
          const iso = isoDate(year, month, day)
          const status = getDayStatus(iso)
          const isToday = iso === todayIso

          return (
            <div
              key={iso}
              onClick={() => handleDayClick(iso, status)}
              onMouseEnter={() => setHoveredDate(iso)}
              onMouseLeave={() => setHoveredDate(null)}
              className={`
                relative aspect-square flex items-center justify-center
                text-sm transition-all duration-100 rounded-lg
                ${dayStyles[status]}
                ${isToday && status === "available" ? "ring-2 ring-brand-300 ring-inset font-bold" : ""}
              `}
              title={status === "booked" ? "Booked" : status === "blocked" ? "Blocked by host" : ""}
            >
              {day}
              {status === "booked" && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />
              )}
              {status === "blocked" && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-400" />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-full bg-brand-600" /> Selected
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-full bg-brand-100" /> In range
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200" /> Booked
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-full bg-gray-200" /> Blocked
        </div>
        {isHost && (
          <p className="w-full text-xs text-gray-400 mt-1">
            Click a start date then an end date to block or unblock a range
          </p>
        )}
      </div>

      {/* Guest selection summary */}
      {!isHost && (localCheckIn || localCheckOut) && (
        <div className="mt-4 bg-brand-50 border border-brand-200 rounded-xl p-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium text-brand-700">
              {localCheckIn || "—"} → {localCheckOut || "select checkout"}
            </span>
            {localCheckIn && localCheckOut && (
              <span className="text-brand-500 ml-2">
                ({Math.round((new Date(localCheckOut).getTime() - new Date(localCheckIn).getTime()) / 86400000)} nights)
              </span>
            )}
          </div>
          <button onClick={clearSelection}>
            <X className="w-4 h-4 text-brand-400 hover:text-brand-600" />
          </button>
        </div>
      )}
    </div>
  )
}
