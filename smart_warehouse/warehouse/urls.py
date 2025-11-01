from django.contrib import admin
from django.urls import path, include
from .views import WarehousePredictAPIView, RobotActivityAPIView, PredictionHistoryAPIView

urlpatterns = [
    path('robot-activity/', RobotActivityAPIView.as_view(), name='robot_activity'),
    path('predictions/', WarehousePredictAPIView.as_view(), name='ai-predictions'),
    path('predictions/history/<str:product_id>/', PredictionHistoryAPIView.as_view(), name='prediction-history'),
]
