from django.contrib import admin
from django.urls import path, include
from .views import RobotScanView

urlpatterns = [
    path('data/', RobotScanView.as_view()),
    # path('token/', RobotTokenView.as_view(), name='robot_token')
]
