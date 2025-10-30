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
        self.current_zone = chr(ord('A') + random.randint(0, 4))  # A-E
        self.current_row = random.randint(1, 20)
        self.current_shelf = random.randint(1, 10)
        self.scan_count = 0
        self.error_count = 0

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
        """Генерация данных сканирования"""
        scanned_products = random.sample(self.products, k=random.randint(1, 2))
        scan_results = []

        for product in scanned_products:
            # Вероятность критического остатка - 10%
            rand = random.random()
            if rand < 0.1:  # 10% шанс критического
                quantity = random.randint(1, 5)
                status = "CRITICAL"
            elif rand < 0.25:  # 15% шанс низкого
                quantity = random.randint(6, 15)
                status = "LOW"
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
        self.current_shelf += 1
        if self.current_shelf > 10:
            self.current_shelf = 1
            self.current_row += 1
            if self.current_row > 20:
                self.current_row = 1
                # Переход к следующей зоне
                self.current_zone = chr(ord(self.current_zone) + 1)
                if ord(self.current_zone) > ord('E'):
                    self.current_zone = 'A'

        # Расход батареи
        self.battery -= random.uniform(0.2, 1.0)
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
                    self.log(
                        f"📦 Сканирование #{self.scan_count} | "
                        f"Позиция: {self.current_zone}{self.current_row}-{self.current_shelf} | "
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
            time.sleep(int(os.getenv('UPDATE_INTERVAL', 5)))  # По умолчанию 5 секунд


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
        print(f"  ✅ Всего сканирований: {total_scans}")
        print(f"  ❌ Всего ошибок: {total_errors}")
        print(f"  🤖 Активных роботов: {len(robots)}")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    print_banner()

    api_url = os.getenv('API_URL', 'http://backend:8000')
    robots_count = int(os.getenv('ROBOTS_COUNT', 5))  # По умолчанию 5 роботов
    update_interval = int(os.getenv('UPDATE_INTERVAL', 5))  # Обновление каждые 5 секунд

    print(f"🌐 API URL: {api_url}")
    print(f"🤖 Количество роботов: {robots_count}")
    print(f"⏱️  Интервал обновления: {update_interval} сек")
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