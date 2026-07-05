import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem("refresh_token")
        if (!refresh) throw new Error("No refresh token")
        const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh })
        localStorage.setItem("access_token", data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register:  (data: any) => api.post("/auth/register/", data),
  login:     (data: any) => api.post("/auth/login/", data),
  logout:    (refresh: string) => api.post("/auth/logout/", { refresh }),
  me:        () => api.get("/auth/me/"),
  updateMe:  (data: any) => api.patch("/auth/me/", data),
  updateMeForm: (data: FormData) =>
    api.patch("/auth/me/", data, { headers: { "Content-Type": "multipart/form-data" } }),
  changePassword: (data: any) => api.put("/auth/change-password/", data),
  hostProfileStatus: () => api.get("/auth/host-profile-status/"),
}

// ── Properties ────────────────────────────────────────────────────────────────
export const propertiesApi = {
  list:         (params?: any) => api.get("/properties/", { params }),
  detail:       (id: number)   => api.get(`/properties/${id}/`),
  create:       (data: any)    => api.post("/properties/", data),
  update:       (id: number, data: any) => api.patch(`/properties/${id}/`, data),
  delete:       (id: number)   => api.delete(`/properties/${id}/`),
  mine:         ()             => api.get("/properties/mine/"),
  publish:      (id: number)   => api.post(`/properties/${id}/publish/`),
  unpublish:    (id: number)   => api.post(`/properties/${id}/unpublish/`),
  amenities:    ()             => api.get("/properties/amenities/"),
  uploadPhoto:  (propertyId: number, data: FormData) =>
    api.post(`/properties/${propertyId}/photos/`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deletePhoto:  (photoId: number)  => api.delete(`/properties/photos/${photoId}/`),
  availability: (id: number)       => api.get(`/properties/${id}/availability/`),
  blockDate:    (id: number, date: string) =>
    api.post(`/properties/${id}/availability/`, { date }),
  unblockDate:  (id: number, date: string) =>
    api.delete(`/properties/${id}/availability/`, { data: { date } }),
}

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookingsApi = {
  create:       (data: any) => api.post("/bookings/", data),
  myTrips:      (status?: string) =>
    api.get("/bookings/my-trips/", { params: status ? { status } : {} }),
  hostBookings: (status?: string) =>
    api.get("/bookings/host-bookings/", { params: status ? { status } : {} }),
  confirm:      (id: number) => api.post(`/bookings/${id}/confirm/`),
  reject:       (id: number) => api.post(`/bookings/${id}/reject/`),
  cancel:       (id: number, reason?: string) =>
    api.post(`/bookings/${id}/cancel/`, { reason }),
  hostCancel:   (id: number, reason?: string) =>
    api.post(`/bookings/${id}/host-cancel/`, { reason }),
  pricePreview: (data: any) => api.post("/bookings/price-preview/", data),
}

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsApi = {
  create:          (data: any)  => api.post("/reviews/", data),
  forProperty:     (id: number) => api.get(`/reviews/property/${id}/`),
  respond:         (id: number, host_response: string) =>
    api.post(`/reviews/${id}/respond/`, { host_response }),
}
