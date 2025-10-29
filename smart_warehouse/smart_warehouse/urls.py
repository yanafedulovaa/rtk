from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/robots/', include('robots.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/warehouse/', include('warehouse.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
]
