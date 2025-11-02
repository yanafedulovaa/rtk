import json
import time
import random
import requests
from datetime import datetime, timezone
import os
import threading
from colorama import init, Fore, Style

# Инициализация colorama для цветного вывода (опционально)
try:
    init(autoreset=True)
    HAS_COLOR = True
except:
    HAS_COLOR = False


class RobotEmulator:
    def __init__(self, robot_id, api_url):
        self.robot_id = robot_id
        self.api_url = api_url
        self.battery = random.randint(80, 100)
        # Исправлено: A-Z (26 зон) и 1-50 (50 рядов)
        self.current_zone = chr(ord('A') + random.randint(0, 25))  # A-Z
        self.current_row = random.randint(1, 50)  # 1-50
        self.current_shelf = random.randint(1, 10)
        self.scan_count = 0
        self.error_count = 0
        self.last_scan_time = time.time()

        # Список тестовых товаров
        self.products = [
            {"id": "TEL-4567", "name": "Роутер RT-AC68U"},
            {"id": "TEL-8901", "name": "Модем DSL-2640U"},
            {"id": "TEL-2345", "name": "Коммутатор SG-108"},
            {"id": "TEL-6789", "name": "IP-телефон T46S"},
            {"id": "TEL-3456", "name": "Кабель UTP Cat6"},
            {"id": "TEL-7890", "name": "Патч-корд 2m"},
            {"id": "TEL-5678", "name": "Роутер Keenetic"},
            {"id": "TEL-9012", "name": "Switch D-Link 24-port"},
        ]

    def generate_scan_data(self):
        """Генерация данных сканирования - исправлено: сканируем 1 товар за раз"""
        # Чаще сканируем 1 товар, реже 2 (70% шанс 1 товар, 30% шанс 2)
        num_products = 1 if random.random() < 0.7 else 2
        scanned_products = random.sample(self.products, k=min(num_products, len(self.products)))
        scan_results = []

        for product in scanned_products:
            # Вероятность критического остатка - 10%
            rand = random.random()
            if rand < 0.1:  # 10% шанс критического
                quantity = random.randint(1, 5)
                status = "CRITICAL"
            elif rand < 0.25:  # 15% шанс низкого
                quantity = random.randint(6, 15)
                status = "LOW_STOCK"  # Исправлено: было "LOW"
            else:  # 75% шанс нормального
                quantity = random.randint(16, 100)
                status = "OK"

            scan_results.append({
                "product_id": product["id"],
                "product_name": product["name"],
                "quantity": quantity,
                "status": status
            })

        return scan_results

    def move_to_next_location(self):
        """Перемещение робота к следующей локации"""
        # Случайно решаем, двигаться ли дальше или остаться на месте
        if random.random() < 0.8:  # 80% шанс двигаться
            self.current_shelf += 1
            if self.current_shelf > 10:
                self.current_shelf = 1
                # Иногда переходим к следующему ряду
                if random.random() < 0.6:  # 60% шанс перейти к следующему ряду
                    self.current_row += 1
                    if self.current_row > 50:  # Исправлено: было > 20
                        self.current_row = 1
                        # Переход к следующей зоне
                        self.current_zone = chr(ord(self.current_zone) + 1)
                        if ord(self.current_zone) > ord('Z'):  # Исправлено: было > ord('E')
                            self.current_zone = 'A'

        # Расход батареи (медленнее)
        self.battery -= random.uniform(0.1, 0.5)  # Исправлено: было 0.2-1.0
        if self.battery < 20:
            self.log("🔌 Низкий заряд! Возвращаюсь на зарядку...", "warning")
            time.sleep(2)
            self.battery = 100
            self.log("✅ Зарядка завершена!", "success")

    def log(self, message, level="info"):
        """Цветной вывод логов"""
        timestamp = datetime.now().strftime("%H:%M:%S")

        if HAS_COLOR:
            if level == "success":
                print(f"{Fore.GREEN}[{timestamp}] [{self.robot_id}] {message}{Style.RESET_ALL}")
            elif level == "warning":
                print(f"{Fore.YELLOW}[{timestamp}] [{self.robot_id}] {message}{Style.RESET_ALL}")
            elif level == "error":
                print(f"{Fore.RED}[{timestamp}] [{self.robot_id}] {message}{Style.RESET_ALL}")
            elif level == "critical":
                print(f"{Fore.RED}{Style.BRIGHT}[{timestamp}] [{self.robot_id}] 🚨 {message}{Style.RESET_ALL}")
            else:
                print(f"{Fore.CYAN}[{timestamp}] [{self.robot_id}] {message}{Style.RESET_ALL}")
        else:
            print(f"[{timestamp}] [{self.robot_id}] {message}")

    def send_data(self):
        """Отправка данных на сервер"""
        # Не всегда сканируем - иногда просто перемещаемся
        should_scan = random.random() < 0.8  # 80% шанс что сканируем

        if not should_scan:
            self.log(
                f"🚶 Перемещение | Позиция: {self.current_zone}{self.current_row}-{self.current_shelf} | "
                f"🔋 {round(self.battery)}%",
                "info"
            )
            return

        scan_results = self.generate_scan_data()

        data = {
            "robot_id": self.robot_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "location": {
                "zone": self.current_zone,
                "row": self.current_row,
                "shelf": self.current_shelf
            },
            "scan_results": scan_results,
            "battery_level": round(self.battery, 1),
        }

        try:
            response = requests.post(
                f"{self.api_url}/api/robots/data/",
                json=data,
                headers={"Content-Type": "application/json"},
                timeout=5
            )

            if response.status_code == 200:
                self.scan_count += 1

                # Проверяем наличие критических товаров
                critical_items = [s for s in scan_results if s['status'] == 'CRITICAL']
                if critical_items:
                    for item in critical_items:
                        self.log(
                            f"🚨 КРИТИЧЕСКИЙ ОСТАТОК: {item['product_name']} "
                            f"({item['quantity']} шт.) в зоне {self.current_zone}{self.current_row}",
                            "critical"
                        )
                else:
                    products_info = ", ".join([p['product_name'] for p in scan_results])
                    self.log(
                        f"📦 Сканирование #{self.scan_count} | "
                        f"Позиция: {self.current_zone}{self.current_row}-{self.current_shelf} | "
                        f"Товары: {products_info} | "
                        f"🔋 {round(self.battery)}%",
                        "success"
                    )
            else:
                self.error_count += 1
                self.log(f"❌ Ошибка сервера: {response.status_code}", "error")

        except requests.exceptions.RequestException as e:
            self.error_count += 1
            self.log(f"❌ Ошибка подключения: {str(e)[:50]}", "error")

    def run(self):
        """Основной цикл работы робота"""
        self.log(f"🚀 Запуск робота | Начальная позиция: {self.current_zone}{self.current_row}", "info")

        while True:
            self.send_data()
            self.move_to_next_location()

            # Увеличенный интервал с небольшими случайными вариациями для реалистичности
            base_interval = int(os.getenv('UPDATE_INTERVAL', 15))  # По умолчанию 15 секунд (было 5)
            # Добавляем случайную вариацию ±3 секунды
            interval = base_interval + random.randint(-3, 3)
            time.sleep(max(5, interval))  # Минимум 5 секунд


def print_banner():
    """Красивый баннер при запуске"""
    banner = """
╔══════════════════════════════════════════════════════════╗
║           🤖 ЭМУЛЯТОР СКЛАДСКИХ РОБОТОВ 🤖              ║
║                  Smart Warehouse System                  ║
╚══════════════════════════════════════════════════════════╝
    """
    print(banner)


def print_stats(robots):
    """Вывод статистики каждые 30 секунд"""
    while True:
        time.sleep(30)
        print("\n" + "=" * 60)
        print("📊 СТАТИСТИКА РАБОТЫ РОБОТОВ:")
        total_scans = sum(r.scan_count for r in robots)
        total_errors = sum(r.error_count for r in robots)
        avg_battery = sum(r.battery for r in robots) / len(robots) if robots else 0
        print(f"  ✅ Всего сканирований: {total_scans}")
        print(f"  ❌ Всего ошибок: {total_errors}")
        print(f"  🤖 Активных роботов: {len(robots)}")
        print(f"  🔋 Средний заряд батареи: {round(avg_battery, 1)}%")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    print_banner()

    api_url = os.getenv('API_URL', 'http://backend:8000')
    robots_count = int(os.getenv('ROBOTS_COUNT', 5))  # По умолчанию 5 роботов
    update_interval = int(os.getenv('UPDATE_INTERVAL', 15))  # Обновление каждые 15 секунд (было 5)

    print(f"🌐 API URL: {api_url}")
    print(f"🤖 Количество роботов: {robots_count}")
    print(f"⏱️  Интервал обновления: {update_interval} сек (с вариациями ±3 сек)")
    print(f"📦 Зоны склада: A-Z (26 зон)")
    print(f"📊 Ряды склада: 1-50 (50 рядов)")
    print(f"⌨️  Нажмите Ctrl+C для остановки\n")
    print("=" * 60 + "\n")

    # Создаем роботов
    robots = []
    threads = []

    for i in range(1, robots_count + 1):
        robot = RobotEmulator(f"RB-{i:03d}", api_url)
        robots.append(robot)

        thread = threading.Thread(target=robot.run)
        thread.daemon = True
        thread.start()
        threads.append(thread)

        # Небольшая задержка между запуском роботов
        time.sleep(0.5)

    # Запускаем поток статистики
    stats_thread = threading.Thread(target=print_stats, args=(robots,))
    stats_thread.daemon = True
    stats_thread.start()

    # Держим главный поток активным
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Остановка эмуляторов...")
        print(f"📊 Итоговая статистика:")
        print(f"  ✅ Всего сканирований: {sum(r.scan_count for r in robots)}")
        print(f"  ❌ Всего ошибок: {sum(r.error_count for r in robots)}")
        print("\n👋 Завершение работы.\n")