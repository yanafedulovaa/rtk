from django.db import models

class Product(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=255, null=False)
    category = models.CharField(max_length=100)
    min_stock = models.IntegerField(default=10)
    optimal_stock = models.IntegerField(default=100)
