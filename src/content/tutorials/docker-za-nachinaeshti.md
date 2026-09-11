---
title: "Docker за начинаещи: От нула до работещ контейнер"
description: "Пълен наръчник за Docker от абсолютната нула. Какво е контейнер, защо съществува, как се различава от виртуална машина и как да пуснеш първия си работещ контейнер стъпка по стъпка."
pubDate: 2026-09-11
category: "DevOps"
level: "Beginner"
duration: "40 мин"
tags: ["Docker", "Containers", "DevOps", "Linux"]
prerequisites:
  - "Linux система (Ubuntu 22.04 / Debian 12) с sudo достъп"
  - "Основни познания по команден ред"
  - "Разбиране какво е процес и порт"
featured: true
heroImage: "/images/devops/docker-za-nachinaeshti.webp"
heroImageAlt: "Docker контейнери на Linux сървър"
---

Ако попаднеш на Docker за пръв път, вероятно си чувал неща като "контейнери", "образ", "Dockerfile", "Kubernetes" и всичко това звучи като отделна вселена. Аз самият прекарах месеци, докато проумея не само **как** се използва Docker, а **защо** съществува и какъв проблем решава.

Това е урокът, който исках да имам, когато започвах. Ще тръгнем от абсолютната нула — какво е контейнер, защо не е същото като виртуална машина, как се различава от това просто да пуснеш процес на сървъра — и ще стигнем до реален работещ контейнер. Без магически команди, които копираш, без да разбираш какво правят.

Ще ти покажа и честите грешки, които аз правех в началото. Ако нещо не тръгне от първия път — нормално е. Аз самият съм счупил достатъчно контейнери, докато нещата се подредят.

## Проблемът, който Docker решава

Преди да говорим за Docker, нека разберем какъв проблем решава. Това е най-важното нещо, което хората пропускат, когато учат Docker от tutorials.

Представи си, че имаш приложение на Python. Пишеш го локално на Ubuntu 22.04 с Python 3.11. Всичко работи. Качваш го на production сървър — и той се счупва. Защо?

Класическият отговор: **"При мен работи."**

Причините обикновено са:
- Различна версия на Python (3.9 на сървъра вместо 3.11)
- Липсваща библиотека, която случайно е била инсталирана локално
- Различна версия на `libssl`, `glibc` или друга системна библиотека
- Environment variables, които са различни
- Различна конфигурация на OS

Това е **"dependency hell"** — приложението зависи от десетки неща в OS, и ако нещо се разминава, то не работи.

### Как се решаваше това преди Docker

**Вариант 1: Документация.** Пишеш README с 50 стъпки как да инсталираш приложението. Проблемът: никой не го чете, остарява, има грешки.

**Вариант 2: Виртуални машини.** Опаковаш цяла OS с приложението във VM. Работи, но е тежко — VM има собствен kernel, собствена OS, 1-2 GB RAM само за да стартира, и 30-60 секунди boot време.

**Вариант 3: Configuration management** (Ansible, Puppet, Chef). Описваш състоянието на сървъра в код. Работи, но е сложно и бавно.

**Docker е четвъртият вариант** — и това, което го прави различен, е че **опакова приложението с всичките му зависимости в изолиран процес**, който споделя kernel-а на host OS, но има собствена файлова система, собствена мрежа, собствени процеси.

## Какво е контейнер (и какво не е)

**Контейнер** е изолиран процес на Linux, който:
- Има **собствена файлова система** (изолирана от host-а)
- Има **собствена мрежа** (собствен IP, собствени портове)
- Има **собствени процеси** (не вижда процесите на host-а)
- Има **собствени ресурси** (може да ограничиш CPU и RAM)
- **Споделя kernel-а** с host OS

Последното е ключово. Контейнерът **не е виртуална машина**. Той няма собствен kernel, собствен bootloader, собствена OS в традиционния смисъл. Използва kernel-а на host-а и затова стартира за **милисекунди**, не минути.

### Контейнер vs Виртуална машина

| | Контейнер | Виртуална машина |
|---|---|---|
| Kernel | Споделя с host-а | Собствен kernel |
| Размер | Десетки MB | Гигабайти |
| Boot време | Милисекунди | 30-60 секунди |
| Изолация | Process-level (namespaces, cgroups) | Hardware-level (hypervisor) |
| Overhead | Минимален | Значителен |
| Плътност | Стотици на сървър | Десетки на сървър |
| Сигурност | По-слаба изолация | По-силна изолация |

**Практическо правило:**
- Искаш да изолираш **приложение** → контейнер
- Искаш да изолираш **цяла OS** → виртуална машина
- Често се използват заедно: контейнери вътре във VM (това прави Kubernetes в AWS/GCP)

### Контейнер vs просто процес

Защо не просто да пуснеш процеса директно на сървъра? Защото:

1. **Изолация** — процесът не вижда файловете на другите процеси (освен ако не му дадеш достъп)
2. **Repeatability** — същият контейнер работи еднакво на всяка машина с Docker
3. **Portability** — можеш да преместиш контейнера от локална машина на сървър в AWS без промени
4. **Versioning** — образът на контейнера има версия, можеш да rollback-неш
5. **Composition** — лесно комбинираш множество контейнери (app + database + cache)

## Как работи под капака (кратко)

Docker използва три Linux технологии:

### 1. Namespaces (изолация)

Linux kernel-ът позволява на процесите да имат "изолирани изгледи" на системата:

- **PID namespace** — процесът вижда само своите деца
- **Network namespace** — собствена мрежова карта
- **Mount namespace** — собствена файлова система
- **UTS namespace** — собствен hostname
- **IPC namespace** — собствена IPC
- **User namespace** — собствен потребител (може да си root в контейнера, но не и на host-а)

### 2. cgroups (ограничения)

Control groups ограничават ресурсите:

- **CPU** — максимум 1 ядро
- **Memory** — максимум 512 MB
- **I/O** — максимум дискова скорост

### 3. Union filesystems (слоеве)

Docker образът е **множество слоеве**, всеки от които е read-only diff. Когато стартираш контейнер, се добавя **writable слой** отгоре. Това прави образите:

- **Малки** — само разликите се пазят
- **Бързи** — само новите слоеве се свалят
- **Ефективни** — множество контейнери споделят базови слоеве

Това е всичко, което трябва да знаеш за начало. Няма нужда да навлизаш по-дълбоко, докато не станеш напреднал.

## Инсталация на Docker

Има два варианта: инсталация от официалния repo на Docker или от repository на дистрибуцията. **Винаги използвай официалния repo** — версията от Ubuntu repos е остаряла и не ти дава най-новите features.

### Ubuntu / Debian

```bash
# 1. Махни старите версии (ако има)
sudo apt remove docker docker-engine docker.io containerd runc

# 2. Инсталирай prerequisites
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

# 3. Добави GPG ключа на Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 4. Добави Docker repo
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Инсталирай Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 6. Провери инсталацията
sudo docker --version
```

Трябва да видиш нещо като `Docker version 27.x.x, build ...`.

### Добави потребителя си към docker групата

По подразбиране само root може да пуска Docker. За да не пишеш `sudo` всеки път:

```bash
sudo usermod -aG docker $USER

# Излез и влез отново (или пусни newgrp docker)
newgrp docker

# Провери дали работи без sudo
docker ps
```

> ⚠️ **Сигурност:** Членството в `docker` група е еквивалентно на root достъп. Docker позволява mount на host директории и достъп до всичко. Ако това не е приемливо в твоята среда — използвай `sudo docker` навсякъде.

## Първият ти контейнер

Класическият "Hello World" в Docker е `hello-world` образът. Той прави едно нещо: показва съобщение и излиза.

```bash
docker run hello-world
```

Какво ще видиш:

```
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
...
Hello from Docker!
This message shows that your installation appears to be working correctly.
...
```

### Какво се случи току-що

1. **Docker провери дали образът `hello-world:latest` е локално.** Не беше.
2. **Изтегли го от Docker Hub** (публичния registry).
3. **Създаде контейнер** от този образ.
4. **Стартира контейнера.** Той показа съобщение и приключи.
5. **Контейнерът спря**, но остана в историята.

Провери:

```bash
# Виж всички работещи контейнери
docker ps

# Виж всички контейнери (включително спрените)
docker ps -a

# Трябва да видиш hello-world контейнера със статус "Exited (0)"
```

## Ключовите концепции — образ, контейнер, Dockerfile

Тук е мястото, където повечето хора се объркват. Нека ги разграничим ясно.

### Образ (Image)

**Образът е шаблонът.** Той е immutable (не се променя). Съдържа:
- Файловата система (OS библиотеки, приложение, зависимости)
- Метаданни (каква команда да се изпълни при старт, какви портове се отварят)
- Слоеве

Аналогия: **образът е класът** в обектно-ориентираното програмиране.

### Контейнер

**Контейнерът е инстанцията на образа.** Той е това, което реално се изпълнява. Може да имаш **един образ и 10 контейнера** от него. Всеки контейнер е независим — със собствени промени във файловата система, собствена мрежа, собствени процеси.

Аналогия: **контейнерът е обектът** — инстанция на класа.

```bash
# Един образ
docker images
# REPOSITORY     TAG       IMAGE ID       SIZE
# nginx          latest    abc123...      187MB

# Можеш да пуснеш 3 контейнера от него
docker run -d --name web1 nginx
docker run -d --name web2 nginx
docker run -d --name web3 nginx

docker ps
# Три nginx контейнера, работещи независимо
```

### Dockerfile

**Dockerfile е текстови файл, който описва как да се построи образ.** Съдържа инструкции стъпка по стъпка — каква база да се използва, какви файлове да се копират, какви команди да се изпълнят.

```dockerfile
FROM ubuntu:22.04
RUN apt update && apt install -y nginx
COPY index.html /var/www/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Ще го разгледаме подробно в следващия урок. За сега запомни: **Dockerfile → build → образ → run → контейнер.**

## Първи реален контейнер — Nginx

Нека пуснем нещо реално. Nginx web server е класически пример.

```bash
docker run -d -p 8080:80 --name my-nginx nginx
```

### Какво прави всяка опция

- **`-d`** (detach) — пусни в background, не блокирай терминала
- **`-p 8080:80`** — map-ни порт 8080 на host-а към порт 80 в контейнера
- **`--name my-nginx`** — дай име на контейнера (иначе Docker генерира случайно)
- **`nginx`** — образът (latest версия)

Провери:

```bash
docker ps
# CONTAINER ID   IMAGE   COMMAND                  STATUS         PORTS                  NAMES
# abc123...      nginx   "/docker-entrypoint.…"   Up 5 seconds   0.0.0.0:8080->80/tcp   my-nginx
```

Отвори в браузъра: `http://localhost:8080`. Трябва да видиш стандартната Nginx страница "Welcome to nginx!".

**Поздравления** — току-що пусна първия си реален контейнер.

### Полезни команди с този контейнер

```bash
# Виж логовете
docker logs my-nginx

# Виж логовете в реално време
docker logs -f my-nginx

# Влез в контейнера с bash
docker exec -it my-nginx bash

# Вътре в контейнера:
# ls /etc/nginx/
# cat /etc/nginx/nginx.conf
# exit
```

```bash
# Спри контейнера
docker stop my-nginx

# Стартирай го отново
docker start my-nginx

# Рестартирай го
docker restart my-nginx

# Изтрий го (трябва да е спрян)
docker stop my-nginx
docker rm my-nginx
```

## По-смислен пример — PostgreSQL

Нека пуснем база данни. Това е нещо, което правиш всеки ден в production.

```bash
docker run -d \
  --name my-postgres \
  -e POSTGRES_PASSWORD=secret123 \
  -e POSTGRES_USER=myuser \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:16
```

### Какво прави всяка нова опция

- **`-e VAR=value`** — environment variable (тук: парола, потребител, база)
- **`-v postgres-data:/var/lib/postgresql/data`** — volume (постоянно съхранение, за да не се губят данни при спиране на контейнера)
- **`postgres:16`** — образ `postgres` с tag `16`

### Volume — защо е критичен

По подразбиране файловете в контейнера се губят, когато контейнерът бъде изтриен. Това е **by design** — контейнерите са ефимерни (ephemeral).

**Volume** е начин да съхраниш данни извън контейнера. Ако изтриеш контейнера и пуснеш нов от същия образ със същия volume, данните са там.

```bash
# Тествай
docker exec -it my-postgres psql -U myuser -d mydb

# В PostgreSQL:
CREATE TABLE test (id int, name text);
INSERT INTO test VALUES (1, 'hello');
SELECT * FROM test;
\q
```

```bash
# Изтрий контейнера
docker stop my-postgres
docker rm my-postgres

# Пусни нов от същия образ и volume
docker run -d --name my-postgres-2 \
  -e POSTGRES_PASSWORD=secret123 \
  -e POSTGRES_USER=myuser \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:16

# Провери дали данните са там
docker exec -it my-postgres-2 psql -U myuser -d mydb -c "SELECT * FROM test;"

# Трябва да видиш записа. Volume-ът е запазил данните.
```

Почисти:

```bash
docker stop my-postgres-2
docker rm my-postgres-2
docker volume rm postgres-data
```

## Полезни команди, които използвам всеки ден

```bash
# Списъци
docker ps                          # работещи контейнери
docker ps -a                       # всички контейнери
docker images                      # всички образи
docker volume ls                   # всички volumes
docker network ls                  # всички мрежи

# Почистване
docker stop $(docker ps -q)        # спри всички работещи
docker rm $(docker ps -aq)         # изтрий всички спрени
docker rmi $(docker images -q)     # изтрий всички образи
docker system prune -a             # изтрий всичко неизползвано

# Debug
docker logs <container>            # логове
docker logs -f <container>         # логове в реално време
docker exec -it <container> bash   # влез в контейнера
docker inspect <container>         # детайлна информация (JSON)
docker stats                       # live ресурси на всички контейнери

# Копиране на файлове
docker cp file.txt <container>:/path/     # от host към контейнер
docker cp <container>:/path/file.txt .    # от контейнер към host
```

## Честите грешки, които правех в началото

### 1. Използване на `latest` tag в production

```dockerfile
# Лошо
FROM node:latest
```

`latest` се променя. Утре може да е Node 22, вдругиден Node 23. Винаги pin-вай версия:

```dockerfile
# Добре
FROM node:20.11-alpine
```

### 2. Инсталиране на всичко в един RUN

```dockerfile
# Лошо (създава 3 слоя)
RUN apt update
RUN apt install -y curl
RUN apt install -y git
```

```dockerfile
# Добре (един слой)
RUN apt update && \
    apt install -y curl git && \
    rm -rf /var/lib/apt/lists/*
```

### 3. Стартиране като root

```dockerfile
# Лошо
FROM node:20
COPY . /app
CMD ["node", "/app/index.js"]
# Всичко върви като root
```

```dockerfile
# Добре
FROM node:20
WORKDIR /app
COPY . .
RUN useradd -m appuser && chown -R appuser /app
USER appuser
CMD ["node", "index.js"]
```

### 4. Игнориране на `.dockerignore`

Ако имаш `node_modules/` в проекта и го копираш в образа, той ще бъде качен. Създай `.dockerignore`:

```
node_modules
.git
.env
*.log
dist
```

### 5. Копиране на всичко с `COPY . .` в началото

```dockerfile
# Лошо — invalidates cache при всяка промяна
COPY . .
RUN npm install
```

```dockerfile
# Добре — npm install се кешира, ако package.json не се променя
COPY package.json package-lock.json ./
RUN npm install
COPY . .
```

### 6. Не използване на `.dockerignore`

Ако не го използваш, целият `node_modules/` (стотици MB) ще бъде изпратен на Docker daemon-а при всеки build. Бавно и безсмислено.

### 7. Без cleanup в Dockerfile

```dockerfile
# Лошо — apt cache остава в образа, +100MB
RUN apt update && apt install -y curl
```

```dockerfile
# Добре — cleanup в същия RUN
RUN apt update && \
    apt install -y curl && \
    rm -rf /var/lib/apt/lists/*
```

## Debug — какво да правиш, когато не работи

### Контейнерът не стартира

```bash
# Виж детайлната причина за exit
docker logs <container>
docker inspect <container> | grep -A 5 "State"
```

### Контейнерът стартира, но веднага спира

Най-честата причина: **CMD-ът завършва**. Контейнер живее, докато има работещ процес. Ако CMD-ът е `echo "hello"`, той ще приключи и контейнерът ще спре.

За дълго работещ контейнер, CMD-ът трябва да е **дълго работещ процес** — сървър, daemon, shell с `sleep infinity`.

### Не можеш да се свържеш на порта

```bash
# Виж дали портът е map-нат правилно
docker port <container>

# Провери какво слуша в контейнера
docker exec <container> netstat -tulpn
```

Честа грешка: приложение слуша на `127.0.0.1` вътре в контейнера, не на `0.0.0.0`. Тогава Docker не може да го достигне отвън.

### Volume не работи

```bash
# Провери дали volume-ът съществува
docker volume ls

# Виж дали е mount-нат правилно
docker inspect <container> | grep -A 20 "Mounts"
```

## Кога НЕ трябва да използваш Docker

Docker не е сребърен куршум. Ето кога **не** е правилният избор:

- **Stateful приложения с големи данни** (напр. PostgreSQL с 500 GB data) — по-добре на bare metal или със специален storage
- **Приложения, които изискват специфичен kernel** — контейнерът споделя kernel-а с host-а
- **High-performance computing** — контейнерът добавя лек overhead, при HPC и това е много
- **Малки скриптове, които се пускат веднъж** — overkill, използвай обикновен shell script
- **Windows приложения** — контейнерите на Linux не могат да пускат Windows binary-та

## Заключение

Docker не е магия — това е просто по-добър начин да опаковаш и изолираш приложения. Разбра ли:

- **Какво е контейнер** (изолиран процес, споделя kernel)
- **Как се различава от VM** (лек, бърз, process-level изолация)
- **Как работи под капака** (namespaces, cgroups, overlay FS)
- **Каква е разликата между образ, контейнер и Dockerfile**
- **Как да пуснеш първите си контейнери** (nginx, postgres)
- **Кои са честите грешки** и как да ги избегнеш

Сега можеш да пуснеш реален сървър за 30 секунди. Това е силата на Docker.

**Следваща стъпка:** Dockerfile — как да построиш собствен образ от нулата. Ще разгледаме всяка инструкция, multi-stage builds, best practices и как да оптимизираш образа от 1.2GB на 80MB.

Ако този урок ти е бил полезен — кажи ми какво още искаш да видиш. Пиша за Docker, защото го използвам всеки ден и вярвам, че разбирането му е задължително за всеки, който работи с Linux и DevOps.