import csv
import random
from datetime import datetime

# Параметры генерации
num_rows = 500  # количество строк
zones = ['A', 'B', 'C', 'D']
product_names = [
    "Роутер RT-AC68U",
    "Модем DSL-2640U",
    "Смартфон Galaxy S21",
    "Ноутбук Lenovo ThinkPad",
    "Клавиатура Logitech K120",
    "Монитор Samsung 24\"",
    "Принтер HP LaserJet",
    "Телефонный адаптер",
    "Наушники Sony WH-1000XM4",
    "Веб-камера Logitech C920"
]

# Текущее время
now = datetime.now()

# Создаём CSV
with open('inventory.csv', 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile, delimiter=';')
    writer.writerow(['product_id', 'product_name', 'quantity', 'zone', 'date', 'row', 'shelf'])

    for i in range(num_rows):
        product_id = f"TEL-{random.randint(1000, 9999)}"
        product_name = random.choice(product_names)
        quantity = random.randint(1, 100)
        zone = random.choice(zones)
        # Ставим текущее время для всех записей
        date = now.strftime('%Y-%m-%d %H:%M:%S')
        row = random.randint(1, 20)
        shelf = random.randint(1, 10)

        writer.writerow([product_id, product_name, quantity, zone, date, row, shelf])

print("CSV файл 'inventory.csv' успешно создан с текущей датой и временем!")
