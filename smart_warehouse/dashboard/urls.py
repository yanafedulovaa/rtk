from django.urls import path
from .views import DashboardCurrentView

urlpatterns = [
    path("current/", DashboardCurrentView.as_view(), name="dashboard_current"),
]