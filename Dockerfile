# Базовый образ Nginx
FROM nginx:stable-alpine

# Удаляем дефолтную конфигурацию Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Копируем нашу конфигурацию Nginx в контейнер
# TODO: Переделать на production конфигурацию перед релизом
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Создаём папки для статики и медиа
RUN mkdir -p /app/backend/staticfiles /app/backend/media

# Открываем порты
EXPOSE 80
EXPOSE 443

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]
