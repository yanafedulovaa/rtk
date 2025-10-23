from django.urls import path
from .views import DashboardCurrentView

urlpatterns = [
    # path("", dashboard_page, name="dashboard_page"),
    path("current/", DashboardCurrentView.as_view(), name="dashboard_current"),
]