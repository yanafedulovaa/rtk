import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_warehouse.settings')
django.setup()

from django.contrib.auth import get_user_model
from products.models import Product
from robots.models import Robot
from warehouse.models import InventoryHistory

User = get_user_model()


def create_initial_data():
    print("Начало загрузки начальных данных...\n")

    # 1. Создаем суперпользователя (если его нет)
    if not User.objects.filter(email='admin@warehouse.com').exists():
        User.objects.create_superuser(
            email='admin@warehouse.com',
            password='admin123'
        )
        print("Создан суперпользователь: admin@warehouse.com / admin123")
    else:
        print("Суперпользователь уже существует")

    # 2. Создаем тестовые товары
    products_data = [
        {"id": "TEL-4567", "name": "Роутер RT-AC68U", "category": "Сетевое оборудование"},
        {"id": "TEL-8901", "name": "Модем DSL-2640U", "category": "Сетевое оборудование"},
        {"id": "TEL-2345", "name": "Коммутатор SG-108", "category": "Сетевое оборудование"},
        {"id": "TEL-6789", "name": "IP-телефон T46S", "category": "Телефония"},
        {"id": "TEL-3456", "name": "Кабель UTP Cat6", "category": "Кабели"},
        {"id": "TEL-7890", "name": "Патч-корд 2m", "category": "Кабели"},
        {"id": "TEL-5678", "name": "Роутер Keenetic", "category": "Сетевое оборудование"},
        {"id": "TEL-9012", "name": "Switch D-Link 24-port", "category": "Сетевое оборудование"},
    ]

    created_products = []
    for product_data in products_data:
        product, created = Product.objects.get_or_create(
            id=product_data["id"],
            defaults={
                "name": product_data["name"],
                "category": product_data["category"],
                "min_stock": 20,
                "optimal_stock": 50
            }
        )
        created_products.append(product)
    print(f"Создано товаров: {len(created_products)}")

    # 3. Создаем тестовых роботов
    robots_data = [
        {"id": "RB-001", "battery": 85, "zone": "A", "row": 5},
        {"id": "RB-002", "battery": 92, "zone": "D", "row": 12},
        {"id": "RB-003", "battery": 78, "zone": "H", "row": 20},
        {"id": "RB-004", "battery": 95, "zone": "M", "row": 30},
        {"id": "RB-005", "battery": 88, "zone": "R", "row": 40},
    ]

    created_robots = []
    now = timezone.now()
    for robot_data in robots_data:
        robot, created = Robot.objects.get_or_create(
            id=robot_data["id"],
            defaults={
                "battery_level": robot_data["battery"],
                "current_zone": robot_data["zone"],
                "current_row": robot_data["row"],
                "current_shelf": random.randint(1, 10),
                "status": "active",
                "is_active": True,
                "last_update": now
            }
        )
        created_robots.append(robot)
    print(f"Создано роботов: {len(created_robots)}")

    # Создаем историю сканирований для заполнения карты
    zones = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    rows = 50
    now = timezone.now()

    cells_to_fill = int(len(zones) * rows * 0.3)  # ~390 ячеек

    scans_created = 0
    for _ in range(cells_to_fill):
        zone = random.choice(zones)
        row = random.randint(1, rows)
        product = random.choice(created_products)
        robot = random.choice(created_robots)

        hours_ago = random.randint(1, 24 * 30)  # от 1 часа до 30 дней
        scanned_at = now - timedelta(hours=hours_ago)

        rand = random.random()
        if rand < 0.1:  # 10% - критический остаток
            quantity = random.randint(1, 5)
            status = "CRITICAL"
        elif rand < 0.25:  # 15% - низкий остаток
            quantity = random.randint(6, 15)
            status = "LOW_STOCK"
        else:  # 75% - нормальный остаток
            quantity = random.randint(16, 100)
            status = "OK"

        existing_scan = InventoryHistory.objects.filter(
            zone=zone,
            row_number=row
        ).order_by('-scanned_at').first()

        # Создаем только если нет существующего или если новое свежее
        if not existing_scan or scanned_at > existing_scan.scanned_at:
            InventoryHistory.objects.create(
                robot=robot,
                product=product,
                quantity=quantity,
                zone=zone,
                row_number=row,
                shelf_number=random.randint(1, 10),
                status=status,
                scanned_at=scanned_at
            )
            scans_created += 1

    for _ in range(50):
        zone = random.choice(zones)
        row = random.randint(1, rows)
        product = random.choice(created_products)
        robot = random.choice(created_robots)

        minutes_ago = random.randint(1, 60)
        scanned_at = now - timedelta(minutes=minutes_ago)

        quantity = random.randint(20, 100)
        status = "OK"

        InventoryHistory.objects.filter(
            zone=zone,
            row_number=row
        ).delete()

        InventoryHistory.objects.create(
            robot=robot,
            product=product,
            quantity=quantity,
            zone=zone,
            row_number=row,
            shelf_number=random.randint(1, 10),
            status=status,
            scanned_at=scanned_at
        )
        scans_created += 1

    print(f"Создано сканирований: {scans_created}")
    print(f"\nСтатистика:")
    print(f"   - Зоны с данными: ~{int(cells_to_fill / rows)} зон")
    print(f"   - Ячеек заполнено: ~{cells_to_fill + 50}")
    print(f"   - Свежих сканирований (за последний час): 50")
    print("\nНачальные данные успешно загружены!")



if __name__ == '__main__':
    create_initial_data()