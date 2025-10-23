# 1. Используем базовый образ с Python
FROM python:3.11-slim

# 2. Указываем рабочую директорию в контейнере
WORKDIR /app

# 3. Копируем файл зависимостей (если у тебя есть requirements.txt)
COPY requirements.txt .

# 4. Устанавливаем все зависимости
RUN pip install --no-cache-dir -r requirements.txt

# 5. Копируем всё содержимое проекта внутрь контейнера
COPY . .

# 6. Запускаем Django-сервер
CMD ["bash", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:3000"]
