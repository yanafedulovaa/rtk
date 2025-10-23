from django.db import models

#можно добавить verbose name
class Robot(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    status = models.CharField(max_length=50, default='active')
    battery_level = models.IntegerField()
    last_update = models.DateTimeField()
    current_zone = models.CharField(max_length=10)
    current_row = models.IntegerField()
    current_shelf = models.IntegerField()


