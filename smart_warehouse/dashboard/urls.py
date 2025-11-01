from django.urls import path
from .views import DashboardCurrentView, ZoneStatusAPIView

urlpatterns = [
    path("current/", DashboardCurrentView.as_view(), name="dashboard_current"),
    path("zone-status/", ZoneStatusAPIView.as_view(), name="zone_status"),
]