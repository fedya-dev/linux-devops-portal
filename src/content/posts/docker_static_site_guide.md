---
title: Превръщане на статичен HTML сайт в Docker контейнер и качване в Docker Hub
description: >-
  Подробно ръководство стъпка по стъпка как да контейнеризираме статични HTML
  файлове с Nginx, да публикуваме изображението в Docker Hub и да го стартираме
  с Docker Compose.
pubDate: 2026-09-12T00:00:00.000Z
category: DevOps
tags:
  - Docker
  - Docker Hub
  - Docker Compose
  - Nginx
  - DevOps
author: Федя Серафиев
featured: false
readTime: 12 мин
heroImage: /images/devops/docker_static_site_guide.webp
heroImageAlt: Контейнеризация на статичен уебсайт с Docker и Nginx
draft: false
---

В съвременната уеб разработка стандартизацията на средата е от ключово значение. Независимо дали разработваме комплексно приложение или просто управляваме статичен сайт, контейнеризацията с Docker ни осигурява надеждност, лесно внедряване (deployment) и пълна независимост от хостинг платформата.

В това ръководство ще ви преведа стъпка по стъпка през целия процес: от локалните ни HTML/JSON файлове, през създаването на оптимизиран Docker image с **Nginx**, публикуването му в **Docker Hub**, до задвижването му с **Docker Compose**.

---

## 1. Преглед на проектната структура

За практическата цел на това ръководство ще използвам реална структура на статичен проект, с която работя. В директорията ми се намират следните файлове:

```text
my-static-project/
├── .wrangler/          # Локална папка от Cloudflare Workers / Pages
├── _headers           # Конфигурационен файл за Cloudflare
├── commandhub.html     # HTML страница
├── config.json        # Конфигурационен JSON файл
├── dev-tools.html     # HTML страница за инструменти
├── encrypt.html       # HTML страница
├── humans.txt         # Информационен TXT файл за автора
├── index.html         # Главна начална страница
├── llms.txt           # Текстов файл за AI роботите
├── robots.txt         # Правила за търсачките
└── sitemap.xml        # SEO карта на сайта
```

Целта ни е да опаковаме тези файлове в лек уеб сървър, като същевременно спестим ресурси и изключим ненужните системни или служебни папки (като `.wrangler`).

---

## 2. Игнориране на излишни файлове с `.dockerignore`

Преди да започнем с изграждането на контейнера, е добра практика да създадем файл `.dockerignore`. Той работи по аналогичен начин на `.gitignore` – указва на Docker кои файлове и директории да **не** копира в изображението по време на `build` процеса. Това намалява размера на крайното изображение и подобрява сигурността.

В корена на проекта създавам `.dockerignore` със следното съдържание:

```gitignore
# Игнориране на Cloudflare / Wrangler файлове
.wrangler/
_headers

# Игнориране на Git файлове и документация
.git
.gitignore
README.md

# Локални настройки на редактори
.vscode/
.idea/
```

---

## 3. Създаване на оптимизиран `Dockerfile`

За сервиране на статично съдържание Nginx е сред най-добрите възможности поради своята бързина и ниска консумация на памет. Ще използваме официалното изображение `nginx:alpine`, базирано на Alpine Linux (размер около 20–30 MB).

В корена на проекта създавам файл с име `Dockerfile`:

```dockerfile
# 1. Избор на лека и сигурна базова образ-среда
FROM nginx:1.27-alpine

# 2. Добавяне на метаданни за автора
LABEL maintainer="Fedya Serafiev"
LABEL description="Docker image for static web application"

# 3. Изчистване на подразбиращите се Nginx статични файлове
RUN rm -rf /usr/share/nginx/html/*

# 4. Копиране на текущите файлове от проекта в Nginx директорията
COPY . /usr/share/nginx/html/

# 5. Деклариране на порт 80, на който работи Nginx
EXPOSE 80

# 6. Стартиране на Nginx във foreground режим (за да не спира контейнерът)
CMD ["nginx", "-g", "daemon off;"]
```

### Подробно обяснение на директивите:

* **`FROM nginx:1.27-alpine`**: Дефинира базовия образ. Използването на Alpine варианта гарантира минимален размер на крайния контейнер.
* **`RUN rm -rf /usr/share/nginx/html/*`**: Изтрива подразбиращата се "Welcome to nginx" страница, за да сме сигурни, че няма да има конфликти.
* **`COPY . /usr/share/nginx/html/`**: Копира цялото съдържание от локалната ни папка (без игнорираните чрез `.dockerignore`) в публичната директория на Nginx.
* **`EXPOSE 80`**: Документира, че контейнерът слуша на порт 80.
* **`CMD ["nginx", "-g", "daemon off;"]`**: Накарва Nginx да работи като основен процес (във foreground). Това е задължително за Docker, тъй като в противен случай контейнерът ще спре веднага след старта.

---

## 4. Локално изграждане (Build) на Docker Image

След като имаме готов `Dockerfile`, е време да построим нашия Docker image. За целта използвам следната команда в терминала, като заменям `yourusername` с моето потребителско име в Docker Hub (например `fedyaserafiev`):

```bash
docker build -t yourusername/my-static-site:v1.0.0 -t yourusername/my-static-site:latest .
```

* `-t yourusername/my-static-site:v1.0.0`: Задава име (repository) и таг с версия.
* `-t yourusername/my-static-site:latest`: Добавя второ копие с таг `latest`.
* `.`: Точката накрая показва, че контекстът на изграждане е текущата директория.

---

## 5. Локално тестване на контейнера

Преди да качим изображението в публичния регистър, задължително проверявам дали всичко работи правилно.

Стартирам контейнера локално:

```bash
docker run -d \
  --name my-static-test \
  -p 8080:80 \
  yourusername/my-static-site:latest
```

* `-d`: Стартира контейнера в background (detached) режим.
* `--name my-static-test`: Присвоява лесно за разпознаване име на контейнера.
* `-p 8080:80`: Пренасочва порт 8080 от нашата машина към порт 80 в контейнера.

Сега мога да отворя браузъра и да посетя:
* `http://localhost:8080/` (отваря `index.html`)
* `http://localhost:8080/commandhub.html`
* `http://localhost:8080/dev-tools.html`
* `http://localhost:8080/robots.txt`

След като се уверя, че всичко работи, спирам и премахвам тестовия контейнер:

```bash
docker stop my-static-test
docker rm my-static-test
```

---

## 6. Публикуване в Docker Hub

За да можем да използваме това изображение на всеки друг сървър или чрез Docker Compose, трябва да го качим в **Docker Hub**.

### Стъпка 6.1: Установяване на сесия (Login)

Влизам в своя Docker Hub профил през терминала:

```bash
docker login
```

Въвеждам потребителско име и парола (или Personal Access Token).

### Стъпка 6.2: Качване (Push)

Качвам изображението с въведените по-рано тагове:

```bash
docker push yourusername/my-static-site:latest
docker push yourusername/my-static-site:v1.0.0
```

След приключване на процеса, изображението е публично достъпно в профила ми в Docker Hub.

---

## 7. Конфигуриране и стартиране с Docker Compose

За по-лесно управление, оркестрация и интегриране с други услуги (като Reverse Proxy, SSL сертификати и др.), предпочитам да използвам **Docker Compose**.

Създавам файл `docker-compose.yml`:

```yaml
version: '3.8'

services:
  web-app:
    image: yourusername/my-static-site:latest
    container_name: my-static-website
    restart: always
    ports:
      - "80:80"
    environment:
      - NGINX_PORT=80
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Ключови параметри в `docker-compose.yml`:
* **`image`**: Указва на Docker Compose да изтегли вече каченото изображение от Docker Hub.
* **`container_name`**: Фиксирано име за контейнера на сървъра.
* **`restart: always`**: Гарантира, че при рестарт на сървъра или срив, контейнерът ще се стартира автоматично.
* **`ports`**: Пренасочва стандартния уеб порт `80` на хост машината към порт `80` на контейнера.

---

## 8. Управление на услугата

Вече можем бързо да управляваме целия стек само с две основни команди:

### Стартиране на приложението:
```bash
docker compose up -d
```
Docker Compose ще изтегли изображението от Docker Hub (ако го няма локално) и ще стартира уеб сайта на порт 80.

### Преглед на логовете:
```bash
docker compose logs -f
```

### Спиране на приложението:
```bash
docker compose down
```

---

## Заключение

Чрез този процес превърнахме обикновена папка със статични HTML и JSON файлове в напълно автономно, преносимо и готово за продукция Docker изображение. Благодарение на Nginx и Alpine Linux получихме изключително бърз и сигурен контейнер, който лесно може да бъде разгърнат на всеки Linux VPS, Kubernetes клъстер или Cloud платформа с помоща на Docker Compose.
