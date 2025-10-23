# 1. Берём базовый образ Python
FROM python:3.11-slim

# 2. Рабочая директория
WORKDIR /app

# 3. Копируем зависимости
COPY requirements.txt .

# 4. Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# 5. Копируем код эмулятора
COPY . .

# 6. Запускаем эмулятор
CMD ["python", "emulator.py"]
