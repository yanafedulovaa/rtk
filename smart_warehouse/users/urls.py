from django.urls import path
from .views import LoginAPIView, ChangePasswordView

urlpatterns = [
    path('login/', LoginAPIView.as_view(), name='login'),
    path('change_password/', ChangePasswordView.as_view(), name='change_password')
]
