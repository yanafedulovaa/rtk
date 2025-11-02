# Smart Warehouse

Интеллектуальная система управления складской логистикой с использованием автономных роботов.  
Позволяет отслеживать работу роботов, управлять инвентарем, просматривать историю операций и прогнозировать потребности с помощью ИИ.

- Мониторинг активности роботов (WebSocket)
- История и тренды инвентаря
- Загрузка CSV, экспорт в Excel/PDF
- Предиктивная аналитика (mock/ИИ)
- JWT-аутентификация и сброс пароля

---

## Архитектура

- **Frontend**: React (CRA), порт `3000`
- **Backend**: Django 5 + DRF, Channels + Daphne, порт `8000`
- **БД**: PostgreSQL 16
- **Кэш/WS**: Redis 7 (Channels layer)
- **Эмулятор роботов**: Python-скрипт
- **Docker Compose**: быстрый запуск всех сервисов

## Структура проекта
```
smart_warehouse/
├─ docker-compose.yml 
├─ frontend/ #Frontend React
├─ robot_emulator/ #Эмулятор роботов
└─ smart_warehouse/ #Backend Django
```

## Запуск при помощи Docker

Требования: установленный Docker и Docker Compose.

### 1. Клонируйте репозиторий и перейдите в папку проекта
```bash
git clone https://github.com/yanafedulovaa/rtk.git
cd smart_warehouse
```
### 2.Сборка и запуск всех сервисов
```bash
docker-compose up -d --build
```

Для быстрого входа в ситсему после первого запуска через Docker можно использовать тестового суперпользователя:

```
Email: admin@warehouse.com
Password: admin123
```


## API Документация

Документация доступна через Swagger UI:

- Swagger: [http://localhost:8000/swagger/](http://localhost:8000/swagger/)
- Redoc: [http://localhost:8000/redoc/](http://localhost:8000/redoc/)

