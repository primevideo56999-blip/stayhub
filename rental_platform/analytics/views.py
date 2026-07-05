from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from datetime import timedelta


class HostAnalyticsView(APIView):
    """GET /api/v1/analytics/host/
    Returns earnings, occupancy, and booking stats for the authenticated host."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from bookings.models import Booking
        from properties.models import Property
        from reviews.models import Review

        user = request.user
        today = timezone.now().date()
        month_start = today.replace(day=1)
        year_start  = today.replace(month=1, day=1)

        base_qs = Booking.objects.filter(host=user, is_active=True)

        # ── Earnings ──────────────────────────────────────────────────────────
        total_earnings = base_qs.filter(
            status=Booking.Status.COMPLETED
        ).aggregate(total=Sum("total_price"))["total"] or 0

        month_earnings = base_qs.filter(
            status=Booking.Status.COMPLETED,
            check_out__gte=month_start,
        ).aggregate(total=Sum("total_price"))["total"] or 0

        year_earnings = base_qs.filter(
            status=Booking.Status.COMPLETED,
            check_out__gte=year_start,
        ).aggregate(total=Sum("total_price"))["total"] or 0

        # ── Bookings ──────────────────────────────────────────────────────────
        bookings_by_status = dict(
            base_qs.values("status").annotate(count=Count("id")).values_list("status", "count")
        )

        # ── Upcoming ──────────────────────────────────────────────────────────
        upcoming = base_qs.filter(
            status=Booking.Status.CONFIRMED,
            check_in__gte=today,
        ).order_by("check_in").select_related("guest", "listing")[:5]

        upcoming_data = [{
            "id":         b.id,
            "guest_name": b.guest.full_name,
            "property":   b.listing.title,
            "check_in":   str(b.check_in),
            "check_out":  str(b.check_out),
            "nights":     b.nights,
            "total":      str(b.total_price),
        } for b in upcoming]

        # ── Monthly earnings chart (last 6 months) ───────────────────────────
        monthly = []
        for i in range(5, -1, -1):
            month_date = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            next_month = (month_date.replace(day=28) + timedelta(days=4)).replace(day=1)
            earned = base_qs.filter(
                status=Booking.Status.COMPLETED,
                check_out__gte=month_date,
                check_out__lt=next_month,
            ).aggregate(total=Sum("total_price"))["total"] or 0
            monthly.append({
                "month":    month_date.strftime("%b %Y"),
                "earnings": float(earned),
            })

        # ── Properties ────────────────────────────────────────────────────────
        properties = Property.objects.filter(host=user, is_active=True)
        prop_stats = []
        for p in properties:
            p_bookings = base_qs.filter(listing=p)
            prop_stats.append({
                "id":            p.id,
                "title":         p.title,
                "status":        p.status,
                "avg_rating":    str(p.avg_rating),
                "total_reviews": p.total_reviews,
                "total_bookings":p_bookings.filter(status=Booking.Status.COMPLETED).count(),
                "earnings":      float(p_bookings.filter(status=Booking.Status.COMPLETED).aggregate(
                                    t=Sum("total_price"))["t"] or 0),
            })

        # ── Reviews ───────────────────────────────────────────────────────────
        reviews_agg = Review.objects.filter(host=user, is_active=True).aggregate(
            avg=Avg("overall"), count=Count("id")
        )

        return Response({
            "earnings": {
                "total":      float(total_earnings),
                "this_month": float(month_earnings),
                "this_year":  float(year_earnings),
                "monthly_chart": monthly,
            },
            "bookings": {
                "by_status":  bookings_by_status,
                "total":      sum(bookings_by_status.values()),
                "upcoming":   upcoming_data,
            },
            "properties": {
                "total":  properties.count(),
                "active": properties.filter(status="active").count(),
                "stats":  prop_stats,
            },
            "reviews": {
                "avg_rating": round(reviews_agg["avg"] or 0, 2),
                "total":      reviews_agg["count"],
            },
        })
