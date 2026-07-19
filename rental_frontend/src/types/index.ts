export type Role = "guest" | "host" | "admin"

export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  full_name: string
  role: Role
  phone: string
  phone_verified: boolean
  email_verified: boolean
  avatar: string | null
  bio: string
  is_verified: boolean
  created_at: string
}

export interface HostProfile {
  user: User
  business_name: string
  description: string
  response_rate: number
  response_time: string
  is_superhost: boolean
  joined_as_host: string
}

export interface Amenity {
  id: number
  name: string
  icon: string
  category: string
}

export interface PropertyPhoto {
  id: number
  image: string
  caption: string
  is_cover: boolean
  order: number
  uploaded_at: string
}

export type PropertyType =
  | "apartment" | "house" | "villa" | "studio"
  | "cabin" | "hotel_room" | "hostel" | "other"

export type PropertyStatus = "draft" | "active" | "paused" | "archived"

export interface Property {
  id: number
  host: User
  title: string
  description: string
  property_type: PropertyType
  status: PropertyStatus
  address_line1: string
  address_line2: string
  city: string
  state: string
  country: string
  postal_code: string
  latitude: number | null
  longitude: number | null
  max_guests: number
  bedrooms: number
  beds: number
  bathrooms: number
  price_per_night: string
  cleaning_fee: string
  service_fee_pct: string
  min_nights: number
  max_nights: number
  check_in_time: string
  check_out_time: string
  house_rules: string
  allows_pets: boolean
  allows_smoking: boolean
  allows_parties: boolean
  amenities: Amenity[]
  photos: PropertyPhoto[]
  avg_rating: string
  total_reviews: number
  total_bookings: number
  is_active: boolean
  created_at: string
  updated_at: string
  // List serializer only
  cover_photo?: string
  host_name?: string
  distance_km?: number | null
}

export type BookingStatus =
  | "pending" | "confirmed" | "cancelled" | "completed" | "rejected"

export interface Booking {
  id: number
  property: Property
  guest: User
  host: User
  check_in: string
  check_out: string
  nights: number
  num_guests: number
  price_per_night: string
  cleaning_fee: string
  service_fee: string
  subtotal: string
  total_price: string
  status: BookingStatus
  cancelled_by: string
  cancellation_reason: string
  cancelled_at: string | null
  stripe_payment_intent_id: string
  is_paid: boolean
  refund_amount: string | null
  refund_amount_preview: string
  created_at: string
  updated_at: string
}

export interface PricePreview {
  nights: number
  price_per_night: string
  subtotal: string
  cleaning_fee: string
  service_fee: string
  service_fee_pct: string
  total: string
  currency: string
}

export interface Review {
  id: number
  property: Property
  booking: number
  guest: User
  guest_name: string
  guest_avatar: string | null
  overall: number
  cleanliness: number
  communication: number
  location: number
  value: number
  comment: string
  host_response: string
  host_responded_at: string | null
  created_at: string
}

export interface ReviewsResponse {
  count: number
  ratings: {
    avg_overall: number
    avg_cleanliness: number
    avg_communication: number
    avg_location: number
    avg_value: number
  }
  results: Review[]
}

export interface HostProfileStatus {
  is_complete: boolean
  missing: string[]
  message: string
}
