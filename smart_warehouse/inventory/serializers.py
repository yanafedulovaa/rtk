from rest_framework import serializers
from warehouse.models import InventoryHistory



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