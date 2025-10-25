from django.contrib import admin
from django.urls import path, include
from .views import WarehousePredictMockAPIView

urlpatterns = [
    path("predict/", WarehousePredictMockAPIView.as_view(), name='warehouse_predict')
]
