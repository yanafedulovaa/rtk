# inventory/serializers.py
from rest_framework import serializers
from warehouse.models import InventoryHistory


"""
Колонки: 

Дата и время проверки
ID робота
Зона склада
Артикул товара
Название товара
Ожидаемое количество
Фактическое количество
Расхождение (+/-)
Статус
Сортировка по каждой колонке
Пагинация (20/50/100 записей на странице)
Возможность выбора записей (checkbox в первой колонке)"""


class InventoryItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = InventoryHistory
        fields = [
            'id',
            'scanned_at',
            'robot_id',
            'row_number',
            'shelf_number',
            'zone',
            'product_id',
            'expected_quantity',
            'difference',
            'product_name',
            'quantity',
            'status',
        ]