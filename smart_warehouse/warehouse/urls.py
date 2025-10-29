from django.contrib import admin
from django.urls import path, include
from .views import WarehousePredictMockAPIView, RobotActivityAPIView

urlpatterns = [
    path("predict/", WarehousePredictMockAPIView.as_view(), name='warehouse_predict'),
    path('robot-activity/', RobotActivityAPIView.as_view(), name='robot_activity')
]
