---
title: 'Docker Compose: Multi-Container приложения на практика'
description: >-
  Пълен наръчник за Docker Compose от нулата. Как да управляваш множество
  контейнери заедно, как да дефинираш услуги, мрежи и volumes в YAML, и как да
  пуснеш реален WordPress + MySQL + Redis stack.
pubDate: 2026-09-11T00:00:00.000Z
category: DevOps
level: Beginner
duration: 35 мин
tags:
  - Docker
  - Docker Compose
  - Containers
  - DevOps
prerequisites:
  - Docker инсталиран (виж урока 'Docker за начинаещи')
  - Основни познания по YAML синтаксис
  - 'Разбиране какво е контейнер, образ и volume'
featured: true
heroImage: /images/devops/docker-compose.webp
heroImageAlt: Docker Compose multi-container setup
draft: false
---

В предишния урок пуснахме първия си контейнер с `docker run`. Работи — но само за един контейнер. Реалните приложения рядко са един контейнер. Обикновено имаш:

- Web приложение
- База данни
- Redis за кеширане
- Nginx като reverse proxy
- Може би worker за background jobs

Ако трябва да пуснеш всичко това с `docker run`, ще напишеш 5 команди с 20 флага всяка. Ще трябва ръчно да създаваш мрежа, да свързваш контейнери, да проверяваш кой кога е стартирал. И ако сървърът рестартира — всичко се разпада.

**Docker Compose** решава точно този проблем. Описваш цялата си инфраструктура в **един YAML файл** и я управляваш с **една команда**.

Аз използвам Docker Compose всеки ден — за локална разработка, за staging среди, а често и за малки production setup-и. Това е може би най-полезната Docker функционалност, която можеш да научиш.

## Какво е Docker Compose

**Docker Compose** е инструмент, който ти позволява да дефинираш и управляваш **multi-container Docker приложения** чрез декларативен YAML файл.

Вместо:

```bash
docker network create myapp-network
docker run -d --name db --network myapp-network -e POSTGRES_PASSWORD=secret postgres:16
docker run -d --name redis --network myapp-network redis:7
docker run -d --name web --network myapp-network -p 8080:80 --link db --link redis myapp:latest
```

Пишеш:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
  redis:
    image: redis:7
  web:
    image: myapp:latest
    ports:
      - "8080:80"
    depends_on:
      - db
      - redis
```

И пускаш:

```bash
docker compose up -d
```

Това е. Цялата сложност е скрита.

### Ключови предимства

1. **Декларативен** — описваш **какво** искаш, не **как** да го направиш
2. **Версионируем** — `docker-compose.yml` може да влезе в Git
3. **Повтаряем** — същият файл работи на всяка машина
4. **Управление с една команда** — `up`, `down`, `restart`, `logs`
5. **Автоматична мрежа** — всички services в един compose файл са в една мрежа
6. **Зависимости** — можеш да кажеш "стартирай db преди web"
7. **Environment-specific конфигурации** — с override файлове

## Инсталация

Ако си инсталирал Docker по моя предишен урок, **Docker Compose вече е инсталиран**. От Docker 20.10+ Compose е част от `docker-ce` пакета под формата на plugin.

Провери:

```bash
docker compose version
```

Трябва да видиш нещо като `Docker Compose version v2.29.0`.

> ⚠️ **Разлика в командите:** Има две версии — стара `docker-compose` (с тире, Python-based) и нова `docker compose` (с интервал, Go-based, plugin). **Използвай новата версия** (`docker compose`). Старата е deprecated.

Ако имаш само старата версия, инсталирай новата:

```bash
sudo apt install docker-compose-plugin
```

## Структурата на docker-compose.yml

Всеки compose файл има три основни секции:

```yaml
services:      # контейнерите, които искаш да пуснеш
  ...

networks:      # мрежите (опционално — Compose създава default мрежа)
  ...

volumes:       # volumes (опционално — само ако искаш именувани volumes)
  ...
```

За 90% от случаите ще пишеш само в `services:`. Compose автоматично създава мрежа за всички services в файла и всички могат да комуникират помежду си по име.

## Първият ти compose файл

Нека започнем с нещо просто — един Nginx.

Създай папка:

```bash
mkdir ~/docker-compose-test
cd ~/docker-compose-test
```

Създай `docker-compose.yml`:

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    restart: unless-stopped
```

Пусни:

```bash
docker compose up -d
```

Какво ще видиш:

```
[+] Running 2/2
 ✔ Network docker-compose-test_default  Created
 ✔ Container docker-compose-test-web-1  Started
```

Отвори `http://localhost:8080` — трябва да видиш Nginx.

### Какво се случи

1. Compose създаде **мрежа** `docker-compose-test_default` (името идва от името на папката)
2. Създаде **контейнер** от образа `nginx:alpine`
3. Свърза го към мрежата
4. Map-на порт 8080 на host-а към 80 в контейнера
5. Стартира го

### Полезни команди

```bash
# Стартирай всичко
docker compose up -d

# Спри всичко (но не изтривай контейнерите)
docker compose stop

# Стартирай отново
docker compose start

# Рестартирай
docker compose restart

# Спри И изтрий контейнерите и мрежата
docker compose down

# Спри и изтрий всичко, включително volumes
docker compose down -v

# Виж статус
docker compose ps

# Виж логове на всички
docker compose logs

# Виж логове на конкретен service
docker compose logs web

# Следвай логовете в реално време
docker compose logs -f

# Влез в контейнер
docker compose exec web bash

# Виж конфигурацията (след като Compose я resolve-не)
docker compose config
```

## Реален пример — WordPress + MySQL + Redis

Нека направим нещо реално. Класически LAMP стек, но модерен: WordPress, MySQL, Redis за кеширане.

Създай нова папка:

```bash
mkdir ~/wordpress-stack
cd ~/wordpress-stack
```

Създай `docker-compose.yml`:

```yaml
services:
  db:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wpuser
      MYSQL_PASSWORD: wppassword
    volumes:
      - db_data:/var/lib/mysql
    networks:
      - wp-network

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - wp-network

  wordpress:
    image: wordpress:6-php8.2-apache
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_USER: wpuser
      WORDPRESS_DB_PASSWORD: wppassword
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - wp_data:/var/www/html
    depends_on:
      - db
      - redis
    networks:
      - wp-network

volumes:
  db_data:
  redis_data:
  wp_data:

networks:
  wp-network:
    driver: bridge
```

Пусни:

```bash
docker compose up -d
```

Първият път ще отнеме 30-60 секунди, защото се свалят три образа.

Провери статуса:

```bash
docker compose ps
```

Трябва да видиш три контейнера, всичките `Up`. Отвори `http://localhost:8080` — трябва да видиш WordPress installation wizard.

### Какво направихме

- **3 контейнера** — MySQL, Redis, WordPress
- **1 мрежа** — `wp-network`, в която всички комуникират
- **3 volumes** — за постоянни данни (MySQL, Redis, WordPress файлове)
- **Environment variables** за конфигурация
- **depends_on** — WordPress изчаква db и redis да стартират

### Разгледай секциите

#### `services:`

Всеки service е контейнер. Ключовете (`db`, `redis`, `wordpress`) са имената на services. Compose ги използва за DNS resolution вътре в мрежата — тоест `db` в `WORDPRESS_DB_HOST` се resolve-ва до IP-то на MySQL контейнера.

#### `image:`

Кой образ да използва. Може да е:
- Публичен образ от Docker Hub: `mysql:8.0`
- Локален образ, който си build-нал: `myapp:latest`
- Build от Dockerfile (виж по-долу)

#### `environment:`

Environment variables. Може да е:
- Кратък синтаксис (map): `KEY: value`
- Дълъг синтаксис (list): `- KEY=value`

```yaml
# Кратък
environment:
  POSTGRES_PASSWORD: secret

# Дълъг
environment:
  - POSTGRES_PASSWORD=secret
```

Дългият е полезен, ако имаш специални символи в стойността.

#### `ports:`

Mapping на портове. Формат: `HOST:CONTAINER`.

```yaml
ports:
  - "8080:80"           # host 8080 → container 80
  - "127.0.0.1:8080:80" # само localhost, не публично
  - "3000-3010:3000-3010" # range
```

> ⚠️ **Сигурност:** Ако пишеш само `- "5432:5432"`, портът е достъпен от **всяка** мрежа, не само от localhost. За development е ок, но в production — внимавай. Използвай `127.0.0.1:5432:5432` за база данни, достъпна само локално.

#### `volumes:`

Постоянно съхранение. Формат: `NAMED_VOLUME:/path/in/container` или `./host/path:/path/in/container` (bind mount).

```yaml
volumes:
  - db_data:/var/lib/mysql          # именуван volume
  - ./config:/etc/app/config        # bind mount от host
  - /var/log:/var/log               # абсолютен път на host
```

**Именуван volume** се създава от Docker и се управлява от него. **Bind mount** е директория от host-а, директно монтирана в контейнера.

Кога кой:
- **Named volume** — за data, която трябва да оцелее (`db_data`)
- **Bind mount** — за конфигурация, която редактираш често (`./nginx.conf`)

#### `depends_on:`

Казва на Compose кой service зависи от кой. WordPress не може да стартира без MySQL, затова:

```yaml
depends_on:
  - db
  - redis
```

> ⚠️ **Внимание:** `depends_on` гарантира **ред на стартиране**, но **не изчаква** услугата реално да е готова. MySQL може да е "стартиран", но още да зарежда. Ако имаш проблем с connection при старт, използвай `healthcheck` (виж по-долу).

#### `restart:`

Какво да прави, ако контейнерът спре:

- `no` — не рестартирай (default)
- `always` — винаги рестартирай
- `on-failure` — само при non-zero exit
- `unless-stopped` — рестартирай, освен ако не си го спрял ръчно

За production обикновено `unless-stopped`.

#### `networks:`

Дефинира мрежата. Името `wp-network` е произволно. Driver-ът `bridge` е default.

## Healthcheck — изчакай услугата да е готова

`depends_on` има недостатък: стартира контейнера, но не изчаква приложението вътре да е готово. MySQL отнема 10-20 секунди, докато стане достъпна.

**Healthcheck** решава това:

```yaml
services:
  db:
    image: mysql:8.0
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  wordpress:
    image: wordpress:6-php8.2-apache
    depends_on:
      db:
        condition: service_healthy
```

`condition: service_healthy` означава "изчакай db да стане healthy, преди да стартираш wordpress".

**Как работи:**
- `test` — команда, която проверява дали услугата е готова
- `interval` — на колко време да проверява
- `timeout` — колко да чака за отговор
- `retries` — колко пъти да се провали, преди да маркира unhealthy
- `start_period` — grace period, в който неуспехите не се броят

## Environment variables от файл

Не искаш да пишеш пароли в `docker-compose.yml`, защото ще ги commit-неш в Git. Решението: **`.env` файл**.

Създай `.env`:

```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=wordpress
MYSQL_USER=wpuser
MYSQL_PASSWORD=wppassword
```

Промени `docker-compose.yml`:

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
```

Compose автоматично чете `.env` файла в същата директория. Синтаксисът `${VAR}` се замества със стойността.

**Добави `.env` в `.gitignore`:**

```
.env
```

И създай `.env.example` (който commit-ваш), за да покажеш на другите какви променливи са нужни:

```env
MYSQL_ROOT_PASSWORD=change_me
MYSQL_DATABASE=wordpress
MYSQL_USER=change_me
MYSQL_PASSWORD=change_me
```

## Build от Dockerfile

Досега използвахме готови образи (`nginx:alpine`, `mysql:8.0`). Но в реални проекти ще имаш **свой** Dockerfile.

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
```

Полето `build` казва на Compose да build-не образа от Dockerfile в текущата папка.

Или по-кратко:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
```

**Опции:**
- `context` — папката, от която се build-ва (може да е `.` или `./backend`)
- `dockerfile` — име на Dockerfile (default: `Dockerfile`)
- `args` — build arguments
- `target` — кой stage от multi-stage build да се използва

### Пример с custom app + db

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - db_data:/var/lib/postgresql/data

  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/myapp
      NODE_ENV: production
    depends_on:
      - db

volumes:
  db_data:
```

Обърни внимание на `DATABASE_URL` — hostname-ът е `db`, името на service-а. Compose автоматично го resolve-ва.

## Override файлове — различни среди

Често искаш различна конфигурация за development и production. Compose поддържа **override файлове**.

Основен `docker-compose.yml`:

```yaml
services:
  app:
    image: myapp:latest
    environment:
      NODE_ENV: production
```

Development override `docker-compose.override.yml` (чете се автоматично):

```yaml
services:
  app:
    build: .
    volumes:
      - ./src:/app/src
    environment:
      NODE_ENV: development
    ports:
      - "3000:3000"
```

Когато пуснеш `docker compose up`, Compose автоматично комбинира двата файла. За development — override-ът дава приоритет.

За production:

```bash
docker compose -f docker-compose.yml up -d
# или
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Debug — какво да правиш, когато не работи

### Service не стартира

```bash
# Виж логовете
docker compose logs <service>

# Виж статуса
docker compose ps
```

### Не можеш да се свържеш между services

Провери дали са в една мрежа:

```bash
docker compose exec app ping db
docker compose exec app nslookup db
```

Ако не resolve-ва — services не са в една мрежа. Провери `docker compose config` за мрежите.

### Портът е зает

```
Error: bind: address already in use
```

Друг процес (или друг контейнер) използва порта. Провери:

```bash
sudo lsof -i :8080
docker ps --format "{{.Names}}\t{{.Ports}}"
```

Смени порта в compose файла на свободен.

### Volume не се запазва

Провери дали правилно е дефиниран:

```bash
docker compose config | grep -A 5 volumes
docker volume ls
docker volume inspect wordpress-stack_db_data
```

## Чести грешки

### 1. Използване на `version:` в compose файла

```yaml
# Лошо (deprecated от Compose v2)
version: '3.8'
services:
  ...
```

```yaml
# Добре
services:
  ...
```

Compose v2 **не използва** `version:` полето. То е било нужно в Compose v1, но вече е deprecated и дава warning.

### 2. Използване на `links:` вместо мрежи

```yaml
# Лошо (deprecated)
web:
  links:
    - db
```

```yaml
# Добре
services:
  web: ...
  db: ...
# Compose автоматично ги свързва в default мрежа
```

### 3. `depends_on` без healthcheck

```yaml
# Лошо — wordpress стартира преди MySQL да е готова
depends_on:
  - db
```

```yaml
# Добре
depends_on:
  db:
    condition: service_healthy
```

### 4. Environment variables без `.env`

Не commit-вай пароли в `docker-compose.yml`. Използвай `.env` файл и го добави в `.gitignore`.

### 5. Volume за development без override

```yaml
# Лошо — production образ, но искаш да редактираш кода
volumes:
  - ./src:/app/src
```

Това е ок за development, но за production искаш кода вътре в образа, не bind mount. Използвай override файлове.

### 6. Не правиш `docker compose down` преди промени

Ако промениш `docker-compose.yml`, `docker compose up -d` ще пресъздаде само променените services. Понякога трябва:

```bash
docker compose down
docker compose up -d
```

### 7. Игнориране на `.dockerignore`

Ако build-ваш от Dockerfile и не изключиш `node_modules/`, целият node_modules (200MB+) ще бъде изпратен на Docker daemon-а при всеки build.

```
# .dockerignore
node_modules
.git
.env
*.log
dist
```

## Полезни команди

```bash
# Управление
docker compose up -d              # стартирай в background
docker compose up                 # стартирай във foreground (виждаш логове)
docker compose down               # спри и изтрий всичко
docker compose down -v            # + изтрий volumes
docker compose restart            # рестартирай
docker compose pull               # обнови образите

# Информация
docker compose ps                 # статус
docker compose ps -a              # включително спрените
docker compose logs               # всички логове
docker compose logs -f web        # следвай web в реално време
docker compose top                # процеси в контейнерите
docker compose config             # resolve-нат конфиг

# Scaling
docker compose up -d --scale web=3   # 3 инстанции на web

# Изпълнение
docker compose exec web bash      # влез в web
docker compose run --rm web sh    # временен контейнер

# Build
docker compose build              # build всички images
docker compose build web          # само web
docker compose up -d --build      # build + up в една команда
```

## Кога НЕ трябва да използваш Docker Compose

Docker Compose е чудесен за:

- **Локална разработка** — пусни целия stack с една команда
- **Малки production setup-и** — 1-2 сървъра с 5-10 контейнера
- **CI/CD среди** — за тестове и integration
- **Демонстрации** — покажи как работи проекта

Но **не е подходящ за**:

- **Multi-node setups** — Compose работи само на един host
- **Auto-scaling** — не може да scale-ва динамично
- **Self-healing** — не рестартира container автоматично, ако node-ът падне
- **Големи production среди** — за това е **Kubernetes** или **Docker Swarm**

**Практическо правило:**
- До 10 контейнера на един сървър → Compose
- Повече от 10, или multi-node → Kubernetes

## Заключение

Docker Compose е най-полезната Docker функционалност, която можеш да научиш след основите. Тя превръща хаоса от 10 `docker run` команди в един четим YAML файл.

Какво научи:

- **Какво е Compose** и какъв проблем решава
- **Структурата на `docker-compose.yml`** — services, networks, volumes
- **Реален пример** — WordPress + MySQL + Redis стек
- **Environment variables** от `.env` файл
- **Volumes** за persistent данни
- **Healthcheck** за правилен ред на стартиране
- **Build от Dockerfile** за собствени образи
- **Override файлове** за development vs production
- **Debug техники** и чести грешки

Сега можеш да пуснеш реален multi-container стек за минути, вместо часове. Това е разликата между "работи при мен" и "работи навсякъде".

**Следваща стъпка:** Dockerfile best practices — как да напишеш ефективен Dockerfile от нулата, multi-stage builds за намаляване на размера, caching стратегии и сигурност.

Ако този урок ти е бил полезен — сподели го с някой, който се бори с Docker. Аз самият прекарах седмици, докато проумея тези неща. Ако мога да спестя тези седмици на някого — свършил съм си работата.
